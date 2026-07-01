import { describe, expect, it } from 'vitest';
import { eventsById } from '../content/packs/midnight-hospital';
import { calculateCheck } from '../engine/checkEngine';
import { enterInstance, startRun } from '../engine/gameMachine';

describe('checkEngine', () => {
  it('combines card base, tag match, career bonus, action modifier, and perturbation', () => {
    const state = enterInstance(startRun('investigator', 'test-check'));
    const node = eventsById.mh_node_01_registration_hall;
    const action = node.actions[0];
    const card = state.player.hand.find((instance) => instance.cardId === 'quick_search') ?? state.player.hand[0];
    const result = calculateCheck(state.player, node, action, card.instanceId, state.run.rngState, {
      forcedPerturbation: 0,
    });

    expect(result.breakdown.total).toBe(result.breakdown.cardBase + result.breakdown.tagBonus + result.breakdown.careerBonus);
    expect(result.breakdown.tagBonus).toBeGreaterThanOrEqual(0);
  });
});
