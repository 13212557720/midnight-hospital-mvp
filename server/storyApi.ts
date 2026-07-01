import type { IncomingMessage, ServerResponse } from 'node:http';

export interface StoryProxyRequest {
  type: 'node' | 'resolution' | 'assistant';
  payload: unknown;
}

export interface StoryApiConfig {
  apiKey?: string;
  model: string;
  baseUrl?: string;
  requestTimeoutMs?: number;
  allowedOrigin?: string;
}

interface DeepSeekChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: unknown;
}

interface DeepSeekStreamChunk {
  choices?: Array<{ delta?: { content?: string } }>;
  error?: unknown;
}

interface HttpError extends Error {
  statusCode?: number;
}

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const MAX_REQUEST_BODY_BYTES = 256 * 1024;

function getRequestPath(req: IncomingMessage): string {
  return new URL(req.url ?? '/', 'http://localhost').pathname;
}

function createHttpError(message: string, statusCode: number): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

function readJsonBody(req: IncomingMessage): Promise<StoryProxyRequest> {
  return new Promise((resolve, reject) => {
    let body = '';
    let receivedBytes = 0;
    let tooLarge = false;

    req.on('data', (chunk: Buffer) => {
      if (tooLarge) {
        return;
      }
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_REQUEST_BODY_BYTES) {
        tooLarge = true;
        reject(createHttpError('Request body is too large', 413));
        return;
      }
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      if (tooLarge) {
        return;
      }
      try {
        resolve(JSON.parse(body || '{}') as StoryProxyRequest);
      } catch {
        reject(createHttpError('Request body must be valid JSON', 400));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function createAbortController(timeoutMs: number): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    controller,
    clear: () => clearTimeout(timeout),
  };
}

function normalizeConfig(config: StoryApiConfig): Required<StoryApiConfig> {
  return {
    apiKey: config.apiKey ?? '',
    model: config.model || 'deepseek-v4-flash',
    baseUrl: config.baseUrl || DEFAULT_BASE_URL,
    requestTimeoutMs: config.requestTimeoutMs ?? 45_000,
    allowedOrigin: config.allowedOrigin ?? '',
  };
}

function setCorsHeaders(req: IncomingMessage, res: ServerResponse, allowedOrigin: string) {
  if (!allowedOrigin) {
    return;
  }

  const requestOrigin = req.headers.origin;
  const origins = allowedOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const matchedOrigin = origins.includes('*') ? '*' : origins.find((origin) => origin === requestOrigin);
  if (!matchedOrigin) {
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', matchedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function extractJsonObject(content: string): { text: string; moodTags: string[] } {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const objectText = cleaned.startsWith('{') ? cleaned : cleaned.slice(start, end + 1);
  const parsed = JSON.parse(objectText) as Partial<{ text: string; moodTags: string[] }>;
  return {
    text: String(parsed.text ?? '').slice(0, 900),
    moodTags: Array.isArray(parsed.moodTags) ? parsed.moodTags.map(String).slice(0, 4) : [],
  };
}

function createStoryPrompt(type: StoryProxyRequest['type'], payload: unknown) {
  const rules = [
    type === 'assistant'
      ? '你是中文互动小说游戏《主神日志：午夜病院》里的主神终端助手。'
      : '你是中文互动小说游戏《主神日志：午夜病院》的剧情文案生成器。',
    '只写恐怖悬疑氛围、动作、声音、气味和局部对白。',
    '禁止改变生命、理智、污染、门禁碎片、剩余时间、胜负结果。',
    '禁止新增系统未提供的关键线索、隐藏规则、道具或通关条件。',
    '只能输出 JSON，格式为 {"text":"...","moodTags":["..."]}。',
  ].join('\n');

  const userTask =
    type === 'node'
      ? '根据输入硬事实写 120-220 字节点剧情，结尾自然引出玩家做选择。'
      : type === 'resolution'
        ? '根据输入硬事实写 60-120 字判定结果氛围文本，不要改写系统数值结算。'
        : '回答玩家问题。可以建议怎么选、解释可能后果、复述当前剧情，但必须只基于输入里的行动、手牌、状态和规则事实。不要替玩家执行选择。';

  return [
    { role: 'system', content: rules },
    { role: 'user', content: `${userTask}\n输入 JSON：\n${JSON.stringify(payload)}` },
  ];
}

function createAssistantStreamPrompt(payload: unknown) {
  return [
    {
      role: 'system',
      content: [
        '你是中文互动小说游戏《主神日志：午夜病院》里的主神终端助手。',
        '你的核心职责是和玩家对话：解释当前局势、推演可见选择的可能后果、给出半透明建议、补足恐怖悬疑氛围。',
        '只能基于输入 JSON 中提供的当前节点、可见行动、手牌、玩家状态、上一轮判定和历史对话回答。',
        '禁止新增系统未提供的关键线索、隐藏规则、道具、NPC 承诺或通关条件。',
        '禁止改变或声称已经改变生命、理智、污染、门禁碎片、剩余时间或胜负结果。',
        '可以推荐现有行动和现有手牌，但不要直接暴露完整公式、随机数或绝对最优解。',
        '如果信息不足，要明确说“主神终端无法从当前记录确认”。',
        '输出中文，120-260 字，允许分短段，不要输出 JSON。',
      ].join('\n'),
    },
    { role: 'user', content: `玩家问题和当前游戏硬事实：\n${JSON.stringify(payload)}` },
  ];
}

function writeSse(res: ServerResponse, event: string, payload: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function sendStoryStatus(res: ServerResponse, apiKey: string | undefined, model: string) {
  sendJson(res, 200, {
    configured: Boolean(apiKey),
    provider: 'deepseek',
    model,
  });
}

function parseSseBuffer(buffer: string): { events: string[]; rest: string } {
  const events = buffer.split('\n\n');
  return {
    events: events.slice(0, -1),
    rest: events.at(-1) ?? '',
  };
}

function dataLinesFromSseEvent(eventText: string): string[] {
  return eventText
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim());
}

async function readUpstreamJsonOrText(response: Response): Promise<DeepSeekChatResponse> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as DeepSeekChatResponse;
  }
  return { error: await response.text() };
}

async function streamAssistantResponse(config: Required<StoryApiConfig>, request: StoryProxyRequest, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  writeSse(res, 'meta', { provider: 'deepseek', model: config.model });

  const timeout = createAbortController(config.requestTimeoutMs);
  try {
    const upstream = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: timeout.controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages: createAssistantStreamPrompt(request.payload),
        max_tokens: 640,
        temperature: 0.75,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const error = await upstream.text();
      writeSse(res, 'error', { error: error || 'DeepSeek stream failed', status: upstream.status });
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseBuffer(buffer);
      buffer = parsed.rest;

      for (const eventText of parsed.events) {
        for (const dataLine of dataLinesFromSseEvent(eventText)) {
          if (dataLine === '[DONE]') {
            writeSse(res, 'done', { done: true });
            res.end();
            return;
          }

          try {
            const chunk = JSON.parse(dataLine) as DeepSeekStreamChunk;
            const delta = chunk.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              writeSse(res, 'delta', { delta });
            }
          } catch {
            // Ignore malformed upstream chunks and keep the stream alive.
          }
        }
      }
    }

    writeSse(res, 'done', { done: true });
    res.end();
  } finally {
    timeout.clear();
  }
}

async function handleAssistantStream(req: IncomingMessage, res: ServerResponse, config: Required<StoryApiConfig>) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }
  if (!config.apiKey) {
    sendJson(res, 501, { error: 'DEEPSEEK_API_KEY is not configured' });
    return;
  }

  try {
    const request = await readJsonBody(req);
    await streamAssistantResponse(config, request, res);
  } catch (error) {
    if (!res.headersSent) {
      const statusCode = (error as HttpError).statusCode ?? 500;
      sendJson(res, statusCode, { error: error instanceof Error ? error.message : 'Assistant stream failed' });
      return;
    }
    writeSse(res, 'error', { error: error instanceof Error ? error.message : 'Assistant stream failed' });
    res.end();
  }
}

