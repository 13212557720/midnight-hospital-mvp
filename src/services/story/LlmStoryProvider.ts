import type { ResolutionStoryInput, StoryInput, StoryOutput, StoryProvider } from './StoryProvider';
import { storyApiDisabled, storyApiUrl } from './storyApiClient';

export class LlmStoryProvider implements StoryProvider {
  async getNodeStory(input: StoryInput): Promise<StoryOutput> {
    return requestStory('node', input);
  }

  async getResolutionText(input: ResolutionStoryInput): Promise<StoryOutput> {
    return requestStory('resolution', input);
  }
}

async function requestStory(type: 'node' | 'resolution', payload: StoryInput | ResolutionStoryInput): Promise<StoryOutput> {
  if (storyApiDisabled) {
    throw new Error('Story provider API is disabled for this build.');
  }

  const response = await fetch(storyApiUrl('/api/story'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, payload }),
  });

  if (!response.ok) {
    throw new Error(`Story provider failed: ${response.status}`);
  }

  const data = (await response.json()) as Partial<StoryOutput>;
  return {
    text: String(data.text ?? ''),
    moodTags: Array.isArray(data.moodTags) ? data.moodTags.map(String) : [],
    source: 'llm',
  };
}
