import { assetManifest, cardsById, careersById, eventsById } from '../../content/packs/midnight-hospital';
import { OUTCOME_LABELS, TAG_LABELS, type EventAction, type EventNode, type GameState } from '../../engine/types';
import { formatDelta, formatTime } from '../../ui/utils';
import { storyApiDisabled, storyApiUrl } from './storyApiClient';

export interface AssistantCardSummary {
  id: string;
  name: string;
  basePower: number;
  cost: number;
  tags: string[];
  description: string;
}

export interface AssistantActionSummary {
  id: string;
  label: string;
  description: string;
  riskLevel: EventAction['riskLevel'];
  preferredTags: string[];
  timeCostSeconds: number;
  modifier?: number;
  outcomes: Record<string, string[]>;
}

export interface AssistantRuntimeContext {
  selectedActionLabel?: string;
  minigameStatus?: string;
  cannotPlayReason?: string;
  screenNote?: string;
}

export interface AssistantContext {
  phase: string;
  nodeTitle: string;
  storyText: string;
  imageAlt: string;
  recommendedTags: string[];
  career: {
    name: string;
    passive: string;
    strengths: string[];
    weaknesses: string[];
  };
  player: {
    hp: number;
    maxHp: number;
    sanity: number;
    maxSanity: number;
    pollution: number;
    pollutionLimit: number;
    fragments: number;
    timeLeftSeconds: number;
    energy: number;
  };
  run: {
    visitedNodeTitles: string[];
    resolvedNodeCount: number;
    flags: Record<string, boolean | number | string>;
  };
  actions: AssistantActionSummary[];
  hand: AssistantCardSummary[];
  lastResolution?: {
    nodeTitle: string;
    actionLabel: string;
    cardName: string;
    outcome: string;
    checkValue: number;
    difficulty: number;
    stateDeltaLines: string[];
    nearMiss?: boolean;
  };
  result?: {
    title: string;
    status: string;
    failureReason?: string;
    diagnosis: string[];
  };
  runtime?: AssistantRuntimeContext;
}

export type AssistantMessageStatus = 'ready' | 'streaming' | 'error' | 'system';
export type AssistantSource = 'llm' | 'offline';

export interface AssistantMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  status?: AssistantMessageStatus;
  source?: AssistantSource;
  elapsedMs?: number;
}

export interface AssistantRequest {
  question: string;
  context: AssistantContext;
  history: AssistantMessage[];
}

export interface AssistantReply {
  text: string;
  source: AssistantSource;
  elapsedMs?: number;
}

interface StreamMeta {
  provider?: string;
  model?: string;
}

function flagSnapshot(flags: GameState['run']['flags']) {
  return Object.fromEntries(
    Object.entries(flags).filter(([, value]) => value !== false && value !== undefined && value !== null),
  ) as Record<string, boolean | number | string>;
}

function buildLastResolutionContext(state: GameState): AssistantContext['lastResolution'] {
  const result = state.run.lastResolution;
  if (!result) {
    return undefined;
  }
  const node = eventsById[result.nodeId];
  const action = node.actions.find((candidate) => candidate.id === result.actionId);
  const card = cardsById[result.cardId];
  return {
    nodeTitle: node.title,
    actionLabel: action?.label ?? result.actionId,
    cardName: card.name,
    outcome: OUTCOME_LABELS[result.outcome],
    checkValue: result.checkValue,
    difficulty: result.difficulty,
    stateDeltaLines: formatDelta(result.delta),
    nearMiss: result.nearMiss,
  };
}

export function buildAssistantContext(
  state: GameState,
  node: EventNode,
  actions: EventAction[],
  runtime: AssistantRuntimeContext = {},
): AssistantContext {
  const career = careersById[state.player.careerId];
  const imageAlt = assetManifest[node.imageAssetId]?.alt ?? node.title;

  return {
    phase: state.run.phase,
    nodeTitle: node.title,
    storyText: node.storyText,
    imageAlt,
    recommendedTags: node.recommendedTags.map((tag) => TAG_LABELS[tag]),
    career: {
      name: career.name,
      passive: career.passive,
      strengths: career.strengths.map((tag) => TAG_LABELS[tag]),
      weaknesses: career.weaknesses.map((tag) => TAG_LABELS[tag]),
    },
    player: {
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      sanity: state.player.sanity,
      maxSanity: state.player.maxSanity,
      pollution: state.player.pollution,
      pollutionLimit: state.player.pollutionLimit,
      fragments: state.player.fragments,
      timeLeftSeconds: state.player.timeLeftSeconds,
      energy: state.player.energy,
    },
    run: {
      visitedNodeTitles: state.run.visitedNodeIds.map((nodeId) => eventsById[nodeId]?.title ?? nodeId),
      resolvedNodeCount: state.run.resolvedNodeIds.length,
      flags: flagSnapshot(state.run.flags),
    },
    actions: actions.map((action) => ({
      id: action.id,
      label: action.label,
      description: action.description,
      riskLevel: action.riskLevel,
      preferredTags: action.preferredTags.map((tag) => TAG_LABELS[tag]),
      timeCostSeconds: action.timeCostSeconds,
      modifier: action.modifier,
      outcomes: Object.fromEntries(
        Object.entries(action.onOutcome).map(([outcome, delta]) => [OUTCOME_LABELS[outcome as keyof typeof OUTCOME_LABELS], formatDelta(delta)]),
      ),
    })),
    hand: state.player.hand.map((cardInstance) => {
      const card = cardsById[cardInstance.cardId];
      return {
        id: card.id,
        name: card.name,
        basePower: card.basePower,
        cost: card.cost,
        tags: card.tags.map((tag) => TAG_LABELS[tag]),
        description: card.description,
      };
    }),
    lastResolution: buildLastResolutionContext(state),
    result: state.run.result
      ? {
          title: state.run.result.title,
          status: state.run.result.status,
          failureReason: state.run.result.failureReason,
          diagnosis: state.run.result.escapeReadout.reasonLines,
        }
      : undefined,
    runtime,
  };
}

