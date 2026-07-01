import type { EventAction } from '../../engine/types';
import { TagBadge } from './TagBadge';

interface ActionButtonsProps {
  actions: EventAction[];
  selectedActionId?: string;
  onSelect: (actionId: string) => void;
}

const riskLabel: Record<EventAction['riskLevel'], string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export function ActionButtons({ actions, selectedActionId, onSelect }: ActionButtonsProps) {
  return (
    <div className="panel panel-pad stack">
      <h3 className="section-title">行动选择</h3>
      <div className="actions">
        {actions.map((action) => (
          <button
            key={action.id}
            className={`action-button ${selectedActionId === action.id ? 'selected' : ''}`}
            type="button"
            onClick={() => onSelect(action.id)}
          >
            <strong>{action.label}</strong>
            <p className="muted">{action.description}</p>
            <div className="tag-row">
              {action.preferredTags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
              <span className="tag-badge">{riskLabel[action.riskLevel]}</span>
              <span className="tag-badge">{action.timeCostSeconds} 秒</span>
              {action.modifier ? <span className="tag-badge">修正 {action.modifier}</span> : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
