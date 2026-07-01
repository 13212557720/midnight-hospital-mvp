# 《午夜病院》MVP 制作指导文件

> 项目类型：职业卡组型无限流短副本  
> MVP 目标：5 分钟左右完成一局，首局新手通关率约 30%，失败时给玩家“差一点就过”的感觉。  
> 推荐技术栈：React + TypeScript + Vite。若已有引擎或框架，可保留本文的模块划分、数据模型和玩法规则。

---

## 0. 给 Codex 的总目标

请先实现一个可玩的前端原型，不要一开始接入真实大模型和复杂后端。

第一版需要完成：

1. 职业选择。
2. 副本进入界面。
3. 6 个普通事件节点 + 1 个最终逃生节点。
4. 卡牌抽取、打牌、判定、奖励和惩罚。
5. 通关 / 失败 / 差一点反馈结算。
6. 模块化数据驱动，后续可以继续增加职业、卡牌、副本、事件、图片资产和 AI 剧情生成 Provider。

核心原则：

```text
系统负责规则、数值、胜负、状态变化。
AI 只负责剧情表达、氛围文本和局部对白。
任何生命、理智、污染、碎片、通关结果，都必须由游戏引擎计算，不能由 AI 文本直接决定。
```

---

## 1. MVP 产品定义

### 1.1 游戏名称

暂定名：

```text
主神日志：午夜病院
```

英文内部代号：

```text
Project Gate-1073 / Midnight Hospital
```

### 1.2 单局体验

玩家从 4 个职业中选择一个，进入《午夜病院》副本。每个事件节点展示一张场景图、一段剧情、2–3 个行动选择和当前手牌。玩家选择行动后打出一张卡，系统根据职业、卡牌、事件标签和难度计算结果。

一局由：

```text
职业选择 → 副本介绍 → 6 个普通事件 → 最终逃生 → 结算
```

组成。

### 1.3 时长控制

目标实际游玩时长：

```text
4.5–6 分钟
```

注意：MVP 不建议用真实倒计时强制玩家失败。建议使用“副本内逻辑倒计时”，每个节点根据行动消耗 35–50 秒。界面展示倒计时，但玩家阅读时不实时扣时间。

```text
初始副本时间：300 秒
普通节点消耗：35–45 秒
高风险行动消耗：25–35 秒
谨慎行动消耗：45–55 秒
最终逃生要求：剩余时间 > 0
```

这样既能营造 5 分钟紧迫感，也不会惩罚阅读速度慢的新手。

---

## 2. 核心通关条件和失败条件

### 2.1 通关条件

普通通关需要同时满足：

```text
门禁碎片 >= 4
生命 > 0
理智 > 0
污染 < 6
剩余时间 > 0
最终逃生判定成功
```

隐藏完美通关：

```text
门禁碎片 >= 6
生命 >= 6
理智 >= 5
污染 <= 2
最终逃生大成功
```

### 2.2 失败条件

失败条件：

```text
生命 <= 0
理智 <= 0
污染 >= 6
剩余时间 <= 0
最终节点时门禁碎片 < 4
最终逃生判定失败
```

### 2.3 失败类型

结算时按优先级展示失败类型。

```ts
export type FailureReason =
  | 'MISSING_ONE_FRAGMENT'   // 3/4，最重要的近胜反馈
  | 'MISSING_FRAGMENTS'      // 0–2/4
  | 'FINAL_CHECK_FAILED'     // 到门前但最终判定失败
  | 'POLLUTION_OVERLOAD'     // 污染 >= 6
  | 'SANITY_COLLAPSE'        // 理智 <= 0
  | 'DEATH'                  // 生命 <= 0
  | 'TIMEOUT';               // 时间归零
```

结算文案重点制造“就差一点”：

```text
门禁碎片：3/4
逃生门开启度：82%
污染值：5/6
距离逃生成功：只差 1 枚门禁碎片
```

---

## 3. 难度目标

### 3.1 新手首局目标

目标新手首局数据：

```text
通关率：28%–35%
近胜失败率：30%–40%
早期死亡率：< 10%
节点 5 或最终节点失败率：> 50% 的失败集中在这里
```

近胜失败包括：

```text
门禁碎片 = 3/4
污染 = 5/6
生命 = 1–2
最终逃生判定差 1 点
剩余时间 < 20 秒
```

### 3.2 节点成功率参考

MVP 的 6 个普通节点推荐难度曲线：

```text
节点 1：新手平均成功率 75%，教学节点
节点 2：新手平均成功率 60%
节点 3：新手平均成功率 55%
节点 4：新手平均成功率 50%
节点 5：新手平均成功率 50%
节点 6：新手平均成功率 45%
最终逃生：有资格进入最终逃生的玩家约 68% 成功
```

玩家需要 6 个普通节点中获得至少 4 枚门禁碎片，再通过最终判定。这个模型的目标结果：

```text
获得 >= 4 枚碎片概率：约 45%
最终逃生成功率：约 68%
最终通关率：约 30%
刚好 3 枚碎片概率：约 30%
```

### 3.3 难度调节旋钮

把以下参数集中到 `src/config/difficulty.ts`，便于调试：

```ts
export const DIFFICULTY_CONFIG = {
  targetWinRateMin: 0.28,
  targetWinRateMax: 0.35,
  initialHp: 10,
  initialSanity: 8,
  pollutionLimit: 6,
  initialTimeSeconds: 300,
  requiredFragments: 4,
  perfectFragments: 6,
  handSize: 3,
  energyPerNode: 3,
  nodeDifficulties: [4, 5, 5, 6, 6, 7],
  finalDifficulty: 7,
  earlyNoDeathNodeCount: 2,
  catchUpNodeIndex: 4,
};
```

### 3.4 早期保护

前两个节点不允许直接让玩家失败。若前两个节点结果会导致生命、理智归零或污染爆表，需要钳制：

```text
生命最低保留 1
理智最低保留 1
污染最高保留 5
```

### 3.5 追赶机制

如果玩家到节点 4 时门禁碎片 <= 1，额外出现一个高风险翻盘行动：

```text
行动：打开院长办公室的暗门
成功：门禁碎片 +2，理智 -1
险胜：门禁碎片 +1，污染 +1
失败：污染 +2，生命 -2
```

这个行动不是降低难度，而是制造“我还有机会”的感觉。

---

## 4. 核心规则

### 4.1 状态数值

玩家状态：

```ts
export interface PlayerState {
  careerId: CareerId;
  hp: number;
  maxHp: number;
  sanity: number;
  maxSanity: number;
  pollution: number;
  pollutionLimit: number;
  fragments: number;
  timeLeftSeconds: number;
  deck: CardInstance[];
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  memoryCards: MemoryCard[];
}
```

副本状态：

```ts
export interface RunState {
  runId: string;
  seed: string;
  instanceId: string;
  currentNodeIndex: number;
  phase: GamePhase;
  visitedNodeIds: string[];
  resolvedNodeIds: string[];
  flags: Record<string, boolean | number | string>;
  lastResolution?: ResolutionResult;
  result?: RunResult;
}
```

游戏阶段：

```ts
export type GamePhase =
  | 'CAREER_SELECT'
  | 'INSTANCE_INTRO'
  | 'NODE_STORY'
  | 'ACTION_SELECT'
  | 'CARD_SELECT'
  | 'RESOLUTION'
  | 'FINAL_ESCAPE'
  | 'RUN_RESULT';
```

### 4.2 标签系统

事件和卡牌都使用标签。标签用于计算加成，也用于 UI 提示。

```ts
export type GameTag =
  | 'combat'
  | 'insight'
  | 'social'
  | 'stealth'
  | 'medical'
  | 'ritual'
  | 'protection'
  | 'escape';
```

中文显示：

