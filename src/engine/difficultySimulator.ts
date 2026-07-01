import { midnightHospitalCareers, midnightHospitalInstance } from '../content/packs/midnight-hospital';
import { cardsById } from '../content/packs/midnight-hospital/cards';
import { continueAfterResolution, enterInstance, startRun } from './gameMachine';
import { getCurrentNode, getVisibleActions, resolveCurrentNode } from './resolutionEngine';
import { hashSeed, randomFloat, randomInt } from './rng';
import type { CareerId, EventAction, GameState, RunResult } from './types';

export interface DifficultySimulationMetrics {
  runs: number;
  winRate: number;
  perfectWinRate: number;
  nearMissRate: number;
  missingOneFragmentRate: number;
  deathBeforeFinalRate: number;
  pollutionOverloadRate: number;
  finalCheckFailedRate: number;
  averageDurationNodes: number;
  careerWinRates: Record<CareerId, number>;
}

function actionScore(action: EventAction, nodeTags: string[]): number {
  return action.preferredTags.filter((tag) => nodeTags.includes(tag)).length;
}

function chooseAction(state: GameState, rngState: number): { action: EventAction; rngState: number } {
  const node = getCurrentNode(state);
  const actions = getVisibleActions(node, state);
  const roll = randomFloat(rngState);
  let nextState = roll.state;

  if (roll.value < 0.55) {
    const bestScore = Math.max(...actions.map((action) => actionScore(action, node.recommendedTags)));
    const best = actions.filter((action) => actionScore(action, node.recommendedTags) === bestScore);
    const picked = randomInt(nextState, best.length);
    return { action: best[picked.value], rngState: picked.state };
  }

  if (roll.value < 0.8) {
    const riskOrder = { low: 0, medium: 1, high: 2 };
    const lowestRisk = Math.min(...actions.map((action) => riskOrder[action.riskLevel]));
    const best = actions.filter((action) => riskOrder[action.riskLevel] === lowestRisk);
    const picked = randomInt(nextState, best.length);
    return { action: best[picked.value], rngState: picked.state };
  }

  const picked = randomInt(nextState, actions.length);
  nextState = picked.state;
  return { action: actions[picked.value], rngState: nextState };
}

function chooseCard(state: GameState, action: EventAction) {
  const node = getCurrentNode(state);
  const tags = [...node.recommendedTags, ...action.preferredTags];
  const playable = state.player.hand.filter((instance) => cardsById[instance.cardId].cost <= state.player.energy);
  const candidates = playable.length > 0 ? playable : state.player.hand;
  return [...candidates].sort((left, right) => {
    const leftCard = cardsById[left.cardId];
    const rightCard = cardsById[right.cardId];
    const leftMatches = leftCard.tags.filter((tag) => tags.includes(tag)).length;
    const rightMatches = rightCard.tags.filter((tag) => tags.includes(tag)).length;
    if (rightMatches !== leftMatches) {
      return rightMatches - leftMatches;
    }
    return rightCard.basePower - leftCard.basePower;
  })[0];
}

function simulateSingleRun(careerId: CareerId, runIndex: number): RunResult {
  let state = enterInstance(startRun(careerId, `sim-${careerId}-${runIndex}`));
  let rngState = hashSeed(`strategy-${careerId}-${runIndex}`);
  let guard = 0;

  while (state.run.phase !== 'RUN_RESULT' && guard < 20) {
    if (state.run.phase === 'RESOLUTION') {
      state = continueAfterResolution(state);
      guard += 1;
      continue;
    }

    const chosenAction = chooseAction(state, rngState);
    rngState = chosenAction.rngState;
    const card = chooseCard(state, chosenAction.action);
    const node = getCurrentNode(state);
    const minigameBonus = node.minigameId ? 1 : 0;
    state = resolveCurrentNode(state, chosenAction.action.id, card.instanceId, {
      minigameBonus,
      minigameHits: minigameBonus,
    });
    guard += 1;
  }

  if (!state.run.result) {
    throw new Error('Simulation did not reach a result.');
  }
  return state.run.result;
}

export function simulateDifficulty(runs: number): DifficultySimulationMetrics {
  const careerStats = Object.fromEntries(midnightHospitalCareers.map((career) => [career.id, { runs: 0, wins: 0 }])) as Record<
    CareerId,
    { runs: number; wins: number }
  >;
  const totals = {
    wins: 0,
    perfectWins: 0,
    nearMiss: 0,
    missingOne: 0,
    deathBeforeFinal: 0,
    pollutionOverload: 0,
    finalCheckFailed: 0,
    nodes: 0,
  };

  for (let index = 0; index < runs; index += 1) {
    const career = midnightHospitalCareers[index % midnightHospitalCareers.length];
    const result = simulateSingleRun(career.id, index);
    careerStats[career.id].runs += 1;
    totals.nodes += result.nodesCleared;

    if (result.status === 'WIN' || result.status === 'PERFECT_WIN') {
      totals.wins += 1;
      careerStats[career.id].wins += 1;
    }
    if (result.status === 'PERFECT_WIN') totals.perfectWins += 1;
    if (
      result.failureReason === 'MISSING_ONE_FRAGMENT' ||
      result.pollution === result.pollutionLimit - 1 ||
      (result.hp > 0 && result.hp <= 2) ||
      (result.timeLeftSeconds > 0 && result.timeLeftSeconds < 20)
    ) {
      totals.nearMiss += 1;
    }
    if (result.failureReason === 'MISSING_ONE_FRAGMENT') totals.missingOne += 1;
    if (result.failureReason === 'DEATH' && result.nodesCleared < midnightHospitalInstance.nodeIds.length) totals.deathBeforeFinal += 1;
    if (result.failureReason === 'POLLUTION_OVERLOAD') totals.pollutionOverload += 1;
    if (result.failureReason === 'FINAL_CHECK_FAILED') totals.finalCheckFailed += 1;
  }

  return {
    runs,
    winRate: totals.wins / runs,
    perfectWinRate: totals.perfectWins / runs,
    nearMissRate: totals.nearMiss / runs,
    missingOneFragmentRate: totals.missingOne / runs,
    deathBeforeFinalRate: totals.deathBeforeFinal / runs,
    pollutionOverloadRate: totals.pollutionOverload / runs,
    finalCheckFailedRate: totals.finalCheckFailed / runs,
    averageDurationNodes: totals.nodes / runs,
    careerWinRates: Object.fromEntries(
      Object.entries(careerStats).map(([careerId, stats]) => [careerId, stats.runs ? stats.wins / stats.runs : 0]),
    ) as Record<CareerId, number>,
  };
}
