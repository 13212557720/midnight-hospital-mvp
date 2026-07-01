import { describe, expect, it } from 'vitest';
import { enterInstance, startRun } from '../engine/gameMachine';
import { resolveCurrentNode } from '../engine/resolutionEngine';

describe('resolutionEngine', () => {
  it('keeps early nodes from directly ending the run', () => {
    const state = enterInstance(startRun('investigator', 'early-protect'));
    const card = state.player.hand[0];
    const next = resolveCurrentNode(
      {
        ...state,
        player: {
          ...state.player,
          hp: 1,
          sanity: 1,
          pollution: 5,
        },
      },
      'cross_hall_directly',
      card.instanceId,
      { forcedPerturbation: -1 },
    );

    expect(next.player.hp).toBeGreaterThanOrEqual(1);
    expect(next.player.sanity).toBeGreaterThanOrEqual(1);
    expect(next.player.pollution).toBeLessThan(6);
    expect(next.run.phase).toBe('RESOLUTION');
  });
});
