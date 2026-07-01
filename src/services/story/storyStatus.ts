import { storyApiDisabled, storyApiUrl } from './storyApiClient';

export interface StoryProviderStatus {
  configured: boolean;
  provider: 'deepseek';
  model: string;
}

export async function getStoryProviderStatus(): Promise<StoryProviderStatus> {
  if (storyApiDisabled) {
    return {
      configured: false,
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
    };
  }

  const response = await fetch(storyApiUrl('/api/story/status'));
  if (!response.ok) {
    throw new Error(`Story status failed: ${response.status}`);
  }
  const data = (await response.json()) as Partial<StoryProviderStatus>;
  return {
    configured: Boolean(data.configured),
    provider: 'deepseek',
    model: String(data.model ?? 'deepseek-v4-flash'),
  };
}
