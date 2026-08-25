import { HOUSE } from '../house';
import type { RoomDevices } from '../house';
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

export type { RoomDevices };


export const ROOM_DEVICES: Record<string, Record<string, RoomDevices>> = HOUSE.rooms;


export const FLOOR_TABS: Array<{ key: string; label: string }> = HOUSE.floorTabs;

