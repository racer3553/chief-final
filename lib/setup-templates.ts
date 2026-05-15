export type CarType = 'dirt_late_model' | 'pavement_late_model' | 'wing_sprint' | 'non_wing_sprint' | 'wing_micro' | 'non_wing_micro' | 'dirt_modified' | 'street_stock'

export const CAR_TYPE_OPTIONS = [
  { value: 'dirt_late_model', label: 'Dirt Late Model' },
  { value: 'pavement_late_model', label: 'Pavement Late Model' },
  { value: 'wing_sprint', label: 'Wing Sprint Car' },
  { value: 'non_wing_sprint', label: 'Non-Wing Sprint Car' },
  { value: 'wing_micro', label: 'Wing Micro Sprint' },
  { value: 'non_wing_micro', label: 'Non-Wing Micro Sprint' },
  { value: 'dirt_modified', label: 'Dirt Modified' },
  { value: 'street_stock', label: 'Street Stock / IMCA' },
] as const

export interface SetupSection {
  title: string
  color: string
  fields: { key: string; label: string; type: 'number' | 'text' | 'select'; unit?: string; step?: number; options?: string[] }[]
}

const TIRE_SECTION: SetupSection = {
  title: 'TIRES', color: '#f5c518',
  fields: [
    { key: 'tire_brand', label: 'Brand', type: 'select', options: ['Hoosier', 'American Racer', 'McCreary', 'Goodyear', 'Other'] },
    { key: 'tire_compound', label: 'Compound', type: 'text' },
    { key: 'lf_cold_psi', label: 'LF Cold PSI', type: 'number', unit: 'psi', step: 0.5 },
    { key: 'rf_cold_psi', label: 'RF Cold PSI', type: 'number', unit: 'psi', step: 0.5 },
    { key: 'lr_cold_psi', label: 'LR Cold PSI', type: 'number', unit: 'psi', step: 0.5 },
    { key: 'rr_cold_psi', label: 'RR Cold PSI', type: 'number', unit: 'psi', step: 0.5 },
    { key: 'lf_hot_psi', label: 'LF Hot PSI', type: 'number', unit: 'psi', step: 0.5 },
    { key: 'rf_hot_psi', label: 'RF Hot PSI', type: 'number', unit: 'psi', step: 0.5 },
    { key: 'lr_hot_psi', label: 'LR Hot PSI', type: 'number', unit: 'psi', step: 0.5 },
    { key: 'rr_hot_psi', label: 'RR Hot PSI', type: 'number', unit: 'psi', step: 0.5 },
    { key: 'lf_duro', label: 'LF Duro', type: 'number', step: 0.5 },
    { key: 'rf_duro', label: 'RF Duro', type: 'number', step: 0.5 },
    { key: 'lr_duro', label: 'LR Duro', type: 'number', step: 0.5 },
    { key: 'rr_duro', label: 'RR Duro', type: 'number', step: 0.5 },
  ],
}

const ALIGNMENT_SECTION: SetupSection = {
  title: 'ALIGNMENT', color: '#39ff14',
  fields: [
    { key: 'lf_caster', label: 'LF Caster', type: 'number', unit: '°', step: 0.25 },
    { key: 'rf_caster', label: 'RF Caster', type: 'number', unit: '°', step: 0.25 },
    { key: 'lf_camber', label: 'LF Camber', type: 'number', unit: '°', step: 0.25 },
    { key: 'rf_camber', label: 'RF Camber', type: 'number', unit: '°', step: 0.25 },
    { key: 'lr_camber', label: 'LR Camber', type: 'number', unit: '°', step: 0.25 },
    { key: 'rr_camber', label: 'RR Camber', type: 'number', unit: '°', step: 0.25 },
    { key: 'front_toe', label: 'Front Toe', type: 'number', unit: '"', step: 0.0625 },
    { key: 'rear_toe', label: 'Rear Toe', type: 'number', unit: '"', step: 0.0625 },
  ],
}

const WEIGHTS_SECTION: SetupSection = {
  title: 'WEIGHTS & BALANCE', color: '#00e5ff',
  fields: [
    { key: 'lf_weight', label: 'LF Weight', type: 'number', unit: 'lbs' },
    { key: 'rf_weight', label: 'RF Weight', type: 'number', unit: 'lbs' },
    { key: 'lr_weight', label: 'LR Weight', type: 'number', unit: 'lbs' },
    { key: 'rr_weight', label: 'RR Weight', type: 'number', unit: 'lbs' },
    { key: 'total_weight', label: 'Total Weight', type: 'number', unit: 'lbs' },
    { key: 'left_side_pct', label: 'Left Side %', type: 'number', unit: '%', step: 0.1 },
    { key: 'cross_weight_pct', label: 'Cross/Wedge %', type: 'number', unit: '%', step: 0.1 },
  ],
}

