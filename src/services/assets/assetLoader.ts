import { assetManifest } from '../../content/packs/midnight-hospital';
import type { AssetManifestItem } from '../../engine/types';

function withPublicBase(src: string): string {
  if (!src || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }

  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${src.replace(/^\/+/, '')}`;
}

export function getAsset(assetId: string): AssetManifestItem {
  const asset =
    assetManifest[assetId] ?? {
      type: 'scene',
      src: '',
      alt: assetId,
    };

  return {
    ...asset,
    src: withPublicBase(asset.src),
  };
}
