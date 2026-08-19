import type { CSSProperties } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass } from '../ha/types';

/**
 * Garage bay control.
 *
 * Deliberately graphic rather than skeuomorphic: a clean panel that travels in
 * its opening, a bright leading edge, and the position set in large type — not
 * a drawing of a wooden door. Position comes from the cover's current_position
 * where the firmware reports it (esphome-ratgdo does), so a half-open door
 * looks half open instead of merely saying "open".
 *
 * State-only, no history — see RoomPanel for why that matters here.
 */

const AMBER = 'rgb(250,187,90)';

export interface GarageControlProps {
  hass: Hass;
  cover: string;
  /** omit whatever the bay doesn't expose */
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
  const openPct = reported ?? (state === 'open' ? 100 : state === 'opening' ? 60 : state === 'closing' ? 40 : 0);

  const blocked = obstruction ? s[obstruction]?.state === 'on' : false;
  const lightOn = light ? s[light]?.state === 'on' : false;
  const locked = lock ? s[lock]?.state === 'locked' : false;
  const cycles = openings ? s[openings]?.state : undefined;

  const call = (svc: string) => hass.callService('cover', svc, {}, { entity_id: cover });
  const primary = state === 'closed' ? 'Open' : state === 'open' ? 'Close' : 'Stop';
  const onPrimary = () =>
    void call(state === 'closed' ? 'open_cover' : state === 'open' ? 'close_cover' : 'stop_cover');

  const headline = moving ? state.toUpperCase() : openPct === 0 ? 'CLOSED' : openPct === 100 ? 'OPEN' : `${openPct}%`;

  return (
    <div style={S.wrap}>
      <div style={S.stage}>
        {/* opening: what's behind the door */}
        <div style={{ ...S.void, opacity: Math.min(1, openPct / 70) }} />
        {openPct > 3 && (
          <div style={{ ...S.spill, opacity: (lightOn ? 0.85 : 0.4) * Math.min(1, openPct / 60) }} />
        )}

        {/* the door panel, travelling */}
        <div
          style={{
            ...S.panel,
            height: `${100 - openPct}%`,
            transition: moving ? 'height 900ms linear' : 'height 620ms cubic-bezier(.4,0,.2,1)',
          }}
        >
          <div style={S.seam} />
          <div style={S.seam} />
          <div style={{ ...S.edge, background: moving ? AMBER : 'var(--wt-planWall)' }} />
        </div>

        <div style={S.headline}>
          <span style={{ ...S.headlineText, color: openPct > 0 ? AMBER : 'var(--wt-text)' }}>{headline}</span>
          {cycles ? <span style={S.cycles}>{Number(cycles).toLocaleString()} cycles</span> : null}
        </div>
      </div>

      {blocked && <div style={S.warn}>Obstruction detected — the door will not close</div>}

      <button type="button" onClick={onPrimary} style={{ ...S.primary, ...(moving ? S.stop : null) }}>
        {primary}
      </button>

      {(light || lock) && (
        <div style={S.chips}>
          {light && (
            <button
              type="button"
              onClick={() => void hass.callService('light', 'toggle', {}, { entity_id: light })}
              style={{ ...S.chip, ...(lightOn ? S.chipOn : null) }}
            >
              Light
            </button>
          )}
          {lock && (
            <button
              type="button"
              onClick={() => void hass.callService('lock', locked ? 'unlock' : 'lock', {}, { entity_id: lock })}
              style={{ ...S.chip, ...(locked ? S.chipOn : null) }}
            >
              {locked ? 'Remotes locked' : 'Remotes open'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  wrap: { display: 'grid', gap: 12 },
  stage: {
    position: 'relative',
    width: '100%',
    aspectRatio: '5 / 4',
    borderRadius: 'calc(var(--wt-radius) / 1.5)',
    overflow: 'hidden',
    background: 'var(--wt-glass)',
    border: '1px solid var(--wt-line)',
  },
  void: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(120% 90% at 50% 100%, rgba(0,0,0,0.85), rgba(0,0,0,0.35))',
    transition: 'opacity 600ms ease',
  },
  spill: {
    position: 'absolute', left: '10%', right: '10%', bottom: '-12%', height: '52%',
    background: `radial-gradient(60% 100% at 50% 100%, ${AMBER}, transparent 70%)`,
    filter: 'blur(10px)', transition: 'opacity 600ms ease',
  },
  panel: {
    position: 'absolute', top: 0, left: 0, right: 0,
    display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly',
    background: 'linear-gradient(180deg, var(--wt-glassHi), var(--wt-glass))',
    borderBottom: '2px solid transparent',
    overflow: 'hidden',
  },
  seam: { height: 1, background: 'var(--wt-line)', flex: 'none' },
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, opacity: 0.95 },
  headline: {
    position: 'absolute', left: 0, right: 0, bottom: 14,
    display: 'grid', justifyItems: 'center', gap: 2, pointerEvents: 'none',
  },
  headlineText: {
    fontSize: 26, fontWeight: 300, letterSpacing: '0.16em',
    textShadow: '0 2px 18px rgba(0,0,0,0.7)',
  },
  cycles: { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--wt-faint)' },
  warn: {
    fontSize: 11.5, lineHeight: 1.4, padding: '9px 11px', borderRadius: 12,
    background: 'rgba(224,121,95,0.14)', border: '1px solid rgba(224,121,95,0.45)', color: '#f0b6a6',
  },
  primary: {
    padding: '13px 14px', borderRadius: 'calc(var(--wt-radius) / 1.8)', cursor: 'pointer', border: 'none',
    font: 'inherit', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: 'var(--wt-onAccent)', background: 'linear-gradient(170deg, var(--wt-gold), var(--wt-goldDeep))',
  },
  stop: { background: 'linear-gradient(170deg, #e0795f, #a8402c)', color: '#fff' },
  chips: { display: 'flex', gap: 7 },
  chip: {
    flex: 1, padding: '10px 8px', borderRadius: 999, cursor: 'pointer',
    font: 'inherit', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--wt-dim)', background: 'var(--wt-glass)', border: '1px solid var(--wt-line)',
  },
  chipOn: { color: 'var(--wt-onAccent)', background: 'var(--wt-gold)', borderColor: 'var(--wt-gold)' },
};