```ts
export const TAG_LABELS: Record<GameTag, string> = {
  combat: '战斗',
  insight: '洞察',
  social: '交涉',
  stealth: '潜行',
  medical: '医疗',
  ritual: '仪式',
  protection: '防护',
  escape: '逃生',
};
```

### 4.3 判定公式

```text
判定值 = 卡牌基础值 + 标签匹配加成 + 职业标签加成 + 行动修正 + 记忆卡修正 + 随机扰动
```

MVP 建议随机扰动很小，避免玩家觉得不可控：

```text
随机扰动：-1 / 0 / +1
权重：20% / 60% / 20%
```

标签匹配：

```text
卡牌标签命中事件推荐标签：+2
职业强项标签命中事件推荐标签：+1
职业弱项标签命中事件推荐标签：-1
```

判定结果：

```text
判定值 >= 难度 + 2：大成功
判定值 >= 难度：成功
判定值 = 难度 - 1：险胜
判定值 <= 难度 - 2：失败
```

TypeScript：

```ts
export type CheckOutcome = 'CRITICAL_SUCCESS' | 'SUCCESS' | 'MIXED' | 'FAILURE';

export interface ResolutionResult {
  outcome: CheckOutcome;
  checkValue: number;
  difficulty: number;
  delta: StateDelta;
  narrativeKey: string;
  nearMiss?: boolean;
}
```

### 4.4 状态变化

```ts
export interface StateDelta {
  hp?: number;
  sanity?: number;
  pollution?: number;
  fragments?: number;
  timeLeftSeconds?: number;
  addCardsToDiscard?: CardId[];
  addFlags?: Record<string, boolean | number | string>;
}
```

注意：所有 delta 都由引擎根据事件配置和判定结果生成。AI 文本不得直接写入状态。

---

## 5. 职业设计

MVP 先做 4 个职业。

### 5.1 调查员 Investigator

定位：新手推荐，搜证稳定。

```ts
{
  id: 'investigator',
  name: '调查员',
  difficulty: '新手推荐',
  maxHp: 9,
  maxSanity: 10,
  strengths: ['insight', 'social'],
  weaknesses: ['combat', 'ritual'],
  passive: '每局第一次洞察失败时，改为险胜。',
  startingDeck: [
    'scene_reconstruction',
    'scene_reconstruction',
    'medical_record_questioning',
    'logic_loop',
    'calm_observation',
    'quick_search',
    'quick_search',
    'brace_yourself',
    'improvised_tool',
    'pollution_noise'
  ]
}
```

### 5.2 清道夫 Cleaner

定位：战斗路线，容错高。

```ts
{
  id: 'cleaner',
  name: '清道夫',
  difficulty: '普通',
  maxHp: 12,
  maxSanity: 7,
  strengths: ['combat', 'protection'],
  weaknesses: ['insight', 'social'],
  passive: '每局第一次生命降到 0 时，保留 1 点生命。',
  startingDeck: [
    'door_breaker',
    'door_breaker',
    'guard_vitals',
    'forced_entry',
    'improvised_weapon',
    'improvised_weapon',
    'brace_yourself',
    'quick_search',
    'run_through',
    'pollution_noise'
  ]
}
```

### 5.3 医师 Physician

定位：稳健，高容错。

```ts
{
  id: 'physician',
  name: '医师',
  difficulty: '新手推荐',
  maxHp: 10,
  maxSanity: 9,
  strengths: ['medical', 'insight'],
  weaknesses: ['combat', 'stealth'],
  passive: '每两个节点后恢复 1 点生命。',
  startingDeck: [
    'first_aid_kit',
    'first_aid_kit',
    'sedative',
    'autopsy',
    'hemostasis',
    'medical_record_questioning',
    'calm_observation',
    'quick_search',
    'improvised_tool',
    'pollution_noise'
  ]
}
```

### 5.4 祭仪师 Ritualist

定位：高风险高收益。

```ts
{
  id: 'ritualist',
  name: '祭仪师',
  difficulty: '熟练玩家',
  maxHp: 8,
  maxSanity: 8,
  strengths: ['ritual', 'insight'],
  weaknesses: ['medical', 'combat'],
  passive: '每个节点可以选择污染 +1，使本次判定 +2。',
  startingDeck: [
    'blood_mark',
    'blood_mark',
    'reverse_prayer',
    'sealing_talisman',
    'speak_with_shadow',
    'calm_observation',
    'quick_search',
    'brace_yourself',
    'improvised_tool',
    'pollution_noise'
  ]
}
```

---

## 6. 卡牌设计

### 6.1 卡牌结构

```ts
export interface CardDefinition {
  id: CardId;
  name: string;
  description: string;
  basePower: number;
  cost: number;
  tags: GameTag[];
  rarity: 'basic' | 'career' | 'rare' | 'curse';
  effects?: CardEffect[];
  assetId?: string;
}
```

### 6.2 MVP 卡牌列表

#### 通用卡

```ts
[
  {
    id: 'quick_search',
    name: '快速搜查',
    basePower: 3,
    cost: 1,
    tags: ['insight'],
    description: '低成本洞察行动。'
  },
  {
    id: 'brace_yourself',
    name: '稳住呼吸',
    basePower: 2,
    cost: 1,
    tags: ['protection'],
    description: '本次失败时，少损失 1 点理智。'
  },
  {
    id: 'improvised_tool',
    name: '临时工具',
    basePower: 3,
    cost: 1,
    tags: ['stealth', 'escape'],
    description: '适合潜行或逃生。'
  },
  {
    id: 'run_through',
    name: '冲过去',
    basePower: 4,
    cost: 2,
    tags: ['escape', 'combat'],
    description: '高风险行动，失败时生命 -1。'
  },
  {
    id: 'pollution_noise',
    name: '污染噪声',
    basePower: 0,
    cost: 0,
    tags: [],
    rarity: 'curse',
    description: '废牌。抽到时本节点可用手牌变少。'
  }
]
```

#### 调查员卡

```ts
[
  {
    id: 'scene_reconstruction',
    name: '现场复盘',
    basePower: 4,
    cost: 2,
    tags: ['insight'],
    description: '成功时预览下一节点推荐标签。'
  },
  {
    id: 'medical_record_questioning',
    name: '病历追问',
    basePower: 3,
    cost: 1,
    tags: ['social', 'insight'],
    description: '成功时理智 +1。'
  },
  {
    id: 'logic_loop',
    name: '逻辑闭环',
    basePower: 5,
    cost: 3,
    tags: ['insight'],
    description: '高强度洞察卡。'
  },
  {
    id: 'calm_observation',
    name: '冷静观察',
    basePower: 2,
    cost: 1,
    tags: ['insight', 'protection'],
    description: '抵消一次小额理智损失。'
  }
]
```

#### 清道夫卡

```ts
[
  {
    id: 'door_breaker',
    name: '破门锤',
    basePower: 5,
    cost: 2,
    tags: ['combat'],
    description: '失败时生命 -1。'
  },
  {
    id: 'guard_vitals',
    name: '护住要害',
    basePower: 2,
    cost: 1,
    tags: ['protection'],
    description: '抵消 3 点生命伤害。'
  },
  {
    id: 'forced_entry',
    name: '强行突入',
    basePower: 5,
    cost: 2,
    tags: ['combat', 'escape'],
    description: '成功率高，但成功或失败都污染 +1。'
  },
  {
    id: 'improvised_weapon',
    name: '临时武器',
    basePower: 3,
    cost: 1,
    tags: ['combat'],
    description: '稳定战斗卡。'
  }
]
```

#### 医师卡

