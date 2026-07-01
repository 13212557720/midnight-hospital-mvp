import { cardsById } from '../../content/packs/midnight-hospital';
import type { CardInstance } from '../../engine/types';
import { getAsset } from '../../services/assets/assetLoader';
import { TagBadge } from './TagBadge';

interface CardViewProps {
  card: CardInstance;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function CardView({ card, disabled = false, selected = false, onClick }: CardViewProps) {
  const definition = cardsById[card.cardId];
  const cardAsset = getAsset(definition.assetId ?? `card_${definition.id}`);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`card-view ${selected ? 'selected' : ''}`}
      aria-label={definition.name}
    >
      <div className="card-art-wrap">
        {cardAsset.src ? <img className="card-art" src={cardAsset.src} alt="" aria-hidden="true" /> : <span>{definition.name}</span>}
      </div>
      <div className="card-meta">
        <span>{definition.rarity}</span>
        <span>费用 {definition.cost}</span>
      </div>
      <h4 className="card-title">{definition.name}</h4>
      <div className="card-meta">
        <strong>基础值 {definition.basePower}</strong>
      </div>
      <p className="muted">{definition.description}</p>
      <div className="tag-row">
        {definition.tags.length > 0 ? definition.tags.map((tag) => <TagBadge key={tag} tag={tag} />) : <span className="tag-badge">噪声</span>}
      </div>
    </button>
  );
}
