import { describe, expect, it } from 'vitest';
import { enterInstance, startRun } from '../engine/gameMachine';
import { createRunResult } from '../engine/outcomeEngine';
import type { GameState, ResolutionResult } from '../engine/types';

function stateForReadout(fragments: number, lastResolution?: ResolutionResult): GameState {
  const state = enterInstance(startRun('investigator', `readout-${fragments}`));
  return {
    ...state,
    player: {
      ...state.player,
      fragments,
      hp: 7,
      sanity: 7,
      pollution: 1,
    },
    run: {
      ...state.run,
      phase: 'FINAL_ESCAPE',
      lastResolution,
    },
  };
}

describe('outcomeEngine', () => {
  it('diagnoses final check failure without presenting it as 99 percent progress', () => {
    const finalFailure: ResolutionResult = {
      outcome: 'FAILURE',
      checkValue: 7,
      difficulty: 8,
      delta: {},
      narrativeKey: 'final_failure',
      actionId: 'input_fragment_code',
      cardId: 'quick_search',
      cardInstanceId: 'card_final',
      nodeId: 'mh_final_rooftop_lift',
      breakdown: {
        cardBase: 3,
        tagBonus: 2,
        careerBonus: 1,
        actionModifier: 0,
        memoryBonus: 0,
        minigameBonus: 0,
        ritualBoost: 0,
        randomPerturbation: 1,
        total: 7,
      },
    };

    const result = createRunResult(stateForReadout(4, finalFailure), 'LOSE', 'FINAL_CHECK_FAILED');

    expect(result.escapeReadout.label).toBe('碎片完整，最终校验失败');
    expect(result.escapeReadout.value).toBe(100);
    expect(result.escapeReadout.reasonLines.join(' ')).toContain('最终判定 7 vs 8 未通过');
  });

  it('diagnoses a missing final fragment as a blocked access chain', () => {
    const result = createRunResult(stateForReadout(3), 'LOSE', 'MISSING_ONE_FRAGMENT');

    expect(result.escapeReadout.label).toBe('缺少 1 枚门禁碎片');
    expect(result.escapeReadout.value).toBe(75);
    expect(result.escapeReadout.reasonLines.join(' ')).toContain('3/4');
  });
});
