/**
 * What lives in each room.
 *
 * The floorplan's glow map (in floorplan.tsx) is deliberately one entity per
 * room — the thing whose state colours the room. This is the fuller picture,
 * used by the drill-in panel when you tap a room.
 *
 * Rooms absent from a floor's map simply have nothing wired yet; the panel
 * says so rather than pretending. Notably the whole upper floor has no lights
 * at all, and the Study has none either — both confirmed against the electrical
 * plan, not an oversight.
 */

export interface RoomDevices {
  /** entity ids, in the order they should appear */
  entities: string[];
  /** optional note shown under the room name */
  note?: string;
}

export const ROOM_DEVICES: Record<string, Record<string, RoomDevices>> = {
  fp_main: {
    'Great Room': {
      entities: [
        'light.living_room_living_room_main_lights',
        'media_player.samsung_the_frame_65',
        'media_player.marantz_sr6011',
        'binary_sensor.living_room_motion',
      ],
      note: '4 recessed cans · 5.1 in-ceiling + sub',
    },
    Kitchen: {
      entities: [
        'light.kitchen_all_lights',
        'light.kitchen_kitchen_island_lights',
        'light.kitchen_kitchen_island_pendants',
        'light.kitchen_kitchen_above_cabinets_left',
        'light.kitchen_kitchen_above_cabinet_right',
        'light.kitchen_right_kitchen_under_cabinet',
        'light.kitchen_left_lower_kitchen_cabinet',
        'binary_sensor.kitchen_dining_motion',
      ],
      note: 'Hue cabinet strips + Caséta island',
    },
    Dining: {
      entities: ['light.dining_room_dining_room_chandelier', 'binary_sensor.dining_sliding_door'],
    },
    Entry: {
      entities: [
        'light.front_foyer_front_foyer_main_lights',
        'lock.yale_front_door_lock',
        'binary_sensor.front_door',
      ],
    },
    Mud: {
      entities: ['light.mudroom_mudroom_main_lights', 'binary_sensor.garage_entry_door'],
    },
    Garage: {
      entities: [
        'cover.garage_single_door',
        'light.garage_single_light',
        'lock.garage_single_remotes',
        'binary_sensor.garage_single_obstruction',
        'binary_sensor.garage_single_motion',
        // second door is still the alarm.com cloud entity until its board is flashed
        'cover.garage_door_2',
      ],
      note: '8×8 single bay on ratgdo (local) · 16×8 double still via alarm.com',
    },
    Porch: {
      entities: ['binary_sensor.front_porch_motion'],
    },
    Study: { entities: [], note: 'No smart lighting — Cat 6 + TV drop only' },
  },

  fp_upper: {
    Laundry: {
      entities: ['sensor.laundry_room_washer_machine_state', 'sensor.laundry_room_dryer_machine_state'],
    },
    'Master Bedroom': { entities: ['media_player.bedroom_bedroom'] },
    'Bedroom 2': { entities: [], note: 'SW 6225 Sleepy Blue' },
    'Bedroom 3': { entities: [], note: 'SW 6743 Mint Condition' },
    'Bedroom 4': { entities: [], note: 'SW 6486 Reflecting Pool' },
  },

  fp_lower: {
    'Family Room': {
      entities: ['media_player.family_room_family_room', 'climate.family_room'],
    },
    Mechanical: {
      entities: ['alarm_control_panel.panel'],
      note: 'Structured wiring hub · alarm panel',
    },
    Bedroom: { entities: ['binary_sensor.lower_motion_motion', 'binary_sensor.lower_sliding_door'] },
  },
};

export const FLOOR_TABS: Array<{ key: string; label: string }> = [
  { key: 'fp_main', label: 'Main' },
  { key: 'fp_upper', label: 'Upper' },
  { key: 'fp_lower', label: 'Lower' },
];
