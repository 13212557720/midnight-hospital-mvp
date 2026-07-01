import type { EventNode } from '../../engine/types';
import { TagBadge } from './TagBadge';

interface StoryPanelProps {
  node: EventNode;
  storyText?: string;
  loading?: boolean;
  source?: 'llm' | 'offline';
}

export function StoryPanel({ node, storyText, loading = false, source }: StoryPanelProps) {
  const sourceLabel = source === 'llm' ? 'AI 主神记录' : 'AI 未连接 / 离线剧情';

  return (
    <div className="panel panel-pad stack">
      <div>
        <h2 className="story-title">{node.title}</h2>
        <div className="tag-row">
          {node.recommendedTags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      </div>
      <div className="story-source">
        {loading ? '主神终端生成中' : sourceLabel}
      </div>
      <p className="story-text">{loading ? '主神终端正在重组本段记录……' : storyText ?? node.storyText}</p>
    </div>
  );
}
