import { useEffect, useState } from 'react';
import { getAsset } from '../../services/assets/assetLoader';

export function SceneImage({ assetId, className = '' }: { assetId: string; className?: string }) {
  const asset = getAsset(assetId);
  const [failed, setFailed] = useState(!asset.src);

  useEffect(() => {
    setFailed(!asset.src);
  }, [asset.src]);

  if (failed) {
    return (
      <div className={`scene-placeholder ${className}`}>
        <span>{asset.alt}</span>
      </div>
    );
  }

  return <img className={`scene-image ${className}`} src={asset.src} alt={asset.alt} onError={() => setFailed(true)} />;
}
