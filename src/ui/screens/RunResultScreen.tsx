import { endingAssetByResult } from '../../content/packs/midnight-hospital';
import { useGameStore } from '../../app/gameStore';
import { ResultSummary } from '../components/ResultSummary';
import { SceneImage } from '../components/SceneImage';
import { GameShell } from '../layout/GameShell';

function getEndingAssetId(resultStatus: string, failureReason?: string): string {
  if (resultStatus === 'PERFECT_WIN') return endingAssetByResult.PERFECT_WIN;
  if (resultStatus === 'WIN') return endingAssetByResult.WIN;
  if (failureReason === 'MISSING_ONE_FRAGMENT') return endingAssetByResult.MISSING_ONE_FRAGMENT;
  if (failureReason === 'POLLUTION_OVERLOAD') return endingAssetByResult.POLLUTION_OVERLOAD;
  if (failureReason === 'DEATH') return endingAssetByResult.DEATH;
  return endingAssetByResult.DEFAULT_LOSE;
}

export function RunResultScreen() {
  const { state, restartCurrentRun, backToCareerSelect } = useGameStore();
  const result = state.run.result;

  if (!result) {
    return null;
  }

  return (
    <GameShell hideStatus assistantRuntime={{ screenNote: result.title }}>
      <div className="scene-wrap">
        <SceneImage assetId={getEndingAssetId(result.status, result.failureReason)} />
      </div>
      <section className="screen screen-grid">
        <ResultSummary result={result} />
        <aside className="panel panel-pad stack">
          {state.run.lastResolution ? (
            <div>
              <h3 className="section-title">最终判定记录</h3>
              <div className="result-grid">
                <div className="result-row">
                  <span>判定值</span>
                  <strong>
                    {state.run.lastResolution.checkValue} vs {state.run.lastResolution.difficulty}
                  </strong>
                </div>
                <div className="result-row">
                  <span>使用卡牌</span>
                  <strong>{state.run.lastResolution.cardId}</strong>
                </div>
              </div>
            </div>
          ) : null}
          <div className="button-row">
            <button className="primary-button" type="button" onClick={restartCurrentRun}>
              再来一局
            </button>
            <button className="secondary-button" type="button" onClick={backToCareerSelect}>
              更换职业
            </button>
          </div>
        </aside>
      </section>
    </GameShell>
  );
}
