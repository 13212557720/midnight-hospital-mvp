import type { MemoryCard } from '../../../engine/types';

export const midnightHospitalMemoryCards: MemoryCard[] = [
  {
    id: 'memory_red_nurse_station',
    name: '记忆：红灯护士站',
    description: '下次进入午夜病院时，节点 2 第一次洞察判定 +1。',
    trigger: '节点 2 洞察判定',
    effect: { type: 'SET_FLAG', flagKey: 'memory_red_nurse_station', flagValue: true },
  },
  {
    id: 'memory_reversed_clock',
    name: '记忆：倒走的钟',
    description: '手术室异常点识别获得的加成 +1。',
    trigger: '节点 4 异常点识别',
    effect: { type: 'SET_FLAG', flagKey: 'memory_reversed_clock', flagValue: true },
  },
  {
    id: 'memory_017_cabinet',
    name: '记忆：017 冷柜',
    description: '停尸间第一次失败时改为险胜，但污染 +1。',
    trigger: '节点 5 第一次失败',
    effect: { type: 'SET_FLAG', flagKey: 'memory_017_cabinet', flagValue: true },
  },
  {
    id: 'memory_rooftop_red_light',
    name: '记忆：红色门禁灯',
    description: '最终逃生判定 +1。',
    trigger: '最终逃生',
    effect: { type: 'SET_FLAG', flagKey: 'memory_rooftop_red_light', flagValue: true },
  },
];

export const memoryCardsById = Object.fromEntries(midnightHospitalMemoryCards.map((card) => [card.id, card])) as Record<
  string,
  MemoryCard
>;
