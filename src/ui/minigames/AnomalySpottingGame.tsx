import { useState } from 'react';
import type { MouseEvent } from 'react';
import { operatingRoomHotspots } from '../../content/packs/midnight-hospital';
import { SceneImage } from '../components/SceneImage';
import { trackTelemetry } from '../../services/telemetry/telemetry';

interface AnomalySpottingGameProps {
  imageAssetId: string;
  onComplete: (hits: number) => void;
}

export function AnomalySpottingGame({ imageAssetId, onComplete }: AnomalySpottingGameProps) {
  const [hits, setHits] = useState<string[]>([]);
  const [clicks, setClicks] = useState(0);
  const completed = clicks >= 3;

  function completeWith(nextHits: string[], nextClicks = 3) {
    setHits(nextHits);
    setClicks(nextClicks);
    trackTelemetry({ type: 'MINIGAME_COMPLETE', minigameId: 'operating_room_anomaly', score: nextHits.length });
    onComplete(nextHits.length);
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (completed) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const hotspot = operatingRoomHotspots.find((candidate) => {
      const dx = candidate.x - x;
      const dy = candidate.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= candidate.radius;
    });
    const nextHits = hotspot && !hits.includes(hotspot.id) ? [...hits, hotspot.id] : hits;
    const nextClicks = clicks + 1;
    setHits(nextHits);
    setClicks(nextClicks);
    if (nextClicks >= 3) {
      completeWith(nextHits, nextClicks);
    }
  }

  return (
    <div className="panel panel-pad stack">
      <h3 className="section-title">异常点识别</h3>
      <p className="action-hint">
        先点击图中 3 处可疑区域，完成后才能出牌。找不到也可以跳过，本节点判定加成为 +0。
      </p>
      <div className="hotspot-board" onClick={handleClick}>
        <SceneImage assetId={imageAssetId} />
        {operatingRoomHotspots
          .filter((hotspot) => hits.includes(hotspot.id))
          .map((hotspot) => (
            <span
              key={hotspot.id}
              className="hotspot-hit"
              style={{
                left: `${hotspot.x * 100}%`,
                top: `${hotspot.y * 100}%`,
                width: `${hotspot.radius * 200}%`,
                height: `${hotspot.radius * 200}%`,
              }}
            />
          ))}
      </div>
      <p className="fine-print">
        命中 {hits.length}/3，点击 {clicks}/3。异常方向：无影灯、腕带、倒走的钟。
      </p>
      <div className="button-row">
        <button className="secondary-button" type="button" disabled={completed} onClick={() => completeWith(hits)}>
          跳过识别，直接出牌
        </button>
      </div>
    </div>
  );
}
