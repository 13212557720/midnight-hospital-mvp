export type CareerId = 'investigator' | 'cleaner' | 'physician' | 'ritualist';

export type CardId =
  | 'quick_search'
  | 'brace_yourself'
  | 'improvised_tool'
  | 'run_through'
  | 'pollution_noise'
  | 'scene_reconstruction'
  | 'medical_record_questioning'
  | 'logic_loop'
  | 'calm_observation'
  | 'door_breaker'
  | 'guard_vitals'
  | 'forced_entry'
  | 'improvised_weapon'
  | 'first_aid_kit'
  | 'sedative'
  | 'autopsy'
  | 'hemostasis'
  | 'blood_mark'
  | 'reverse_prayer'
  | 'sealing_talisman'
  | 'speak_with_shadow';

export type GameTag =
  | 'combat'
  | 'insight'
  | 'social'
  | 'stealth'
  | 'medical'
  | 'ritual'
  | 'protection'
  | 'escape';

export const TAG_LABELS: Record<GameTag, string> = {
  combat: '战斗',
  insight: '洞察',
  social: '交涉',
  stealth: '潜行',
  medical: '医疗',
  ritual: '仪式',
  protection: '防护',
  escape: '逃生',
};

export type GamePhase =
  | 'CAREER_SELECT'
  | 'INSTANCE_INTRO'
  | 'NODE_STORY'
  | 'ACTION_SELECT'
  | 'CARD_SELECT'
  | 'RESOLUTION'
  | 'FINAL_ESCAPE'
  | 'RUN_RESULT';

export type CheckOutcome = 'CRITICAL_SUCCESS' | 'SUCCESS' | 'MIXED' | 'FAILURE';

export type FailureReason =
  | 'MISSING_ONE_FRAGMENT'
  | 'MISSING_FRAGMENTS'
  | 'FINAL_CHECK_FAILED'
  | 'POLLUTION_OVERLOAD'
  | 'SANITY_COLLAPSE'
  | 'DEATH'
  | 'TIMEOUT';

export interface StateDelta {
  hp?: number;
  sanity?: number;
  pollution?: number;
  fragments?: number;
  timeLeftSeconds?: number;
  addCardsToDiscard?: CardId[];
  addFlags?: Record<string, boolean | number | string>;
}

export interface CardEffect {
  type:
    | 'REDUCE_SANITY_LOSS'
    | 'REDUCE_HP_LOSS'
    | 'ON_SUCCESS_DELTA'
    | 'ON_FAILURE_DELTA'
    | 'ON_ANY_DELTA'
    | 'FAILURE_TO_MIXED'
    | 'SET_FLAG'
    | 'NEXT_HAND_PENALTY';
  amount?: number;
  delta?: StateDelta;
  flagKey?: string;
  flagValue?: boolean | number | string;
}

export interface CardDefinition {
  id: CardId;
  name: string;
  description: string;
  basePower: number;
  cost: number;
  tags: GameTag[];
  rarity: 'basic' | 'career' | 'rare' | 'curse';
  effects?: CardEffect[];
  assetId?: string;
}

export interface CardInstance {
  instanceId: string;
  cardId: CardId;
}

export interface MemoryCard {
  id: string;
  name: string;
  description: string;
  trigger: string;
  effect: CardEffect;
}

export interface CareerDefinition {
  id: CareerId;
  name: string;
  difficulty: string;
  maxHp: number;
  maxSanity: number;
  strengths: GameTag[];
  weaknesses: GameTag[];
  passive: string;
  startingDeck: CardId[];
  assetId: string;
}

export interface PlayerState {
  careerId: CareerId;
  hp: number;
  maxHp: number;
  sanity: number;
  maxSanity: number;
  pollution: number;
  pollutionLimit: number;
  fragments: number;
  timeLeftSeconds: number;
  energy: number;
  deck: CardInstance[];
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  memoryCards: MemoryCard[];
}

export interface EventAction {
  id: string;
  label: string;
  description: string;
  preferredTags: GameTag[];
  modifier?: number;
  timeCostSeconds: number;
  riskLevel: 'low' | 'medium' | 'high';
  onOutcome: Record<CheckOutcome, StateDelta>;
  isCatchUp?: boolean;
}

export interface EventNode {
  id: string;
  title: string;
  order: number;
  difficulty: number;
  imageAssetId: string;
  recommendedTags: GameTag[];
  storyText: string;
  actions: EventAction[];
  resultTextKeys: Record<CheckOutcome, string>;
  isFinal?: boolean;
  minigameId?: string;
}

export interface InstanceDefinition {
  id: string;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  coverAssetId: string;
  requiredFragments: number;
  perfectFragments: number;
  pollutionLimit: number;
  initialTimeSeconds: number;
  nodeIds: string[];
  finalNodeId: string;
  recommendedCareers: CareerId[];
}

export interface CheckBreakdown {
  cardBase: number;
  tagBonus: number;
  careerBonus: number;
  actionModifier: number;
  memoryBonus: number;
  minigameBonus: number;
  ritualBoost: number;
  randomPerturbation: -1 | 0 | 1;
  total: number;
}

export interface ResolutionResult {
  outcome: CheckOutcome;
  checkValue: number;
  difficulty: number;
  delta: StateDelta;
  narrativeKey: string;
  nearMiss?: boolean;
  actionId: string;
  cardId: CardId;
  cardInstanceId: string;
  nodeId: string;
  breakdown: CheckBreakdown;
}

export interface RunResult {
  status: 'WIN' | 'PERFECT_WIN' | 'LOSE';
  failureReason?: FailureReason;
  fragments: number;
  requiredFragments: number;
  hp: number;
  sanity: number;
  pollution: number;
  pollutionLimit: number;
  timeLeftSeconds: number;
  escapeDoorProgress: number;
  escapeReadout: {
    status: 'open' | 'blocked' | 'failed' | 'unstable';
    label: string;
    value: number;
    reasonLines: string[];
  };
  nodesCleared: number;
  memoryCardReward?: MemoryCard;
  title: string;
  summary: string;
  suggestion: string;
}

export interface RunState {
  runId: string;
  seed: string;
  instanceId: string;
  currentNodeIndex: number;
  phase: GamePhase;
  visitedNodeIds: string[];
  resolvedNodeIds: string[];
  flags: Record<string, boolean | number | string>;
  rngState: number;
  lastResolution?: ResolutionResult;
  result?: RunResult;
}

export interface GameState {
  player: PlayerState;
  run: RunState;
}

export interface AssetManifestItem {
  type: 'cover' | 'scene' | 'character' | 'monster' | 'card' | 'ending' | 'ui';
  src: string;
  alt: string;
}

export interface Hotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
}

export interface ResolveOptions {
  minigameBonus?: number;
  minigameHits?: number;
  useRitualBoost?: boolean;
  forcedPerturbation?: -1 | 0 | 1;
}

export const OUTCOME_LABELS: Record<CheckOutcome, string> = {
  CRITICAL_SUCCESS: '大成功',
  SUCCESS: '成功',
  MIXED: '险胜',
  FAILURE: '失败',
};