```ts
[
  {
    id: 'first_aid_kit',
    name: '急救包',
    basePower: 4,
    cost: 2,
    tags: ['medical'],
    description: '成功时生命 +2。'
  },
  {
    id: 'sedative',
    name: '镇定剂',
    basePower: 3,
    cost: 1,
    tags: ['medical', 'protection'],
    description: '理智 +2，但下一节点少抽 1 张牌。'
  },
  {
    id: 'autopsy',
    name: '尸检',
    basePower: 4,
    cost: 2,
    tags: ['medical', 'insight'],
    description: '成功时获得隐藏线索标记。'
  },
  {
    id: 'hemostasis',
    name: '止血',
    basePower: 2,
    cost: 1,
    tags: ['medical', 'protection'],
    description: '抵消一次流血或伤害惩罚。'
  }
]
```

#### 祭仪师卡

```ts
[
  {
    id: 'blood_mark',
    name: '血印',
    basePower: 5,
    cost: 2,
    tags: ['ritual'],
    description: '使用后污染 +1。'
  },
  {
    id: 'reverse_prayer',
    name: '逆祷',
    basePower: 3,
    cost: 2,
    tags: ['ritual', 'protection'],
    description: '失败改为险胜，但污染 +2。'
  },
  {
    id: 'sealing_talisman',
    name: '封门符',
    basePower: 4,
    cost: 2,
    tags: ['ritual', 'protection'],
    description: '取消一次追击类惩罚。'
  },
  {
    id: 'speak_with_shadow',
    name: '与影交谈',
    basePower: 4,
    cost: 1,
    tags: ['ritual', 'insight'],
    description: '成功时获得线索，理智 -2。'
  }
]
```

---

## 7. 副本《午夜病院》事件设计

### 7.1 事件结构

```ts
export interface EventNode {
  id: string;
  title: string;
  order: number;
  difficulty: number;
  imageAssetId: string;
  recommendedTags: GameTag[];
  storyText: string;
  actions: EventAction[];
  resultTextKeys: Record<CheckOutcome, string>;
}

export interface EventAction {
  id: string;
  label: string;
  description: string;
  preferredTags: GameTag[];
  modifier?: number;
  timeCostSeconds: number;
  riskLevel: 'low' | 'medium' | 'high';
  onOutcome: Record<CheckOutcome, StateDelta>;
}
```

### 7.2 节点 1：挂号大厅

```text
标题：挂号大厅
难度：4
推荐标签：洞察 / 交涉
场景图：asset.scene.registration_hall
```

剧情：

```text
午夜的挂号大厅只亮着一排冷白色的灯。自助挂号机不断吐出空白号单，前台后方坐着一名低头写字的护士。她没有抬头，却准确叫出了你的编号：1073。
```

行动：

```text
A. 查看挂号机上的最后一条记录
标签：洞察
时间：45 秒

B. 询问前台护士
标签：交涉 / 洞察
时间：40 秒

C. 直接穿过大厅
标签：逃生 / 潜行
时间：30 秒，修正 -1
```

结果：

```text
大成功：碎片 +1，理智 +1，时间 -40
成功：碎片 +1，时间 -45
险胜：碎片 +1，理智 -1，时间 -45
失败：理智 -1，威胁 flag +1，时间 -35
```

### 7.3 节点 2：护士站

```text
标题：护士站
难度：5
推荐标签：洞察 / 医疗
场景图：asset.scene.nurse_station
```

剧情：

```text
护士站的红灯一闪一闪，值班日志摊在桌上，最后一页写满了同一个名字。药柜深处传来玻璃瓶轻撞的声音，像有人在黑暗里整理药品。
```

行动：

```text
A. 检查病历柜
标签：洞察 / 医疗
时间：45 秒

B. 搜索值班日志
标签：洞察
时间：40 秒

C. 偷走护士的门禁卡
标签：潜行
时间：30 秒，高风险，失败生命 -2
```

结果：

```text
大成功：碎片 +1，预览节点 3 推荐标签，时间 -40
成功：碎片 +1，时间 -45
险胜：碎片 +1，污染 +1，时间 -45
失败：生命 -2，时间 -35
```

### 7.4 节点 3：住院部走廊

```text
标题：住院部走廊
难度：5
推荐标签：潜行 / 交涉 / 战斗
场景图：asset.scene.inpatient_corridor
```

剧情：

```text
住院部走廊被拉长得不正常。307 病房的门虚掩着，里面有人轻声咳嗽。走廊尽头，一个穿病号服的人背对着你站着，腕带上的编号和你完全一致。
```

行动：

```text
A. 假装自己是病人
标签：交涉 / 潜行
时间：45 秒

B. 躲进 307 病房
标签：潜行 / 洞察
时间：40 秒

C. 正面冲过走廊
标签：战斗 / 逃生
时间：30 秒，高风险
```

结果：

```text
大成功：碎片 +1，生命 +1，时间 -40
成功：碎片 +1，时间 -45
险胜：碎片 +1，生命 -1，时间 -40
失败：生命 -2，理智 -1，时间 -30
```

### 7.5 节点 4：手术室

```text
标题：手术室
难度：6
推荐标签：医疗 / 仪式 / 洞察
场景图：asset.scene.operating_room
小游戏：异常点识别
```

剧情：

```text
手术室里没有病人，只有一张被白布盖住的手术台。无影灯缓慢旋转，却没有在地面留下影子。墙上的钟倒着走，秒针每退一格，门外就多一声脚步。
```

行动：

```text
A. 掀开白布
标签：医疗 / 洞察
时间：45 秒

B. 检查手术记录
标签：洞察
时间：50 秒

C. 在门口画下封闭符号
标签：仪式 / 防护
时间：45 秒
```

小游戏：

```text
展示手术室图，玩家点击 3 个异常点。
异常点：无影灯没有影子、两张腕带、倒走的时钟。
找到 2 个以上：本节点判定 +2。
找到 1 个：本节点判定 +1。
找到 0 个：无加成。
```

结果：

```text
大成功：碎片 +1，污染 -1，时间 -40
成功：碎片 +1，时间 -45
险胜：碎片 +1，理智 -2，时间 -45
失败：污染 +1，理智 -2，时间 -35
```

追赶机制：

```text
如果进入节点 4 时碎片 <= 1，额外显示：
D. 打开院长办公室的暗门
标签：洞察 / 仪式
修正 -1
大成功：碎片 +2，理智 -1
成功：碎片 +2，污染 +1
险胜：碎片 +1，污染 +1
失败：污染 +2，生命 -2
```

### 7.6 节点 5：停尸间

```text
标题：停尸间
难度：6
推荐标签：仪式 / 洞察 / 战斗
场景图：asset.scene.morgue
```

剧情：

```text
停尸间的冷柜全部开着，只有 017 号柜紧紧锁死。柜门内侧传来指甲敲击金属的声音，节奏和你胸口的心跳完全一致。
```

行动：

```text
A. 打开 017 号冷柜
标签：洞察 / 医疗
时间：45 秒

B. 破坏停尸间电闸
标签：战斗 / 逃生
时间：30 秒，高风险

C. 向尸体询问天台密码
标签：仪式 / 洞察
时间：40 秒，高风险高收益
```

结果：

```text
大成功：碎片 +1，最终逃生判定 +1 flag，时间 -35
成功：碎片 +1，时间 -40
险胜：碎片 +1，污染 +2，时间 -40
失败：污染 +2，生命 -2，时间 -30
```

### 7.7 节点 6：电梯井

```text
标题：电梯井
难度：7
推荐标签：战斗 / 潜行 / 医疗 / 逃生
场景图：asset.scene.elevator_shaft
```

剧情：

```text
电梯停在井道中间，门缝外是一片黑。钢缆上挂着一串湿漉漉的腕带，每一张都写着曾经进入这里的编号。最上方那张还很新，墨迹没有干。
```

行动：

