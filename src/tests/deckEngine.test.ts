import { describe, expect, it } from 'vitest';
import { createDeck, drawCards } from '../engine/deckEngine';
import type { PlayerState } from '../engine/types';

describe('deckEngine', () => {
  it('reshuffles discard pile when draw pile is empty', () => {
    const deck = createDeck(['quick_search', 'brace_yourself'], 'deck-test');
    const player: PlayerState = {
      careerId: 'investigator',
      hp: 9,
      maxHp: 9,
      sanity: 10,
      maxSanity: 10,
      pollution: 0,
      pollutionLimit: 6,
      fragments: 0,
      timeLeftSeconds: 300,
      energy: 3,
      deck,
      drawPile: [],
      hand: [],
      discardPile: deck,
      memoryCards: [],
    };

    const result = drawCards(player, 2, 123);
    expect(result.player.hand).toHaveLength(2);
    expect(result.player.discardPile).toHaveLength(0);
  });
});