async function handleStoryJson(req: IncomingMessage, res: ServerResponse, config: Required<StoryApiConfig>) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }
  if (!config.apiKey) {
    sendJson(res, 501, { error: 'DEEPSEEK_API_KEY is not configured' });
    return;
  }

  try {
    const request = await readJsonBody(req);
    const timeout = createAbortController(config.requestTimeoutMs);
    try {
      const upstream = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: timeout.controller.signal,
        body: JSON.stringify({
          model: config.model,
          messages: createStoryPrompt(request.type, request.payload),
          max_tokens: request.type === 'resolution' ? 256 : 512,
          temperature: 0.7,
          stream: false,
          response_format: { type: 'json_object' },
        }),
      });

      const data = await readUpstreamJsonOrText(upstream);

      if (!upstream.ok) {
        sendJson(res, upstream.status, { error: data.error ?? 'DeepSeek request failed' });
        return;
      }

      const content = data.choices?.[0]?.message?.content ?? '';
      try {
        sendJson(res, 200, extractJsonObject(content));
      } catch {
        sendJson(res, 502, { error: 'DeepSeek response was not valid story JSON' });
      }
    } finally {
      timeout.clear();
    }
  } catch (error) {
    const statusCode = (error as HttpError).statusCode ?? 500;
    sendJson(res, statusCode, { error: error instanceof Error ? error.message : 'Story proxy failed' });
  }
}

export async function handleStoryApiRequest(req: IncomingMessage, res: ServerResponse, config: StoryApiConfig): Promise<boolean> {
  const path = getRequestPath(req);
  const normalizedConfig = normalizeConfig(config);

  if (path === '/api/story/status' || path === '/api/story/assistant-stream' || path === '/api/story') {
    setCorsHeaders(req, res, normalizedConfig.allowedOrigin);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return true;
    }
  }

  if (path === '/api/story/status') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return true;
    }
    sendStoryStatus(res, normalizedConfig.apiKey, normalizedConfig.model);
    return true;
  }

  if (path === '/api/story/assistant-stream') {
    await handleAssistantStream(req, res, normalizedConfig);
    return true;
  }

  if (path === '/api/story') {
    await handleStoryJson(req, res, normalizedConfig);
    return true;
  }

  return false;
}

export function createStoryApiMiddleware(config: StoryApiConfig) {
  return (req: IncomingMessage, res: ServerResponse, next?: () => void) => {
    handleStoryApiRequest(req, res, config)
      .then((handled) => {
        if (!handled) {
          next?.();
        }
      })
      .catch((error) => {
        if (res.headersSent) {
          res.end();
          return;
        }
        const statusCode = (error as HttpError).statusCode ?? 500;
        sendJson(res, statusCode, { error: error instanceof Error ? error.message : 'Story API failed' });
      });
  };
}