```text
A. 沿检修梯爬上去
标签：逃生 / 潜行
时间：45 秒

B. 启动备用电源
标签：医疗 / 洞察
时间：50 秒

C. 切断追击者伸来的手
标签：战斗
时间：30 秒，高风险
```

结果：

```text
大成功：碎片 +1，生命 +1，时间 -35
成功：碎片 +1，时间 -40
险胜：碎片 +1，生命 -2，时间 -35
失败：生命 -3，污染 +1，时间 -25
```

### 7.8 最终节点：天台升降梯

```text
标题：天台升降梯
难度：7
推荐标签：逃生 / 洞察 / 仪式 / 战斗
场景图：asset.scene.rooftop_lift
```

进入条件检查：

```text
若碎片 < 4：直接失败，按 MISSING_ONE_FRAGMENT 或 MISSING_FRAGMENTS 结算。
若生命 <= 0 / 理智 <= 0 / 污染 >= 6 / 时间 <= 0：直接失败。
否则进入最终逃生判定。
```

最终行动：

```text
A. 输入门禁碎片中的编号
标签：洞察 / 逃生
时间：20 秒

B. 强行撬开升降梯门
标签：战斗 / 逃生
时间：15 秒，高风险

C. 用污染压制院长的影子
标签：仪式 / 逃生
时间：20 秒，高风险，污染 +1
```

结果：

```text
大成功：通关；若碎片 >= 6 且污染 <= 2，完美通关。
成功：普通通关。
险胜：通关，但获得污染后遗症记忆卡。
失败：FINAL_CHECK_FAILED。
```

---

## 8. 结算设计

### 8.1 结算数据

```ts
export interface RunResult {
  status: 'WIN' | 'PERFECT_WIN' | 'LOSE';
  failureReason?: FailureReason;
  fragments: number;
  requiredFragments: number;
  hp: number;
  sanity: number;
  pollution: number;
  pollutionLimit: number;
  timeLeftSeconds: number;
  escapeDoorProgress: number;
  nodesCleared: number;
  memoryCardReward?: MemoryCard;
  title: string;
  summary: string;
  suggestion: string;
}
```

### 8.2 逃生门开启度

用于近胜反馈：

```ts
function calculateEscapeDoorProgress(state: PlayerState): number {
  const fragmentScore = Math.min(state.fragments / 4, 1) * 70;
  const survivalScore = state.hp > 0 && state.sanity > 0 ? 10 : 0;
  const pollutionScore = state.pollution < 6 ? 10 : Math.max(0, 10 - state.pollution);
  const timeScore = state.timeLeftSeconds > 0 ? 10 : 0;
  return Math.min(99, Math.round(fragmentScore + survivalScore + pollutionScore + timeScore));
}
```

失败时如果是 3/4 碎片，建议固定显示 80%–89% 的开启度。

### 8.3 记忆卡奖励

每次失败也给轻成长，但不能破坏难度。

```ts
export interface MemoryCard {
  id: string;
  name: string;
  description: string;
  trigger: string;
  effect: CardEffect;
}
```

MVP 记忆卡：

```ts
[
  {
    id: 'memory_red_nurse_station',
    name: '记忆：红灯护士站',
    description: '下次进入午夜病院时，节点 2 第一次洞察判定 +1。'
  },
  {
    id: 'memory_reversed_clock',
    name: '记忆：倒走的钟',
    description: '手术室异常点识别获得的加成 +1。'
  },
  {
    id: 'memory_017_cabinet',
    name: '记忆：017 冷柜',
    description: '停尸间第一次失败时改为险胜，但污染 +1。'
  },
  {
    id: 'memory_rooftop_red_light',
    name: '记忆：红色门禁灯',
    description: '最终逃生判定 +1。'
  }
]
```

---

## 9. 界面方案

MVP 采用“沉浸小说型主界面 + 卡牌桌面弹窗 + 主神终端结算”的混合设计。

### 9.1 页面列表

必须实现 6 个界面：

```text
CareerSelectScreen       职业选择
InstanceIntroScreen      副本进入
NodeStoryScreen          剧情事件
CardResolutionModal      卡牌判定弹窗
FinalEscapeScreen        最终逃生
RunResultScreen          结算
```

### 9.2 主界面布局

桌面端 16:9：

```text
┌──────────────────────────────────────────────┐
│  主神日志 / 午夜病院                         │
│  HP 9/10  SAN 7/8  污染 2/6  碎片 2/4  04:12 │
├──────────────────────────────────────────────┤
│                                              │
│                大幅场景插画                   │
│                                              │
├──────────────────────────────────────────────┤
│ 剧情文本：                                    │
│ 护士站的红灯一闪一闪……                       │
│                                              │
│ 行动选择：                                    │
│ [检查病历柜] [搜索值班日志] [偷走门禁卡]       │
├──────────────────────────────────────────────┤
│ 手牌：[现场复盘] [急救包] [稳住呼吸]           │
└──────────────────────────────────────────────┘
```

移动端竖屏可后续再适配，MVP 先保证桌面端和浏览器可玩。

### 9.3 卡牌判定弹窗

```text
┌──────────────────────────────┐
│ 当前事件：护士站              │
│ 难度：5                       │
│ 推荐标签：洞察 / 医疗          │
├──────────────────────────────┤
│ 打出的卡牌：现场复盘           │
│ 基础值：4                     │
│ 标签匹配：+2                  │
│ 职业加成：+1                  │
│ 随机扰动：0                   │
│ 最终判定：7 vs 5              │
├──────────────────────────────┤
│ 结果：大成功                   │
│ 获得门禁碎片 +1                │
│ 预览下一节点推荐标签            │
└──────────────────────────────┘
```

玩家必须看得懂自己为什么成功或失败。

### 9.4 结算界面

失败结算示例：

```text
副本失败：门禁权限不足

门禁碎片：3/4
逃生门开启度：82%
污染值：5/6
剩余时间：00:18

你已经抵达天台，升降梯的门也打开了一条缝。
但最后一枚护士站门禁残片没有被激活。

获得记忆卡：红灯护士站
下次进入午夜病院时，节点 2 第一次洞察判定 +1。

[再来一局] [更换职业] [返回主神空间]
```

---

## 10. 推荐项目结构

采用数据驱动 + 纯规则引擎 + 可替换 Provider。

```text
midnight-hospital-mvp/
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  public/
    assets/
      images/
        midnight_hospital/
          cover/
          scenes/
          characters/
          monsters/
          cards/
          endings/
          ui/
      audio/
        sfx/
        bgm/
  src/
    main.tsx
    App.tsx
    app/
      routes.tsx
      providers.tsx
      gameStore.ts
    config/
      difficulty.ts
      ui.ts
    content/
      packs/
        midnight-hospital/
          instance.ts
          careers.ts
          cards.ts
          events.ts
          endings.ts
          memoryCards.ts
          assetManifest.ts
    engine/
      types.ts
      rng.ts
      gameMachine.ts
      runFactory.ts
      deckEngine.ts
      checkEngine.ts
      resolutionEngine.ts
      outcomeEngine.ts
      difficultySimulator.ts
      guards.ts
    services/
      story/
        StoryProvider.ts
        StaticStoryProvider.ts
        LlmStoryProvider.ts
        prompts.ts
      assets/
        assetLoader.ts
      telemetry/
        telemetry.ts
      save/
        saveService.ts
    ui/
      screens/
        CareerSelectScreen.tsx
        InstanceIntroScreen.tsx
        NodeStoryScreen.tsx
        FinalEscapeScreen.tsx
        RunResultScreen.tsx
      components/
        StatusBar.tsx
        SceneImage.tsx
        StoryPanel.tsx
        ActionButtons.tsx
        CardHand.tsx
        CardView.tsx
        CardResolutionModal.tsx
        TagBadge.tsx
        ProgressPips.tsx
        ResultSummary.tsx
      minigames/
        AnomalySpottingGame.tsx
      layout/
        GameShell.tsx
    styles/
      globals.css
      tokens.css
      components.css
    tests/
      checkEngine.test.ts
      deckEngine.test.ts
      resolutionEngine.test.ts
      difficultySimulator.test.ts
```

