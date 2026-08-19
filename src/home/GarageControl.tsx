import type { CSSProperties } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass } from '../ha/types';

/**
 * Garage bay control — a door you can actually read at a glance.
 *
 * Rather than a row of entity toggles, this draws the opening: header, jambs,
 * and a slatted door that travels. Position comes from the cover's
 * current_position where the firmware reports it (esphome-ratgdo does), so a
 * half-open door looks half open rather than just saying "open". Light spills
 * out of the opening, and brighter still when the opener's own light is on.
 *
 * State-only, no history — see RoomPanel for why that matters on this install.
 */

const AMBER = 'rgb(250,187,90)';

export interface GarageControlProps {
  hass: Hass;
  /** the cover to drive */
  cover: string;
  /** opener light, remote lock, obstruction — omit what the bay doesn't have */
  light?: string;
  lock?: string;
  obstruction?: string;
  openings?: string;
}

export function GarageControl({ hass, cover, light, lock, obstruction, openings }: GarageControlProps) {
  const ids = [cover, light, lock, obstruction, openings].filter(Boolean) as string[];
  const s = useEntities(hass, ids);

  const door = s[cover];
  const state = door?.state ?? 'unknown';
  const moving = state === 'opening' || state === 'closing';
  const attrs = (door?.attributes ?? {}) as Record<string, unknown>;
  const reported = typeof attrs.current_position === 'number' ? attrs.current_position : undefined;
  // fall back to the discrete state when the firmware reports no position
  const openPct = reported ?? (state === 'open' ? 100 : state === 'opening' ? 60 : state === 'closing' ? 40 : 0);

  const blocked = obstruction ? s[obstruction]?.state === 'on' : false;
  const lightOn = light ? s[light]?.state === 'on' : false;
  const locked = lock ? s[lock]?.state === 'locked' : false;
  const cycles = openings ? s[openings]?.state : undefined;

  const call = (service: string) => hass.callService('cover', service, {}, { entity_id: cover });

  const primary = state === 'closed' ? 'Open' : state === 'open' ? 'Close' : 'Stop';
  const onPrimary = () =>
    void call(state === 'closed' ? 'open_cover' : state === 'open' ? 'close_cover' : 'stop_cover');

  // door travel: slats shrink upward into the header as it opens
  const doorH = 100 - openPct;

  return (
    <div style={S.wrap}>
      <div style={S.bay}>
        {/* interior seen through the opening */}
        <div style={{ ...S.interior, background: lightOn ? 'rgba(250,187,90,0.22)' : 'rgba(0,0,0,0.55)' }} />
        {openPct > 4 && (
          <div style={{ ...S.spill, opacity: Math.min(1, openPct / 100) * (lightOn ? 0.9 : 0.45) }} />
        )}

        {/* the door itself */}
        <div
          style={{
            ...S.door,
            height: `${doorH}%`,
            transition: moving ? 'height 900ms linear' : 'height 600ms cubic-bezier(.4,0,.2,1)',
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={S.slat} />
          ))}
        </div>

        <div style={S.header} />
        <div style={{ ...S.jamb, left: 0 }} />
        <div style={{ ...S.jamb, right: 0 }} />
      </div>

      <div style={S.statusRow}>
        <span style={{ ...S.status, color: state === 'closed' ? 'var(--wt-dim)' : AMBER }}>
          {moving ? `${state}…` : state}
          {reported !== undefined && openPct > 0 && openPct < 100 ? ` · ${openPct}%` : ''}
        </span>
        {cycles ? <span style={S.cycles}>{Number(cycles).toLocaleString()} cycles</span> : null}
      </div>

      {blocked && <div style={S.warn}>Obstruction detected — door will not close</div>}

      <button type="button" onClick={onPrimary} style={{ ...S.primary, ...(moving ? S.primaryStop : null) }}>
        {primary}
      </button>

      <div style={S.secondary}>
        {light && (
          <button
            type="button"
            onClick={() => void hass.callService('light', 'toggle', {}, { entity_id: light })}
            style={{ ...S.chip, ...(lightOn ? S.chipOn : null) }}
          >
            Light {lightOn ? 'on' : 'off'}
          </button>
        )}
        {lock && (
          <button
            type="button"
            onClick={() => void hass.callService('lock', locked ? 'unlock' : 'lock', {}, { entity_id: lock })}
            style={{ ...S.chip, ...(locked ? S.chipOn : null) }}
          >
            Remotes {locked ? 'locked' : 'unlocked'}
          </button>
        )}
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  wrap: { display: 'grid', gap: 10 },
  bay: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 3',
    borderRadius: 'calc(var(--wt-radius) / 1.6)',
    overflow: 'hidden',
    background: 'var(--wt-glass)',
    border: '1px solid var(--wt-line)',
  },
  interior: { position: 'absolute', inset: 0, transition: 'background 500ms ease' },
  spill: {
    position: 'absolute', left: '6%', right: '6%', bottom: 0, height: '38%',
    background: `linear-gradient(to top, ${AMBER}, transparent)`,
    filter: 'blur(14px)', transition: 'opacity 600ms ease',
  },
  door: {
    position: 'absolute', top: 0, left: '5%', right: '5%',
    display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden',
  },
  slat: {
    flex: 1,
    minHeight: 0,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.22))',
    borderTop: '1px solid rgba(255,255,255,0.10)',
    borderBottom: '1px solid rgba(0,0,0,0.35)',
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 9,
    background: 'var(--wt-planWall)', opacity: 0.9,
  },
  jamb: { position: 'absolute', top: 0, bottom: 0, width: '5%', background: 'var(--wt-planWall)', opacity: 0.9 },
  statusRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  status: { fontSize: 13, fontWeight: 700, textTransform: 'capitalize', letterSpacing: '0.02em' },
  cycles: { fontSize: 11, color: 'var(--wt-faint)' },
  warn: {
    fontSize: 11.5, lineHeight: 1.4, padding: '8px 10px', borderRadius: 10,
    background: 'rgba(224,121,95,0.14)', border: '1px solid rgba(224,121,95,0.45)', color: '#f0b6a6',
  },
  primary: {
    padding: '12px 14px', borderRadius: 'calc(var(--wt-radius) / 1.8)', cursor: 'pointer',
    font: 'inherit', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--wt-onAccent)', background: `linear-gradient(170deg, var(--wt-gold), var(--wt-goldDeep))`,
    border: 'none',
  },
  primaryStop: { background: 'linear-gradient(170deg, #e0795f, #a8402c)', color: '#fff' },
  secondary: { display: 'flex', gap: 7, flexWrap: 'wrap' },
  chip: {
    flex: 1, minWidth: 120, padding: '9px 10px', borderRadius: 999, cursor: 'pointer',
    font: 'inherit', fontSize: 11.5, fontWeight: 600,
    color: 'var(--wt-dim)', background: 'var(--wt-glass)', border: '1px solid var(--wt-line)',
  },
  chipOn: { color: 'var(--wt-onAccent)', background: 'var(--wt-gold)', borderColor: 'var(--wt-gold)' },
};
