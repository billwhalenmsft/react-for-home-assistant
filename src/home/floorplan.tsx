import { useMemo, useState, type CSSProperties } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass } from '../ha/types';
import { FLOORS, PLAN_W, PLAN_H, MATERIAL_COLORS, type PlanRoom } from './plan.generated';
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
const ROOM_ENTITY: Record<string, Record<string, string>> = {
  fp_main: {
    'Great Room': 'light.living_room_living_room_main_lights',
    Kitchen: 'light.kitchen_all_lights',
    Dining: 'light.dining_room_dining_room_chandelier',
    Entry: 'light.front_foyer_front_foyer_main_lights',
    Mud: 'light.mudroom_mudroom_main_lights',
    Garage: 'cover.garage_single_door',
  },
  fp_upper: {
    Laundry: 'sensor.laundry_room_washer_machine_state',
    'Master Bedroom': 'media_player.bedroom_bedroom',
  },
  fp_lower: {
    'Family Room': 'media_player.family_room_family_room',
  },
};

/** Motion beacons, positioned in plan space. */
const BEACONS: Record<string, Array<{ entity: string; x: number; y: number }>> = {
  fp_main: [
    { entity: 'binary_sensor.front_porch_motion', x: 250, y: 1180 },
    { entity: 'binary_sensor.living_room_motion', x: 300, y: 560 },
    { entity: 'binary_sensor.kitchen_dining_motion', x: 700, y: 420 },
  ],
};

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

  // only what this floor draws — see ha/useEntities for why this matters
  const ids = useMemo(
    () => [...Object.values(map), ...beacons.map((b) => b.entity)],
    [map, beacons]
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
        <div style={tabsWrap}>
          {FLOOR_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTab(t.key); setSelected(null); }}
              style={{ ...tabStyle, ...(active === t.key ? tabActive : null) }}
            >
              {t.label}
            </button>
          ))}
        </div>
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
            FRONT · Wyoming Ave
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

const tabsWrap: CSSProperties = {
  position: 'absolute',
  left: 10,
  top: 10,
  display: 'flex',
  gap: 6,
  zIndex: 4,
};

const tabStyle: CSSProperties = {
  padding: '5px 12px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  font: 'inherit',
  color: 'rgba(230,236,245,0.62)',
  background: 'rgba(10,14,20,0.7)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.10)',
};

const tabActive: CSSProperties = {
  color: '#0d1218',
  background: AMBER,
  borderColor: AMBER,
};
