import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { createStoryApiMiddleware, type StoryApiConfig } from './server/storyApi';

function deepseekStoryProxy(config: StoryApiConfig): Plugin {
  const middleware = createStoryApiMiddleware(config);

  return {
    name: 'deepseek-story-proxy',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

function resolveBasePath(): string {
  if (process.env.VITE_BASE_PATH) {
    return process.env.VITE_BASE_PATH;
  }

  const repository = process.env.GITHUB_REPOSITORY?.split('/').at(1);
  if (!repository || repository.endsWith('.github.io')) {
    return '/';
  }
  return `/${repository}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: resolveBasePath(),
    plugins: [
      react(),
      deepseekStoryProxy({
        apiKey: env.DEEPSEEK_API_KEY,
        model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      }),
    ],
    test: {
      globals: true,
      environment: 'node',
    },
  };
});
