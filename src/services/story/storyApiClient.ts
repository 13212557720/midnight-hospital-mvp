const storyApiBase = import.meta.env.VITE_STORY_API_BASE?.replace(/\/+$/, '') ?? '';

export const storyApiDisabled = import.meta.env.VITE_DISABLE_STORY_API === 'true';

export function storyApiUrl(path: string): string {
  return `${storyApiBase}${path.startsWith('/') ? path : `/${path}`}`;
}
