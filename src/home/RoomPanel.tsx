import type { CSSProperties } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass } from '../ha/types';
import { ROOM_DEVICES } from './rooms';
import { GarageControl } from './GarageControl';

/**
 * Drill-in panel for one room. Overlays the floorplan when a room is tapped.
 *
 * Controls are deliberately minimal and state-driven — no history queries.
 * The recorder on this install blocks the UI thread hard enough to freeze the
 * renderer for 45s, so nothing here asks for history; everything comes from
 * the push-based state subscription.
 */

const AMBER = 'rgb(250,187,90)';

const pretty = (id: string, fallback: string) => {
  const [, obj = ''] = id.split('.');
  return obj
    .replace(/_/g, ' ')
    .replace(/\b(\w)/g, (m) => m.toUpperCase())
    .trim() || fallback;
};

const ON = new Set(['on', 'open', 'playing', 'run', 'unlocked', 'cleaning', 'home']);

export function RoomPanel({
  hass,
  floor,
  room,
  onClose,
  /** 'overlay' pins it to the floorplan; 'inline' lets a parent place it */
  variant = 'overlay',
}: {
  hass: Hass;
  floor: string;
  room: string;
  onClose: () => void;
  variant?: 'overlay' | 'inline';
}) {
  const spec = ROOM_DEVICES[floor]?.[room];
  const ids = spec?.entities ?? [];
  const states = useEntities(hass, ids);

  const act = (id: string) => {
    const [domain] = id.split('.');
    const st = states[id]?.state;
    if (domain === 'light' || domain === 'switch' || domain === 'fan') {
      void hass.callService(domain, 'toggle', {}, { entity_id: id });
    } else if (domain === 'cover') {
      void hass.callService('cover', st === 'open' ? 'close_cover' : 'open_cover', {}, { entity_id: id });
    } else if (domain === 'lock') {
      void hass.callService('lock', st === 'locked' ? 'unlock' : 'lock', {}, { entity_id: id });
    } else if (domain === 'media_player') {
      void hass.callService('media_player', 'media_play_pause', {}, { entity_id: id });
    }
  };

  const interactive = (id: string) =>
    ['light', 'switch', 'fan', 'cover', 'lock', 'media_player'].includes(id.split('.')[0]);

  return (
    <div style={variant === 'inline' ? { ...S.wrap, ...S.inline } : S.wrap} role="dialog" aria-label={`${room} controls`}>
      <div style={S.head}>
        <div>
          <div style={S.title}>{room}</div>
          {spec?.note ? <div style={S.note}>{spec.note}</div> : null}
        </div>
        <button type="button" onClick={onClose} style={S.close} aria-label="Close">
          ✕
        </button>
      </div>

      {GARAGE[room] ? (
        <GarageControl hass={hass} {...GARAGE[room]} />
      ) : ids.length === 0 ? (
        <div style={S.empty}>Nothing wired in this room yet.</div>
      ) : (
        <div style={S.list}>
          {ids.map((id) => {
            const s = states[id];
            const on = s ? ON.has(s.state) : false;
            const name = (s?.attributes as Record<string, unknown> | undefined)?.friendly_name;
            const label = typeof name === 'string' ? name : pretty(id, id);
            const can = interactive(id);
            return (
              <button
                key={id}
                type="button"
                disabled={!can}
                onClick={() => can && act(id)}
                style={{ ...S.row, ...(on ? S.rowOn : null), cursor: can ? 'pointer' : 'default' }}
              >
                <span style={S.dot(on)} />
                <span style={S.label}>{label}</span>
                <span style={S.state}>{s ? s.state.replace(/_/g, ' ') : '—'}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Bays render a door control rather than an entity list. */
const GARAGE: Record<string, {
  cover: string; light?: string; lock?: string; obstruction?: string; openings?: string;
}> = {
  'Single Bay': {
    cover: 'cover.garage_single_door',
    light: 'light.garage_single_light',
    lock: 'lock.garage_single_remotes',
    obstruction: 'binary_sensor.garage_single_obstruction',
    openings: 'sensor.garage_single_openings',
  },
  // still the alarm.com cover, so only the door itself is available
  'Double Bay': { cover: 'cover.garage_door_2' },
};

const S = {
  wrap: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 'min(360px, 82%)',
    maxHeight: 'calc(100% - 24px)',
    overflowY: 'auto',
    padding: 14,
    borderRadius: 'var(--wt-radius)',
    background: 'var(--wt-ground)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--wt-line)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
    zIndex: 5,
  } as CSSProperties,
  inline: {
    position: 'static',
    width: '100%',
    maxHeight: '80vh',
  } as CSSProperties,
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 } as CSSProperties,
  title: { fontSize: 17, fontWeight: 700, color: 'var(--wt-text)' } as CSSProperties,
  note: { fontSize: 11, color: 'var(--wt-dim)', marginTop: 3, lineHeight: 1.4 } as CSSProperties,
  close: {
    border: '1px solid var(--wt-line)', background: 'transparent', color: 'var(--wt-dim)',
    borderRadius: 10, width: 28, height: 28, cursor: 'pointer', fontSize: 13, lineHeight: 1,
  } as CSSProperties,
  list: { display: 'grid', gap: 7 } as CSSProperties,
  row: {
    display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10,
    padding: '9px 11px', borderRadius: 12, textAlign: 'left', font: 'inherit',
    background: 'var(--wt-glass)', border: '1px solid var(--wt-line)',
    color: 'var(--wt-text)', transition: 'background 160ms ease, border-color 160ms ease',
  } as CSSProperties,
  rowOn: { background: 'var(--wt-glassHi)', borderColor: 'var(--wt-lineHi)' } as CSSProperties,
  dot: (on: boolean): CSSProperties => ({
    width: 8, height: 8, borderRadius: '50%',
    background: on ? AMBER : 'rgba(255,255,255,0.22)',
    boxShadow: on ? `0 0 10px ${AMBER}` : 'none',
  }),
  label: { fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as CSSProperties,
  state: { fontSize: 11, color: 'var(--wt-dim)', textTransform: 'capitalize' } as CSSProperties,
  empty: { fontSize: 12.5, color: 'var(--wt-dim)', padding: '10px 4px', lineHeight: 1.5 } as CSSProperties,
};
