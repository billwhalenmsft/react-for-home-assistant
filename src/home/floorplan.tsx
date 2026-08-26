import { useMemo, useState, type CSSProperties } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass } from '../ha/types';
import { HOUSE } from '../house';
import type { PlanRoom } from '../house';

const { floors: FLOORS, width: PLAN_W, height: PLAN_H, materialColors: MATERIAL_COLORS } = HOUSE.plan;
import { ROOM_DEVICES, FLOOR_TABS } from './rooms';
import { RoomPanel } from './RoomPanel';

/**
 * The living floorplan — Savant's signature move, drawn as real vector
 * geometry instead of glows guessed over a bitmap.
 *
 * Rooms come from plan.generated.ts, emitted by the same Python module that
 * renders the PNG plans, so the two cannot drift. Geometry was traced from the
 * builder's architectural set and mirrored to match the as-built house
 * (Elevation B, "Garage Side: Right"). The front facade runs along the BOTTOM
 * facing the viewer; north points left.
 *
 * Why SVG rather than the PNG: crisp from a phone to a 3813px monitor, every
 * room is a real hit target instead of a circle near one, light pools inside
 * the actual room polygon and dims with brightness — and it can't be stretched
 * by a hardcoded aspect ratio, which is exactly how the previous version broke
 * when the plans were re-rendered portrait.
 *
 * Wall trick: every room is stroked thickly on a layer BEHIND the fills. Where
 * two rooms share an edge both fills cover their half of that stroke and it
 * reads as a thin partition; on the building's outer edge only one fill covers
 * it, so it reads as a thick exterior wall. No path unioning needed.
 */

const AMBER = 'rgb(250,187,90)';

const rgb = (c: [number, number, number] | undefined, fallback: string) =>
  c ? `rgb(${c[0]},${c[1]},${c[2]})` : fallback;

/** The one entity whose state colours each room. Fuller device lists live in rooms.ts. */
const ROOM_ENTITY = HOUSE.plan.roomEntity;

/**
 * Overhead doors on the front facade. Drawn as a bar across the bottom edge of
 * their bay: solid when shut, broken open with light spilling out when not —
 * so an open door is obvious from across the room, not just a colour shift.
 */
const DOORS = HOUSE.plan.doors;

/** Motion beacons, positioned in plan space. */
const BEACONS = HOUSE.plan.beacons;

/** A room counts as lit when its entity is in one of these states. */
const LIT = new Set(['on', 'open', 'playing', 'run', 'cleaning']);

export interface FloorplanProps {
  hass: Hass;
  floor?: string;
  /** override the default drill-in behaviour */
  onSelectRoom?: (room: PlanRoom, entity?: string) => void;
  height?: number | string;
}

