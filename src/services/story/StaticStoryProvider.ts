import type { ResolutionStoryInput, StoryInput, StoryOutput, StoryProvider } from './StoryProvider';

const resolutionTextByKey: Record<string, string> = {
  registration_hall_critical: '你从空白号单背面的压痕里找到了第一段门禁编号，护士终于抬头，却已经来不及阻止你。',
  registration_hall_success: '挂号机吐出一枚裂开的门禁碎片，红灯短暂转暗。',
  registration_hall_mixed: '你拿到碎片时听见护士念出你的出生日期，脑中一阵发冷。',
  registration_hall_failure: '号单堆成一地，前台后的笔尖停下了。你没有拿到有效碎片。',
  nurse_station_critical: '值班日志里夹着下一段编号，你还看见了通往住院部的标签提示。',
  nurse_station_success: '病历柜深处藏着一枚门禁碎片，边缘还带着红灯余温。',
  nurse_station_mixed: '你拿到了碎片，但药柜里的瓶子同时停止碰撞，污染噪声钻入耳道。',
  nurse_station_failure: '护士站后的黑暗突然伸手，你被重重拖向柜角。',
  corridor_critical: '你利用编号骗过走廊尽头的人，甚至从 307 门缝里找到补给。',
  corridor_success: '腕带编号帮你蒙混过关，走廊恢复了正常长度。',
  corridor_mixed: '你冲过走廊，背后那个人转身时，你看见了自己的脸。',
  corridor_failure: '走廊尽头的病号服贴近过来，腕带冰冷地勒住你的手腕。',
  operating_room_critical: '三个异常点拼出手术室的真实出口，污染被无影灯短暂烧退。',
  operating_room_success: '手术记录里的空格连成门禁编号，出口在白布下方打开。',
  operating_room_mixed: '你拿到编号时，墙上的钟倒退了一整分钟，理智随秒针一起被削去。',
  operating_room_failure: '门外脚步停在你身后，白布下的空手术台开始呼吸。',
  morgue_critical: '017 号柜停止敲击，你从霜雾中听见天台门禁的额外节奏。',
  morgue_success: '冷柜锁芯弹出一枚碎片，霜雾里显出通往电梯井的方向。',
  morgue_mixed: '你带走碎片，柜内敲击声却改成了你的心跳频率。',
  morgue_failure: '017 号柜从内部撞开，停尸间的红灯变成一片污染噪声。',
  elevator_critical: '你抢在电梯坠落前攀上天台，腕带串被风吹散。',
  elevator_success: '电梯井尽头露出天台门缝，最后一枚碎片落入掌心。',
  elevator_mixed: '你爬出井道时被钢缆划伤，碎片在血和冷光里发亮。',
  elevator_failure: '电梯厢猛地下坠，黑暗从井底反冲上来。',
  final_critical: '门禁灯由红转白，升降梯完整打开。院长的影子在门外被切成静止的噪点。',
  final_success: '升降梯门勉强打开，你在红灯再次亮起前踏了进去。',
  final_mixed: '你逃进升降梯，但污染在门缝合拢前追上了你的影子。',
  final_failure: '编号顺序错了一位。升降梯门重新闭合，红灯照亮院长的影子。',
};

export class StaticStoryProvider implements StoryProvider {
  async getNodeStory(input: StoryInput): Promise<StoryOutput> {
    return {
      text: input.hardFacts[0] ?? '',
      moodTags: ['冷白灯', '红色门禁', '监控噪点'],
      source: 'offline',
    };
  }

  async getResolutionText(input: ResolutionStoryInput): Promise<StoryOutput> {
    return {
      text: resolutionTextByKey[input.narrativeKey] ?? `${input.nodeTitle}：${input.outcome}`,
      moodTags: ['判定', '门禁'],
      source: 'offline',
    };
  }
}
