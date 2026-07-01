import { useGameStore } from '../../app/gameStore';
import { careersById, midnightHospitalInstance } from '../../content/packs/midnight-hospital';
import { SceneImage } from '../components/SceneImage';
import { GameShell } from '../layout/GameShell';

export function InstanceIntroScreen() {
  const { state, enterCurrentInstance, backToCareerSelect } = useGameStore();
  const career = careersById[state.player.careerId];

  return (
    <GameShell>
      <div className="scene-wrap">
        <SceneImage assetId={midnightHospitalInstance.coverAssetId} />
      </div>
      <section className="screen screen-grid">
        <div className="panel panel-pad stack">
          <div>
            <h2 className="story-title">{midnightHospitalInstance.title}</h2>
            <p className="muted">{midnightHospitalInstance.subtitle}</p>
          </div>
          <p className="story-text">
            主神终端打开 B-17 副本记录。午夜后的病院只接受编号 1073 的试炼者进入，六段门禁碎片散落在挂号大厅、护士站、住院部、手术室、停尸间和电梯井。
          </p>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={enterCurrentInstance}>
              进入副本
            </button>
            <button className="secondary-button" type="button" onClick={backToCareerSelect}>
              更换职业
            </button>
          </div>
        </div>
        <aside className="panel panel-pad stack">
          <h3 className="section-title">当前职业</h3>
          <SceneImage assetId={career.assetId} />
          <h4 className="card-title">{career.name}</h4>
          <p className="fine-print">{career.passive}</p>
        </aside>
      </section>
    </GameShell>
  );
}