### 10.1 模块职责

#### `engine/`

只包含纯 TypeScript 规则，不依赖 React。

```text
rng.ts                可复现随机数
runFactory.ts         根据职业和副本创建新局
gameMachine.ts        控制游戏阶段流转
checkEngine.ts        计算判定值和判定结果
resolutionEngine.ts   根据事件、行动、卡牌和结果生成状态变化
outcomeEngine.ts      判断通关、失败、近胜反馈
deckEngine.ts         洗牌、抽牌、弃牌、废牌
guards.ts             状态钳制、早期保护、非法状态修正
difficultySimulator.ts 批量模拟新手策略，用于调难度
```

#### `content/`

所有职业、卡牌、副本、事件、图片引用都放在这里。新增副本时不改引擎，只增加 content pack。

#### `services/story/`

故事文本 Provider。MVP 先用 `StaticStoryProvider`。之后接大模型时实现 `LlmStoryProvider`，但接口保持不变。

```ts
export interface StoryProvider {
  getNodeStory(input: StoryInput): Promise<StoryOutput>;
  getResolutionText(input: ResolutionStoryInput): Promise<StoryOutput>;
}
```

#### `ui/`

只负责展示和交互，不直接修改复杂状态。UI 调用 `gameStore`，`gameStore` 调用 engine。

---

## 11. 数据驱动示例

### 11.1 副本定义

```ts
export const midnightHospitalInstance: InstanceDefinition = {
  id: 'midnight_hospital',
  title: '午夜病院：B-17 副本',
  subtitle: '第 1073 批试炼者记录',
  estimatedMinutes: 5,
  coverAssetId: 'mh_cover_entrance',
  requiredFragments: 4,
  perfectFragments: 6,
  pollutionLimit: 6,
  initialTimeSeconds: 300,
  nodeIds: [
    'mh_node_01_registration_hall',
    'mh_node_02_nurse_station',
    'mh_node_03_inpatient_corridor',
    'mh_node_04_operating_room',
    'mh_node_05_morgue',
    'mh_node_06_elevator_shaft'
  ],
  finalNodeId: 'mh_final_rooftop_lift',
  recommendedCareers: ['investigator', 'physician'],
};
```

### 11.2 图片资产 Manifest

```ts
export const assetManifest = {
  mh_cover_entrance: {
    type: 'cover',
    src: '/assets/images/midnight_hospital/cover/mh_cover_entrance.webp',
    alt: '午夜废弃医院入口'
  },
  mh_scene_registration_hall: {
    type: 'scene',
    src: '/assets/images/midnight_hospital/scenes/registration_hall.webp',
    alt: '挂号大厅'
  }
};
```

---

## 12. AI 剧情生成接口设计

MVP 不接真实大模型，先静态文本跑通。后续接入时使用下面的约束。

### 12.1 AI 输入

```ts
export interface StoryInput {
  instanceTitle: string;
  nodeTitle: string;
  playerCareerName: string;
  playerState: {
    hp: number;
    sanity: number;
    pollution: number;
    fragments: number;
    timeLeftSeconds: number;
  };
  knownFlags: Record<string, boolean | number | string>;
  recommendedTags: GameTag[];
  actionLabels: string[];
  hardFacts: string[];
  forbiddenFacts: string[];
  maxChineseChars: number;
}
```

### 12.2 AI 输出

```ts
export interface StoryOutput {
  text: string;
  moodTags: string[];
}
```

禁止 AI 输出：

```text
生命变化
理智变化
污染变化
碎片变化
最终胜负
新增道具
新增规则
未由系统提供的关键线索
```

### 12.3 事件文本 Prompt 模板

```text
你是一个中文互动小说游戏的剧情文案生成器。
请根据系统提供的硬事实写一段 120–220 字的恐怖悬疑剧情。

要求：
1. 不要决定玩家是否成功。
2. 不要改变生命、理智、污染、门禁碎片等数值。
3. 不要新增关键线索、隐藏规则或胜负条件。
4. 可以写氛围、动作、声音、气味、NPC 表情。
5. 结尾要自然引出玩家即将做选择。
6. 不要输出 JSON 之外的内容。

输入：
副本：{{instanceTitle}}
节点：{{nodeTitle}}
职业：{{playerCareerName}}
玩家状态：{{playerState}}
硬事实：{{hardFacts}}
禁止事实：{{forbiddenFacts}}
可用行动：{{actionLabels}}

输出 JSON：
{
  "text": "...",
  "moodTags": ["...", "..."]
}
```

---

## 13. 图片资产总规范

### 13.1 美术方向

关键词：

```text
中式无限流、废弃医院、主神终端、恐怖悬疑、电影感、视觉小说、卡牌 Roguelite、冷白荧光灯、红色门禁灯、监控噪点、轻微胶片颗粒、低饱和、高对比、非写实血腥
```

重要限制：

```text
不要让 AI 图片生成文字、标志、UI 字符、真实医院名称。
所有文字由游戏 UI 叠加。
避免过度血腥，使用暗示性恐怖。
同一角色保持固定服装、发型、轮廓和主色调。
每张图保留上方或下方 20% 安全区，方便叠加 UI。
```

### 13.2 通用正向提示词模板

建议英文提示词，方便多数图像模型稳定输出：

```text
dark cinematic horror visual novel game illustration, abandoned hospital at midnight, Chinese infinite-flow survival game atmosphere, cold fluorescent lighting, red access-control glow, subtle surveillance camera noise, film grain, high detail environment, dramatic composition, immersive storytelling, no text, no logo, no watermark, clean area for game UI overlay, 16:9 aspect ratio
```

### 13.3 通用负向提示词

```text
text, readable letters, logo, watermark, signature, UI text, overexposed, low resolution, blurry, cartoonish, comedy, cute, excessive gore, dismemberment, real hospital brand, modern advertisement, extra limbs, distorted hands, deformed face, duplicate characters, bad anatomy
```

### 13.4 资产规格

```text
场景图：16:9，推荐 1920x1080 或 1536x864，WebP
职业立绘：2:3，推荐 1024x1536，透明背景或纯暗背景，WebP/PNG
NPC 立绘：2:3，推荐 1024x1536
卡牌图：1:1 或 4:5，推荐 768x768 / 768x960
结局 CG：16:9，推荐 1920x1080
UI 纹理：透明 PNG，推荐 1024x1024 或 1920x1080
```

---

## 14. 图片资产清单和提示词

下面的提示词可以直接用于生成。建议所有场景使用相同风格锁定词，并尽量使用同一模型、同一风格参考图、相近 seed。

### 14.1 副本封面图

#### A001 - 午夜病院入口

文件名：

```text
public/assets/images/midnight_hospital/cover/mh_cover_entrance.webp
```

提示词：

```text
cover art for a dark cinematic horror visual novel game, abandoned hospital entrance at midnight, rain-slick pavement, broken glass doors, cold fluorescent lights flickering inside, red access-control light glowing near the entrance, a lone human silhouette standing before the gate, Chinese infinite-flow survival atmosphere, subtle surveillance noise, film grain, high detail, dramatic composition, no text, no logo, no watermark, 16:9
```

负向：使用通用负向提示词。

---

### 14.2 场景图

#### S001 - 挂号大厅

文件名：

```text
public/assets/images/midnight_hospital/scenes/registration_hall.webp
```

提示词：

```text
abandoned hospital registration hall at midnight, empty rows of metal chairs, self-service registration machine printing blank tickets, reception counter in the distance, cold white fluorescent lights, red access-control indicator, dust in the air, eerie stillness, dark cinematic horror visual novel game illustration, high detail environment, no text, no logo, no watermark, 16:9
```

