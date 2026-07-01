import type { CardInstance } from '../../engine/types';
import { cardsById } from '../../content/packs/midnight-hospital';
import { CardView } from './CardView';

interface CardHandProps {
  hand: CardInstance[];
  energy: number;
  disabled?: boolean;
  disabledReason?: string;
  onPlay: (cardInstanceId: string) => void;
}

export function CardHand({ hand, energy, disabled = false, disabledReason, onPlay }: CardHandProps) {
  return (
    <div className="panel panel-pad stack">
      <h3 className="section-title">手牌</h3>
      {disabled && disabledReason ? <p className="action-hint">{disabledReason}</p> : null}
      <div className="card-hand">
        {hand.map((card) => {
          const definition = cardsById[card.cardId];
          const cardDisabled = disabled || definition.cost > energy;
          return <CardView key={card.instanceId} card={card} disabled={cardDisabled} onClick={() => onPlay(card.instanceId)} />;
        })}
      </div>
      {hand.length === 0 ? <p className="fine-print">牌堆暂时没有可抽取的卡。</p> : null}
    </div>
  );
}
