import { useMemo, type CSSProperties } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass } from '../ha/types';

/**
 * The living floorplan — Savant's signature move. Rooms glow with their real
 * lights, the garage shows door state, tapping a room toggles it.
 * Coordinates are percentages of the 1600×1300 fp_main.png.
 */

interface Room {
  name: string;
  /** center of the glow, percent */
  x: number; y: number;
  /** glow radius as a percent of plan width */
  r: number;
  entity?: string;           // light/switch to reflect + toggle
  kind?: 'light' | 'cover';
}

const ROOMS: Room[] = [
  { name: 'Great Room', x: 70, y: 23, r: 15, entity: 'light.living_room_living_room_main_lights', kind: 'light' },
  { name: 'Entry', x: 49, y: 30, r: 9, entity: 'light.front_foyer_front_foyer_main_lights', kind: 'light' },
  { name: 'Kitchen', x: 64, y: 54.5, r: 12, entity: 'light.kitchen_all_lights', kind: 'light' },
  { name: 'Dining', x: 85, y: 54.5, r: 11, entity: 'light.dining_room_dining_room_chandelier', kind: 'light' },
  { name: 'Mud', x: 55, y: 81.5, r: 9, entity: 'light.mudroom_mudroom_main_lights', kind: 'light' },
  { name: 'Garage', x: 28.5, y: 68, r: 16, entity: 'cover.garage', kind: 'cover' },
];

const EXTRA = ['cover.garage_door_2', 'binary_sensor.front_porch_motion', 'binary_sensor.front_door_motion'];

export function Floorplan({ hass }: { hass: Hass }) {
  const ids = useMemo(() => [...ROOMS.filter(r => r.entity).map(r => r.entity as string), ...EXTRA], []);
  const e = useEntities(hass, ids);

  const toggle = (room: Room) => {
    if (!room.entity) return;
    if (room.kind === 'cover') {
      const open = e[room.entity]?.state === 'open';
      void hass.callService('cover', open ? 'close_cover' : 'open_cover', {}, { entity_id: room.entity });
    } else {
      const on = e[room.entity]?.state === 'on';
      void hass.callService('light', on ? 'turn_off' : 'turn_on', {}, { entity_id: room.entity });
    }
  };

  const porchMotion = e['binary_sensor.front_porch_motion']?.state === 'on' || e['binary_sensor.front_door_motion']?.state === 'on';
  const garage2Open = e['cover.garage_door_2']?.state === 'open';

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1600/1300', borderRadius: 18, overflow: 'hidden' }}>
      <img
        src="/local/yard/fp_main.png" alt="Main floor plan"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(1.08)' }}
      />

      {/* warm light glows */}
      {ROOMS.map((room) => {
        const st = room.entity ? e[room.entity]?.state : undefined;
        const active = room.kind === 'cover' ? st === 'open' || (room.name === 'Garage' && garage2Open) : st === 'on';
        const warm = room.kind !== 'cover';
        return (
          <button
            key={room.name}
            type="button"
            aria-label={`${room.name}${room.entity ? ` — ${active ? (warm ? 'on' : 'open') : (warm ? 'off' : 'closed')}, tap to toggle` : ''}`}
            onClick={() => toggle(room)}
            className="est-room"
            style={{
              position: 'absolute',
              left: `${room.x}%`, top: `${room.y}%`,
              width: `${room.r * 2}%`, aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%', border: 'none', cursor: room.entity ? 'pointer' : 'default',
              background: active
                ? warm
                  ? 'radial-gradient(circle, rgba(255,196,110,0.55) 0%, rgba(255,178,80,0.22) 45%, transparent 72%)'
                  : 'radial-gradient(circle, rgba(224,179,76,0.5) 0%, rgba(224,179,76,0.18) 50%, transparent 75%)'
                : 'transparent',
              transition: 'background .5s ease',
              padding: 0,
            }}
          >
            <span style={{
              position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
              padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap',
              fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'rgba(8,10,12,0.72)', backdropFilter: 'blur(6px)',
              border: `1px solid ${active ? 'rgba(255,196,110,0.6)' : 'rgba(255,255,255,0.14)'}`,
              color: active ? '#ffd9a0' : 'rgba(240,237,230,0.75)',
              opacity: room.entity ? 1 : 0,
            } as CSSProperties}>
              {room.name}{room.kind === 'cover' && active ? ' · OPEN' : ''}
            </span>
          </button>
        );
      })}

      {/* porch motion beacon */}
      {porchMotion && (
        <span aria-hidden="true" className="est-pulse" style={{
          position: 'absolute', left: '36.5%', top: '20%', width: 14, height: 14,
          transform: 'translate(-50%,-50%)', borderRadius: '50%',
          background: '#e0b34c', boxShadow: '0 0 18px 4px rgba(224,179,76,0.8)',
        }} />
      )}

      <div style={{
        position: 'absolute', right: 12, bottom: 10, fontSize: 10, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: 'rgba(240,237,230,0.5)',
      }}>Main Floor · tap a room</div>
    </div>
  );
}
