import { DIFFICULTY_CONFIG } from '../config/difficulty';
import { midnightHospitalMemoryCards } from '../content/packs/midnight-hospital';
import type { FailureReason, GameState, MemoryCard, PlayerState, RunResult, RunState } from './types';

export function calculateEscapeDoorProgress(player: PlayerState): number {
  const fragmentScore = Math.min(player.fragments / DIFFICULTY_CONFIG.requiredFragments, 1) * 70;
  const survivalScore = player.hp > 0 && player.sanity > 0 ? 10 : 0;
  const pollutionScore =
    player.pollution < DIFFICULTY_CONFIG.pollutionLimit ? 10 : Math.max(0, 10 - player.pollution);
  const timeScore = player.timeLeftSeconds > 0 ? 10 : 0;
  return Math.min(100, Math.round(fragmentScore + survivalScore + pollutionScore + timeScore));
}

export function getFailureReason(player: PlayerState, run: RunState, finalCheckFailed = false): FailureReason | undefined {
  if (run.phase === 'FINAL_ESCAPE' || finalCheckFailed) {
    if (player.fragments === DIFFICULTY_CONFIG.requiredFragments - 1) {
      return 'MISSING_ONE_FRAGMENT';
    }
    if (player.fragments < DIFFICULTY_CONFIG.requiredFragments) {
      return 'MISSING_FRAGMENTS';
    }
  }

  if (finalCheckFailed) return 'FINAL_CHECK_FAILED';
  if (player.pollution >= player.pollutionLimit) return 'POLLUTION_OVERLOAD';
  if (player.sanity <= 0) return 'SANITY_COLLAPSE';
  if (player.hp <= 0) return 'DEATH';
  if (player.timeLeftSeconds <= 0) return 'TIMEOUT';
  return undefined;
}

export function getImmediateFailureReason(player: PlayerState): FailureReason | undefined {
  if (player.pollution >= player.pollutionLimit) return 'POLLUTION_OVERLOAD';
  if (player.sanity <= 0) return 'SANITY_COLLAPSE';
  if (player.hp <= 0) return 'DEATH';
  if (player.timeLeftSeconds <= 0) return 'TIMEOUT';
  return undefined;
}

function pickMemoryReward(reason: FailureReason | undefined, run: RunState): MemoryCard | undefined {
  if (reason === 'MISSING_ONE_FRAGMENT' || reason === 'FINAL_CHECK_FAILED') {
    return midnightHospitalMemoryCards.find((card) => card.id === 'memory_rooftop_red_light');
  }
  if (reason === 'POLLUTION_OVERLOAD') {
    return midnightHospitalMemoryCards.find((card) => card.id === 'memory_017_cabinet');
  }
  if (run.resolvedNodeIds.includes('mh_node_04_operating_room')) {
    return midnightHospitalMemoryCards.find((card) => card.id === 'memory_reversed_clock');
  }
  return midnightHospitalMemoryCards.find((card) => card.id === 'memory_red_nurse_station');
}

function resultCopy(status: RunResult['status'], reason?: FailureReason): Pick<RunResult, 'title' | 'summary' | 'suggestion'> {
  if (status === 'PERFECT_WIN') {
    return {
      title: '完美通关：门禁完全解除',
      summary: '你在污染扩散前完成了编号闭环，升降梯门完整打开，院长的影子被留在天台风里。',
      suggestion: '记录已归档。下一次可以尝试更高风险职业。',
    };
  }
  if (status === 'WIN') {
    return {
      title: '通关：逃离午夜病院',
      summary: '升降梯门在红灯中打开，你带着未完全消散的噪声离开了 B-17 副本。',
      suggestion: '通关成立，但污染和时间仍有优化空间。',
    };
  }

  const copyByReason: Record<FailureReason, Pick<RunResult, 'title' | 'summary' | 'suggestion'>> = {
    MISSING_ONE_FRAGMENT: {
      title: '副本失败：门禁权限不足',
      summary: '你已经抵达天台，升降梯的门也打开了一条缝。但最后一枚门禁残片没有被激活。',
      suggestion: '距离逃生成功只差 1 枚门禁碎片。',
    },
    MISSING_FRAGMENTS: {
      title: '副本失败：门禁链路断裂',
      summary: '升降梯拒绝响应，散落的门禁碎片无法拼成完整编号。',
      suggestion: '优先选择匹配推荐标签的行动，提高碎片获取稳定性。',
    },
    FINAL_CHECK_FAILED: {
      title: '副本失败：最终判定失败',
      summary: '编号已经拼齐，但你在最后一秒读错了门禁灯的闪烁顺序。',
      suggestion: '最终逃生需要更高判定值，保留一张逃生或洞察卡。',
    },
    POLLUTION_OVERLOAD: {
      title: '副本失败：污染失控',
      summary: '黑色噪声覆盖了你的影子，主神终端把你标记为病院资产。',
      suggestion: '污染达到 5/6 时，优先选择低风险行动。',
    },
    SANITY_COLLAPSE: {
      title: '副本失败：理智崩溃',
      summary: '你还能听见升降梯，却再也无法判断哪一盏红灯是真实的。',
      suggestion: '防护与医疗标签能降低理智压力。',
    },
    DEATH: {
      title: '副本失败：生命体征归零',
      summary: '你的编号被重新挂回腕带，停尸间多了一只未关闭的冷柜。',
      suggestion: '高风险行动需要战斗或防护卡支撑。',
    },
    TIMEOUT: {
      title: '副本失败：倒计时归零',
      summary: '天台门禁灯熄灭，整座病院回到午夜开始前的静止状态。',
      suggestion: '谨慎行动更稳，但时间压力会在最终节点集中结算。',
    },
  };

  return copyByReason[reason ?? 'MISSING_FRAGMENTS'];
}

