import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useEntities } from '../ha/useEntities';
import type { Hass } from '../ha/types';
import { HOUSE } from '../house';
import type { PlanRoom } from '../house';
import { ROOM_DEVICES } from './rooms';
import { ACTIONABLE, EntityControl, rendersAsSquare, useControlStyle } from './Controls';
import { DiffuserBlock, diffusersFor } from './Scent';

const { floors: FLOORS, materialColors: MATERIAL_COLORS } = HOUSE.plan;
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

/** Rooms that don't ask for a slot sort after those that do, in plan order. */
const DEFAULT_ORDER = 1000;

interface Tile {
  floor: string;
  order: number;
  room: PlanRoom;
  entities: string[];
  /** the up-to-three surfaced on the card itself */
  favorites: string[];
  /** names of diffusers in this room, from the house config */
  scent: string[];
  note?: string;
}

export function RoomsGrid({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  const [open, setOpen] = useState<{ floor: string; room: string } | null>(null);

  // A tile has to earn its place. Two rules, both deliberate:
  //
  //   1. The room must offer something you would actually TOUCH. A room whose
  //      only contents are read-only sensors is a readout, not a destination —
  //      it was making the grid look full of rooms that do nothing when tapped.
  //      This is a rule rather than a list so it maintains itself: wire a light
  //      into the porch and the porch shows up on its own.
  //   2. Rooms flagged `hideFromRooms` are controllable but belong to another
  //      page (garage bays, the alarm panel). See the house config.
  //
  // Neither rule touches the floorplan — every room stays on the map.
  const tiles = useMemo<Tile[]>(() => {
    const out: Tile[] = [];
    for (const floor of ['fp_main', 'fp_upper', 'fp_lower']) {
      const plan = FLOORS[floor];
      if (!plan) continue;
      for (const room of plan.rooms) {
        const spec = ROOM_DEVICES[floor]?.[room.name];
        if (!spec || spec.entities.length === 0) continue;
        if (spec.hideFromRooms) continue;
        const usable = spec.entities.filter((id) => ACTIONABLE.has(id.split('.')[0]));
        const scent = spec.scentDiffusers ?? [];
        // A diffuser counts. It has an intensity you can set, so a room that
        // holds one is a place you can do something — which is the whole test.
        if (usable.length === 0 && scent.length === 0) continue;
        // What you reach for in this room, straight on the card. The house
        // config gets first say; absent that, the first three things you can
        // actually operate — which for every room here is the right answer.
        // Capped at three: a card that lists everything is the old flat list
        // again, just with a photo behind it.
        const favorites = (spec.favorites?.filter((id) => usable.includes(id)) ?? usable).slice(0, 3);
        out.push({
          floor, room, entities: spec.entities, favorites, scent, note: spec.note,
          order: spec.order ?? DEFAULT_ORDER,
        });
      }
    }
    // Stable sort: only rooms that asked for a slot move. Everything else
    // keeps the floorplan's own order, behind them.
    return out.sort((a, b) => a.order - b.order);
  }, []);

  const ids = useMemo(() => [...new Set(tiles.flatMap((t) => t.entities))], [tiles]);
  const states = useEntities(hass, ids);
  const [ctrl] = useControlStyle(hass);

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
            <div
              key={`${t.floor}:${t.room.name}`}
              style={{ ...S.card, borderColor: lit ? 'var(--wt-lineHi)' : 'var(--wt-line)' }}
            >
              {/*
                The photo is the way into the room; the strip below it is the
                way to skip going in at all. They have to be separate elements:
                controls nested inside a <button> is invalid HTML, and every
                tap on a dimmer would also open the panel behind it.
              */}
              <button
                type="button"
                onClick={() => setOpen({ floor: t.floor, room: t.room.name })}
                aria-label={`Open ${t.room.name}`}
                style={S.tile}
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

              {t.favorites.length || t.scent.length ? (
                <div style={ctrl === 'square' ? { ...S.strip, ...S.stripSquare } : S.strip}>
                  {t.favorites.map((id) => (
                    <div
                      key={id}
                      // A domain with no square form spans the whole strip
                      // instead of being squeezed into a 1:1 cell.
                      style={ctrl === 'square' && !rendersAsSquare(id, states[id])
                        ? { gridColumn: '1 / -1', alignSelf: 'center' }
                        : { minWidth: 0 }}
                    >
                      <EntityControl hass={hass} id={id} s={states[id]} size="tile" style={ctrl} />
                    </div>
                  ))}
                  {t.scent.length ? (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <DiffuserBlock hass={hass} diffusers={diffusersFor(t.scent)} size="tile" />
                    </div>
                  ) : null}

                  {/*
                    Always rendered, even when nothing is hidden. Two reasons:
                    it is a real target (it opens the room), and it is the row
                    that keeps every card in a row the same height — without it
                    a room with nothing extra sits shorter than its neighbours.
                  */}
                  <button
                    type="button"
                    className="est-tap"
                    onClick={() => setOpen({ floor: t.floor, room: t.room.name })}
                    style={{ ...S.more, gridColumn: '1 / -1' }}
                  >
                    {t.entities.length > t.favorites.length
                      ? `All ${t.entities.length} in ${t.room.name} →`
                      : `Open ${t.room.name} →`}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {open ? (
        <RoomModal narrow={narrow} onClose={() => setOpen(null)}>
          <RoomPanel hass={hass} floor={open.floor} room={open.room} onClose={() => setOpen(null)} variant="inline" />
        </RoomModal>
      ) : null}
    </>
  );
}


/**
 * Room detail modal.
 *
 * Portalled to document.body on purpose. This whole surface is a Lovelace
 * card, so it renders deep inside Home Assistant's DOM - and `position: fixed`
 * is measured against the nearest ancestor carrying a transform, filter or
 * containment, not the viewport. Any such ancestor (ours or HA's) silently
 * re-anchors the overlay, which is how a "fixed" panel ends up parked at the
 * middle of the page instead of in front of the person who tapped. A portal
 * sidesteps every one of them.
 *
 * On phones it rises from the bottom edge rather than centring: that is where
 * a thumb already is, and it cannot land off-screen no matter the scroll
 * position. Height is capped in dvh so mobile browser chrome cannot clip it.
 */
function RoomModal({ narrow, onClose, children }: {
  narrow: boolean; onClose: () => void; children: React.ReactNode;
}) {
  // Escape closes, and the page behind must not scroll while this is up.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      // Same reason as the confirm dialog: theme tokens live on
      // .est-root[data-wt-theme], and a portal renders outside it.
      className="est-root"
      data-wt-theme={
        (typeof document !== 'undefined'
          && document.querySelector('.est-root[data-wt-theme]')?.getAttribute('data-wt-theme'))
        || 'estate'
      }
      onClick={onClose}
      style={{
        ...S.modalWrap,
        alignItems: narrow ? 'flex-end' : 'center',
        padding: narrow ? 0 : 20,
      }}
    >
      <div
        className="est-sheet"
        onClick={(ev) => ev.stopPropagation()}
        style={{
          ...S.modalInner,
          width: narrow ? '100%' : 'min(420px, 100%)',
          maxHeight: narrow ? '85dvh' : '90dvh',
          overflowY: 'auto',
          paddingBottom: narrow ? 'env(safe-area-inset-bottom, 0px)' : undefined,
        }}
      >
        {narrow ? <div aria-hidden="true" style={S.grabber} /> : null}
        {children}
      </div>
    </div>,
    document.body,
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
  card: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 'var(--wt-radius)',
    border: '1px solid var(--wt-line)',
    background: 'var(--wt-ground)',
    transition: 'border-color 200ms ease',
  },
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
    border: 'none',
    background: 'transparent',
  },
  strip: {
    display: 'grid',
    gap: 10,
    padding: '12px 14px 13px',
    borderTop: '1px solid var(--wt-line)',
    background: 'var(--wt-glass)',
    // Cards in a grid row stretch to the tallest of them. Letting the strip
    // take that slack, rather than the squares, keeps every control the same
    // size and puts any leftover space quietly at the bottom.
    flex: 1,
    alignContent: 'start',
  },
  stripSquare: {
    // Always three columns, never one per favourite. A room with a single
    // control was getting a square as wide as the whole card, and 1:1 made
    // it as tall as it was wide — an enormous button for one lamp.
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
  more: {
    justifySelf: 'start',
    font: 'inherit',
    fontSize: 11,
    letterSpacing: '0.06em',
    padding: '4px 0',
    border: 'none',
    background: 'transparent',
    color: 'var(--wt-dim)',
    cursor: 'pointer',
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
    display: 'flex',
    justifyContent: 'center',
    padding: 20,
    background: 'rgba(0,0,0,0.62)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  },
  modalInner: { position: 'relative', width: 'min(420px, 100%)', minHeight: 260 },
  grabber: {
    width: 38, height: 4, borderRadius: 999, margin: '8px auto 2px',
    background: 'var(--wt-lineHi)', flex: 'none',
  },
};