#### S002 - 护士站

文件名：

```text
public/assets/images/midnight_hospital/scenes/nurse_station.webp
```

提示词：

```text
deserted nurse station in an abandoned hospital, red warning lamp blinking, open medical record cabinet, scattered files without readable text, medicine bottles in shadow, narrow corridor behind the counter, cold fluorescent lighting, ominous atmosphere, cinematic horror visual novel game scene, subtle film grain, no text, no logo, no watermark, 16:9
```

#### S003 - 住院部走廊

文件名：

```text
public/assets/images/midnight_hospital/scenes/inpatient_corridor.webp
```

提示词：

```text
long distorted inpatient corridor in an abandoned hospital at midnight, patient room doors half open, a distant figure in hospital gown standing with back turned, wet floor reflecting fluorescent lights, red emergency glow at the end of the hallway, oppressive depth, dark cinematic horror game illustration, no text, no logo, no watermark, 16:9
```

#### S004 - 手术室

文件名：

```text
public/assets/images/midnight_hospital/scenes/operating_room.webp
```

提示词：

```text
abandoned operating room, empty surgical table covered by white sheet, shadowless operating lamp rotating overhead, reversed clock shape on the wall without readable numbers, two patient wristbands on the bed, sterile cold blue-green lighting, suspenseful horror visual novel scene, high detail, no text, no logo, no watermark, 16:9
```

小游戏异常点要求：

```text
这张图需要能看出 3 个异常点：
1. 无影灯照下但地面没有正常影子。
2. 病床上有两张腕带。
3. 墙上有一个倒走时钟的视觉暗示，但不要生成可读文字或数字。
```

#### S005 - 停尸间

文件名：

```text
public/assets/images/midnight_hospital/scenes/morgue.webp
```

提示词：

```text
hospital morgue at midnight, rows of metal cold storage drawers, most drawers slightly open, one drawer marked visually as special without readable text, frost in the air, dim cold lighting, red warning reflection on steel surfaces, subtle horror atmosphere without gore, cinematic visual novel game background, no text, no logo, no watermark, 16:9
```

#### S006 - 电梯井

文件名：

```text
public/assets/images/midnight_hospital/scenes/elevator_shaft.webp
```

提示词：

```text
open hospital elevator shaft, elevator stuck between floors, hanging steel cables, many blank patient wristbands tied to the cables, darkness below, red emergency light from above, claustrophobic vertical composition adapted to 16:9, cinematic horror game illustration, high detail, no text, no logo, no watermark, 16:9
```

#### S007 - 天台升降梯

文件名：

```text
public/assets/images/midnight_hospital/scenes/rooftop_lift.webp
```

提示词：

```text
hospital rooftop at midnight, old service lift with red access-control panel glowing, storm clouds, city lights far away, broken railings, black shadow spreading from the stairwell door, tense final escape scene, dark cinematic horror visual novel game illustration, dramatic lighting, no text, no logo, no watermark, 16:9
```

---

### 14.3 职业立绘

统一角色风格提示：

```text
full body character concept art for a dark horror survival card game, Chinese infinite-flow trial participant, realistic anime semi-realistic style, cinematic lighting, clean silhouette, detailed clothing, no text, no logo, no watermark, 2:3
```

#### C001 - 调查员

文件名：

```text
public/assets/images/midnight_hospital/characters/career_investigator.webp
```

提示词：

```text
full body character concept art, a calm Chinese investigator in a dark trench coat, carrying a small flashlight and notebook, observant eyes, subtle tired expression, practical clothing, horror survival visual novel game, cinematic rim light, dark background, no text, no logo, no watermark, 2:3
```

#### C002 - 清道夫

文件名：

```text
public/assets/images/midnight_hospital/characters/career_cleaner.webp
```

提示词：

```text
full body character concept art, a rugged Chinese cleaner mercenary for supernatural incidents, heavy jacket, protective gloves, compact breaching hammer, battle-worn but not military branded, strong silhouette, horror survival card game, cinematic lighting, dark background, no text, no logo, no watermark, 2:3
```

#### C003 - 医师

文件名：

```text
public/assets/images/midnight_hospital/characters/career_physician.webp
```

提示词：

```text
full body character concept art, a Chinese emergency physician in a dark medical coat, portable medical kit, calm and exhausted expression, small headlamp, practical shoes, horror survival visual novel game, cinematic cold lighting, dark background, no text, no logo, no watermark, 2:3
```

#### C004 - 祭仪师

文件名：

```text
public/assets/images/midnight_hospital/characters/career_ritualist.webp
```

提示词：

```text
full body character concept art, a mysterious Chinese ritualist, dark layered coat, red thread charms, old talismans without readable symbols, pale hands, composed expression, supernatural horror survival card game, cinematic red rim light, dark background, no text, no logo, no watermark, 2:3
```

---

### 14.4 NPC 立绘

#### N001 - 前台护士

文件名：

```text
public/assets/images/midnight_hospital/characters/npc_front_desk_nurse.webp
```

提示词：

```text
semi-realistic character portrait, eerie hospital front desk nurse, neat old-fashioned nurse uniform without readable badge, head slightly lowered, face partly hidden by shadow, red access-control glow reflected in eyes, unsettling but not grotesque, dark horror visual novel game character, no text, no logo, no watermark, 2:3
```

#### N002 - 307 病人

文件名：

```text
public/assets/images/midnight_hospital/characters/npc_patient_307.webp
```

提示词：

```text
semi-realistic character portrait, thin patient in pale hospital gown, standing with hunched shoulders, blank wristband without readable text, anxious expression, corridor shadow behind, subtle supernatural unease, horror visual novel game character, no gore, no text, no logo, no watermark, 2:3
```

#### N003 - 院长

文件名：

```text
public/assets/images/midnight_hospital/characters/npc_director_shadow.webp
```

提示词：

```text
semi-realistic character portrait, hospital director as a tall shadowy figure in an old dark coat, face mostly obscured, red access-control light outlining the silhouette, authoritative and unnatural presence, supernatural horror game character, no text, no logo, no watermark, 2:3
```

---

### 14.5 怪物图

#### M001 - 值夜护士

文件名：

```text
public/assets/images/midnight_hospital/monsters/night_shift_nurse.webp
```

提示词：

```text
horror creature concept art, supernatural night-shift nurse in abandoned hospital, elongated shadow, old nurse uniform, face partly obscured, holding a tray of unmarked medicine bottles, eerie red hospital light, suspenseful not overly gory, dark cinematic game art, no text, no logo, no watermark, 16:9
```

#### M002 - 017 冷柜中的病人

文件名：

```text
public/assets/images/midnight_hospital/monsters/cabinet_017_patient.webp
```

提示词：

```text
horror scene concept art, a pale hand pressing from inside a slightly opened morgue cold drawer, frost and vapor, metal surfaces reflecting red warning light, implied presence without graphic gore, cinematic horror visual novel game, no text, no logo, no watermark, 16:9
```

#### M003 - 院长的影子

文件名：

```text
public/assets/images/midnight_hospital/monsters/director_shadow.webp
```

提示词：

```text
supernatural shadow monster in hospital rooftop stairwell, tall human-like silhouette spreading like black smoke, red access-control glow, stormy midnight background, final boss atmosphere, dark cinematic horror game illustration, no gore, no text, no logo, no watermark, 16:9
```

---

### 14.6 卡牌图

卡牌图建议统一 1:1，UI 中再套卡框。不要让图片里有文字。

统一提示：

```text
item card illustration for a dark horror survival card game, centered object, dramatic lighting, dark background, high detail, no text, no logo, no watermark, 1:1
```

#### 通用卡

