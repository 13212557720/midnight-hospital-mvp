import { useEffect, useMemo, useState } from 'react';
import { careersById, eventsById, midnightHospitalInstance } from '../../content/packs/midnight-hospital';
import { cardsById } from '../../content/packs/midnight-hospital/cards';
import { OUTCOME_LABELS, TAG_LABELS, type EventNode, type GameState, type ResolutionResult } from '../../engine/types';
import { getAsset } from '../../services/assets/assetLoader';
import type { StoryOutput } from '../../services/story/StoryProvider';
import { getNodeStory, getResolutionStory } from '../../services/story/providerRegistry';
import { formatDelta } from '../utils';

type StoryStatus = 'idle' | 'loading' | 'ready';

interface StoryTextState {
  text: string;
  moodTags: string[];
  status: StoryStatus;
  source?: StoryOutput['source'];
}

const STORY_FORBIDDEN_FACTS = [
  '不要改变生命、理智、污染、门禁碎片、剩余时间或胜负结果。',
  '不要新增系统未提供的关键线索、隐藏规则、道具或通关条件。',
  '不要写出获得门禁碎片、受到伤害、污染增加等结果，除非系统硬事实已提供。',
];

function toStoryState(output: StoryOutput, fallbackText: string): StoryTextState {
  return {
    text: output.text || fallbackText,
    moodTags: output.moodTags,
    status: 'ready',
    source: output.source,
  };
}

function visitedNodeTitles(state: GameState): string[] {
  return state.run.visitedNodeIds.map((nodeId) => eventsById[nodeId]?.title ?? nodeId);
}

function summarizeLastResolution(state: GameState): string | undefined {
  const result = state.run.lastResolution;
  if (!result) {
    return undefined;
  }
  const node = eventsById[result.nodeId];
  const action = node.actions.find((candidate) => candidate.id === result.actionId);
  const card = cardsById[result.cardId];
  return `${node.title}：行动「${action?.label ?? result.actionId}」，卡牌「${card.name}」，结果 ${OUTCOME_LABELS[result.outcome]}，判定 ${result.checkValue} vs ${result.difficulty}，结算 ${formatDelta(result.delta).join('，')}`;
}

export function useNodeStoryText(state: GameState, node: EventNode, actionLabels: string[]) {
  const fallbackText = node.storyText;
  const [story, setStory] = useState<StoryTextState>({
    text: fallbackText,
    moodTags: [],
    status: 'idle',
  });

  const input = useMemo(
    () => {
      const imageAlt = getAsset(node.imageAssetId).alt;
      const handCards = state.player.hand.map((cardInstance) => {
        const card = cardsById[cardInstance.cardId];
        return {
          name: card.name,
          basePower: card.basePower,
          cost: card.cost,
          tags: card.tags,
        };
      });
      const handFact = handCards
        .map((card) => `${card.name}(基础${card.basePower}/耗能${card.cost}/标签${card.tags.map((tag) => TAG_LABELS[tag]).join('+') || '无'})`)
        .join('；');
      const flagsFact = Object.entries(state.run.flags)
        .filter(([, value]) => value !== false && value !== undefined && value !== null)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join('；');
      const lastResolutionSummary = summarizeLastResolution(state);

      return {
        instanceTitle: midnightHospitalInstance.title,
        nodeTitle: node.title,
        playerCareerName: careersById[state.player.careerId].name,
        playerState: {
          hp: state.player.hp,
          sanity: state.player.sanity,
          pollution: state.player.pollution,
          fragments: state.player.fragments,
          timeLeftSeconds: state.player.timeLeftSeconds,
        },
        knownFlags: state.run.flags,
        recommendedTags: node.recommendedTags,
        actionLabels,
        visitedNodeTitles: visitedNodeTitles(state),
        imageAlt,
        handCards,
        lastResolutionSummary,
        hardFacts: [
          node.storyText,
          `场景图像语义：${imageAlt}`,
          `已访问节点：${visitedNodeTitles(state).join(' -> ') || '无'}`,
          `当前手牌：${handFact || '无'}`,
          `关键标记：${flagsFact || '无'}`,
          lastResolutionSummary ? `上一轮判定：${lastResolutionSummary}` : '上一轮判定：无',
        ],
        forbiddenFacts: STORY_FORBIDDEN_FACTS,
        maxChineseChars: 220,
      };
    },
    [
      actionLabels,
      node.imageAssetId,
      node.recommendedTags,
      node.storyText,
      node.title,
      state.player.careerId,
      state.player.fragments,
      state.player.hand,
      state.player.hp,
      state.player.pollution,
      state.player.sanity,
      state.player.timeLeftSeconds,
      state.run.lastResolution,
      state.run.flags,
      state.run.visitedNodeIds,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    setStory({ text: fallbackText, moodTags: [], status: 'loading' });
    getNodeStory(input).then((output) => {
      if (!cancelled) {
        setStory(toStoryState(output, fallbackText));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fallbackText, input]);

  return story;
}

export function useResolutionStoryText(result: ResolutionResult | undefined) {
  const fallbackText = result ? `${eventsById[result.nodeId].title}：${result.narrativeKey}` : '';
  const [story, setStory] = useState<StoryTextState>({
    text: fallbackText,
    moodTags: [],
    status: 'idle',
  });

  useEffect(() => {
    let cancelled = false;
    if (!result) {
      setStory({ text: '', moodTags: [], status: 'idle' });
      return () => {
        cancelled = true;
      };
    }

    const node = eventsById[result.nodeId];
    const action = node.actions.find((candidate) => candidate.id === result.actionId);
    const card = cardsById[result.cardId];
    const imageAlt = getAsset(node.imageAssetId).alt;
    const input = {
      instanceTitle: midnightHospitalInstance.title,
      nodeTitle: node.title,
      outcome: result.outcome,
      narrativeKey: result.narrativeKey,
      actionLabel: action?.label ?? result.actionId,
      cardName: card.name,
      checkValue: result.checkValue,
      difficulty: result.difficulty,
      stateDeltaLines: formatDelta(result.delta),
      imageAlt,
      visitedNodeTitles: [node.title],
      hardFacts: [
        `行动：${action?.label ?? result.actionId}`,
        `卡牌：${card.name}`,
        `判定：${result.checkValue} vs ${result.difficulty}`,
        `系统结算：${formatDelta(result.delta).join('；')}`,
        `场景图像语义：${imageAlt}`,
      ],
      forbiddenFacts: STORY_FORBIDDEN_FACTS,
      maxChineseChars: 120,
    };

    setStory({ text: fallbackText, moodTags: [], status: 'loading' });
    getResolutionStory(input).then((output) => {
      if (!cancelled) {
        setStory(toStoryState(output, fallbackText));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fallbackText, result]);

  return story;
}
