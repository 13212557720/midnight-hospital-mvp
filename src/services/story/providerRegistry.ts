import { LlmStoryProvider } from './LlmStoryProvider';
import { StaticStoryProvider } from './StaticStoryProvider';
import type { ResolutionStoryInput, StoryInput, StoryOutput } from './StoryProvider';

const staticProvider = new StaticStoryProvider();
const llmProvider = new LlmStoryProvider();

async function withStaticFallback<TInput>(
  input: TInput,
  llmCall: (input: TInput) => Promise<StoryOutput>,
  staticCall: (input: TInput) => Promise<StoryOutput>,
): Promise<StoryOutput> {
  try {
    const output = await llmCall(input);
    if (output.text.trim()) {
      return output;
    }
  } catch {
    // Static story remains the deterministic fallback for offline play and tests.
  }
  return staticCall(input);
}

export function getNodeStory(input: StoryInput): Promise<StoryOutput> {
  return withStaticFallback(
    input,
    (value) => llmProvider.getNodeStory(value),
    (value) => staticProvider.getNodeStory(value),
  );
}

export function getResolutionStory(input: ResolutionStoryInput): Promise<StoryOutput> {
  return withStaticFallback(
    input,
    (value) => llmProvider.getResolutionText(value),
    (value) => staticProvider.getResolutionText(value),
  );
}