```text
quick_search.webp
Prompt: small flashlight illuminating scattered hospital files, centered object card illustration, dark horror survival card game, no text, no logo, 1:1

brace_yourself.webp
Prompt: two hands gripping a metal hospital bed rail, tense but controlled, centered object card illustration, dark horror survival card game, no text, no logo, 1:1

improvised_tool.webp
Prompt: bent metal clip and small screwdriver on a dark hospital floor, centered object card illustration, no text, no logo, 1:1

run_through.webp
Prompt: blurred motion through a dark hospital corridor toward a red emergency light, action card illustration, no text, no logo, 1:1

pollution_noise.webp
Prompt: abstract black static cloud with red glitch fragments, cursed card illustration, dark horror game, no text, no logo, 1:1
```

#### 调查员卡

```text
scene_reconstruction.webp
Prompt: transparent crime scene threads connecting hospital objects under flashlight, investigation card illustration, dark background, no text, no logo, 1:1

medical_record_questioning.webp
Prompt: open medical folder with blank pages, flashlight and recorder beside it, investigation card illustration, no readable text, no logo, 1:1

logic_loop.webp
Prompt: circular arrangement of evidence photos without readable text, red thread forming a closed loop, dark investigation card, no text, no logo, 1:1

calm_observation.webp
Prompt: calm eye reflected in cracked hospital glass, cold light, psychological protection card illustration, no text, no logo, 1:1
```

#### 清道夫卡

```text
door_breaker.webp
Prompt: heavy breaching hammer leaning against a damaged hospital door, combat card illustration, no text, no logo, 1:1

guard_vitals.webp
Prompt: protective forearm blocking sharp glass fragments, dark survival card illustration, no gore, no text, no logo, 1:1

forced_entry.webp
Prompt: boot kicking open a hospital service door, red emergency light behind, action card illustration, no text, no logo, 1:1

improvised_weapon.webp
Prompt: metal IV stand held like a weapon in a dark hospital corridor, survival combat card illustration, no text, no logo, 1:1
```

#### 医师卡

```text
first_aid_kit.webp
Prompt: compact emergency first aid kit opened under cold hospital light, medical card illustration, no readable labels, no text, no logo, 1:1

sedative.webp
Prompt: small syringe and sealed medicine vial on a metal tray, cold light, medical card illustration, no readable label, no text, no logo, 1:1

autopsy.webp
Prompt: gloved hands examining blank patient wristband and surgical tools, forensic medical card illustration, no gore, no text, no logo, 1:1

hemostasis.webp
Prompt: clean bandage roll and medical clamp on dark tray, emergency medicine card illustration, no text, no logo, 1:1
```

#### 祭仪师卡

```text
blood_mark.webp
Prompt: red ritual mark painted on a blank hospital tile, supernatural card illustration, symbolic but no readable characters, no text, no logo, 1:1

reverse_prayer.webp
Prompt: dark prayer beads floating above a cracked hospital floor, supernatural ritual card illustration, no text, no logo, 1:1

sealing_talisman.webp
Prompt: old blank talisman paper and red thread sealing a hospital door, no readable symbols, ritual protection card, no text, no logo, 1:1

speak_with_shadow.webp
Prompt: human silhouette whispering to a shadow on a hospital wall, supernatural insight card illustration, dark cinematic lighting, no text, no logo, 1:1
```

---

### 14.7 结局 CG

#### E001 - 普通通关

文件名：

```text
public/assets/images/midnight_hospital/endings/ending_escape.webp
```

提示词：

```text
cinematic ending CG, hospital rooftop service lift opening into pale dawn light, exhausted survivor silhouette stepping inside, red access-control light turning green but without readable UI, dark horror visual novel game ending, emotional relief, no text, no logo, no watermark, 16:9
```

#### E002 - 完美通关

文件名：

```text
public/assets/images/midnight_hospital/endings/ending_perfect_escape.webp
```

提示词：

```text
cinematic perfect ending CG, abandoned hospital rooftop under first light before dawn, service lift fully open, black shadow dissolving behind the survivor, clean cold atmosphere, subtle golden horizon, horror visual novel game ending, no text, no logo, no watermark, 16:9
```

#### E003 - 差一枚门禁碎片

文件名：

```text
public/assets/images/midnight_hospital/endings/ending_missing_fragment.webp
```

提示词：

```text
cinematic failure CG, hospital rooftop service lift door opened only a narrow gap, red access-control light glowing, survivor hand reaching toward the gap, black shadow approaching from behind, near escape horror game ending, no readable text, no logo, no watermark, 16:9
```

#### E004 - 污染失控

文件名：

```text
public/assets/images/midnight_hospital/endings/ending_pollution.webp
```

提示词：

```text
cinematic failure CG, survivor standing in hospital rooftop lift, but a black shadow is attached to their back like a second silhouette, red and cold fluorescent mixed lighting, subtle supernatural horror, no gore, no text, no logo, no watermark, 16:9
```

#### E005 - 死亡回收

文件名：

```text
public/assets/images/midnight_hospital/endings/ending_cold_storage.webp
```

提示词：

```text
cinematic horror ending CG, morgue cold storage drawer slowly closing, blank patient wristband hanging from the metal handle, frost and red warning light, implied death without graphic gore, dark visual novel game ending, no text, no logo, no watermark, 16:9
```

---

### 14.8 UI 纹理和图标

#### U001 - 主神终端噪点覆盖层

文件名：

```text
public/assets/images/midnight_hospital/ui/terminal_noise_overlay.png
```

提示词：

```text
transparent PNG overlay, subtle surveillance camera noise, scanlines, red glitch fragments, dark sci-fi horror terminal interface texture, no text, no logo, no watermark, 16:9
```

#### U002 - 门禁碎片图标

文件名：

```text
public/assets/images/midnight_hospital/ui/icon_access_fragment.png
```

提示词：

```text
game icon, broken access card fragment, red glowing circuit edge, dark horror survival UI, centered object, transparent background, no text, no logo, 1:1
```

#### U003 - 污染图标

文件名：

```text
public/assets/images/midnight_hospital/ui/icon_pollution.png
```

提示词：

```text
game icon, black static infection droplet with red glitch veins, dark horror survival UI, centered object, transparent background, no text, no logo, 1:1
```

#### U004 - 生命图标

文件名：

```text
public/assets/images/midnight_hospital/ui/icon_hp.png
```

提示词：

```text
game icon, cracked medical cross symbol made of cold light, dark horror survival UI, centered object, transparent background, no readable text, no logo, 1:1
```

#### U005 - 理智图标

文件名：

```text
public/assets/images/midnight_hospital/ui/icon_sanity.png
```

提示词：

```text
game icon, human eye reflected in cracked glass, dark horror survival UI, centered object, transparent background, no text, no logo, 1:1
```

#### U006 - 卡牌边框

文件名：

```text
public/assets/images/midnight_hospital/ui/card_frame_basic.png
```

提示词：

```text
transparent PNG card frame for dark horror survival card game, worn metal edge, subtle red access-control glow, empty center, no text, no logo, no watermark, vertical card frame, 4:5
```

---

## 15. 最小图片资产版本

如果要先快速制作，不需要一次生成全部图片。最低资产集：

```text
1 张封面图
7 张场景图
4 张职业立绘
16 张卡牌图
3 张结局 CG
5 张 UI 图标/纹理
```

合计：

```text
36 张图片左右
```

优先级：

```text
P0：封面、7 张场景图、4 张职业立绘、3 张结局 CG
P1：16 张卡牌图
P2：UI 图标和纹理
P3：NPC/怪物独立立绘
```

没有卡牌图时，可以先用统一卡背 + 标签图标占位。不要阻塞玩法实现。

---

## 16. 小游戏：手术室异常点识别

MVP 只做一个小游戏，放在节点 4。

