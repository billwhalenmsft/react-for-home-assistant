/**
 * The shape of a house.
 *
 * Everything in this panel that is specific to one home — entity ids, who
 * lives there, what is in each room, the floorplan — is described by these
 * types and supplied by a single config object. The components read the
 * config; they never name an entity themselves.
 *
 * That split is what makes the panel installable by someone who is not the
 * author: fork it, write your own `local.ts`, and every page follows. It is
 * also what keeps a real household's device inventory out of a public repo —
 * the committed config is sample data (see `sample.ts`), and the real one is
 * ignored by git.
 */

/** A member of the household, and what Home Assistant can see of them. */
export interface Person {
  /** `person.*` entity id. */
  id: string;
  name: string;
  /** Companion-app battery sensor, once that person has the app installed. */
  battery?: string;
  note?: string;
}

/**
 * A scene button, carrying a plain description of what it will actually do.
 * The description is shown in the confirm dialog, so it has to match the
 * script body: a confirmation that describes the wrong thing is worse than no
 * confirmation, because it trains people to click through without reading.
 */
export interface Scene {
  label: string;
  script: string;
  does: string;
}

/** What lives in one room, for the floorplan's drill-in panel. */
export interface RoomDevices {
  /** entity ids, in the order they should appear */
  entities: string[];
  /** optional note shown under the room name */
  note?: string;
}

/** One traced room on a floorplan image, in image pixels. */
export interface PlanRoom {
  name: string;
  x: number; y: number; w: number; h: number;
  cold: boolean;
  material: string | null;
  sqft: number | null;
  paint: [number, number, number] | null;
}

export interface HousePlan {
  /** Natural size of the rendered floorplan images, in pixels. */
  width: number;
  height: number;
  pxPerFt: number;
  floors: Record<string, { title: string; rooms: PlanRoom[] }>;
  materialColors: Record<string, [number, number, number]>;
}

/** A labelled pair — a display name and the entity behind it. */
export type Named = readonly [string, string];

export interface EntityMap {
  headline: string;
  weather: string;
  sun: string;
  /** The tracker the masthead treats as "the resident" on a shared screen. */
  person: string;
  phoneBatt: string;
  phone: string;
  blink: string;
  panel: string;
  lock: string;
  garage1: string;
  garage2: string;
  doors: ReadonlyArray<Named>;
  motion: string;

  homeZone: string;
  issPos: string;
  issPassSummary: string;
  issPassDir: string;
  kp: string;
  apod: string;
  auroraVerdict: string;
  nextLaunch: string;
  nextLaunchName: string;
  nextLaunchDetail: string;
  nextLaunchCountdown: string;
  nextSpacex: string;
  nextSpacexMission: string;
  nextSpacexCountdown: string;
  epicImage: string;
  epicWhen: string;

  laundryWasherFlag: string;
  laundryDryerFlag: string;
  climate: string;
  climateNest: string;
  allLights: string;
  rooms: ReadonlyArray<{ name: string; light: string; temp?: string }>;
  fixtures: ReadonlyArray<Named>;
  autopilotHue: string;
  autopilotDim: string;
  frame: string;
  marantz: string;
  sonos: ReadonlyArray<Named>;
  cams: ReadonlyArray<Named>;

  soil: string;
  soilBatt: string;
  tentTemp: string;
  tentHum: string;
  tentVpd: string;
  water: string;
  stage: string;
  growOnline: string[];
  plantA: { name: string; planted: string; stage: string };
  plantB: { name: string; planted: string; stage: string };
  growLight: string;
  ductFan: string;
  circFan: string;
  humidifier: string;
  lightPlan: string;

  moon: string;
  moonEmoji: string;
  aurora: string;
  waste: string;
  washer: string;
  dryer: string;
}

/** One scent diffuser, and the two bottles in it. */
export interface ScentDiffuser {
  /** What to call it on screen. */
  name: string;
  connected: string;
  /** Which fragrance is actually diffusing right now. */
  active: string;
  /** `select` entity: off / subtle / medium / strong. */
  intensity: string;
  slots: ReadonlyArray<{ fragrance: string; remaining: string }>;
}

export interface ScentConfig {
  /** Lowest bottle across the house, as a percentage. */
  lowest: string;
  /** True while any bottle is below the refill threshold. */
  needsRefill: string;
  /** Human-readable list of which bottles need refilling. */
  refills: string;
  diffusers: ReadonlyArray<ScentDiffuser>;
}

export interface HouseConfig {
  /** Shown in the masthead and used for the rail's monogram. */
  name: string;
  /** The street the front of the house faces, labelled on the floorplan. */
  street: string;
  /** The one script the Lockup button fires. */
  lockupScript: string;
  /** Two example coordinates, used only as placeholder text in the Locations form. */
  sampleCoords: { lat: string; lon: string };
  family: ReadonlyArray<Person>;
  entities: EntityMap;
  scenes: ReadonlyArray<Scene>;
  /** floor key -> room name -> what is in it */
  rooms: Record<string, Record<string, RoomDevices>>;
  floorTabs: Array<{ key: string; label: string }>;
  /** Omit entirely if the house has no scent diffusers. */
  scent?: ScentConfig;
  plan: HousePlan;
}
