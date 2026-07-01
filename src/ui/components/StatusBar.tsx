import type { PlayerState } from '../../engine/types';
import { getAsset } from '../../services/assets/assetLoader';
import { formatTime } from '../utils';

function StatusIcon({ assetId }: { assetId: string }) {
  const asset = getAsset(assetId);
  return <img className="status-icon" src={asset.src} alt="" aria-hidden="true" />;
}

export function StatusBar({ player }: { player: PlayerState }) {
  return (
    <div className="status-bar" aria-label="玩家状态">
      <span className="status-chip">
        <StatusIcon assetId="ui_icon_hp" />
        HP <strong>{player.hp}/{player.maxHp}</strong>
      </span>
      <span className="status-chip">
        <StatusIcon assetId="ui_icon_sanity" />
        SAN <strong>{player.sanity}/{player.maxSanity}</strong>
      </span>
      <span className="status-chip">
        <StatusIcon assetId="ui_icon_pollution" />
        污染 <strong>{player.pollution}/{player.pollutionLimit}</strong>
      </span>
      <span className="status-chip">
        <StatusIcon assetId="ui_icon_access_fragment" />
        碎片 <strong>{player.fragments}/4</strong>
      </span>
      <span className="status-chip">
        时间 <strong>{formatTime(player.timeLeftSeconds)}</strong>
      </span>
      <span className="status-chip">
        能量 <strong>{player.energy}</strong>
      </span>
    </div>
  );
}