### 16.1 规则

```text
展示手术室图片。
玩家需要点击异常点。
异常点数量：3
允许点击次数：3
得分：命中数量
```

### 16.2 加成

```text
命中 0 个：本节点判定 +0
命中 1 个：本节点判定 +1
命中 2 个：本节点判定 +2
命中 3 个：本节点判定 +2，且理智 +1
```

### 16.3 技术实现

用相对坐标定义热区：

```ts
export interface Hotspot {
  id: string;
  label: string;
  x: number;      // 0–1
  y: number;      // 0–1
  radius: number; // 0–1
}

export const operatingRoomHotspots: Hotspot[] = [
  { id: 'shadowless_lamp', label: '没有影子的无影灯', x: 0.52, y: 0.18, radius: 0.08 },
  { id: 'double_wristbands', label: '两张腕带', x: 0.48, y: 0.58, radius: 0.06 },
  { id: 'reversed_clock', label: '倒走的钟', x: 0.78, y: 0.25, radius: 0.06 },
];
```

注意：如果实际图片构图不同，需要调整坐标。

---

## 17. 存档和轻成长

MVP 使用 localStorage。

保存内容：

```ts
export interface SaveData {
  version: number;
  unlockedMemoryCards: string[];
  runHistory: RunHistoryItem[];
  settings: {
    reduceMotion: boolean;
    textSpeed: 'instant' | 'fast' | 'normal';
  };
}
```

每次失败或通关后写入 runHistory，便于后续分析。

---

## 18. Telemetry / 调参日志

MVP 可以先不接后端，输出到 console 和 localStorage。后续再接分析平台。

事件：

```ts
export type TelemetryEvent =
  | { type: 'RUN_START'; careerId: string; seed: string }
  | { type: 'NODE_ENTER'; nodeId: string; hp: number; sanity: number; pollution: number; fragments: number }
  | { type: 'ACTION_SELECT'; nodeId: string; actionId: string }
  | { type: 'CARD_PLAY'; cardId: string; checkValue: number; difficulty: number; outcome: CheckOutcome }
  | { type: 'MINIGAME_COMPLETE'; minigameId: string; score: number }
  | { type: 'RUN_END'; status: string; failureReason?: string; fragments: number; pollution: number };
```

关键分析指标：

```text
首局通关率
3/4 碎片失败率
每个节点失败率
每张卡使用率
职业通关率
节点 4 追赶机制触发率
节点 5 高风险行动选择率
最终逃生失败率
```

---

## 19. 难度模拟器

实现 `difficultySimulator.ts`，用于快速模拟新手策略。

### 19.1 新手策略模型

```text
55% 概率选择推荐标签匹配最高的行动
25% 概率选择风险最低的行动
20% 概率随机行动

打牌策略：
优先选择当前事件推荐标签匹配最多的卡；若没有，则选择基础值最高的卡。
```

### 19.2 输出

运行命令：

```bash
npm run sim:difficulty -- --runs=10000
```

输出示例：

```text
Runs: 10000
Win rate: 31.4%
Perfect win rate: 3.2%
Near miss rate: 34.7%
Missing one fragment: 28.1%
Death before final: 6.8%
Pollution overload: 12.4%
Final check failed: 17.3%
Average duration nodes: 6.7
Career win rates:
- Investigator: 34.9%
- Physician: 36.1%
- Cleaner: 28.5%
- Ritualist: 24.8%
```

如果首局模拟通关率高于 35%，优先提高节点 5、节点 6 或最终逃生难度。  
如果低于 28%，优先增加节点 4 追赶机制收益或降低节点 6 难度。

---

## 20. UI 视觉风格

### 20.1 颜色方向

```text
背景：近黑、深灰蓝
主文字：冷白
次级文字：灰白
危险：暗红
成功：低饱和绿色或冷白高亮
污染：黑红噪点
门禁碎片：红色发光边缘
```

### 20.2 字体建议

使用系统字体即可，不要依赖商业字体。

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
```

### 20.3 动效

MVP 动效只做必要部分：

```text
卡牌 hover / selected
判定数字递增
成功时碎片图标亮起
污染增加时屏幕轻微故障闪烁
结算时逃生门开启度进度条
```

提供“减少动效”设置。

---

## 21. 开发顺序

### Phase 1：项目初始化和数据模型

Codex 先完成：

```text
1. 初始化 Vite + React + TypeScript。
2. 建立目录结构。
3. 定义 engine/types.ts。
4. 写 content pack：职业、卡牌、事件、副本。
5. 写 difficulty.ts。
```

验收：项目可以启动，TypeScript 无错误。

### Phase 2：规则引擎

完成：

```text
1. runFactory 创建新局。
2. deckEngine 洗牌、抽牌、弃牌。
3. checkEngine 计算判定。
4. resolutionEngine 应用状态变化。
5. outcomeEngine 判断通关失败。
6. guards 实现早期保护。
```

验收：用单元测试覆盖核心规则。

### Phase 3：可玩 UI

完成：

```text
1. 职业选择界面。
2. 副本介绍界面。
3. 节点剧情界面。
4. 行动选择 + 手牌选择。
5. 判定弹窗。
6. 最终逃生界面。
7. 结算界面。
```

验收：不接图片也能完整跑完一局。

### Phase 4：图片资产接入

完成：

```text
1. assetManifest。
2. SceneImage 组件。
3. 职业立绘。
4. 卡牌图片。
5. 结局 CG。
6. UI 纹理覆盖层。
```

验收：图片缺失时显示占位，不报错。

### Phase 5：小游戏

完成：

```text
1. 手术室异常点识别。
2. 热区配置。
3. 命中反馈。
4. 加成接入当前节点判定。
```

验收：小游戏影响节点 4 判定值。

### Phase 6：调参和模拟

完成：

```text
1. difficultySimulator。
2. 模拟 10000 局。
3. 输出通关率和近胜率。
4. 根据结果调整 difficulty.ts。
```

验收：新手模型通关率在 28%–35%。

---

## 22. Definition of Done

MVP 完成标准：

```text
可以从职业选择开始完整进入副本。
可以经历 6 个普通节点和 1 个最终节点。
每个节点有剧情、图片位、行动选择、手牌选择、判定结果。
通关和失败都能进入结算。
失败结算能显示差距分析。
至少有 4 个职业、20+ 张卡牌、7 个节点。
图片资产全部通过 manifest 引用，缺失时有占位。
规则引擎不依赖 React。
新增职业、卡牌、副本不需要改核心引擎。
模拟器显示新手通关率约 30%。
```

---

## 23. 后续扩展方向

MVP 完成后按以下顺序扩展：

```text
1. 第二个副本：规则怪谈旅馆。
2. 主神空间界面：安全屋、记忆卡、队友。
3. 更多职业：黑客、道士、演员、骗子。
4. 更多小游戏：规则真假判断、证据连线、路线逃生。
5. LLM 剧情 Provider：替换静态事件文本。
6. 图片资源包系统：每个副本独立 manifest。
7. 队友系统：关系、背叛、救援。
8. 卡组成长：局外解锁和局内临时奖励。
```

---

## 24. 给 Codex 的第一条执行指令建议

可以直接把下面这段发给 Codex：

```text
请根据本 Markdown 指导文件实现《主神日志：午夜病院》MVP。
优先使用 React + TypeScript + Vite。
第一步只做可运行、可测试、可扩展的前端原型。
先不要接真实 AI 大模型，也不要依赖真实图片资源；图片先通过 assetManifest 和占位图实现。
请先创建项目结构、核心类型、content pack 和纯 TypeScript 规则引擎，然后再实现 UI。
所有游戏状态变化必须经过 engine 计算，UI 和 StoryProvider 不得直接修改生命、理智、污染、碎片或通关结果。
```

