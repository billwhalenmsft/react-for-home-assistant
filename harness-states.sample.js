// SAMPLE STATES for the offline harness. Every value here is invented.
//
// harness.html renders the panel in a plain browser tab with no Home Assistant
// behind it. That is the safe way to work on layout, and on gesture logic --
// stub hass.callService and dispatch synthetic pointer events rather than
// dragging a dial wired to a real furnace. It needs a snapshot of entity
// states to render against, and this is that snapshot for the sample house in
// src/house/sample.ts, so a fresh clone can run the harness immediately.
//
// To work against your own house instead, drop a real dump at
// harness-states.local.js. It loads after this file and overrides it. Keep
// that file out of git: a states dump is a complete inventory of a real home.
window.MOCK_ENTITIES = {
 "alarm_control_panel.alarm_panel": {
  "s": "disarmed",
  "a": {
   "friendly_name": "Alarm Panel"
  },
  "lc": 1787728478,
  "lu": 1787749323,
  "c": "x"
 },
 "alarm_control_panel.indoor_cameras": {
  "s": "disarmed",
  "a": {
   "friendly_name": "Indoor Cameras"
  },
  "lc": 1787723825,
  "lu": 1787747274,
  "c": "x"
 },
 "binary_sensor.diffuser_needs_refill": {
  "s": "off",
  "a": {
   "friendly_name": "Diffuser Needs Refill"
  },
  "lc": 1787746536,
  "lu": 1787749644,
  "c": "x"
 },
 "binary_sensor.drip_irrigation_connected": {
  "s": "on",
  "a": {
   "friendly_name": "Drip Irrigation Connected"
  },
  "lc": 1787714581,
  "lu": 1787749555,
  "c": "x"
 },
 "binary_sensor.entry_diffuser_connected": {
  "s": "on",
  "a": {
   "friendly_name": "Entry Diffuser Connected"
  },
  "lc": 1787725735,
  "lu": 1787747553,
  "c": "x"
 },
 "binary_sensor.front_door": {
  "s": "off",
  "a": {
   "friendly_name": "Front Door"
  },
  "lc": 1787745899,
  "lu": 1787747862,
  "c": "x"
 },
 "binary_sensor.garage_entry_door": {
  "s": "off",
  "a": {
   "friendly_name": "Garage Entry Door"
  },
  "lc": 1787735630,
  "lu": 1787749787,
  "c": "x"
 },
 "binary_sensor.hallway_motion": {
  "s": "off",
  "a": {
   "friendly_name": "Hallway Motion"
  },
  "lc": 1787744068,
  "lu": 1787748164,
  "c": "x"
 },
 "binary_sensor.humidifier_connected": {
  "s": "on",
  "a": {
   "friendly_name": "Humidifier Connected"
  },
  "lc": 1787722295,
  "lu": 1787749654,
  "c": "x"
 },
 "binary_sensor.kitchen_motion": {
  "s": "off",
  "a": {
   "friendly_name": "Kitchen Motion"
  },
  "lc": 1787733928,
  "lu": 1787749569,
  "c": "x"
 },
 "binary_sensor.living_room_diffuser_connected": {
  "s": "on",
  "a": {
   "friendly_name": "Living Room Diffuser Connected"
  },
  "lc": 1787713587,
  "lu": 1787748202,
  "c": "x"
 },
 "binary_sensor.living_room_motion": {
  "s": "off",
  "a": {
   "friendly_name": "Living Room Motion"
  },
  "lc": 1787745827,
  "lu": 1787747624,
  "c": "x"
 },
 "binary_sensor.lower_patio_door": {
  "s": "off",
  "a": {
   "friendly_name": "Lower Patio Door"
  },
  "lc": 1787741587,
  "lu": 1787749026,
  "c": "x"
 },
 "binary_sensor.patio_door": {
  "s": "off",
  "a": {
   "friendly_name": "Patio Door"
  },
  "lc": 1787711493,
  "lu": 1787749687,
  "c": "x"
 },
 "binary_sensor.soil_sensor_online": {
  "s": "on",
  "a": {
   "friendly_name": "Soil Sensor Online"
  },
  "lc": 1787711879,
  "lu": 1787747542,
  "c": "x"
 },
 "binary_sensor.tent_controller_connected": {
  "s": "on",
  "a": {
   "friendly_name": "Tent Controller Connected"
  },
  "lc": 1787723704,
  "lu": 1787749737,
  "c": "x"
 },
 "binary_sensor.weather_gateway_online": {
  "s": "on",
  "a": {
   "friendly_name": "Weather Gateway Online"
  },
  "lc": 1787735212,
  "lu": 1787749750,
  "c": "x"
 },
 "camera.back_yard": {
  "s": "--",
  "a": {
   "friendly_name": "Back Yard"
  },
  "lc": 1787713219,
  "lu": 1787749395,
  "c": "x"
 },
 "camera.driveway": {
  "s": "--",
  "a": {
   "friendly_name": "Driveway"
  },
  "lc": 1787730721,
  "lu": 1787748224,
  "c": "x"
 },
 "camera.front_door": {
  "s": "--",
  "a": {
   "friendly_name": "Front Door"
  },
  "lc": 1787740247,
  "lu": 1787747726,
  "c": "x"
 },
 "camera.front_porch": {
  "s": "--",
  "a": {
   "friendly_name": "Front Porch"
  },
  "lc": 1787741981,
  "lu": 1787747602,
  "c": "x"
 },
 "camera.kitchen": {
  "s": "--",
  "a": {
   "friendly_name": "Kitchen"
  },
  "lc": 1787729484,
  "lu": 1787747646,
  "c": "x"
 },
 "camera.living_room": {
  "s": "--",
  "a": {
   "friendly_name": "Living Room"
  },
  "lc": 1787737856,
  "lu": 1787749518,
  "c": "x"
 },
 "climate.lower_level": {
  "s": "heat",
  "a": {
   "friendly_name": "Lower Level",
   "current_temperature": 69,
   "temperature": 70,
   "current_humidity": 41,
   "hvac_action": "idle",
   "hvac_modes": [
    "heat",
    "cool",
    "heat_cool",
    "off"
   ],
   "preset_modes": [
    "none",
    "eco"
   ],
   "min_temp": 50,
   "max_temp": 90
  },
  "lc": 1787711585,
  "lu": 1787747601,
  "c": "x"
 },
 "climate.main_floor": {
  "s": "heat",
  "a": {
   "friendly_name": "Main Floor",
   "current_temperature": 69,
   "temperature": 70,
   "current_humidity": 41,
   "hvac_action": "idle",
   "hvac_modes": [
    "heat",
    "cool",
    "heat_cool",
    "off"
   ],
   "preset_modes": [
    "none",
    "eco"
   ],
   "min_temp": 50,
   "max_temp": 90
  },
  "lc": 1787737388,
  "lu": 1787748415,
  "c": "x"
 },
 "cover.garage_double_door": {
  "s": "closed",
  "a": {
   "friendly_name": "Garage Double Door",
   "device_class": "garage",
   "current_position": 0
  },
  "lc": 1787743315,
  "lu": 1787747697,
  "c": "x"
 },
 "cover.garage_single_door": {
  "s": "closed",
  "a": {
   "friendly_name": "Garage Single Door",
   "device_class": "garage",
   "current_position": 0
  },
  "lc": 1787745586,
  "lu": 1787747629,
  "c": "x"
 },
 "device_tracker.sams_phone": {
  "s": "home",
  "a": {
   "friendly_name": "Sams Phone"
  },
  "lc": 1787745794,
  "lu": 1787747405,
  "c": "x"
 },
 "fan.circulation_fan": {
  "s": "on",
  "a": {
   "friendly_name": "Circulation Fan",
   "percentage": 45
  },
  "lc": 1787736203,
  "lu": 1787747907,
  "c": "x"
 },
 "fan.duct_fan": {
  "s": "on",
  "a": {
   "friendly_name": "Duct Fan",
   "percentage": 45
  },
  "lc": 1787714854,
  "lu": 1787748189,
  "c": "x"
 },
 "humidifier.tent_humidifier": {
  "s": "on",
  "a": {
   "friendly_name": "Tent Humidifier",
   "humidity": 60
  },
  "lc": 1787729113,
  "lu": 1787748033,
  "c": "x"
 },
 "input_boolean.dryer_needs_unloading": {
  "s": "on",
  "a": {
   "friendly_name": "Dryer Needs Unloading"
  },
  "lc": 1787711325,
  "lu": 1787748084,
  "c": "x"
 },
 "input_boolean.washer_needs_unloading": {
  "s": "on",
  "a": {
   "friendly_name": "Washer Needs Unloading"
  },
  "lc": 1787726004,
  "lu": 1787748713,
  "c": "x"
 },
 "input_datetime.plant_a_planted": {
  "s": "2026-06-14",
  "a": {
   "friendly_name": "Plant A Planted"
  },
  "lc": 1787733420,
  "lu": 1787749204,
  "c": "x"
 },
 "input_datetime.plant_b_planted": {
  "s": "2026-06-14",
  "a": {
   "friendly_name": "Plant B Planted"
  },
  "lc": 1787733703,
  "lu": 1787749605,
  "c": "x"
 },
 "input_select.plant_a_stage": {
  "s": "Late Veg",
  "a": {
   "friendly_name": "Plant A Stage",
   "options": [
    "Germination",
    "Seedling",
    "Early Veg",
    "Late Veg",
    "Flowering",
    "Flushing",
    "Harvested"
   ]
  },
  "lc": 1787712055,
  "lu": 1787748711,
  "c": "x"
 },
 "input_select.plant_b_stage": {
  "s": "Late Veg",
  "a": {
   "friendly_name": "Plant B Stage",
   "options": [
    "Germination",
    "Seedling",
    "Early Veg",
    "Late Veg",
    "Flowering",
    "Flushing",
    "Harvested"
   ]
  },
  "lc": 1787715281,
  "lu": 1787747913,
  "c": "x"
 },
 "input_text.plant_a_name": {
  "s": "Blue Dream",
  "a": {
   "friendly_name": "Plant A Name"
  },
  "lc": 1787727190,
  "lu": 1787748102,
  "c": "x"
 },
 "input_text.plant_b_name": {
  "s": "Northern Lights",
  "a": {
   "friendly_name": "Plant B Name"
  },
  "lc": 1787730830,
  "lu": 1787747446,
  "c": "x"
 },
 "light.dining_room_chandelier": {
  "s": "off",
  "a": {
   "friendly_name": "Dining Room Chandelier",
   "brightness": null,
   "supported_color_modes": [
    "brightness"
   ]
  },
  "lc": 1787744903,
  "lu": 1787749457,
  "c": "x"
 },
 "light.entry_lights": {
  "s": "off",
  "a": {
   "friendly_name": "Entry Lights",
   "brightness": null,
   "supported_color_modes": [
    "brightness"
   ]
  },
  "lc": 1787716150,
  "lu": 1787748228,
  "c": "x"
 },
 "light.foyer_lights": {
  "s": "off",
  "a": {
   "friendly_name": "Foyer Lights",
   "brightness": null,
   "supported_color_modes": [
    "brightness"
   ]
  },
  "lc": 1787738890,
  "lu": 1787748539,
  "c": "x"
 },
 "light.grow_light": {
  "s": "off",
  "a": {
   "friendly_name": "Grow Light",
   "brightness": null,
   "supported_color_modes": [
    "brightness"
   ]
  },
  "lc": 1787739740,
  "lu": 1787747938,
  "c": "x"
 },
 "light.kitchen_all_lights": {
  "s": "on",
  "a": {
   "friendly_name": "Kitchen All Lights",
   "brightness": 196,
   "supported_color_modes": [
    "brightness"
   ]
  },
  "lc": 1787722064,
  "lu": 1787749780,
  "c": "x"
 },
 "light.kitchen_island": {
  "s": "on",
  "a": {
   "friendly_name": "Kitchen Island",
   "brightness": 196,
   "supported_color_modes": [
    "brightness"
   ]
  },
  "lc": 1787744614,
  "lu": 1787747655,
  "c": "x"
 },
 "light.kitchen_pendants": {
  "s": "on",
  "a": {
   "friendly_name": "Kitchen Pendants",
   "brightness": 196,
   "supported_color_modes": [
    "brightness"
   ]
  },
  "lc": 1787712147,
  "lu": 1787748655,
  "c": "x"
 },
 "light.living_room_lights": {
  "s": "on",
  "a": {
   "friendly_name": "Living Room Lights",
   "brightness": 196,
   "supported_color_modes": [
    "brightness"
   ]
  },
  "lc": 1787727410,
  "lu": 1787747093,
  "c": "x"
 },
 "light.main_floor_all_lights": {
  "s": "off",
  "a": {
   "friendly_name": "Main Floor All Lights",
   "brightness": null,
   "supported_color_modes": [
    "brightness"
   ]
  },
  "lc": 1787726751,
  "lu": 1787747506,
  "c": "x"
 },
 "light.mudroom_lights": {
  "s": "off",
  "a": {
   "friendly_name": "Mudroom Lights",
   "brightness": null,
   "supported_color_modes": [
    "brightness"
   ]
  },
  "lc": 1787717150,
  "lu": 1787747565,
  "c": "x"
 },
 "lock.front_door": {
  "s": "locked",
  "a": {
   "friendly_name": "Front Door"
  },
  "lc": 1787719803,
  "lu": 1787749659,
  "c": "x"
 },
 "media_player.av_receiver": {
  "s": "off",
  "a": {
   "friendly_name": "Av Receiver",
   "media_title": null,
   "media_artist": null,
   "volume_level": 0.3
  },
  "lc": 1787743567,
  "lu": 1787748835,
  "c": "x"
 },
 "media_player.bedroom_speaker": {
  "s": "off",
  "a": {
   "friendly_name": "Bedroom Speaker",
   "media_title": null,
   "media_artist": null,
   "volume_level": 0.3
  },
  "lc": 1787718630,
  "lu": 1787747085,
  "c": "x"
 },
 "media_player.living_room_speaker": {
  "s": "playing",
  "a": {
   "friendly_name": "Living Room Speaker",
   "media_title": "Rhiannon",
   "media_artist": "Fleetwood Mac",
   "volume_level": 0.3
  },
  "lc": 1787745441,
  "lu": 1787749692,
  "c": "x"
 },
 "media_player.living_room_tv": {
  "s": "off",
  "a": {
   "friendly_name": "Living Room Tv",
   "media_title": null,
   "media_artist": null,
   "volume_level": 0.3
  },
  "lc": 1787729410,
  "lu": 1787747290,
  "c": "x"
 },
 "media_player.office_speaker": {
  "s": "off",
  "a": {
   "friendly_name": "Office Speaker",
   "media_title": null,
   "media_artist": null,
   "volume_level": 0.3
  },
  "lc": 1787711824,
  "lu": 1787747150,
  "c": "x"
 },
 "person.alex": {
  "s": "home",
  "a": {
   "friendly_name": "Alex"
  },
  "lc": 1787720495,
  "lu": 1787748775,
  "c": "x"
 },
 "person.jordan": {
  "s": "not_home",
  "a": {
   "friendly_name": "Jordan"
  },
  "lc": 1787724417,
  "lu": 1787747202,
  "c": "x"
 },
 "person.riley": {
  "s": "not_home",
  "a": {
   "friendly_name": "Riley"
  },
  "lc": 1787726959,
  "lu": 1787749848,
  "c": "x"
 },
 "person.sam": {
  "s": "home",
  "a": {
   "friendly_name": "Sam"
  },
  "lc": 1787719443,
  "lu": 1787748485,
  "c": "x"
 },
 "script.all_lights_off": {
  "s": "off",
  "a": {
   "friendly_name": "All Lights Off"
  },
  "lc": 1787738687,
  "lu": 1787747438,
  "c": "x"
 },
 "script.all_lights_on": {
  "s": "off",
  "a": {
   "friendly_name": "All Lights On"
  },
  "lc": 1787742027,
  "lu": 1787747918,
  "c": "x"
 },
 "script.goodnight": {
  "s": "off",
  "a": {
   "friendly_name": "Goodnight"
  },
  "lc": 1787745837,
  "lu": 1787749047,
  "c": "x"
 },
 "script.half_on": {
  "s": "off",
  "a": {
   "friendly_name": "Half On"
  },
  "lc": 1787730863,
  "lu": 1787749411,
  "c": "x"
 },
 "script.lockup": {
  "s": "off",
  "a": {
   "friendly_name": "Lockup"
  },
  "lc": 1787733473,
  "lu": 1787748311,
  "c": "x"
 },
 "script.morning_wake": {
  "s": "off",
  "a": {
   "friendly_name": "Morning Wake"
  },
  "lc": 1787724079,
  "lu": 1787747907,
  "c": "x"
 },
 "script.movie_time": {
  "s": "off",
  "a": {
   "friendly_name": "Movie Time"
  },
  "lc": 1787744420,
  "lu": 1787749259,
  "c": "x"
 },
 "select.entry_diffuser_intensity": {
  "s": "medium",
  "a": {
   "friendly_name": "Entry Diffuser Intensity",
   "options": [
    "off",
    "subtle",
    "medium",
    "strong"
   ]
  },
  "lc": 1787720263,
  "lu": 1787748295,
  "c": "x"
 },
 "select.living_room_diffuser_intensity": {
  "s": "medium",
  "a": {
   "friendly_name": "Living Room Diffuser Intensity",
   "options": [
    "off",
    "subtle",
    "medium",
    "strong"
   ]
  },
  "lc": 1787713692,
  "lu": 1787748802,
  "c": "x"
 },
 "sensor.alexs_phone_battery_level": {
  "s": "82",
  "a": {
   "friendly_name": "Alexs Phone Battery Level",
   "device_class": "battery",
   "unit_of_measurement": "%"
  },
  "lc": 1787740727,
  "lu": 1787748177,
  "c": "x"
 },
 "sensor.aurora_verdict": {
  "s": "2",
  "a": {
   "friendly_name": "Aurora Verdict"
  },
  "lc": 1787713641,
  "lu": 1787748800,
  "c": "x"
 },
 "sensor.aurora_visibility": {
  "s": "2",
  "a": {
   "friendly_name": "Aurora Visibility"
  },
  "lc": 1787722484,
  "lu": 1787748471,
  "c": "x"
 },
 "sensor.diffuser_lowest_bottle": {
  "s": "12",
  "a": {
   "friendly_name": "Diffuser Lowest Bottle",
   "unit_of_measurement": "%"
  },
  "lc": 1787724768,
  "lu": 1787748995,
  "c": "x"
 },
 "sensor.diffuser_refills_needed": {
  "s": "Living Room Slot 1",
  "a": {
   "friendly_name": "Diffuser Refills Needed"
  },
  "lc": 1787739810,
  "lu": 1787749601,
  "c": "x"
 },
 "sensor.dryer_machine_state": {
  "s": "stop",
  "a": {
   "friendly_name": "Dryer Machine State"
  },
  "lc": 1787738152,
  "lu": 1787749321,
  "c": "x"
 },
 "sensor.entry_diffuser_active_fragrance": {
  "s": "Sea Salt",
  "a": {
   "friendly_name": "Entry Diffuser Active Fragrance"
  },
  "lc": 1787734499,
  "lu": 1787747243,
  "c": "x"
 },
 "sensor.entry_diffuser_slot_1_fragrance": {
  "s": "Cedar and Sage",
  "a": {
   "friendly_name": "Entry Diffuser Slot 1 Fragrance"
  },
  "lc": 1787734409,
  "lu": 1787749891,
  "c": "x"
 },
 "sensor.entry_diffuser_slot_1_fragrance_remaining": {
  "s": "58",
  "a": {
   "friendly_name": "Entry Diffuser Slot 1 Fragrance Remaining",
   "unit_of_measurement": "%"
  },
  "lc": 1787717918,
  "lu": 1787747527,
  "c": "x"
 },
 "sensor.entry_diffuser_slot_2_fragrance": {
  "s": "Sea Salt",
  "a": {
   "friendly_name": "Entry Diffuser Slot 2 Fragrance"
  },
  "lc": 1787737750,
  "lu": 1787748864,
  "c": "x"
 },
 "sensor.entry_diffuser_slot_2_fragrance_remaining": {
  "s": "91",
  "a": {
   "friendly_name": "Entry Diffuser Slot 2 Fragrance Remaining",
   "unit_of_measurement": "%"
  },
  "lc": 1787731224,
  "lu": 1787749924,
  "c": "x"
 },
 "sensor.grow_light_schedule": {
  "s": "18/6, on at 06:00",
  "a": {
   "friendly_name": "Grow Light Schedule"
  },
  "lc": 1787740153,
  "lu": 1787748224,
  "c": "x"
 },
 "sensor.grow_plan_stage": {
  "s": "Late Veg",
  "a": {
   "friendly_name": "Grow Plan Stage"
  },
  "lc": 1787714666,
  "lu": 1787748428,
  "c": "x"
 },
 "sensor.house_headline": {
  "s": "All quiet. Two lights on, everything locked.",
  "a": {
   "friendly_name": "House Headline"
  },
  "lc": 1787712585,
  "lu": 1787748635,
  "c": "x"
 },
 "sensor.humidifier_water_level": {
  "s": "72",
  "a": {
   "friendly_name": "Humidifier Water Level",
   "unit_of_measurement": "%"
  },
  "lc": 1787741476,
  "lu": 1787747112,
  "c": "x"
 },
 "sensor.iss_pass_direction": {
  "s": "Visible 8:42 PM, SW to NE",
  "a": {
   "friendly_name": "Iss Pass Direction"
  },
  "lc": 1787715917,
  "lu": 1787747411,
  "c": "x"
 },
 "sensor.iss_pass_summary": {
  "s": "Visible 8:42 PM, SW to NE",
  "a": {
   "friendly_name": "Iss Pass Summary"
  },
  "lc": 1787746162,
  "lu": 1787748070,
  "c": "x"
 },
 "sensor.iss_position": {
  "s": "Visible 8:42 PM, SW to NE",
  "a": {
   "friendly_name": "Iss Position"
  },
  "lc": 1787713048,
  "lu": 1787748333,
  "c": "x"
 },
 "sensor.kitchen_temperature": {
  "s": "71",
  "a": {
   "friendly_name": "Kitchen Temperature",
   "unit_of_measurement": "F",
   "device_class": "temperature"
  },
  "lc": 1787723613,
  "lu": 1787748306,
  "c": "x"
 },
 "sensor.living_room_diffuser_active_fragrance": {
  "s": "Sea Salt",
  "a": {
   "friendly_name": "Living Room Diffuser Active Fragrance"
  },
  "lc": 1787723871,
  "lu": 1787749516,
  "c": "x"
 },
 "sensor.living_room_diffuser_slot_1_fragrance": {
  "s": "Cedar and Sage",
  "a": {
   "friendly_name": "Living Room Diffuser Slot 1 Fragrance"
  },
  "lc": 1787718143,
  "lu": 1787747342,
  "c": "x"
 },
 "sensor.living_room_diffuser_slot_1_fragrance_remaining": {
  "s": "12",
  "a": {
   "friendly_name": "Living Room Diffuser Slot 1 Fragrance Remaining",
   "unit_of_measurement": "%"
  },
  "lc": 1787723457,
  "lu": 1787749686,
  "c": "x"
 },
 "sensor.living_room_diffuser_slot_2_fragrance": {
  "s": "Sea Salt",
  "a": {
   "friendly_name": "Living Room Diffuser Slot 2 Fragrance"
  },
  "lc": 1787737209,
  "lu": 1787749665,
  "c": "x"
 },
 "sensor.living_room_diffuser_slot_2_fragrance_remaining": {
  "s": "44",
  "a": {
   "friendly_name": "Living Room Diffuser Slot 2 Fragrance Remaining",
   "unit_of_measurement": "%"
  },
  "lc": 1787736019,
  "lu": 1787748136,
  "c": "x"
 },
 "sensor.living_room_temperature": {
  "s": "71",
  "a": {
   "friendly_name": "Living Room Temperature",
   "unit_of_measurement": "F",
   "device_class": "temperature"
  },
  "lc": 1787739064,
  "lu": 1787749490,
  "c": "x"
 },
 "sensor.moon_emoji": {
  "s": "waxing_gibbous",
  "a": {
   "friendly_name": "Moon Emoji"
  },
  "lc": 1787727415,
  "lu": 1787747480,
  "c": "x"
 },
 "sensor.moon_phase": {
  "s": "waxing_gibbous",
  "a": {
   "friendly_name": "Moon Phase"
  },
  "lc": 1787746255,
  "lu": 1787749521,
  "c": "x"
 },
 "sensor.nasa_earth_captured": {
  "s": "--",
  "a": {
   "friendly_name": "Nasa Earth Captured"
  },
  "lc": 1787749685,
  "lu": 1787747619,
  "c": "x"
 },
 "sensor.nasa_earth_image": {
  "s": "--",
  "a": {
   "friendly_name": "Nasa Earth Image"
  },
  "lc": 1787739787,
  "lu": 1787747743,
  "c": "x"
 },
 "sensor.nasa_picture_of_the_day": {
  "s": "--",
  "a": {
   "friendly_name": "Nasa Picture Of The Day"
  },
  "lc": 1787743051,
  "lu": 1787748451,
  "c": "x"
 },
 "sensor.next_launch": {
  "s": "Falcon 9 - Starlink",
  "a": {
   "friendly_name": "Next Launch"
  },
  "lc": 1787748029,
  "lu": 1787749652,
  "c": "x"
 },
 "sensor.next_launch_countdown": {
  "s": "Falcon 9 - Starlink",
  "a": {
   "friendly_name": "Next Launch Countdown"
  },
  "lc": 1787736072,
  "lu": 1787747425,
  "c": "x"
 },
 "sensor.next_launch_detail": {
  "s": "Falcon 9 - Starlink",
  "a": {
   "friendly_name": "Next Launch Detail"
  },
  "lc": 1787725044,
  "lu": 1787749332,
  "c": "x"
 },
 "sensor.next_launch_name": {
  "s": "Falcon 9 - Starlink",
  "a": {
   "friendly_name": "Next Launch Name"
  },
  "lc": 1787733169,
  "lu": 1787748518,
  "c": "x"
 },
 "sensor.next_spacex_countdown": {
  "s": "Falcon 9 - Starlink",
  "a": {
   "friendly_name": "Next Spacex Countdown"
  },
  "lc": 1787710230,
  "lu": 1787748449,
  "c": "x"
 },
 "sensor.next_spacex_launch": {
  "s": "Falcon 9 - Starlink",
  "a": {
   "friendly_name": "Next Spacex Launch"
  },
  "lc": 1787718627,
  "lu": 1787749437,
  "c": "x"
 },
 "sensor.next_spacex_mission": {
  "s": "Falcon 9 - Starlink",
  "a": {
   "friendly_name": "Next Spacex Mission"
  },
  "lc": 1787742141,
  "lu": 1787747941,
  "c": "x"
 },
 "sensor.planetary_k_index": {
  "s": "2",
  "a": {
   "friendly_name": "Planetary K Index"
  },
  "lc": 1787719161,
  "lu": 1787747973,
  "c": "x"
 },
 "sensor.sams_phone_battery_level": {
  "s": "82",
  "a": {
   "friendly_name": "Sams Phone Battery Level",
   "device_class": "battery",
   "unit_of_measurement": "%"
  },
  "lc": 1787717992,
  "lu": 1787748663,
  "c": "x"
 },
 "sensor.soil_moisture": {
  "s": "38",
  "a": {
   "friendly_name": "Soil Moisture",
   "unit_of_measurement": "%"
  },
  "lc": 1787744072,
  "lu": 1787749350,
  "c": "x"
 },
 "sensor.soil_moisture_battery": {
  "s": "82",
  "a": {
   "friendly_name": "Soil Moisture Battery",
   "device_class": "battery",
   "unit_of_measurement": "%"
  },
  "lc": 1787743004,
  "lu": 1787748537,
  "c": "x"
 },
 "sensor.tent_humidity": {
  "s": "47",
  "a": {
   "friendly_name": "Tent Humidity",
   "device_class": "humidity",
   "unit_of_measurement": "%"
  },
  "lc": 1787732349,
  "lu": 1787747980,
  "c": "x"
 },
 "sensor.tent_temperature": {
  "s": "71",
  "a": {
   "friendly_name": "Tent Temperature",
   "unit_of_measurement": "F",
   "device_class": "temperature"
  },
  "lc": 1787739120,
  "lu": 1787747826,
  "c": "x"
 },
 "sensor.tent_vpd": {
  "s": "1.04",
  "a": {
   "friendly_name": "Tent Vpd",
   "unit_of_measurement": "kPa"
  },
  "lc": 1787748187,
  "lu": 1787749100,
  "c": "x"
 },
 "sensor.washer_machine_state": {
  "s": "stop",
  "a": {
   "friendly_name": "Washer Machine State"
  },
  "lc": 1787715081,
  "lu": 1787748459,
  "c": "x"
 },
 "sensor.waste_upcoming": {
  "s": "Recycling on Tuesday",
  "a": {
   "friendly_name": "Waste Upcoming"
  },
  "lc": 1787740093,
  "lu": 1787747114,
  "c": "x"
 },
 "sun.sun": {
  "s": "above_horizon",
  "a": {
   "friendly_name": "Sun"
  },
  "lc": 1787714103,
  "lu": 1787749830,
  "c": "x"
 },
 "switch.adaptive_lighting_dimmers": {
  "s": "on",
  "a": {
   "friendly_name": "Adaptive Lighting Dimmers"
  },
  "lc": 1787715090,
  "lu": 1787748720,
  "c": "x"
 },
 "switch.adaptive_lighting_kitchen": {
  "s": "on",
  "a": {
   "friendly_name": "Adaptive Lighting Kitchen"
  },
  "lc": 1787743736,
  "lu": 1787747089,
  "c": "x"
 },
 "weather.forecast_home": {
  "s": "partlycloudy",
  "a": {
   "friendly_name": "Forecast Home",
   "temperature": 68,
   "humidity": 52,
   "wind_speed": 6,
   "forecast": []
  },
  "lc": 1787732588,
  "lu": 1787747817,
  "c": "x"
 },
 "zone.home": {
  "s": "0",
  "a": {
   "friendly_name": "Home",
   "latitude": 41.8781,
   "longitude": -87.6298,
   "radius": 100
  },
  "lc": 1787725668,
  "lu": 1787749256,
  "c": "x"
 }
};
