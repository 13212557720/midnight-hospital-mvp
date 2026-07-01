import type { StateDelta } from '../engine/types';

export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const rest = Math.floor(safe % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${rest}`;
}

export function formatDelta(delta: StateDelta): string[] {
  const lines: string[] = [];
  if (delta.hp) lines.push(`生命 ${delta.hp > 0 ? '+' : ''}${delta.hp}`);
  if (delta.sanity) lines.push(`理智 ${delta.sanity > 0 ? '+' : ''}${delta.sanity}`);
  if (delta.pollution) lines.push(`污染 ${delta.pollution > 0 ? '+' : ''}${delta.pollution}`);
  if (delta.fragments) lines.push(`门禁碎片 ${delta.fragments > 0 ? '+' : ''}${delta.fragments}`);
  if (delta.timeLeftSeconds) lines.push(`时间 ${delta.timeLeftSeconds}`);
  if (delta.addCardsToDiscard?.length) lines.push(`弃牌堆加入 ${delta.addCardsToDiscard.length} 张牌`);
  return lines.length > 0 ? lines : ['状态未发生可见变化'];
}
