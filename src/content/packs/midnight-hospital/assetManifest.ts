import type { AssetManifestItem } from '../../../engine/types';

export const assetManifest: Record<string, AssetManifestItem> = {
  mh_cover_entrance: {
    type: 'cover',
    src: '/assets/images/midnight_hospital/cover/mh_cover_entrance.webp',
    alt: '午夜废弃医院入口',
  },
  mh_scene_registration_hall: {
    type: 'scene',
    src: '/assets/images/midnight_hospital/scenes/registration_hall.webp',
    alt: '挂号大厅',
  },
  mh_scene_nurse_station: {
    type: 'scene',
    src: '/assets/images/midnight_hospital/scenes/nurse_station.webp',
    alt: '护士站',
  },
  mh_scene_inpatient_corridor: {
    type: 'scene',
    src: '/assets/images/midnight_hospital/scenes/inpatient_corridor.webp',
    alt: '住院部走廊',
  },
  mh_scene_operating_room: {
    type: 'scene',
    src: '/assets/images/midnight_hospital/scenes/operating_room.webp',
    alt: '手术室',
  },
  mh_scene_morgue: {
    type: 'scene',
    src: '/assets/images/midnight_hospital/scenes/morgue.webp',
    alt: '停尸间',
  },
  mh_scene_elevator_shaft: {
    type: 'scene',
    src: '/assets/images/midnight_hospital/scenes/elevator_shaft.webp',
    alt: '电梯井',
  },
  mh_scene_rooftop_lift: {
    type: 'scene',
    src: '/assets/images/midnight_hospital/scenes/rooftop_lift.webp',
    alt: '天台升降梯',
  },
  career_investigator: {
    type: 'character',
    src: '/assets/images/midnight_hospital/characters/career_investigator.webp',
    alt: '调查员',
  },
  career_cleaner: {
    type: 'character',
    src: '/assets/images/midnight_hospital/characters/career_cleaner.webp',
    alt: '清道夫',
  },
  career_physician: {
    type: 'character',
    src: '/assets/images/midnight_hospital/characters/career_physician.webp',
    alt: '医师',
  },
  career_ritualist: {
    type: 'character',
    src: '/assets/images/midnight_hospital/characters/career_ritualist.webp',
    alt: '祭仪师',
  },
  ending_escape: {
    type: 'ending',
    src: '/assets/images/midnight_hospital/endings/ending_escape.webp',
    alt: '普通通关',
  },
  ending_perfect_escape: {
    type: 'ending',
    src: '/assets/images/midnight_hospital/endings/ending_perfect_escape.webp',
    alt: '完美通关',
  },
  ending_missing_fragment: {
    type: 'ending',
    src: '/assets/images/midnight_hospital/endings/ending_missing_fragment.webp',
    alt: '差一枚门禁碎片',
  },
  ending_pollution: {
    type: 'ending',
    src: '/assets/images/midnight_hospital/endings/ending_pollution.webp',
    alt: '污染失控',
  },
  ending_cold_storage: {
    type: 'ending',
    src: '/assets/images/midnight_hospital/endings/ending_cold_storage.webp',
    alt: '死亡回收',
  },
  ui_terminal_noise_overlay: {
    type: 'ui',
    src: '/assets/images/midnight_hospital/ui/terminal_noise_overlay.webp',
    alt: '主神终端噪点覆盖层',
  },
  ui_icon_access_fragment: {
    type: 'ui',
    src: '/assets/images/midnight_hospital/ui/icon_access_fragment.webp',
    alt: '门禁碎片图标',
  },
  ui_icon_pollution: {
    type: 'ui',
    src: '/assets/images/midnight_hospital/ui/icon_pollution.webp',
    alt: '污染图标',
  },
  ui_icon_hp: {
    type: 'ui',
    src: '/assets/images/midnight_hospital/ui/icon_hp.webp',
    alt: '生命图标',
  },
  ui_icon_sanity: {
    type: 'ui',
    src: '/assets/images/midnight_hospital/ui/icon_sanity.webp',
    alt: '理智图标',
  },
  ui_card_frame_basic: {
    type: 'ui',
    src: '/assets/images/midnight_hospital/ui/card_frame_basic.webp',
    alt: '基础卡牌边框',
  },
  npc_front_desk_nurse: {
    type: 'character',
    src: '/assets/images/midnight_hospital/characters/npc_front_desk_nurse.webp',
    alt: '前台护士',
  },
  npc_patient_307: {
    type: 'character',
    src: '/assets/images/midnight_hospital/characters/npc_patient_307.webp',
    alt: '307 病人',
  },
  npc_director_shadow: {
    type: 'character',
    src: '/assets/images/midnight_hospital/characters/npc_director_shadow.webp',
    alt: '院长',
  },
  monster_night_shift_nurse: {
    type: 'monster',
    src: '/assets/images/midnight_hospital/monsters/night_shift_nurse.webp',
    alt: '值夜护士',
  },
  monster_cabinet_017_patient: {
    type: 'monster',
    src: '/assets/images/midnight_hospital/monsters/cabinet_017_patient.webp',
    alt: '017 冷柜病人',
  },
  monster_director_shadow: {
    type: 'monster',
    src: '/assets/images/midnight_hospital/monsters/director_shadow_monster.webp',
    alt: '院长影子',
  },
};

const cardIds = [
  'quick_search',
  'brace_yourself',
  'improvised_tool',
  'run_through',
  'pollution_noise',
  'scene_reconstruction',
  'medical_record_questioning',
  'logic_loop',
  'calm_observation',
  'door_breaker',
  'guard_vitals',
  'forced_entry',
  'improvised_weapon',
  'first_aid_kit',
  'sedative',
  'autopsy',
  'hemostasis',
  'blood_mark',
  'reverse_prayer',
  'sealing_talisman',
  'speak_with_shadow',
] as const;

for (const cardId of cardIds) {
  assetManifest[`card_${cardId}`] = {
    type: 'card',
    src: `/assets/images/midnight_hospital/cards/${cardId}.webp`,
    alt: cardId,
  };
}
