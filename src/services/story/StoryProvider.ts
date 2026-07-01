import type { CheckOutcome, GameTag } from '../../engine/types';

export interface StoryInput {
  instanceTitle: string;
  nodeTitle: string;
  playerCareerName: string;
  playerState: {
    hp: number;
    sanity: number;
    pollution: number;
    fragments: number;
    timeLeftSeconds: number;
  };
  knownFlags: Record<string, boolean | number | string>;
  recommendedTags: GameTag[];
  actionLabels: string[];
  visitedNodeTitles?: string[];
  imageAlt?: string;
  handCards?: Array<{
    name: string;
    basePower: number;
    cost: number;
    tags: GameTag[];
  }>;
  lastResolutionSummary?: string;
  hardFacts: string[];
  forbiddenFacts: string[];
  maxChineseChars: number;
}

export interface ResolutionStoryInput {
  instanceTitle: string;
  nodeTitle: string;
  outcome: CheckOutcome;
  narrativeKey: string;
  actionLabel: string;
  cardName: string;
  checkValue: number;
  difficulty: number;
  stateDeltaLines: string[];
  playerState?: {
    hp: number;
    sanity: number;
    pollution: number;
    fragments: number;
    timeLeftSeconds: number;
  };
  imageAlt?: string;
  visitedNodeTitles?: string[];
  hardFacts: string[];
  forbiddenFacts: string[];
  maxChineseChars: number;
}

export interface StoryOutput {
  text: string;
  moodTags: string[];
  source?: 'llm' | 'offline';
}

export interface StoryProvider {
  getNodeStory(input: StoryInput): Promise<StoryOutput>;
  getResolutionText(input: ResolutionStoryInput): Promise<StoryOutput>;
}
