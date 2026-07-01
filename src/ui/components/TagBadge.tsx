import { TAG_LABELS, type GameTag } from '../../engine/types';

export function TagBadge({ tag }: { tag: GameTag }) {
  return <span className="tag-badge">{TAG_LABELS[tag]}</span>;
}
