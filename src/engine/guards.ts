import { DIFFICULTY_CONFIG } from '../config/difficulty';
import type { PlayerState, RunState, StateDelta } from './types';

export function mergeDelta(base: StateDelta, extra: StateDelta): StateDelta {
  return {
    hp: (base.hp ?? 0) + (extra.hp ?? 0),
    sanity: (base.sanity ?? 0) + (extra.sanity ?? 0),
    pollution: (base.pollution ?? 0) + (extra.pollution ?? 0),
    fragments: (base.fragments ?? 0) + (extra.fragments ?? 0),
    timeLeftSeconds: (base.timeLeftSeconds ?? 0) + (extra.timeLeftSeconds ?? 0),
    addCardsToDiscard: [...(base.addCardsToDiscard ?? []), ...(extra.addCardsToDiscard ?? [])],
    addFlags: { ...(base.addFlags ?? {}), ...(extra.addFlags ?? {}) },
  };
}

export function normalizeDelta(delta: StateDelta): StateDelta {
  const normalized: StateDelta = {};
  if (delta.hp) normalized.hp = delta.hp;
  if (delta.sanity) normalized.sanity = delta.sanity;
  if (delta.pollution) normalized.pollution = delta.pollution;
  if (delta.fragments) normalized.fragments = delta.fragments;
  if (delta.timeLeftSeconds) normalized.timeLeftSeconds = delta.timeLeftSeconds;
  if (delta.addCardsToDiscard?.length) normalized.addCardsToDiscard = delta.addCardsToDiscard;
  if (delta.addFlags && Object.keys(delta.addFlags).length > 0) normalized.addFlags = delta.addFlags;
  return normalized;
}

export function applyDeltaToPlayer(player: PlayerState, delta: StateDelta): PlayerState {
  return {
    ...player,
    hp: Math.min(player.maxHp, player.hp + (delta.hp ?? 0)),
    sanity: Math.min(player.maxSanity, player.sanity + (delta.sanity ?? 0)),
    pollution: Math.max(0, player.pollution + (delta.pollution ?? 0)),
    fragments: Math.max(0, player.fragments + (delta.fragments ?? 0)),
    timeLeftSeconds: player.timeLeftSeconds + (delta.timeLeftSeconds ?? 0),
  };
}

export function applyEarlyProtection(player: PlayerState, run: RunState): PlayerState {
  if (run.currentNodeIndex >= DIFFICULTY_CONFIG.earlyNoDeathNodeCount) {
    return player;
  }
  return {
    ...player,
    hp: Math.max(1, player.hp),
    sanity: Math.max(1, player.sanity),
    pollution: Math.min(player.pollutionLimit - 1, player.pollution),
  };
}

export function applyCareerDeathGuard(player: PlayerState, run: RunState): { player: PlayerState; flags: RunState['flags'] } {
  if (player.careerId !== 'cleaner' || player.hp > 0 || run.flags.cleaner_death_guard_used) {
    return { player, flags: run.flags };
  }

  return {
    player: { ...player, hp: 1 },
    flags: { ...run.flags, cleaner_death_guard_used: true },
  };
}

export function clampVisibleState(player: PlayerState): PlayerState {
  return {
    ...player,
    hp: Math.min(player.maxHp, player.hp),
    sanity: Math.min(player.maxSanity, player.sanity),
    pollution: Math.max(0, player.pollution),
    fragments: Math.max(0, player.fragments),
  };
}
