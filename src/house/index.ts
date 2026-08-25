/**
 * Which house is this?
 *
 * `local.ts` if you have written one, `sample.ts` otherwise. The lookup uses
 * Vite's `import.meta.glob`, which resolves at build time and yields nothing
 * when the file is absent — so a fresh clone with no local config compiles and
 * runs instead of failing on a missing import.
 *
 * The override is all-or-nothing on purpose. Merging a partial local config
 * over the sample would leave a half-real house: some cards pointing at your
 * entities, others at invented ones, and no obvious reason why. Copy the whole
 * sample file to `local.ts` and edit it.
 */
import { SAMPLE_HOUSE } from './sample';
import type { HouseConfig } from './types';

const overrides = import.meta.glob<{ HOUSE?: HouseConfig }>('./local.ts', { eager: true });
const local = Object.values(overrides)[0]?.HOUSE;

export const HOUSE: HouseConfig = local ?? SAMPLE_HOUSE;

/** False when this build is running against a real, private house config. */
export const IS_SAMPLE_HOUSE = local === undefined;

export type {
  HouseConfig, Person, Scene, RoomDevices, PlanRoom, HousePlan, EntityMap,
} from './types';