export function Floorplan({ hass, floor, onSelectRoom, height = '100%' }: FloorplanProps) {
  const [tab, setTab] = useState(floor ?? 'fp_main');
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const active = floor ?? tab;
  const plan = FLOORS[active] ?? FLOORS.fp_main;
  const map = useMemo(() => ROOM_ENTITY[active] ?? {}, [active]);
  const beacons = useMemo(() => BEACONS[active] ?? [], [active]);
  const doors = useMemo(() => DOORS[active] ?? [], [active]);

  // only what this floor draws — see ha/useEntities for why this matters
  const ids = useMemo(
    () => [...Object.values(map), ...beacons.map((b) => b.entity), ...doors.map((d) => d.entity)],
    [map, beacons, doors]
  );
  const states = useEntities(hass, ids);

  const brightnessOf = (entity?: string): number => {
    if (!entity) return 0;
    const s = states[entity];
    if (!s || !LIT.has(s.state)) return 0;
    const b = (s.attributes as Record<string, unknown> | undefined)?.brightness;
    return typeof b === 'number' ? Math.max(0.25, b / 255) : 1;
  };

  const knownRoom = (name: string) => !!ROOM_DEVICES[active]?.[name] || !!map[name];

  const activate = (room: PlanRoom) => {
    if (onSelectRoom) return onSelectRoom(room, map[room.name]);
    if (!knownRoom(room.name)) return;
    setSelected((cur) => (cur === room.name ? null : room.name));
  };

  const svgStyle: CSSProperties = { width: '100%', height, display: 'block' };

  return (
    <div style={{ position: 'relative' }}>
      {!floor && (
        <FloorSelect
          value={active}
          onChange={(k) => { setTab(k); setSelected(null); }}
        />
      )}

      <svg viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} style={svgStyle} role="img" aria-label={`${plan.title} floorplan`}>
        <defs>
          <filter id="fp-pool" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
        </defs>

        {/* thick strokes behind the fills — see header note */}
        <g fill="none" stroke="var(--wt-planWall)" strokeWidth={14} strokeLinejoin="round">
          {plan.rooms.map((r, i) => (
            <rect key={`w${i}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={3} />
          ))}
        </g>

        {/* floor materials, from the signed selections sheet */}
        <g>
          {plan.rooms.map((r, i) => (
            <rect
              key={`f${i}`}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={2}
              fill={rgb(MATERIAL_COLORS[r.material ?? ''], r.cold ? '#0f1319' : '#1b2029')}
              stroke="#39424f"
              strokeWidth={2}
            />
          ))}
        </g>

        {/* lightens the floor materials on light themes so labels stay legible */}
      <rect x={0} y={0} width={PLAN_W} height={PLAN_H} fill="var(--wt-planWash)" style={{ pointerEvents: 'none' }} />

      {/* light pooling */}
        <g style={{ pointerEvents: 'none' }} filter="url(#fp-pool)">
          {plan.rooms.map((r, i) => {
            const b = brightnessOf(map[r.name]);
            if (!b) return null;
            return (
              <rect
                key={`g${i}`}
                x={r.x + 8}
                y={r.y + 8}
                width={Math.max(0, r.w - 16)}
                height={Math.max(0, r.h - 16)}
                fill={AMBER}
                opacity={0.3 + 0.45 * b}
                style={{ transition: 'opacity 420ms ease' }}
              />
            );
          })}
        </g>

        {/* overhead doors on the front facade */}
        <g>
          {doors.map((d) => {
            const r = plan.rooms.find((x) => x.name === d.room);
            if (!r) return null;
            const open = states[d.entity]?.state === 'open';
            const moving = ['opening', 'closing'].includes(states[d.entity]?.state ?? '');
            const y = r.y + r.h - 7;          // the front wall of the bay
            const inset = 26;
            const x1 = r.x + inset;
            const x2 = r.x + r.w - inset;
            const stub = (x2 - x1) * 0.16;
            return (
              <g key={d.entity} style={{ pointerEvents: 'none' }}>
                {open ? (
                  <>
                    {/* light spilling out of the opening */}
                    <rect
                      x={x1} y={y - 4} width={x2 - x1} height={54}
                      fill={AMBER} opacity={0.5} filter="url(#fp-pool)"
                    />
                    {/* door retracted — only the jamb stubs remain */}
                    <line x1={x1} y1={y} x2={x1 + stub} y2={y} stroke={AMBER} strokeWidth={11} strokeLinecap="round" />
                    <line x1={x2 - stub} y1={y} x2={x2} y2={y} stroke={AMBER} strokeWidth={11} strokeLinecap="round" />
                    <text
                      x={(x1 + x2) / 2} y={y - 16} textAnchor="middle"
                      fontSize={26} fontWeight={700} fill={AMBER} letterSpacing="2"
                    >
                      OPEN
                    </text>
                  </>
                ) : (
                  <line
                    x1={x1} y1={y} x2={x2} y2={y}
                    stroke={moving ? AMBER : 'var(--wt-planWall)'}
                    strokeWidth={11}
                    strokeLinecap="round"
                    strokeDasharray={moving ? '26 18' : undefined}
                  >
                    {moving ? (
                      <animate attributeName="stroke-dashoffset" values="0;-44" dur="1s" repeatCount="indefinite" />
                    ) : null}
                  </line>
                )}
              </g>
            );
          })}
        </g>

        {/* labels + hit targets */}
        <g>
          {plan.rooms.map((r, i) => {
            const live = knownRoom(r.name);
            const isHover = hover === r.name;
            const isSel = selected === r.name;
            const cx = r.x + r.w / 2;
            const cy = r.y + r.h / 2;
            const fs = Math.max(20, Math.min(34, r.w / 9));
            const showSqft = !!r.sqft && r.h > 110;
            return (
              <g
                key={`l${i}`}
                onClick={() => activate(r)}
                onMouseEnter={() => setHover(r.name)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: live ? 'pointer' : 'default' }}
              >
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={2}
                  fill={(isHover || isSel) && live ? 'rgba(255,255,255,0.07)' : 'transparent'}
                  stroke={isSel ? AMBER : isHover && live ? 'rgba(250,187,90,0.7)' : 'none'}
                  strokeWidth={isSel ? 5 : 3}
                  style={{ transition: 'fill 160ms ease' }}
                />
                {r.name ? (
                  <text
                    x={cx}
                    y={showSqft ? cy - 4 : cy + 6}
                    textAnchor="middle"
                    fontSize={fs}
                    fontWeight={600}
                    fill={r.cold ? 'var(--wt-dim)' : 'var(--wt-text)'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {r.name}
                  </text>
                ) : null}
                {showSqft ? (
                  <text
                    x={cx}
                    y={cy + fs - 2}
                    textAnchor="middle"
                    fontSize={fs * 0.62}
                    fill="var(--wt-dim)"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {r.sqft} sq ft
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>

        {/* motion beacons */}
        <g style={{ pointerEvents: 'none' }}>
          {beacons.map((b) =>
            states[b.entity]?.state === 'on' ? (
              <circle key={b.entity} cx={b.x} cy={b.y} r={13} fill="#e0b34c">
                <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
              </circle>
            ) : null
          )}
        </g>

        {/* front-of-house marker and compass */}
        <g style={{ pointerEvents: 'none' }}>
          <text x={PLAN_W / 2} y={PLAN_H - 28} textAnchor="middle" fontSize={26} fill="var(--wt-dim)">
            FRONT · {HOUSE.street}
          </text>
          <polygon
            points={`${PLAN_W / 2 - 11},${PLAN_H - 20} ${PLAN_W / 2 + 11},${PLAN_H - 20} ${PLAN_W / 2},${PLAN_H - 4}`}
            fill="var(--wt-planWall)"
          />
          <line x1={52} y1={60} x2={116} y2={60} stroke={AMBER} strokeWidth={5} />
          <polygon points="36,60 60,48 60,72" fill={AMBER} />
          <text x={132} y={70} fontSize={24} fill={AMBER}>
            N
          </text>
        </g>
      </svg>

      {selected && !onSelectRoom ? (
        <RoomPanel hass={hass} floor={active} room={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

/**
 * Floor picker. One control rather than three buttons, parked bottom-left so
 * it sits over the empty corner of the plan instead of covering rooms.
 */
function FloorSelect({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = FLOOR_TABS.find((t) => t.key === value) ?? FLOOR_TABS[0];

  return (
    <div style={selWrap}>
      {open && (
        <div style={selMenu} role="listbox">
          {FLOOR_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="option"
              aria-selected={t.key === value}
              onClick={() => { onChange(t.key); setOpen(false); }}
              style={{ ...selItem, ...(t.key === value ? selItemOn : null) }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={selButton}
      >
        <span>{current.label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path
            d={open ? 'M1 5L5 1l4 4' : 'M1 1l4 4 4-4'}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

const selWrap: CSSProperties = {
  position: 'absolute',
  left: 12,
  bottom: 12,
  zIndex: 4,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 6,
};

const selButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 12px',
  borderRadius: 'var(--wt-radius)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  font: 'inherit',
  color: 'var(--wt-text)',
  background: 'var(--wt-glassHi)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid var(--wt-line)',
};

const selMenu: CSSProperties = {
  display: 'grid',
  gap: 2,
  padding: 4,
  borderRadius: 'var(--wt-radius)',
  background: 'var(--wt-ground)',
  border: '1px solid var(--wt-line)',
  boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
  minWidth: 116,
};

const selItem: CSSProperties = {
  padding: '7px 12px',
  borderRadius: 'calc(var(--wt-radius) / 2)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  textAlign: 'left',
  cursor: 'pointer',
  font: 'inherit',
  color: 'var(--wt-dim)',
  background: 'transparent',
  border: 'none',
};

const selItemOn: CSSProperties = {
  color: 'var(--wt-onAccent)',
  background: 'var(--wt-gold)',
};
