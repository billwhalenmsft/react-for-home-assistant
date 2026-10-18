import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Hass, HassEntity } from '../ha/types';
import { brightnessPct, isOn, nameOf, Slider } from './Controls';

/**
 * Colour and white for the bulbs that can do more than dim.
 *
 * The room panel's squares already toggle and dim each light; this is the
 * second row for the ones with a colour engine in them (the ZL1 lamps, Hue).
 * Caseta dimmers report `brightness` only and never show up here, which is
 * the point: no colour wheel next to a light that cannot take it.
 *
 * One block per room, aimed at "both" or a single lamp, because two lamps in
 * one room are nearly always wanted the same and occasionally not.
 */

const COLOR_MODES = new Set(['hs', 'xy', 'rgb', 'rgbw', 'rgbww', 'color_temp']);
const HUE_MODES = new Set(['hs', 'xy', 'rgb', 'rgbw', 'rgbww']);

const modesOf = (s?: HassEntity): string[] => {
  const m = (s?.attributes as Record<string, unknown> | undefined)?.supported_color_modes;
  return Array.isArray(m) ? (m as string[]) : [];
};

/** A light with white temperature or colour, not just a dimmer. */
export const isColorLight = (id: string, s?: HassEntity) =>
  id.startsWith('light.') && modesOf(s).some((m) => COLOR_MODES.has(m));

/** The bulb's live colour as CSS, for tinting its tile. Null when off or unknown. */
export const lightCss = (s?: HassEntity): string | null => {
  const c = (s?.attributes as Record<string, unknown> | undefined)?.rgb_color as number[] | undefined;
  return s?.state === 'on' && Array.isArray(c) ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : null;
};

export const KELVIN_PRESETS: ReadonlyArray<{ k: number; label: string; css: string }> = [
  { k: 2200, label: 'Candle',   css: '#ffb56b' },
  { k: 2700, label: 'Warm',     css: '#ffc998' },
  { k: 4000, label: 'Neutral',  css: '#ffe4cd' },
  { k: 5500, label: 'Daylight', css: '#fff4ec' },
  { k: 6500, label: 'Cool',     css: '#eaf1ff' },
];

const LAMP_COLORS: ReadonlyArray<{ label: string; hs: [number, number] }> = [
  { label: 'Ember',  hs: [22, 85] },
  { label: 'Rose',   hs: [335, 55] },
  { label: 'Violet', hs: [275, 70] },
  { label: 'Ocean',  hs: [205, 75] },
  { label: 'Forest', hs: [120, 65] },
];

/*
 * Drag-to-pick colour wheel. Hue runs round the rim, saturation from white at
 * the centre to full colour at the edge - the same model the bulbs take, so
 * what the thumb sits on is what gets sent.
 *
 * The thumb follows the finger locally; the light gets a command at most every
 * `every` ms while dragging and once more on release, so a sweep across the
 * wheel is a handful of Zigbee frames rather than a flood the mesh drops.
 */
