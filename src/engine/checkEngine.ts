import { cardsById, careersById } from '../content/packs/midnight-hospital';
import type {
  CardDefinition,
  CareerDefinition,
  CheckBreakdown,
  CheckOutcome,
  EventAction,
  EventNode,
  PlayerState,
  ResolveOptions,
} from './types';
import { weightedPerturbation } from './rng';

function intersects<T>(left: T[], right: T[]): boolean {
  return left.some((item) => right.includes(item));
}

function calculateTagBonus(card: CardDefinition, node: EventNode, action: EventAction): number {
  const targetTags = [...new Set([...node.recommendedTags, ...action.preferredTags])];
  return intersects(card.tags, targetTags) ? 2 : 0;
}

function calculateCareerBonus(career: CareerDefinition, node: EventNode, action: EventAction): number {
  const targetTags = [...new Set([...node.recommendedTags, ...action.preferredTags])];
  const strength = intersects(career.strengths, targetTags) ? 1 : 0;
  const weakness = intersects(career.weaknesses, targetTags) ? -1 : 0;
  return strength + weakness;
}

function calculateMemoryBonus(player: PlayerState, node: EventNode, action: EventAction): number {
  let bonus = 0;
  const memoryIds = new Set(player.memoryCards.map((card) => card.id));
  if (memoryIds.has('memory_red_nurse_station') && node.id === 'mh_node_02_nurse_station' && action.preferredTags.includes('insight')) {
    bonus += 1;
  }
  if (memoryIds.has('memory_rooftop_red_light') && node.isFinal) {
    bonus += 1;
  }
  if (memoryIds.has('memory_reversed_clock') && node.minigameId === 'operating_room_anomaly') {
    bonus += 1;
  }
  return bonus;
}

export function outcomeFromCheck(checkValue: number, difficulty: number): CheckOutcome {
  if (checkValue >= difficulty + 2) {
    return 'CRITICAL_SUCCESS';
  }
  if (checkValue >= difficulty) {
    return 'SUCCESS';
  }
  if (checkValue === difficulty - 1) {
    return 'MIXED';
  }
  return 'FAILURE';
}

export function calculateCheck(
  player: PlayerState,
  node: EventNode,
  action: EventAction,
  cardInstanceId: string,
  rngState: number,
  options: ResolveOptions = {},
): { outcome: CheckOutcome; breakdown: CheckBreakdown; rngState: number } {
  const cardInstance = player.hand.find((card) => card.instanceId === cardInstanceId);
  if (!cardInstance) {
    throw new Error(`Card instance not found in hand: ${cardInstanceId}`);
  }

  const card = cardsById[cardInstance.cardId];
  const career = careersById[player.careerId];
  const perturbation =
    options.forcedPerturbation !== undefined
      ? { value: options.forcedPerturbation, state: rngState }
      : weightedPerturbation(rngState);
  const memoryBonus = calculateMemoryBonus(player, node, action);
  const ritualBoost = options.useRitualBoost && player.careerId === 'ritualist' ? 2 : 0;
  const minigameBonus = options.minigameBonus ?? 0;
  const breakdown: CheckBreakdown = {
    cardBase: card.basePower,
    tagBonus: calculateTagBonus(card, node, action),
    careerBonus: calculateCareerBonus(career, node, action),
    actionModifier: action.modifier ?? 0,
    memoryBonus,
    minigameBonus,
    ritualBoost,
    randomPerturbation: perturbation.value,
    total: 0,
  };

  breakdown.total =
    breakdown.cardBase +
    breakdown.tagBonus +
    breakdown.careerBonus +
    breakdown.actionModifier +
    breakdown.memoryBonus +
    breakdown.minigameBonus +
    breakdown.ritualBoost +
    breakdown.randomPerturbation;

  return {
    outcome: outcomeFromCheck(breakdown.total, node.difficulty),
    breakdown,
    rngState: perturbation.state,
  };
}
