import { DIFFICULTY_CONFIG } from '../config/difficulty';
import { careersById, midnightHospitalInstance } from '../content/packs/midnight-hospital';
import { createDeck, prepareHandForNode, shuffleCards } from './deckEngine';
import { hashSeed, makeRunSeed } from './rng';
import type { CareerId, GameState, PlayerState, RunState } from './types';

export function createEmptyGameState(): GameState {
  const career = careersById.investigator;
  const seed = 'career-select';
  const deck = createDeck(career.startingDeck, seed);
  return {
    player: {
      careerId: career.id,
      hp: career.maxHp,
      maxHp: career.maxHp,
      sanity: career.maxSanity,
      maxSanity: career.maxSanity,
      pollution: 0,
      pollutionLimit: DIFFICULTY_CONFIG.pollutionLimit,
      fragments: 0,
      timeLeftSeconds: DIFFICULTY_CONFIG.initialTimeSeconds,
      energy: DIFFICULTY_CONFIG.energyPerNode,
      deck,
      drawPile: deck,
      hand: [],
      discardPile: [],
      memoryCards: [],
    },
    run: {
      runId: seed,
      seed,
      instanceId: midnightHospitalInstance.id,
      currentNodeIndex: 0,
      phase: 'CAREER_SELECT',
      visitedNodeIds: [],
      resolvedNodeIds: [],
      flags: {},
      rngState: hashSeed(seed),
    },
  };
}

export function createNewRun(careerId: CareerId, seed = makeRunSeed()): GameState {
  const career = careersById[careerId];
  const deck = createDeck(career.startingDeck, seed);
  const initialRng = hashSeed(seed);
  const shuffled = shuffleCards(deck, initialRng);
  const basePlayer: PlayerState = {
    careerId,
    hp: career.maxHp,
    maxHp: career.maxHp,
    sanity: career.maxSanity,
    maxSanity: career.maxSanity,
    pollution: 0,
    pollutionLimit: DIFFICULTY_CONFIG.pollutionLimit,
    fragments: 0,
    timeLeftSeconds: DIFFICULTY_CONFIG.initialTimeSeconds,
    energy: DIFFICULTY_CONFIG.energyPerNode,
    deck,
    drawPile: shuffled.cards,
    hand: [],
    discardPile: [],
    memoryCards: [],
  };
  const handPrepared = prepareHandForNode(basePlayer, shuffled.rngState);
  const run: RunState = {
    runId: seed,
    seed,
    instanceId: midnightHospitalInstance.id,
    currentNodeIndex: 0,
    phase: 'INSTANCE_INTRO',
    visitedNodeIds: [],
    resolvedNodeIds: [],
    flags: {},
    rngState: handPrepared.rngState,
  };

  return {
    player: handPrepared.player,
    run,
  };
}