export function ColorWheel({ hs, onPick, size = 210, every = 300, disabled }: {
  hs: [number, number] | null; onPick: (hs: [number, number]) => void;
  size?: number; every?: number; disabled?: boolean;
}) {
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const dragging = useRef(false);
  const lastSent = useRef(0);
  const pending = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(pending.current), []);
  // Drop the local draft once the light reports something close to it.
  useEffect(() => {
    if (!draft || dragging.current || !hs) return undefined;
    const t = window.setTimeout(() => setDraft(null), 3000);
    return () => window.clearTimeout(t);
  }, [hs, draft]);

  const shown = draft ?? hs;
  const at = (ev: React.PointerEvent<HTMLDivElement>): [number, number] => {
    const r = ev.currentTarget.getBoundingClientRect();
    const dx = ev.clientX - (r.left + r.width / 2);
    const dy = ev.clientY - (r.top + r.height / 2);
    const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const sat = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)) * 100;
    return [Math.round(hue), Math.round(sat)];
  };
  const push = (v: [number, number], final: boolean) => {
    setDraft(v);
    window.clearTimeout(pending.current);
    const wait = every - (Date.now() - lastSent.current);
    if (final || wait <= 0) { lastSent.current = Date.now(); onPick(v); return; }
    pending.current = window.setTimeout(() => { lastSent.current = Date.now(); onPick(v); }, wait);
  };

  const R = size / 2;
  const thumb = shown
    ? { x: R + Math.cos(shown[0] * Math.PI / 180) * R * (shown[1] / 100), y: R + Math.sin(shown[0] * Math.PI / 180) * R * (shown[1] / 100) }
    : null;

  return (
    <div
      role="slider" aria-label="Colour wheel" aria-valuetext={shown ? `hue ${shown[0]}, saturation ${shown[1]}%` : 'no colour'}
      onPointerDown={(ev) => {
        if (disabled) return;
        dragging.current = true;
        ev.currentTarget.setPointerCapture(ev.pointerId);
        push(at(ev), false);
      }}
      onPointerMove={(ev) => { if (dragging.current) push(at(ev), false); }}
      onPointerUp={(ev) => { if (!dragging.current) return; dragging.current = false; push(at(ev), true); }}
      onPointerCancel={() => { dragging.current = false; }}
      style={{
        position: 'relative', width: size, height: size, borderRadius: '50%', margin: '0 auto',
        touchAction: 'none', cursor: disabled ? 'default' : 'crosshair', opacity: disabled ? 0.4 : 1,
        background: `radial-gradient(circle closest-side, #fff, rgba(255,255,255,0)),
          conic-gradient(from 90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)`,
        boxShadow: '0 6px 30px rgba(0,0,0,0.35)',
      }}
    >
      {thumb && (
        <span style={{
          position: 'absolute', left: thumb.x - 13, top: thumb.y - 13, width: 26, height: 26, borderRadius: '50%',
          border: '3px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.5)',
          background: `hsl(${shown![0]}, ${shown![1]}%, ${100 - shown![1] / 2}%)`, pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}

/** "Great Room Window Lamp" reads as "Window Lamp" inside the Great Room. */
const shortName = (id: string, s: HassEntity | undefined, room: string) => {
  const n = nameOf(id, s);
  return n.toLowerCase().startsWith(room.toLowerCase() + ' ') ? n.slice(room.length + 1) : n;
};

export function ColorLightBlock({ hass, ids, states, room }: {
  hass: Hass;
  ids: string[];
  states: Record<string, HassEntity | undefined>;
  room: string;
}) {
  // null = every colour lamp in the room at once.
  const [only, setOnly] = useState<string | null>(null);
  const [wheel, setWheel] = useState(false);
  const target = useMemo(() => (only && ids.includes(only) ? [only] : ids), [only, ids]);

  // Read the look from the first lamp that is lit, so "both" shows something real.
  const lead = states[target.find((id) => isOn(states[id])) ?? target[0]];
  const anyOn = target.some((id) => isOn(states[id]));
  const allGone = target.every((id) => !states[id] || states[id]!.state === 'unavailable');
  const canHue = target.some((id) => modesOf(states[id]).some((m) => HUE_MODES.has(m)));
  const a = (lead?.attributes ?? {}) as Record<string, unknown>;
  const mode = a.color_mode;
  const k = typeof a.color_temp_kelvin === 'number' ? a.color_temp_kelvin : 0;
  const hs = anyOn && mode !== 'color_temp' && Array.isArray(a.hs_color) ? (a.hs_color as [number, number]) : null;

  const send = (data: Record<string, unknown>) =>
    void hass.callService('light', 'turn_on', data, { entity_id: target });

  const chip = (key: string | null, label: string, s?: HassEntity) => {
    const active = only === key;
    const dot = lightCss(s);
    return (
      <button
        key={key ?? '*'} type="button" className="est-tap" aria-pressed={active}
        onClick={() => setOnly(key)}
        style={{ ...S.chip, ...(active ? S.chipOn : null) }}
      >
        {s ? (
          <span aria-hidden="true" style={{
            ...S.dot,
            background: dot ?? 'transparent',
            border: dot ? 'none' : '1px solid var(--wt-line)',
          }} />
        ) : null}
        {label}
      </button>
    );
  };

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <span style={S.title}>Colour &amp; white</span>
        {ids.length > 1 ? (
          <span style={S.chips}>
            {chip(null, 'All')}
            {ids.map((id) => chip(id, shortName(id, states[id], room), states[id]))}
          </span>
        ) : null}
      </div>

      <div style={S.row}>
        <span style={S.label}>Level</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Slider
            value={anyOn ? brightnessPct(lead) : 0}
            disabled={allGone}
            ariaLabel="Lamp brightness"
            onCommit={(v) =>
              v <= 0
                ? void hass.callService('light', 'turn_off', {}, { entity_id: target })
                : send({ brightness_pct: v })}
          />
        </div>
        <span style={S.num}>{anyOn ? `${brightnessPct(lead)}%` : 'Off'}</span>
      </div>

      <div style={S.swatches}>
        {KELVIN_PRESETS.map((p) => (
          <button
            key={p.k} type="button" className="est-tap" disabled={allGone}
            title={`${p.label} · ${p.k}K`} aria-label={`${p.label} white, ${p.k} kelvin`}
            onClick={() => send({ color_temp_kelvin: p.k })}
            style={{
              ...S.swatch, background: p.css, color: '#2a2118',
              borderColor: anyOn && mode === 'color_temp' && Math.abs(k - p.k) < 80 ? 'var(--wt-gold)' : 'var(--wt-line)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {canHue ? (
        <>
          <div style={S.swatches}>
            {LAMP_COLORS.map((c) => (
              <button
                key={c.label} type="button" className="est-tap" disabled={allGone}
                title={c.label} aria-label={`${c.label} colour`}
                onClick={() => send({ hs_color: c.hs })}
                style={{
                  ...S.swatch, color: '#14110d',
                  background: `hsl(${c.hs[0]}, ${c.hs[1]}%, 58%)`,
                  borderColor: hs && Math.abs(hs[0] - c.hs[0]) < 6 && Math.abs(hs[1] - c.hs[1]) < 8
                    ? 'var(--wt-gold)' : 'var(--wt-line)',
                }}
              >
                {c.label}
              </button>
            ))}
            <button
              type="button" className="est-tap" aria-expanded={wheel}
              onClick={() => setWheel((w) => !w)}
              style={{
                ...S.swatch, color: 'var(--wt-text)',
                background: 'conic-gradient(from 90deg, #f55, #ff5, #5f5, #5ff, #55f, #f5f, #f55)',
                textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                borderColor: wheel ? 'var(--wt-gold)' : 'var(--wt-line)',
              }}
            >
              Custom
            </button>
          </div>
          {wheel ? (
            <div style={{ padding: '6px 0 4px' }}>
              <ColorWheel size={180} disabled={allGone} hs={hs} onPick={(v) => send({ hs_color: v })} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  wrap: { display: 'grid', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--wt-line)' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 12.5, fontWeight: 700, color: 'var(--wt-text)', letterSpacing: '0.02em' },
  chips: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    font: 'inherit', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em',
    padding: '4px 9px', borderRadius: 999, cursor: 'pointer',
    color: 'var(--wt-dim)', background: 'var(--wt-glass)', border: '1px solid var(--wt-line)',
  },
  chipOn: { color: 'var(--wt-onAccent)', background: 'var(--wt-gold)', borderColor: 'var(--wt-gold)' },
  dot: { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  row: { display: 'flex', alignItems: 'center', gap: 10 },
  label: { fontSize: 11, color: 'var(--wt-dim)', width: 34, flexShrink: 0 },
  num: { fontSize: 11.5, color: 'var(--wt-dim)', width: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  swatches: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: 6 },
  swatch: {
    height: 34, borderRadius: 9, cursor: 'pointer', border: '1px solid var(--wt-line)',
    font: 'inherit', fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', padding: 0,
  },
};
