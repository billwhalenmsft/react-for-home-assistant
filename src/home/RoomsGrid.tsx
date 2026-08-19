import { useMemo, useState, type CSSProperties } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass } from '../ha/types';
import { FLOORS, MATERIAL_COLORS, type PlanRoom } from './plan.generated';
import { ROOM_DEVICES } from './rooms';
import { RoomPanel } from './RoomPanel';

/**
 * Room-first browsing, the way high-end control systems do it: you pick a
 * room, then a service — rather than scrolling a flat list of every light in
 * the house, which is what this page used to be.
 *
 * Each tile is a portrait of the actual room: its true footprint from the
 * traced plan, filled with its real floor material, glowing when something in
 * it is on. Drop a photo at /local/yard/room_<slug>.jpg and the tile uses that
 * instead — the geometry is the fallback, not the goal.
 */

const AMBER = 'rgb(250,187,90)';

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const rgb = (c: [number, number, number] | undefined, fallback: string) =>
  c ? `rgb(${c[0]},${c[1]},${c[2]})` : fallback;

const LIT = new Set(['on', 'open', 'playing', 'run', 'cleaning', 'heat', 'cool']);

interface Tile {
  floor: string;
  room: PlanRoom;
  entities: string[];
  note?: string;
}

export function RoomsGrid({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  const [open, setOpen] = useState<{ floor: string; room: string } | null>(null);

  // every room that has something wired, in plan order, main floor first
  const tiles = useMemo<Tile[]>(() => {
    const out: Tile[] = [];
    for (const floor of ['fp_main', 'fp_upper', 'fp_lower']) {
      const plan = FLOORS[floor];
      if (!plan) continue;
      for (const room of plan.rooms) {
        const spec = ROOM_DEVICES[floor]?.[room.name];
        if (!spec || spec.entities.length === 0) continue;
        out.push({ floor, room, entities: spec.entities, note: spec.note });
      }
    }
    return out;
  }, []);

  const ids = useMemo(() => [...new Set(tiles.flatMap((t) => t.entities))], [tiles]);
  const states = useEntities(hass, ids);

  const summarise = (t: Tile) => {
    const parts: string[] = [];
    let lit = 0;
    for (const id of t.entities) {
      const s = states[id];
      if (!s) continue;
      const [domain] = id.split('.');
      if (domain === 'light' && s.state === 'on') lit++;
      else if (domain === 'cover' && s.state !== 'closed') parts.push(`door ${s.state}`);
      else if (domain === 'climate' && s.attributes) {
        const t2 = (s.attributes as Record<string, unknown>).current_temperature;
        if (typeof t2 === 'number') parts.push(`${Math.round(t2)}°`);
      } else if (domain === 'media_player' && s.state === 'playing') parts.push('playing');
      else if (domain === 'lock' && s.state === 'unlocked') parts.push('unlocked');
    }
    if (lit) parts.unshift(`${lit} light${lit > 1 ? 's' : ''} on`);
    return parts.length ? parts.join(' · ') : 'All quiet';
  };

  const isLit = (t: Tile) => t.entities.some((id) => LIT.has(states[id]?.state ?? ''));

  const cols = narrow ? 1 : 3;

  return (
    <>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {tiles.map((t) => {
          const lit = isLit(t);
          const photo = `/local/yard/room_${slug(t.room.name)}.jpg`;
          return (
            <button
              key={`${t.floor}:${t.room.name}`}
              type="button"
              onClick={() => setOpen({ floor: t.floor, room: t.room.name })}
              style={{ ...S.tile, borderColor: lit ? 'var(--wt-lineHi)' : 'var(--wt-line)' }}
            >
              {/* room photo if one exists; the geometry portrait shows through if not */}
              <span
                style={{
                  ...S.photo,
                  backgroundImage: `url("${photo}")`,
                }}
              />
              <RoomPortrait room={t.room} lit={lit} />
              <span style={S.scrim} />
              <span style={S.meta}>
                <span style={S.name}>{t.room.name}</span>
                <span style={{ ...S.sub, color: lit ? AMBER : 'var(--wt-dim)' }}>{summarise(t)}</span>
              </span>
              {lit ? <span style={S.dot} /> : null}
            </button>
          );
        })}
      </div>

      {open ? (
        <div style={S.modalWrap} onClick={() => setOpen(null)}>
          <div style={S.modalInner} onClick={(e) => e.stopPropagation()}>
            <RoomPanel hass={hass} floor={open.floor} room={open.room} onClose={() => setOpen(null)} variant="inline" />
          </div>
        </div>
      ) : null}
    </>
  );
}

/** The room's real footprint, centred and scaled to fill the tile. */
function RoomPortrait({ room, lit }: { room: PlanRoom; lit: boolean }) {
  const pad = 12;
  const vb = `${room.x - pad} ${room.y - pad} ${room.w + pad * 2} ${room.h + pad * 2}`;
  return (
    <svg viewBox={vb} preserveAspectRatio="xMidYMid slice" style={S.portrait} aria-hidden="true">
      <rect
        x={room.x}
        y={room.y}
        width={room.w}
        height={room.h}
        fill={rgb(MATERIAL_COLORS[room.material ?? ''], '#1b2029')}
        stroke="var(--wt-planWall)"
        strokeWidth={7}
      />
      {lit ? (
        <rect
          x={room.x}
          y={room.y}
          width={room.w}
          height={room.h}
          fill={AMBER}
          opacity={0.34}
          style={{ transition: 'opacity 500ms ease' }}
        />
      ) : null}
    </svg>
  );
}

const S: Record<string, CSSProperties> = {
  tile: {
    position: 'relative',
    display: 'block',
    width: '100%',
    aspectRatio: '4 / 3',
    padding: 0,
    overflow: 'hidden',
    cursor: 'pointer',
    font: 'inherit',
    textAlign: 'left',
    borderRadius: 'var(--wt-radius)',
    border: '1px solid var(--wt-line)',
    background: 'var(--wt-ground)',
  },
  portrait: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  photo: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    // a missing photo simply paints nothing, leaving the portrait visible
    zIndex: 1,
  },
  scrim: {
    position: 'absolute',
    inset: 0,
    zIndex: 2,
    background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.25) 42%, rgba(0,0,0,0) 70%)',
  },
  meta: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    zIndex: 3,
    display: 'grid',
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#fff',
  },
  sub: { fontSize: 11.5, fontWeight: 500 },
  dot: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 3,
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: AMBER,
    boxShadow: `0 0 12px ${AMBER}`,
  },
  modalWrap: {
    position: 'fixed',
    inset: 0,
    zIndex: 60,
    display: 'grid',
    placeItems: 'center',
    padding: 20,
    background: 'rgba(0,0,0,0.62)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  },
  modalInner: { position: 'relative', width: 'min(420px, 100%)', minHeight: 260 },
};
