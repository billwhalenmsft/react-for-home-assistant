/**
 * SAMPLE HOUSE — the config this repo ships with.
 *
 * Every value here is invented. It exists so a fresh clone builds, runs and
 * renders something recognisable before you have wired up a single one of your
 * own entities, and so that no real household's device inventory has to live
 * in a public repository.
 *
 * To make it yours, copy this file to `local.ts` and edit the ids to match
 * your Home Assistant. `local.ts` is git-ignored and takes precedence
 * automatically — nothing else needs changing.
 *
 * Finding your ids: Developer Tools → States in Home Assistant lists every
 * entity. Anything left pointing at a sample id renders as unavailable; the
 * panel degrades card by card rather than failing whole.
 */
import type { HouseConfig } from './types';

export const SAMPLE_HOUSE: HouseConfig = {
  name: 'Maple Street',
  street: 'Maple Street',
  lockupScript: 'script.lockup',
  // Placeholder text in the Locations form. A city centre, not anybody's home.
  sampleCoords: { lat: '41.8781', lon: '-87.6298' },

  family: [
    { id: 'person.sam', name: 'Sam', battery: 'sensor.sams_phone_battery_level' },
    { id: 'person.alex', name: 'Alex', battery: 'sensor.alexs_phone_battery_level' },
    { id: 'person.jordan', name: 'Jordan' },
    { id: 'person.riley', name: 'Riley', note: 'Away at school' },
  ],

  entities: {
    // A template sensor summarising the house in one line.
    headline: 'sensor.house_headline',
    weather: 'weather.forecast_home',
    sun: 'sun.sun',
    person: 'device_tracker.sams_phone',
    phoneBatt: 'sensor.sams_phone_battery_level',
    phone: 'device_tracker.sams_phone',
    blink: 'alarm_control_panel.indoor_cameras',
    panel: 'alarm_control_panel.alarm_panel',
    lock: 'lock.front_door',
    garage1: 'cover.garage_double_door',
    garage2: 'cover.garage_single_door',
    doors: [
      ['Front Door', 'binary_sensor.front_door'],
      ['Patio Slider', 'binary_sensor.patio_door'],
      ['Lower Slider', 'binary_sensor.lower_patio_door'],
      ['Garage Entry', 'binary_sensor.garage_entry_door'],
    ],
    motion: 'binary_sensor.hallway_motion',

    // --- sky lab -------------------------------------------------------
    homeZone: 'zone.home',
    issPos: 'sensor.iss_position',
    issPassSummary: 'sensor.iss_pass_summary',
    issPassDir: 'sensor.iss_pass_direction',
    kp: 'sensor.planetary_k_index',
    apod: 'sensor.nasa_picture_of_the_day',
    auroraVerdict: 'sensor.aurora_verdict',
    nextLaunch: 'sensor.next_launch',
    nextLaunchName: 'sensor.next_launch_name',
    nextLaunchDetail: 'sensor.next_launch_detail',
    nextLaunchCountdown: 'sensor.next_launch_countdown',
    nextSpacex: 'sensor.next_spacex_launch',
    nextSpacexMission: 'sensor.next_spacex_mission',
    nextSpacexCountdown: 'sensor.next_spacex_countdown',
    epicImage: 'sensor.nasa_earth_image',
    epicWhen: 'sensor.nasa_earth_captured',

    laundryWasherFlag: 'input_boolean.washer_needs_unloading',
    laundryDryerFlag: 'input_boolean.dryer_needs_unloading',
    // Two zones, two systems. The Climate panel shows them as separate tabs;
    // point both at the same entity if you only have one thermostat.
    climate: 'climate.lower_level',
    climateNest: 'climate.main_floor',
    allLights: 'light.main_floor_all_lights',
    rooms: [
      { name: 'Kitchen', light: 'light.kitchen_all_lights', temp: 'sensor.kitchen_temperature' },
      { name: 'Living Room', light: 'light.living_room_lights', temp: 'sensor.living_room_temperature' },
      { name: 'Dining', light: 'light.dining_room_chandelier', temp: undefined },
      { name: 'Entry', light: 'light.entry_lights', temp: undefined },
    ],
    fixtures: [
      ['Island', 'light.kitchen_island'],
      ['Pendants', 'light.kitchen_pendants'],
      ['Living Room', 'light.living_room_lights'],
      ['Chandelier', 'light.dining_room_chandelier'],
      ['Foyer', 'light.foyer_lights'],
      ['Mudroom', 'light.mudroom_lights'],
    ],
    // Adaptive Lighting creates one switch per profile you define.
    autopilotHue: 'switch.adaptive_lighting_kitchen',
    autopilotDim: 'switch.adaptive_lighting_dimmers',
    frame: 'media_player.living_room_tv',
    marantz: 'media_player.av_receiver',
    sonos: [
      ['Living Room', 'media_player.living_room_speaker'],
      ['Bedroom', 'media_player.bedroom_speaker'],
      ['Office', 'media_player.office_speaker'],
    ],
    cams: [
      ['Front Door', 'camera.front_door'],
      ['Front Porch', 'camera.front_porch'],
      ['Driveway', 'camera.driveway'],
      ['Living Room', 'camera.living_room'],
      ['Back Yard', 'camera.back_yard'],
      ['Kitchen', 'camera.kitchen'],
    ],

    // --- grow tent -----------------------------------------------------
    soil: 'sensor.soil_moisture',
    soilBatt: 'sensor.soil_moisture_battery',
    tentTemp: 'sensor.tent_temperature',
    tentHum: 'sensor.tent_humidity',
    tentVpd: 'sensor.tent_vpd',
    water: 'sensor.humidifier_water_level',
    stage: 'sensor.grow_plan_stage',
    growOnline: [
      'binary_sensor.soil_sensor_online',
      'binary_sensor.weather_gateway_online',
      'binary_sensor.tent_controller_connected',
      'binary_sensor.humidifier_connected',
      'binary_sensor.drip_irrigation_connected',
    ],
    plantA: {
      name: 'input_text.plant_a_name',
      planted: 'input_datetime.plant_a_planted',
      stage: 'input_select.plant_a_stage',
    },
    plantB: {
      name: 'input_text.plant_b_name',
      planted: 'input_datetime.plant_b_planted',
      stage: 'input_select.plant_b_stage',
    },
    growLight: 'light.grow_light',
    ductFan: 'fan.duct_fan',
    circFan: 'fan.circulation_fan',
    humidifier: 'humidifier.tent_humidifier',
    lightPlan: 'sensor.grow_light_schedule',

    moon: 'sensor.moon_phase',
    moonEmoji: 'sensor.moon_emoji',
    aurora: 'sensor.aurora_visibility',
    waste: 'sensor.waste_upcoming',
    washer: 'sensor.washer_machine_state',
    dryer: 'sensor.dryer_machine_state',
  },

  // `does` is shown in the confirm dialog before the script runs, so write
  // what the script actually does — not what you wish it did.
  scenes: [
    {
      label: 'Movie Time', script: 'script.movie_time',
      does: 'Drops the main-floor lights to the movie scene and dims the kitchen to match.',
    },
    {
      label: 'All On', script: 'script.all_lights_on',
      does: 'Turns on every main-floor light at natural colour temperature.',
    },
    {
      label: 'All Off', script: 'script.all_lights_off',
      does: 'Turns off every main-floor light.',
    },
    {
      label: 'Half On', script: 'script.half_on',
      does: 'Main-floor lights to 40 percent.',
    },
    {
      label: 'Goodnight', script: 'script.goodnight',
      does: 'Puts adaptive lighting into sleep mode, turns every light off, and shuts down the TV and receiver.',
    },
    {
      label: 'Good Morning', script: 'script.morning_wake',
      does: 'Leaves sleep mode, disarms the indoor cameras, and brings the main floor up.',
    },
  ],

  // Floor key -> room name -> what is in it. Room names must match the plan.
  rooms: {
    fp_main: {
      'Living Room': {
        entities: [
          'light.living_room_lights',
          'media_player.living_room_tv',
          'media_player.av_receiver',
          'binary_sensor.living_room_motion',
        ],
        note: 'Recessed cans, 5.1 in-ceiling',
      },
      Kitchen: {
        entities: [
          'light.kitchen_all_lights',
          'light.kitchen_island',
          'light.kitchen_pendants',
          'binary_sensor.kitchen_motion',
        ],
        note: 'Cabinet strips and island dimmer',
      },
      Dining: {
        entities: ['light.dining_room_chandelier', 'binary_sensor.patio_door'],
      },
      Entry: {
        entities: ['light.foyer_lights', 'lock.front_door', 'binary_sensor.front_door'],
      },
      Garage: {
        entities: [
          'cover.garage_double_door',
          'cover.garage_single_door',
          'binary_sensor.garage_entry_door',
        ],
      },
      Study: { entities: [], note: 'Nothing wired here yet' },
    },
    fp_lower: {
      'Family Room': {
        entities: [
          'media_player.office_speaker',
          'binary_sensor.lower_patio_door',
          'climate.lower_level',
        ],
      },
      Laundry: {
        entities: ['sensor.washer_machine_state', 'sensor.dryer_machine_state'],
      },
    },
  },

  floorTabs: [
    { key: 'fp_main', label: 'Main' },
    { key: 'fp_lower', label: 'Lower' },
  ],

  /**
   * A deliberately plain sample plan: rectangular floors split into rooms, in
   * the same image-pixel coordinate space the real renderer emits. Replace it
   * by running the floorplan tooling against your own drawing (see
   * INSTALL.md) — or leave it, and the Rooms page still works from the
   * `rooms` map above.
   */
  plan: {
    width: 1300,
    height: 1000,
    pxPerFt: 26,
    floors: {
      fp_main: {
        title: 'MAIN FLOOR',
        rooms: [
          { name: 'Living Room', x: 60, y: 60, w: 520, h: 420, cold: false, material: 'wood', sqft: 320, paint: null },
          { name: 'Kitchen', x: 600, y: 60, w: 380, h: 420, cold: false, material: 'tile', sqft: 236, paint: null },
          { name: 'Dining', x: 1000, y: 60, w: 240, h: 420, cold: false, material: 'wood', sqft: 149, paint: null },
          { name: 'Entry', x: 60, y: 500, w: 300, h: 440, cold: false, material: 'tile', sqft: 195, paint: null },
          { name: 'Study', x: 380, y: 500, w: 300, h: 440, cold: false, material: 'carpet', sqft: 195, paint: null },
          { name: 'Garage', x: 700, y: 500, w: 540, h: 440, cold: true, material: 'concrete', sqft: 351, paint: null },
        ],
      },
      fp_lower: {
        title: 'LOWER LEVEL',
        rooms: [
          { name: 'Family Room', x: 60, y: 60, w: 700, h: 500, cold: false, material: 'carpet', sqft: 518, paint: null },
          { name: 'Laundry', x: 780, y: 60, w: 460, h: 240, cold: false, material: 'tile', sqft: 163, paint: null },
        ],
      },
    },
    materialColors: {
      wood: [122, 92, 62],
      tile: [138, 142, 148],
      carpet: [108, 104, 116],
      concrete: [96, 99, 103],
    },
  },
};
