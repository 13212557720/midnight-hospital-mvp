import { DIFFICULTY_CONFIG } from '../config/difficulty';
import { midnightHospitalInstance } from '../content/packs/midnight-hospital';
import { prepareHandForNode } from './deckEngine';
import { createRunResult, getFailureReason } from './outcomeEngine';
import { createEmptyGameState, createNewRun } from './runFactory';
import type { CareerId, GameState } from './types';

export const initialGameState = createEmptyGameState();

export function startRun(careerId: CareerId, seed?: string): GameState {
  return createNewRun(careerId, seed);
}

export function enterInstance(state: GameState): GameState {
  if (state.run.phase !== 'INSTANCE_INTRO') {
    return state;
  }
  const nodeId = midnightHospitalInstance.nodeIds[0];
  return {
    ...state,
    run: {
      ...state.run,
      phase: 'NODE_STORY',
      visitedNodeIds: [nodeId],
    },
  };
}

function applyPhysicianPassive(state: GameState): GameState {
  const cleared = state.run.resolvedNodeIds.length;
  if (state.player.careerId !== 'physician' || cleared === 0 || cleared % 2 !== 0) {
    return state;
  }
  return {
    ...state,
    player: {
      ...state.player,
      hp: Math.min(state.player.maxHp, state.player.hp + 1),
    },
  };
}

export function continueAfterResolution(state: GameState): GameState {
  if (state.run.phase !== 'RESOLUTION') {
    return state;
  }

  const afterPassive = applyPhysicianPassive(state);
  const nextNodeIndex = afterPassive.run.currentNodeIndex + 1;

  if (nextNodeIndex >= midnightHospitalInstance.nodeIds.length) {
    const gateRun = { ...afterPassive.run, phase: 'FINAL_ESCAPE' as const };
    const failureReason = getFailureReason(afterPassive.player, gateRun);
    if (failureReason) {
      const resultState = { ...afterPassive, run: gateRun };
      return {
        ...resultState,
        run: {
          ...gateRun,
          phase: 'RUN_RESULT',
          result: createRunResult(resultState, 'LOSE', failureReason),
        },
      };
    }
    const penalty = Number(afterPassive.run.flags.next_hand_penalty ?? 0);
    const prepared = prepareHandForNode(afterPassive.player, afterPassive.run.rngState, penalty);
    return {
      player: prepared.player,
      run: {
        ...afterPassive.run,
        currentNodeIndex: nextNodeIndex,
        phase: 'FINAL_ESCAPE',
        rngState: prepared.rngState,
        flags: { ...afterPassive.run.flags, next_hand_penalty: 0 },
        visitedNodeIds: [...afterPassive.run.visitedNodeIds, midnightHospitalInstance.finalNodeId],
      },
    };
  }

  const nextNodeId = midnightHospitalInstance.nodeIds[nextNodeIndex];
  const penalty = Number(afterPassive.run.flags.next_hand_penalty ?? 0);
  const prepared = prepareHandForNode(afterPassive.player, afterPassive.run.rngState, penalty);
  return {
    player: prepared.player,
    run: {
      ...afterPassive.run,
      currentNodeIndex: nextNodeIndex,
      phase: 'NODE_STORY',
      rngState: prepared.rngState,
      flags: { ...afterPassive.run.flags, next_hand_penalty: 0 },
      visitedNodeIds: afterPassive.run.visitedNodeIds.includes(nextNodeId)
        ? afterPassive.run.visitedNodeIds
        : [...afterPassive.run.visitedNodeIds, nextNodeId],
    },
  };
}

export function resetToCareerSelect(): GameState {
  return initialGameState;
}

export function restartRun(state: GameState): GameState {
  return startRun(state.player.careerId);
}

export function hasTargetDifficulty(metrics: { winRate: number }): boolean {
  return metrics.winRate >= DIFFICULTY_CONFIG.targetWinRateMin && metrics.winRate <= DIFFICULTY_CONFIG.targetWinRateMax;
}
