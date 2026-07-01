import { cardsById, eventsById, midnightHospitalFinalNode, midnightHospitalInstance } from '../content/packs/midnight-hospital';
import { calculateCheck } from './checkEngine';
import { discardHandAfterPlay } from './deckEngine';
import {
  applyCareerDeathGuard,
  applyDeltaToPlayer,
  applyEarlyProtection,
  clampVisibleState,
  mergeDelta,
  normalizeDelta,
} from './guards';
import { createRunResult, getFailureReason, getImmediateFailureReason, isNearMiss, isPerfectWin } from './outcomeEngine';
import type { CardDefinition, CheckOutcome, EventAction, EventNode, GameState, ResolveOptions, StateDelta } from './types';

export function getCurrentNode(state: GameState): EventNode {
  if (state.run.phase === 'FINAL_ESCAPE') {
    return midnightHospitalFinalNode;
  }
  const nodeId = midnightHospitalInstance.nodeIds[state.run.currentNodeIndex];
  const node = eventsById[nodeId];
  if (!node) {
    throw new Error(`Unknown node at index ${state.run.currentNodeIndex}`);
  }
  return node;
}

export function getVisibleActions(node: EventNode, state: GameState): EventAction[] {
  return node.actions.filter((action) => {
    if (!action.isCatchUp) {
      return true;
    }
    return state.run.currentNodeIndex === 3 && state.player.fragments <= 1;
  });
}

function shouldApplySuccessEffects(outcome: CheckOutcome): boolean {
  return outcome === 'CRITICAL_SUCCESS' || outcome === 'SUCCESS' || outcome === 'MIXED';
}

function applyCardOutcomeOverrides(card: CardDefinition, outcome: CheckOutcome): CheckOutcome {
  if (outcome !== 'FAILURE') {
    return outcome;
  }
  if (card.effects?.some((effect) => effect.type === 'FAILURE_TO_MIXED')) {
    return 'MIXED';
  }
  return outcome;
}

function applyCareerOutcomeOverrides(
  state: GameState,
  node: EventNode,
  action: EventAction,
  outcome: CheckOutcome,
): { outcome: CheckOutcome; flags: GameState['run']['flags'] } {
  const isInsightAttempt = [...node.recommendedTags, ...action.preferredTags].includes('insight');
  if (
    state.player.careerId === 'investigator' &&
    outcome === 'FAILURE' &&
    isInsightAttempt &&
    !state.run.flags.investigator_insight_save_used
  ) {
    return {
      outcome: 'MIXED',
      flags: { ...state.run.flags, investigator_insight_save_used: true },
    };
  }
  return { outcome, flags: state.run.flags };
}

function reduceLoss(value: number | undefined, reduction: number): number | undefined {
  if (value === undefined || value >= 0) {
    return value;
  }
  return Math.min(0, value + reduction);
}

function applyCardEffects(card: CardDefinition, outcome: CheckOutcome, delta: StateDelta): StateDelta {
  let next: StateDelta = { ...delta, addFlags: { ...(delta.addFlags ?? {}) } };

  for (const effect of card.effects ?? []) {
    if (effect.type === 'REDUCE_SANITY_LOSS') {
      next.sanity = reduceLoss(next.sanity, effect.amount ?? 1);
    }
    if (effect.type === 'REDUCE_HP_LOSS') {
      next.hp = reduceLoss(next.hp, effect.amount ?? 1);
    }
    if (effect.type === 'ON_SUCCESS_DELTA' && shouldApplySuccessEffects(outcome) && effect.delta) {
      next = mergeDelta(next, effect.delta);
    }
    if (effect.type === 'ON_FAILURE_DELTA' && outcome === 'FAILURE' && effect.delta) {
      next = mergeDelta(next, effect.delta);
    }
    if (effect.type === 'ON_ANY_DELTA' && effect.delta) {
      next = mergeDelta(next, effect.delta);
    }
    if (effect.type === 'SET_FLAG' && shouldApplySuccessEffects(outcome) && effect.flagKey) {
      next.addFlags = {
        ...(next.addFlags ?? {}),
        [effect.flagKey]: effect.flagValue ?? true,
      };
    }
    if (effect.type === 'NEXT_HAND_PENALTY' && shouldApplySuccessEffects(outcome)) {
      next.addFlags = {
        ...(next.addFlags ?? {}),
        next_hand_penalty: Math.max(Number(next.addFlags?.next_hand_penalty ?? 0), effect.amount ?? 1),
      };
    }
  }

  return normalizeDelta(next);
}

function applySpecialMemoryOverrides(
  state: GameState,
  node: EventNode,
  outcome: CheckOutcome,
  delta: StateDelta,
): { outcome: CheckOutcome; delta: StateDelta; flags: GameState['run']['flags'] } {
  const memoryIds = new Set(state.player.memoryCards.map((card) => card.id));
  if (
    memoryIds.has('memory_017_cabinet') &&
    node.id === 'mh_node_05_morgue' &&
    outcome === 'FAILURE' &&
    !state.run.flags.memory_017_used
  ) {
    return {
      outcome: 'MIXED',
      delta: mergeDelta(delta, { pollution: 1 }),
      flags: { ...state.run.flags, memory_017_used: true },
    };
  }
  return { outcome, delta, flags: state.run.flags };
}