function parseSseEvent(eventText: string): { event: string; data: string } {
  const lines = eventText.split('\n');
  const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() ?? 'message';
  const data = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n');
  return { event, data };
}

function parseStreamBuffer(buffer: string): { events: string[]; rest: string } {
  const chunks = buffer.split('\n\n');
  return {
    events: chunks.slice(0, -1),
    rest: chunks.at(-1) ?? '',
  };
}

export async function streamStoryAssistant(
  request: AssistantRequest,
  onDelta: (delta: string) => void,
  onMeta?: (meta: StreamMeta) => void,
): Promise<AssistantReply> {
  if (storyApiDisabled) {
    throw new Error('Assistant API is disabled for this build.');
  }

  const startedAt = performance.now();
  const response = await fetch(storyApiUrl('/api/story/assistant-stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'assistant', payload: request }),
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(errorText || `Assistant provider failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseStreamBuffer(buffer);
    buffer = parsed.rest;

    for (const eventText of parsed.events) {
      const event = parseSseEvent(eventText);
      if (!event.data) {
        continue;
      }
      const data = JSON.parse(event.data) as { delta?: string; error?: string; model?: string; provider?: string };
      if (event.event === 'error') {
        throw new Error(String(data.error ?? 'Assistant stream failed'));
      }
      if (event.event === 'meta') {
        onMeta?.({ provider: data.provider, model: data.model });
      }
      if (event.event === 'delta' && data.delta) {
        text += data.delta;
        onDelta(data.delta);
      }
    }
  }

  return {
    text,
    source: 'llm',
    elapsedMs: Math.round(performance.now() - startedAt),
  };
}

export async function askStoryAssistant(request: AssistantRequest): Promise<AssistantReply> {
  if (storyApiDisabled) {
    return {
      text: createOfflineUnavailableReply(request.context),
      source: 'offline',
    };
  }

  try {
    const response = await fetch(storyApiUrl('/api/story'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'assistant', payload: request }),
    });
    if (!response.ok) {
      throw new Error(`Assistant provider failed: ${response.status}`);
    }
    const data = (await response.json()) as Partial<{ text: string }>;
    if (data.text?.trim()) {
      return { text: data.text, source: 'llm' };
    }
  } catch {
    // Keep the game playable, but do not present deterministic fallback as AI.
  }

  return {
    text: createOfflineUnavailableReply(request.context),
    source: 'offline',
  };
}

export function createOfflineUnavailableReply(context: AssistantContext): string {
  const reason = context.runtime?.cannotPlayReason ? `当前无法出牌：${context.runtime.cannotPlayReason}` : undefined;
  return [
    'AI 大模型未连接，主神助手不能生成真实对话或策略推演。',
    `当前记录：${context.nodeTitle}，碎片 ${context.player.fragments}/4，污染 ${context.player.pollution}/${context.player.pollutionLimit}，剩余 ${formatTime(context.player.timeLeftSeconds)}。`,
    reason,
    '配置 DEEPSEEK_API_KEY 并重启本地服务后，这里会改为实时 AI 回复。',
  ]
    .filter(Boolean)
    .join(' ');
}

export function createSituationRecord(context: AssistantContext): string {
  if (context.result) {
    return [`主神局势记录：${context.result.title}`, ...context.result.diagnosis].join('\n');
  }

  if (context.phase === 'RESOLUTION' && context.lastResolution) {
    const resolution = context.lastResolution;
    return [
      `主神局势记录：${resolution.nodeTitle} 判定完成。`,
      `行动「${resolution.actionLabel}」，卡牌「${resolution.cardName}」，结果 ${resolution.outcome}。`,
      `判定 ${resolution.checkValue} vs ${resolution.difficulty}；系统结算：${resolution.stateDeltaLines.join('，')}。`,
    ].join('\n');
  }

  const actionLine = context.actions.length ? context.actions.map((action) => action.label).join(' / ') : '暂无可见行动';
  const handLine = context.hand.length ? context.hand.map((card) => `${card.name}(耗能${card.cost})`).join(' / ') : '无手牌';
  const blocker = context.runtime?.cannotPlayReason ? `\n限制：${context.runtime.cannotPlayReason}` : '';
  const minigame = context.runtime?.minigameStatus ? `\n异常识别：${context.runtime.minigameStatus}` : '';

  return [
    `主神局势记录：进入「${context.nodeTitle}」。`,
    `资源：生命 ${context.player.hp}/${context.player.maxHp}，理智 ${context.player.sanity}/${context.player.maxSanity}，污染 ${context.player.pollution}/${context.player.pollutionLimit}，碎片 ${context.player.fragments}/4，时间 ${formatTime(context.player.timeLeftSeconds)}。`,
    `可见行动：${actionLine}。`,
    `当前手牌：${handLine}。${blocker}${minigame}`,
  ].join('\n');
}