function createEscapeReadout(
  state: GameState,
  status: RunResult['status'],
  failureReason: FailureReason | undefined,
  rawProgress: number,
): RunResult['escapeReadout'] {
  const { player, run } = state;
  const fragmentLine = `门禁碎片：${player.fragments}/${DIFFICULTY_CONFIG.requiredFragments}`;
  const survivalLine = `生命 ${player.hp}/${player.maxHp}，理智 ${player.sanity}/${player.maxSanity}，污染 ${player.pollution}/${player.pollutionLimit}`;

  if (status === 'PERFECT_WIN') {
    return {
      status: 'open',
      label: '门禁完全解除',
      value: 100,
      reasonLines: [fragmentLine, '最终校验大成功，升降梯完整开启。'],
    };
  }

  if (status === 'WIN') {
    return {
      status: 'open',
      label: '门禁已开启',
      value: 100,
      reasonLines: [fragmentLine, '最终校验通过，可以逃离午夜病院。'],
    };
  }

  if (failureReason === 'FINAL_CHECK_FAILED') {
    const final = run.lastResolution;
    return {
      status: 'failed',
      label: '碎片完整，最终校验失败',
      value: 100,
      reasonLines: [
        fragmentLine,
        final ? `最终判定 ${final.checkValue} vs ${final.difficulty} 未通过。` : '最终判定未通过。',
        '失败原因不是进度不足，而是最后一次门禁读码没有通过。',
      ],
    };
  }

  if (failureReason === 'MISSING_ONE_FRAGMENT') {
    return {
      status: 'blocked',
      label: '缺少 1 枚门禁碎片',
      value: Math.round((player.fragments / DIFFICULTY_CONFIG.requiredFragments) * 100),
      reasonLines: [fragmentLine, '升降梯识别到编号链只差最后一段，但门禁不会接受不完整序列。'],
    };
  }

  if (failureReason === 'MISSING_FRAGMENTS') {
    return {
      status: 'blocked',
      label: '门禁链路断裂',
      value: Math.round((player.fragments / DIFFICULTY_CONFIG.requiredFragments) * 100),
      reasonLines: [fragmentLine, '碎片数量不足，无法进入最终门禁校验。'],
    };
  }

  if (failureReason === 'POLLUTION_OVERLOAD') {
    return {
      status: 'unstable',
      label: '污染覆盖门禁信号',
      value: Math.min(rawProgress, 90),
      reasonLines: [fragmentLine, survivalLine, '污染达到上限，主神终端判定角色已被病院接管。'],
    };
  }

  if (failureReason === 'SANITY_COLLAPSE') {
    return {
      status: 'failed',
      label: '理智崩溃，无法读码',
      value: Math.min(rawProgress, 90),
      reasonLines: [fragmentLine, survivalLine, '角色已无法判断门禁灯和编号顺序。'],
    };
  }

  if (failureReason === 'DEATH') {
    return {
      status: 'failed',
      label: '生命体征归零',
      value: Math.min(rawProgress, 90),
      reasonLines: [fragmentLine, survivalLine, '角色无法抵达升降梯完成校验。'],
    };
  }

  if (failureReason === 'TIMEOUT') {
    return {
      status: 'failed',
      label: '倒计时归零',
      value: Math.min(rawProgress, 90),
      reasonLines: [fragmentLine, `剩余时间：${player.timeLeftSeconds} 秒`, '午夜窗口关闭，门禁序列已重置。'],
    };
  }

  return {
    status: 'blocked',
    label: '门禁未开启',
    value: rawProgress,
    reasonLines: [fragmentLine, '主神终端未获得可通行结果。'],
  };
}

export function createRunResult(
  state: GameState,
  status: RunResult['status'],
  failureReason?: FailureReason,
): RunResult {
  const { player, run } = state;
  const copy = resultCopy(status, failureReason);
  const rawProgress = calculateEscapeDoorProgress(player);
  const escapeReadout = createEscapeReadout(state, status, failureReason, rawProgress);

  return {
    status,
    failureReason,
    fragments: player.fragments,
    requiredFragments: DIFFICULTY_CONFIG.requiredFragments,
    hp: player.hp,
    sanity: player.sanity,
    pollution: player.pollution,
    pollutionLimit: player.pollutionLimit,
    timeLeftSeconds: player.timeLeftSeconds,
    escapeDoorProgress: escapeReadout.value,
    escapeReadout,
    nodesCleared: run.resolvedNodeIds.length,
    memoryCardReward: status === 'LOSE' ? pickMemoryReward(failureReason, run) : undefined,
    ...copy,
  };
}

export function isPerfectWin(player: PlayerState, outcomeCritical: boolean): boolean {
  return (
    outcomeCritical &&
    player.fragments >= DIFFICULTY_CONFIG.perfectFragments &&
    player.hp >= 6 &&
    player.sanity >= 5 &&
    player.pollution <= 2
  );
}

export function isNearMiss(player: PlayerState, checkGap?: number): boolean {
  return (
    player.fragments === DIFFICULTY_CONFIG.requiredFragments - 1 ||
    player.pollution === player.pollutionLimit - 1 ||
    (player.hp > 0 && player.hp <= 2) ||
    (player.timeLeftSeconds > 0 && player.timeLeftSeconds < 20) ||
    checkGap === -1
  );
}
