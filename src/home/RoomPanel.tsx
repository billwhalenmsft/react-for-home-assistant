import type { CSSProperties } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass } from '../ha/types';
import { ROOM_DEVICES } from './rooms';

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
}: {
  hass: Hass;
  floor: string;
  room: string;
  onClose: () => void;
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
    <div style={S.wrap} role="dialog" aria-label={`${room} controls`}>
      <div style={S.head}>
        <div>
          <div style={S.title}>{room}</div>
          {spec?.note ? <div style={S.note}>{spec.note}</div> : null}
        </div>
        <button type="button" onClick={onClose} style={S.close} aria-label="Close">
          ✕
        </button>
      </div>

      {ids.length === 0 ? (
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

const S = {
  wrap: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 'min(330px, 78%)',
    maxHeight: 'calc(100% - 24px)',
    overflowY: 'auto',
    padding: 14,
    borderRadius: 18,
    background: 'rgba(12,16,22,0.90)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
    zIndex: 5,
  } as CSSProperties,
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 } as CSSProperties,
  title: { fontSize: 17, fontWeight: 700, color: '#eef3fa' } as CSSProperties,
  note: { fontSize: 11, color: '#7d8a9c', marginTop: 3, lineHeight: 1.4 } as CSSProperties,
  close: {
    border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: '#9fb0c4',
    borderRadius: 10, width: 28, height: 28, cursor: 'pointer', fontSize: 13, lineHeight: 1,
  } as CSSProperties,
  list: { display: 'grid', gap: 7 } as CSSProperties,
  row: {
    display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10,
    padding: '9px 11px', borderRadius: 12, textAlign: 'left', font: 'inherit',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
    color: '#dbe4f0', transition: 'background 160ms ease, border-color 160ms ease',
  } as CSSProperties,
  rowOn: { background: 'rgba(250,187,90,0.13)', borderColor: 'rgba(250,187,90,0.42)' } as CSSProperties,
  dot: (on: boolean): CSSProperties => ({
    width: 8, height: 8, borderRadius: '50%',
    background: on ? AMBER : 'rgba(255,255,255,0.22)',
    boxShadow: on ? `0 0 10px ${AMBER}` : 'none',
  }),
  label: { fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as CSSProperties,
  state: { fontSize: 11, color: '#8b98ab', textTransform: 'capitalize' } as CSSProperties,
  empty: { fontSize: 12.5, color: '#7d8a9c', padding: '10px 4px', lineHeight: 1.5 } as CSSProperties,
};