function addMinigameRewards(delta: StateDelta, options: ResolveOptions): StateDelta {
  if ((options.minigameHits ?? 0) >= 3) {
    return mergeDelta(delta, { sanity: 1 });
  }
  return delta;
}

export function resolveCurrentNode(
  state: GameState,
  actionId: string,
  cardInstanceId: string,
  options: ResolveOptions = {},
): GameState {
  const node = getCurrentNode(state);
  const action = getVisibleActions(node, state).find((candidate) => candidate.id === actionId);
  if (!action) {
    throw new Error(`Action not available: ${actionId}`);
  }

  const cardInstance = state.player.hand.find((card) => card.instanceId === cardInstanceId);
  if (!cardInstance) {
    throw new Error(`Card not available: ${cardInstanceId}`);
  }

  const card = cardsById[cardInstance.cardId];
  if (card.cost > state.player.energy) {
    throw new Error(`Not enough energy for card: ${card.id}`);
  }

  const check = calculateCheck(state.player, node, action, cardInstanceId, state.run.rngState, options);
  const cardOverriddenOutcome = applyCardOutcomeOverrides(card, check.outcome);
  const careerOverridden = applyCareerOutcomeOverrides(state, node, action, cardOverriddenOutcome);
  let outcome = careerOverridden.outcome;
  let flags = { ...state.run.flags, ...careerOverridden.flags };
  const baseDelta: StateDelta = mergeDelta(action.onOutcome[outcome], {
    timeLeftSeconds: -action.timeCostSeconds,
  });
  let delta = applyCardEffects(card, outcome, baseDelta);
  delta = addMinigameRewards(delta, options);
  if (options.useRitualBoost && state.player.careerId === 'ritualist') {
    delta = mergeDelta(delta, { pollution: 1 });
  }

  const memoryOverride = applySpecialMemoryOverrides(state, node, outcome, delta);
  outcome = memoryOverride.outcome;
  delta = normalizeDelta(memoryOverride.delta);
  flags = { ...flags, ...memoryOverride.flags, ...(delta.addFlags ?? {}) };

  let nextPlayer = applyDeltaToPlayer(state.player, delta);
  nextPlayer = {
    ...nextPlayer,
    energy: Math.max(0, nextPlayer.energy - card.cost),
  };
  nextPlayer = applyEarlyProtection(nextPlayer, state.run);
  const deathGuard = applyCareerDeathGuard(nextPlayer, { ...state.run, flags });
  nextPlayer = clampVisibleState(deathGuard.player);
  flags = { ...flags, ...deathGuard.flags };
  nextPlayer = discardHandAfterPlay(nextPlayer, cardInstanceId);

  const checkGap = check.breakdown.total - node.difficulty;
  const resolution = {
    outcome,
    checkValue: check.breakdown.total,
    difficulty: node.difficulty,
    delta,
    narrativeKey: node.resultTextKeys[outcome],
    nearMiss: isNearMiss(nextPlayer, checkGap),
    actionId: action.id,
    cardId: card.id,
    cardInstanceId,
    nodeId: node.id,
    breakdown: check.breakdown,
  };

  const nextRun = {
    ...state.run,
    phase: 'RESOLUTION' as const,
    rngState: check.rngState,
    flags,
    visitedNodeIds: state.run.visitedNodeIds.includes(node.id)
      ? state.run.visitedNodeIds
      : [...state.run.visitedNodeIds, node.id],
    resolvedNodeIds: state.run.resolvedNodeIds.includes(node.id)
      ? state.run.resolvedNodeIds
      : [...state.run.resolvedNodeIds, node.id],
    lastResolution: resolution,
  };

  const nextState: GameState = {
    player: nextPlayer,
    run: nextRun,
  };

  if (node.isFinal) {
    if (outcome === 'FAILURE') {
      const result = createRunResult(nextState, 'LOSE', getFailureReason(nextPlayer, { ...nextRun, phase: 'FINAL_ESCAPE' }, true));
      return {
        ...nextState,
        run: { ...nextRun, phase: 'RUN_RESULT', result },
      };
    }

    const failureReason = getFailureReason(nextPlayer, { ...nextRun, phase: 'FINAL_ESCAPE' });
    if (failureReason) {
      const result = createRunResult(nextState, 'LOSE', failureReason);
      return {
        ...nextState,
        run: { ...nextRun, phase: 'RUN_RESULT', result },
      };
    }

    const status = isPerfectWin(nextPlayer, outcome === 'CRITICAL_SUCCESS') ? 'PERFECT_WIN' : 'WIN';
    const result = createRunResult(nextState, status);
    return {
      ...nextState,
      run: { ...nextRun, phase: 'RUN_RESULT', result },
    };
  }

  const immediateFailure = getImmediateFailureReason(nextPlayer);
  if (immediateFailure) {
    const result = createRunResult(nextState, 'LOSE', immediateFailure);
    return {
      ...nextState,
      run: { ...nextRun, phase: 'RUN_RESULT', result },
    };
  }

  return nextState;
}
