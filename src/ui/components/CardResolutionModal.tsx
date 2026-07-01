import { cardsById } from '../../content/packs/midnight-hospital';
import { OUTCOME_LABELS, type ResolutionResult } from '../../engine/types';
import { formatDelta } from '../utils';

interface CardResolutionModalProps {
  result: ResolutionResult;
  narrativeText?: string;
  narrativeLoading?: boolean;
  onContinue: () => void;
}

export function CardResolutionModal({ result, narrativeText, narrativeLoading = false, onContinue }: CardResolutionModalProps) {
  const card = cardsById[result.cardId];
  const breakdown = result.breakdown;

  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <h2 className="story-title">卡牌判定</h2>
          <p className="muted">
            {card.name} / {OUTCOME_LABELS[result.outcome]}
          </p>
        </header>
        <div className="modal-body stack">
          <div className="breakdown-grid">
            <div className="breakdown-row">
              <span>基础值</span>
              <strong>{breakdown.cardBase}</strong>
            </div>
            <div className="breakdown-row">
              <span>标签匹配</span>
              <strong>{breakdown.tagBonus >= 0 ? `+${breakdown.tagBonus}` : breakdown.tagBonus}</strong>
            </div>
            <div className="breakdown-row">
              <span>职业加成</span>
              <strong>{breakdown.careerBonus >= 0 ? `+${breakdown.careerBonus}` : breakdown.careerBonus}</strong>
            </div>
            <div className="breakdown-row">
              <span>行动修正</span>
              <strong>{breakdown.actionModifier >= 0 ? `+${breakdown.actionModifier}` : breakdown.actionModifier}</strong>
            </div>
            <div className="breakdown-row">
              <span>记忆 / 小游戏 / 祭仪</span>
              <strong>+{breakdown.memoryBonus + breakdown.minigameBonus + breakdown.ritualBoost}</strong>
            </div>
            <div className="breakdown-row">
              <span>随机扰动</span>
              <strong>{breakdown.randomPerturbation >= 0 ? `+${breakdown.randomPerturbation}` : breakdown.randomPerturbation}</strong>
            </div>
            <div className="breakdown-row">
              <span>最终判定</span>
              <strong>
                {result.checkValue} vs {result.difficulty}
              </strong>
            </div>
          </div>
          <div className="panel panel-pad">
            <h3 className="section-title">主神记录</h3>
            <p className="muted">{narrativeLoading ? '主神终端正在写入判定记录……' : narrativeText}</p>
          </div>
          <div className="panel panel-pad">
            <h3 className="section-title">状态变化</h3>
            <div className="result-grid">
              {formatDelta(result.delta).map((line) => (
                <div className="result-row" key={line}>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
          {result.nearMiss ? <p className="fine-print">主神终端标记：本次判定接近成功阈值。</p> : null}
        </div>
        <footer className="modal-footer">
          <button className="primary-button" type="button" onClick={onContinue}>
            继续
          </button>
        </footer>
      </section>
    </div>
  );
}
