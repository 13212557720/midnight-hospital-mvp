import { DIFFICULTY_CONFIG } from '../config/difficulty';
import type { CardId, CardInstance, PlayerState } from './types';
import { randomInt } from './rng';

export function createDeck(cardIds: CardId[], seed: string): CardInstance[] {
  return cardIds.map((cardId, index) => ({
    cardId,
    instanceId: `${seed}_${cardId}_${index}`,
  }));
}

export function shuffleCards(cards: CardInstance[], rngState: number): { cards: CardInstance[]; rngState: number } {
  const shuffled = [...cards];
  let state = rngState;
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const result = randomInt(state, i + 1);
    state = result.state;
    [shuffled[i], shuffled[result.value]] = [shuffled[result.value], shuffled[i]];
  }
  return { cards: shuffled, rngState: state };
}

export function drawCards(
  player: PlayerState,
  count: number,
  rngState: number,
): { player: PlayerState; rngState: number } {
  let state = rngState;
  let drawPile = [...player.drawPile];
  let discardPile = [...player.discardPile];
  const hand = [...player.hand];

  while (hand.length < count) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) {
        break;
      }
      const shuffled = shuffleCards(discardPile, state);
      drawPile = shuffled.cards;
      discardPile = [];
      state = shuffled.rngState;
    }

    const nextCard = drawPile.shift();
    if (!nextCard) {
      break;
    }
    hand.push(nextCard);
  }

  return {
    player: {
      ...player,
      drawPile,
      discardPile,
      hand,
    },
    rngState: state,
  };
}

export function discardHandAfterPlay(player: PlayerState, playedCardInstanceId: string): PlayerState {
  const playedCard = player.hand.find((card) => card.instanceId === playedCardInstanceId);
  const remainingHand = player.hand.filter((card) => card.instanceId !== playedCardInstanceId);
  return {
    ...player,
    hand: [],
    discardPile: [...player.discardPile, ...(playedCard ? [playedCard] : []), ...remainingHand],
  };
}

export function prepareHandForNode(
  player: PlayerState,
  rngState: number,
  handPenalty = 0,
): { player: PlayerState; rngState: number } {
  const handSize = Math.max(1, DIFFICULTY_CONFIG.handSize - handPenalty);
  const resetPlayer: PlayerState = {
    ...player,
    energy: DIFFICULTY_CONFIG.energyPerNode,
    hand: [],
  };
  return drawCards(resetPlayer, handSize, rngState);
}
