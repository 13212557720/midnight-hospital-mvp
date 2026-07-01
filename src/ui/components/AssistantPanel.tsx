import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../app/gameStore';
import { getVisibleActions } from '../../engine/resolutionEngine';
import {
  buildAssistantContext,
  createOfflineUnavailableReply,
  createSituationRecord,
  streamStoryAssistant,
  type AssistantMessage,
  type AssistantRuntimeContext,
} from '../../services/story/assistantAdvisor';
import { getStoryProviderStatus, type StoryProviderStatus } from '../../services/story/storyStatus';

const quickQuestions = ['推荐路线', '推演后果', '讲讲现在剧情', '为什么不能出牌'];

function createMessageId() {
  return `assistant_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function trimMessages(messages: AssistantMessage[]) {
  return messages.slice(-36);
}

function updateMessage(messages: AssistantMessage[], id: string, updater: (message: AssistantMessage) => AssistantMessage) {
  return messages.map((message) => (message.id === id ? updater(message) : message));
}

function providerStatusText(status: StoryProviderStatus | null, loading: boolean, failed: boolean) {
  if (loading) {
    return 'AI 状态检测中';
  }
  if (failed) {
    return 'AI 状态请求失败';
  }
  if (status?.configured) {
    return `AI 已连接 · ${status.model}`;
  }
  return `AI 未配置 · ${status?.model ?? 'deepseek-v4-flash'}`;
}

function providerStatusClass(status: StoryProviderStatus | null, loading: boolean, failed: boolean) {
  if (loading) return 'checking';
  if (failed) return 'error';
  return status?.configured ? 'online' : 'offline';
}

function situationKey(phase: string, nodeId: string, lastResolutionKey?: string, resultKey?: string) {
  if (phase === 'RESOLUTION' && lastResolutionKey) return `resolution:${lastResolutionKey}`;
  if (phase === 'RUN_RESULT' && resultKey) return `result:${resultKey}`;
  if (phase === 'NODE_STORY' || phase === 'FINAL_ESCAPE') return `node:${phase}:${nodeId}`;
  return undefined;
}

function messageMeta(message: AssistantMessage) {
  if (message.role === 'user') {
    return undefined;
  }
  if (message.status === 'system') {
    return '主神局势记录';
  }
  if (message.status === 'streaming') {
    return 'AI 生成中';
  }
  if (message.status === 'error') {
    return '未连接 / 请求失败';
  }
  if (message.source === 'llm') {
    return message.elapsedMs ? `AI 回复 · ${message.elapsedMs}ms` : 'AI 回复';
  }
  return '离线提示';
}

export function AssistantPanel({ runtime = {} }: { runtime?: AssistantRuntimeContext }) {
  const { state, currentNode } = useGameStore();
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [providerStatus, setProviderStatus] = useState<StoryProviderStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusFailed, setStatusFailed] = useState(false);
  const lastSituationKey = useRef<string | undefined>(undefined);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: createMessageId(),
      role: 'assistant',
      status: 'system',
      source: 'offline',
      content: '主神终端等待连接检测。你可以问推荐路线、选择后果、当前剧情，或为什么不能出牌。',
    },
  ]);

  const actions = useMemo(() => getVisibleActions(currentNode, state), [currentNode, state]);
  const assistantContext = useMemo(() => buildAssistantContext(state, currentNode, actions, runtime), [actions, currentNode, runtime, state]);

  useEffect(() => {
    let cancelled = false;
    setStatusLoading(true);
    setStatusFailed(false);
    getStoryProviderStatus()
      .then((status) => {
        if (!cancelled) {
          setProviderStatus(status);
          setStatusFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatusFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStatusLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const resolution = state.run.lastResolution;
    const key = situationKey(
      state.run.phase,
      currentNode.id,
      resolution ? `${resolution.nodeId}:${resolution.actionId}:${resolution.cardInstanceId}:${resolution.outcome}:${resolution.checkValue}` : undefined,
      state.run.result ? `${state.run.runId}:${state.run.result.status}:${state.run.result.failureReason ?? 'none'}` : undefined,
    );

    if (!key || lastSituationKey.current === key) {
      return;
    }

    lastSituationKey.current = key;
    setMessages((prev) =>
      trimMessages([
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          status: 'system',
          source: 'offline',
          content: createSituationRecord(assistantContext),
        },
      ]),
    );
  }, [assistantContext, currentNode.id, state.run.lastResolution, state.run.phase, state.run.result, state.run.runId]);

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) {
      return;
    }

    const context = buildAssistantContext(state, currentNode, actions, runtime);
    const userMessage: AssistantMessage = {
      id: createMessageId(),
      role: 'user',
      status: 'ready',
      content: trimmed,
    };
    const nextMessages = trimMessages([...messages, userMessage]);
    setMessages(nextMessages);
    setInput('');

    if (!providerStatus?.configured) {
      setMessages((prev) =>
        trimMessages([
          ...prev,
          {
            id: createMessageId(),
            role: 'assistant',
            status: 'error',
            source: 'offline',
            content: createOfflineUnavailableReply(context),
          },
        ]),
      );
      return;
    }

    const assistantId = createMessageId();
    setBusy(true);
    setMessages((prev) =>
      trimMessages([
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          status: 'streaming',
          source: 'llm',
          content: '',
        },
      ]),
    );

    try {
      const reply = await streamStoryAssistant(
        {
          question: trimmed,
          context,
          history: nextMessages.slice(-10),
        },
        (delta) => {
          setMessages((prev) =>
            updateMessage(prev, assistantId, (message) => ({
              ...message,
              content: `${message.content}${delta}`,
            })),
          );
        },
        (meta) => {
          if (meta.model) {
            setProviderStatus({ configured: true, provider: 'deepseek', model: meta.model });
          }
        },
      );
      setMessages((prev) =>
        updateMessage(prev, assistantId, (message) => ({
          ...message,
          content: message.content || reply.text,
          status: 'ready',
          source: 'llm',
          elapsedMs: reply.elapsedMs,
        })),
      );
    } catch {
      setMessages((prev) =>
        updateMessage(prev, assistantId, (message) => ({
          ...message,
          status: 'error',
          source: 'offline',
          content: message.content || 'AI 请求失败，当前无法生成大模型回复。请检查 DEEPSEEK_API_KEY、网络或模型额度后重试。',
        })),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="assistant-fab" type="button" onClick={() => setOpen(true)}>
        主神助手
      </button>
    );
  }

  const statusText = providerStatusText(providerStatus, statusLoading, statusFailed);
  const statusClass = providerStatusClass(providerStatus, statusLoading, statusFailed);

  return (
    <aside className="assistant-panel" aria-label="主神助手">
      <header className="assistant-header">
        <div>
          <strong>主神助手</strong>
          <span className={`assistant-provider ${statusClass}`}>{statusText}</span>
        </div>
        <button className="assistant-close" type="button" onClick={() => setOpen(false)} aria-label="收起主神助手">
          ×
        </button>
      </header>
      <div className="assistant-log">
        {messages.map((message) => {
          const meta = messageMeta(message);
          return (
            <div key={message.id} className={`assistant-message ${message.role} ${message.status ?? 'ready'}`}>
              {meta ? <span className="assistant-message-meta">{meta}</span> : null}
              {message.content || (message.status === 'streaming' ? '主神终端正在生成回复……' : '')}
            </div>
          );
        })}
      </div>
      <div className="assistant-quick">
        {quickQuestions.map((question) => (
          <button key={question} type="button" onClick={() => sendQuestion(question)} disabled={busy}>
            {question}
          </button>
        ))}
      </div>
      <form
        className="assistant-form"
        onSubmit={(event) => {
          event.preventDefault();
          sendQuestion(input);
        }}
      >
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="问主神助手..." />
        <button className="primary-button" type="submit" disabled={busy || !input.trim()}>
          {busy ? '生成中' : '发送'}
        </button>
      </form>
    </aside>
  );
}
