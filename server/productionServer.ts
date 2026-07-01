import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { handleStoryApiRequest } from './storyApi.js';

const projectRoot = process.cwd();
const distDir = resolve(projectRoot, 'dist');
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '0.0.0.0';

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
};

function loadEnvFiles() {
  const protectedKeys = new Set(Object.keys(process.env));
  const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local'];

  for (const envFile of envFiles) {
    const filePath = resolve(projectRoot, envFile);
    if (!existsSync(filePath)) {
      continue;
    }

    for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) {
        continue;
      }
      const [, key, rawValue] = match;
      if (protectedKeys.has(key)) {
        continue;
      }
      process.env[key] = unquoteEnvValue(rawValue);
    }
  }
}

function unquoteEnvValue(rawValue: string): string {
  const trimmed = rawValue.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function safeStaticPath(pathname: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }

  const normalizedPath = decoded === '/' ? '/index.html' : decoded;
  const resolvedPath = resolve(distDir, `.${normalizedPath}`);
  const distPrefix = distDir.endsWith(sep) ? distDir : `${distDir}${sep}`;
  if (resolvedPath !== distDir && !resolvedPath.startsWith(distPrefix)) {
    return undefined;
  }
  return resolvedPath;
}

async function resolveFileToServe(pathname: string): Promise<string | undefined> {
  const candidate = safeStaticPath(pathname);
  if (!candidate) {
    return undefined;
  }

  try {
    const fileStat = await stat(candidate);
    if (fileStat.isFile()) {
      return candidate;
    }
  } catch {
    // Fall through to SPA fallback.
  }

  if (!extname(pathname)) {
    return resolve(distDir, 'index.html');
  }

  return undefined;
}

async function serveStatic(pathname: string, method: string, res: ServerResponse) {
  if (method !== 'GET' && method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const filePath = await resolveFileToServe(pathname);
  if (!filePath) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  const extension = extname(filePath);
  const contentType = mimeTypes[extension] ?? 'application/octet-stream';
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', filePath.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');

  if (method === 'HEAD') {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
}

loadEnvFiles();

if (!existsSync(resolve(distDir, 'index.html'))) {
  console.error('Production build not found. Run `npm run build` before `npm start`.');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname === '/healthz') {
    sendJson(res, 200, {
      ok: true,
      dist: true,
      storyProvider: {
        provider: 'deepseek',
        configured: Boolean(process.env.DEEPSEEK_API_KEY),
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      },
    });
    return;
  }

  try {
    const handledByApi = await handleStoryApiRequest(req, res, {
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      allowedOrigin: process.env.STORY_API_ALLOWED_ORIGIN,
    });
    if (handledByApi) {
      return;
    }
    await serveStatic(url.pathname, req.method ?? 'GET', res);
  } catch (error) {
    if (!res.headersSent) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'Server error' });
      return;
    }
    res.end();
  }
});

server.listen(port, host, () => {
  console.info(`Midnight Hospital production server listening on http://${host}:${port}`);
  console.info(`DeepSeek configured: ${Boolean(process.env.DEEPSEEK_API_KEY)}; model: ${process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'}`);
});
