import { useGameStore } from '../../app/gameStore';
import { midnightHospitalCareers, midnightHospitalInstance } from '../../content/packs/midnight-hospital';
import { GameShell } from '../layout/GameShell';
import { SceneImage } from '../components/SceneImage';
import { TagBadge } from '../components/TagBadge';

export function CareerSelectScreen() {
  const { startCareerRun, save } = useGameStore();

  return (
    <GameShell hideStatus>
      <div className="scene-wrap">
        <SceneImage assetId={midnightHospitalInstance.coverAssetId} />
      </div>
      <section className="screen stack">
        <div>
          <h2 className="story-title">选择试炼者职业</h2>
          <p className="muted">
            {midnightHospitalInstance.title} / {midnightHospitalInstance.subtitle}
          </p>
        </div>
        <div className="career-grid">
          {midnightHospitalCareers.map((career) => (
            <button key={career.id} className="career-card stack" type="button" onClick={() => startCareerRun(career.id)}>
              <SceneImage assetId={career.assetId} />
              <div>
                <h3 className="card-title">{career.name}</h3>
                <p className="muted">{career.difficulty}</p>
              </div>
              <div className="split">
                <span className="status-chip">HP {career.maxHp}</span>
                <span className="status-chip">SAN {career.maxSanity}</span>
              </div>
              <div className="tag-row">
                {career.strengths.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
              <p className="fine-print">{career.passive}</p>
            </button>
          ))}
        </div>
        <p className="fine-print">已解锁记忆卡：{save.unlockedMemoryCards.length}</p>
      </section>
    </GameShell>
  );
}