const RESULTS_SECTION: SetupSection = {
  title: 'RESULTS', color: '#f5c518',
  fields: [
    { key: 'qualifying_time', label: 'Qualifying Time', type: 'number', unit: 's', step: 0.001 },
    { key: 'best_lap_time', label: 'Best Lap Time', type: 'number', unit: 's', step: 0.001 },
    { key: 'heat_finish', label: 'Heat Finish', type: 'text' },
    { key: 'feature_finish', label: 'Feature Finish', type: 'text' },
  ],
}

export const CAR_TEMPLATES: Record<CarType, { label: string; sections: SetupSection[] }> = {
  dirt_late_model: {
    label: 'Dirt Late Model',
    sections: [
      TIRE_SECTION,
      { title: 'STAGGER & HEIGHTS', color: '#f5c518', fields: [
        { key: 'front_stagger', label: 'Front Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'rear_stagger', label: 'Rear Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'lf_ride_height', label: 'LF Ride Height', type: 'number', unit: '"', step: 0.125 },
        { key: 'rf_ride_height', label: 'RF Ride Height', type: 'number', unit: '"', step: 0.125 },
        { key: 'lr_ride_height', label: 'LR Ride Height', type: 'number', unit: '"', step: 0.125 },
        { key: 'rr_ride_height', label: 'RR Ride Height', type: 'number', unit: '"', step: 0.125 },
      ]},
      { title: 'SPRINGS & SHOCKS', color: '#39ff14', fields: [
        { key: 'lf_spring', label: 'LF Spring', type: 'number', unit: 'lb/in' },
        { key: 'rf_spring', label: 'RF Spring', type: 'number', unit: 'lb/in' },
        { key: 'lr_spring', label: 'LR Spring', type: 'number', unit: 'lb/in' },
        { key: 'rr_spring', label: 'RR Spring', type: 'number', unit: 'lb/in' },
        { key: 'lf_shock_comp', label: 'LF Comp', type: 'number' },
        { key: 'rf_shock_comp', label: 'RF Comp', type: 'number' },
        { key: 'lr_shock_comp', label: 'LR Comp', type: 'number' },
        { key: 'rr_shock_comp', label: 'RR Comp', type: 'number' },
        { key: 'lf_shock_reb', label: 'LF Reb', type: 'number' },
        { key: 'rf_shock_reb', label: 'RF Reb', type: 'number' },
        { key: 'lr_shock_reb', label: 'LR Reb', type: 'number' },
        { key: 'rr_shock_reb', label: 'RR Reb', type: 'number' },
      ]},
      { title: 'WEDGE & SWAY BARS', color: '#ff2d2d', fields: [
        { key: 'wedge_turns', label: 'Wedge Turns', type: 'number', step: 0.25 },
        { key: 'lr_bite', label: 'LR Bite', type: 'number', unit: 'lbs' },
        { key: 'rr_bite', label: 'RR Bite', type: 'number', unit: 'lbs' },
        { key: 'front_sway_bar_size', label: 'Front Bar', type: 'number', unit: '"', step: 0.0625 },
        { key: 'rear_sway_bar_size', label: 'Rear Bar', type: 'number', unit: '"', step: 0.0625 },
      ]},
      { title: 'REAR GEOMETRY', color: '#00e5ff', fields: [
        { key: 'panhard_bar_lr', label: 'Panhard LR', type: 'number', unit: '"', step: 0.125 },
        { key: 'panhard_bar_rr', label: 'Panhard RR', type: 'number', unit: '"', step: 0.125 },
        { key: 'j_bar_height', label: 'J-Bar Height', type: 'number', unit: '"', step: 0.125 },
        { key: 'birdcage_offset', label: 'Birdcage Offset', type: 'text' },
        { key: 'lr_trailing_arm_angle', label: 'LR Trailing Arm', type: 'number', unit: '°', step: 0.25 },
        { key: 'rr_trailing_arm_angle', label: 'RR Trailing Arm', type: 'number', unit: '°', step: 0.25 },
      ]},
      ALIGNMENT_SECTION, WEIGHTS_SECTION,
      { title: 'GEAR & BRAKES', color: '#888', fields: [
        { key: 'gear_ratio', label: 'Gear Ratio', type: 'text' },
        { key: 'brake_bias', label: 'Brake Bias', type: 'number', unit: '%', step: 0.5 },
      ]},
      RESULTS_SECTION,
    ],
  },
  wing_sprint: {
    label: 'Wing Sprint Car',
    sections: [
      TIRE_SECTION,
      { title: 'TORSION BARS & BLOCKS', color: '#f5c518', fields: [
        { key: 'front_stagger', label: 'Front Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'rear_stagger', label: 'Rear Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'lf_torsion_bar', label: 'LF Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'rf_torsion_bar', label: 'RF Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'lr_torsion_bar', label: 'LR Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'rr_torsion_bar', label: 'RR Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'lf_torsion_arm_angle', label: 'LF Arm Angle', type: 'number', unit: '°', step: 0.5 },
        { key: 'rf_torsion_arm_angle', label: 'RF Arm Angle', type: 'number', unit: '°', step: 0.5 },
        { key: 'lf_block_height', label: 'LF Block', type: 'number', unit: '"', step: 0.0625 },
        { key: 'rf_block_height', label: 'RF Block', type: 'number', unit: '"', step: 0.0625 },
        { key: 'lr_block_height', label: 'LR Block', type: 'number', unit: '"', step: 0.0625 },
        { key: 'rr_block_height', label: 'RR Block', type: 'number', unit: '"', step: 0.0625 },
      ]},
      { title: 'WINGS', color: '#00e5ff', fields: [
        { key: 'front_wing_angle', label: 'Front Wing Angle', type: 'number', unit: '°', step: 0.5 },
        { key: 'rear_wing_angle', label: 'Rear Wing Angle', type: 'number', unit: '°', step: 0.5 },
        { key: 'front_wing_offset', label: 'Front Wing Offset', type: 'text' },
        { key: 'rear_wing_side_boards', label: 'Side Boards', type: 'text' },
      ]},
      ALIGNMENT_SECTION, WEIGHTS_SECTION, RESULTS_SECTION,
    ],
  },
  non_wing_sprint: {
    label: 'Non-Wing Sprint Car',
    sections: [
      TIRE_SECTION,
      { title: 'TORSION BARS', color: '#f5c518', fields: [
        { key: 'front_stagger', label: 'Front Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'rear_stagger', label: 'Rear Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'lf_torsion_bar', label: 'LF Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'rf_torsion_bar', label: 'RF Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'lr_torsion_bar', label: 'LR Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'rr_torsion_bar', label: 'RR Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'lf_block_height', label: 'LF Block', type: 'number', unit: '"', step: 0.0625 },
        { key: 'rf_block_height', label: 'RF Block', type: 'number', unit: '"', step: 0.0625 },
        { key: 'lr_block_height', label: 'LR Block', type: 'number', unit: '"', step: 0.0625 },
        { key: 'rr_block_height', label: 'RR Block', type: 'number', unit: '"', step: 0.0625 },
      ]},
      ALIGNMENT_SECTION, WEIGHTS_SECTION, RESULTS_SECTION,
    ],
  },
  pavement_late_model: {
    label: 'Pavement Late Model',
    sections: [
      TIRE_SECTION,
      { title: 'SPRINGS & SHOCKS', color: '#39ff14', fields: [
        { key: 'lf_spring', label: 'LF Spring', type: 'number', unit: 'lb/in' },
        { key: 'rf_spring', label: 'RF Spring', type: 'number', unit: 'lb/in' },
        { key: 'lr_spring', label: 'LR Spring', type: 'number', unit: 'lb/in' },
        { key: 'rr_spring', label: 'RR Spring', type: 'number', unit: 'lb/in' },
        { key: 'lf_shock_comp', label: 'LF Comp', type: 'number' },
        { key: 'rf_shock_comp', label: 'RF Comp', type: 'number' },
        { key: 'lr_shock_comp', label: 'LR Comp', type: 'number' },
        { key: 'rr_shock_comp', label: 'RR Comp', type: 'number' },
        { key: 'lf_ride_height', label: 'LF Ride Height', type: 'number', unit: '"', step: 0.125 },
        { key: 'rf_ride_height', label: 'RF Ride Height', type: 'number', unit: '"', step: 0.125 },
        { key: 'lr_ride_height', label: 'LR Ride Height', type: 'number', unit: '"', step: 0.125 },
        { key: 'rr_ride_height', label: 'RR Ride Height', type: 'number', unit: '"', step: 0.125 },
        { key: 'brake_bias', label: 'Brake Bias', type: 'number', unit: '%', step: 0.5 },
      ]},
      ALIGNMENT_SECTION, WEIGHTS_SECTION, RESULTS_SECTION,
    ],
  },
  wing_micro: {
    label: 'Wing Micro Sprint',
    sections: [
      TIRE_SECTION,
      { title: 'TORSION BARS & WINGS', color: '#f5c518', fields: [
        { key: 'front_stagger', label: 'Front Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'rear_stagger', label: 'Rear Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'lf_torsion_bar', label: 'LF Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'rf_torsion_bar', label: 'RF Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'lr_torsion_bar', label: 'LR Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'rr_torsion_bar', label: 'RR Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'front_wing_angle', label: 'Front Wing', type: 'number', unit: '°', step: 0.5 },
        { key: 'rear_wing_angle', label: 'Rear Wing', type: 'number', unit: '°', step: 0.5 },
        { key: 'lf_block_height', label: 'LF Block', type: 'number', unit: '"', step: 0.0625 },
        { key: 'rf_block_height', label: 'RF Block', type: 'number', unit: '"', step: 0.0625 },
        { key: 'lr_block_height', label: 'LR Block', type: 'number', unit: '"', step: 0.0625 },
        { key: 'rr_block_height', label: 'RR Block', type: 'number', unit: '"', step: 0.0625 },
      ]},
      ALIGNMENT_SECTION, WEIGHTS_SECTION, RESULTS_SECTION,
    ],
  },
  non_wing_micro: {
    label: 'Non-Wing Micro Sprint',
    sections: [
      TIRE_SECTION,
      { title: 'TORSION BARS', color: '#f5c518', fields: [
        { key: 'front_stagger', label: 'Front Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'rear_stagger', label: 'Rear Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'lf_torsion_bar', label: 'LF Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'rf_torsion_bar', label: 'RF Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'lr_torsion_bar', label: 'LR Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'rr_torsion_bar', label: 'RR Bar', type: 'number', unit: '"', step: 0.001 },
        { key: 'lf_block_height', label: 'LF Block', type: 'number', unit: '"', step: 0.0625 },
        { key: 'rf_block_height', label: 'RF Block', type: 'number', unit: '"', step: 0.0625 },
        { key: 'lr_block_height', label: 'LR Block', type: 'number', unit: '"', step: 0.0625 },
        { key: 'rr_block_height', label: 'RR Block', type: 'number', unit: '"', step: 0.0625 },
      ]},
      ALIGNMENT_SECTION, WEIGHTS_SECTION, RESULTS_SECTION,
    ],
  },
  dirt_modified: {
    label: 'Dirt Modified',
    sections: [
      TIRE_SECTION,
      { title: 'SPRINGS & GEOMETRY', color: '#f5c518', fields: [
        { key: 'front_stagger', label: 'Front Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'rear_stagger', label: 'Rear Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'lf_spring', label: 'LF Spring', type: 'number', unit: 'lb/in' },
        { key: 'rf_spring', label: 'RF Spring', type: 'number', unit: 'lb/in' },
        { key: 'lr_spring', label: 'LR Spring', type: 'number', unit: 'lb/in' },
        { key: 'rr_spring', label: 'RR Spring', type: 'number', unit: 'lb/in' },
        { key: 'wedge_turns', label: 'Wedge', type: 'number', step: 0.25 },
        { key: 'panhard_bar_lr', label: 'Panhard LR', type: 'number', unit: '"', step: 0.125 },
        { key: 'panhard_bar_rr', label: 'Panhard RR', type: 'number', unit: '"', step: 0.125 },
      ]},
      ALIGNMENT_SECTION, WEIGHTS_SECTION, RESULTS_SECTION,
    ],
  },
  street_stock: {
    label: 'Street Stock / IMCA',
    sections: [
      TIRE_SECTION,
      { title: 'SPRINGS & BASICS', color: '#f5c518', fields: [
        { key: 'front_stagger', label: 'Front Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'rear_stagger', label: 'Rear Stagger', type: 'number', unit: '"', step: 0.125 },
        { key: 'lf_spring', label: 'LF Spring', type: 'number', unit: 'lb/in' },
        { key: 'rf_spring', label: 'RF Spring', type: 'number', unit: 'lb/in' },
        { key: 'lr_spring', label: 'LR Spring', type: 'number', unit: 'lb/in' },
        { key: 'rr_spring', label: 'RR Spring', type: 'number', unit: 'lb/in' },
        { key: 'wedge_turns', label: 'Wedge Turns', type: 'number', step: 0.25 },
        { key: 'lr_bite', label: 'LR Bite', type: 'number', unit: 'lbs' },
      ]},
      ALIGNMENT_SECTION, WEIGHTS_SECTION, RESULTS_SECTION,
    ],
  },
}
