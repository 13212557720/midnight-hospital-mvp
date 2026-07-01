import type { InstanceDefinition } from '../../../engine/types';

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
    'mh_node_06_elevator_shaft',
  ],
  finalNodeId: 'mh_final_rooftop_lift',
  recommendedCareers: ['investigator', 'physician'],
};
