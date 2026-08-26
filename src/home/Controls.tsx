import {
  useEffect, useRef, useState,
  type CSSProperties, type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Hass, HassEntity } from '../ha/types';
import { useUserData } from '../ha/useUserData';

/**
 * Compact per-entity controls, shared by the room tiles and the room panel.
 *
 * The rule this file exists to enforce: if a thing can be controlled, you can
 * control it *where you are looking at it*. No tabs, no drill-in before the
 * first useful gesture. A room tile carries up to three of these inline; the
 * room panel carries one per entity at a slightly larger size. Same widgets in
 * both places, so a light behaves identically wherever you meet it.
 *
 * Everything here is optimistic: the widget shows your gesture immediately and
 * lets the state feed correct it. A dimmer that waits for a websocket
 * round-trip before moving feels broken even when it is working.
 */

const ON = new Set(['on', 'open', 'playing', 'run', 'cleaning', 'heat', 'cool', 'heat_cool', 'dry', 'fan_only']);

const pretty = (id: string) =>
  (id.split('.')[1] ?? id).replace(/_/g, ' ').replace(/\b(\w)/g, (m) => m.toUpperCase()).trim();

export const nameOf = (id: string, s?: HassEntity) => {
  const n = (s?.attributes as Record<string, unknown> | undefined)?.friendly_name;
  return typeof n === 'string' ? n : pretty(id);
};

/** Domains that offer a gesture rather than just a readout. */
export const ACTIONABLE = new Set([
  'light', 'switch', 'cover', 'lock', 'media_player', 'climate',
  'fan', 'humidifier', 'vacuum', 'scene', 'script', 'select', 'button',
]);

export const isOn = (s?: HassEntity) => (s ? ON.has(s.state) : false);

const attr = (s: HassEntity | undefined, k: string) =>
  (s?.attributes as Record<string, unknown> | undefined)?.[k];

/** A light we can dim, as opposed to one we can only switch. */
export const isDimmable = (id: string, s?: HassEntity) => {
  if (!id.startsWith('light.')) return false;
  const modes = attr(s, 'supported_color_modes');
  if (Array.isArray(modes)) return modes.some((m) => m !== 'onoff' && m !== 'unknown');
  return attr(s, 'brightness') !== undefined;
};

export const brightnessPct = (s?: HassEntity) => {
  const b = attr(s, 'brightness');
  if (typeof b === 'number') return Math.round(b / 2.55);
  return s?.state === 'on' ? 100 : 0;
};

/* --------------------------------------------------------------- primitives */

/**
 * Slide to dim.
 *
 * Built on the themed `.est-range` input rather than a bespoke pointer handler:
 * a native range gets keyboard, screen readers and touch for free, and this
 * house already had the styling. `--fill` drives the track gradient.
 *
 * Dragging reports continuously so the number under your thumb is honest, but
 * only the release calls the service — a light asked to change 40 times in one
 * swipe visibly stutters.
 */
export function Slider({
  value, onCommit, ariaLabel, disabled, min = 0, max = 100,
}: {
  value: number;
  onCommit: (v: number) => void;
  ariaLabel: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  // Let the live value win again once the drag is over and the feed catches up.
  useEffect(() => { setDrag(null); }, [value]);
  const shown = drag ?? value;
  const fill = ((shown - min) / (max - min || 1)) * 100;

  // Release, blur and keyup can all land for a single gesture, and `drag` is
  // still set until the state feed answers — so without this the same
  // brightness gets sent two or three times per swipe.
  const sent = useRef<number | null>(null);
  const commit = () => {
    if (drag === null || sent.current === drag) return;
    sent.current = drag;
    onCommit(drag);
  };

  return (
    <input
      className="est-range"
      type="range"
      min={min}
      max={max}
      step={1}
      value={shown}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{ '--fill': `${fill}%`, opacity: disabled ? 0.4 : 1 } as CSSProperties}
      onChange={(e) => setDrag(Number(e.target.value))}
      onPointerUp={commit}
      onKeyUp={commit}
      onBlur={commit}
    />
  );
}

/** The on/off gesture. Reads as a switch, not as a link. */
export function Pill({
  on, label, onClick, ariaLabel, tone = 'gold',
}: {
  on: boolean;
  label: string;
  onClick: () => void;
  ariaLabel: string;
  tone?: 'gold' | 'plain';
}) {
  return (
    <button
      type="button"
      className="est-tap"
      aria-pressed={on}
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        ...S.pill,
        ...(on && tone === 'gold' ? S.pillOn : null),
        ...(on && tone === 'plain' ? S.pillOnPlain : null),
      }}
    >
      {label}
    </button>
  );
}

/* --------------------------------------------------------------- preference */

export type ControlStyle = 'square' | 'bar';

/**
 * How this person wants to touch things.
 *
 * Per-user rather than per-house: two people sharing a wall tablet can disagree
 * about this without either of them being wrong, and `useUserData` already
 * follows a person across devices. Defaults to the square tiles.
 */
export function useControlStyle(hass: Hass) {
  const [style, save, loaded] = useUserData<ControlStyle>(hass, 'estate.controlStyle', 'square');
  return [style, save, loaded] as const;
}

/**
 * A square you press, or press and slide.
 *
 * Tap toggles. Press and drag upward raises the value, downward lowers it —
 * the same gesture the thermostat dial uses, for the same reason: a vertical
 * drag is forgiving on a phone in a way an angular grab is not, and it does
 * not fight the page's own scrolling once the pointer is captured.
 *
 * The two gestures live on one control because they are one intent. A drag is
 * only a drag once it has travelled past DEAD_ZONE; below that it is a tap
 * with an unsteady thumb, and treating it as a dim to 43% is how these
 * controls earn a reputation for being twitchy.
 *
 * The fill is the value, drawn from the bottom, so a dark room reads as a
 * mostly-empty square from across the room without anyone reading the number.
 */
const DEAD_ZONE = 5;      // px of travel before a press becomes a drag
const PX_PER_UNIT = 1.6;  // drag distance for one unit of value

export function SquareControl({
  label, sub, value, on, slideable, min = 0, max = 100, unit = '%',
  onToggle, onCommit, ariaLabel,
}: {
  label: string;
  sub?: string;
  /** null when the thing has no level, only a state */
  value: number | null;
  on: boolean;
  slideable: boolean;
  min?: number;
  max?: number;
  unit?: string;
  /** omit for things that set a level but have no sensible on/off tap */
  onToggle?: () => void;
  onCommit: (v: number) => void;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const drag = useRef<{ y: number; from: number; moved: boolean } | null>(null);
  useEffect(() => { setDraft(null); }, [value]);

  const shown = draft ?? value;
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  const fill = shown !== null && on ? ((shown - min) / (max - min || 1)) * 100 : on ? 100 : 0;

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!slideable || value === null) return;
    drag.current = { y: e.clientY, from: value, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY;                    // up is positive
    if (!d.moved && Math.abs(dy) < DEAD_ZONE) return;
    d.moved = true;
    setDraft(clamp(d.from + dy / PX_PER_UNIT));
  };

  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) { onToggle?.(); return; }             // not slideable: a plain press
    if (!d.moved) { setDraft(null); onToggle?.(); return; }
    if (draft !== null) onCommit(draft);
  };

  const key = (e: React.KeyboardEvent) => {
    if (onToggle && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggle(); return; }
    if (!slideable || value === null) return;
    const step = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    onCommit(clamp(value + step * (e.shiftKey ? 10 : 1)));
  };

  return (
    <div
      role={onToggle ? 'button' : 'slider'}
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={onToggle ? on : undefined}
      aria-valuenow={slideable && shown !== null ? shown : undefined}
      aria-valuemin={!onToggle ? min : undefined}
      aria-valuemax={!onToggle ? max : undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { drag.current = null; setDraft(null); }}
      onKeyDown={key}
      style={{
        ...Q.tile,
        borderColor: on ? 'var(--wt-lineHi)' : 'var(--wt-line)',
        // touch-action matters: without it the browser claims the vertical
        // drag for page scroll and the control never sees the gesture.
        touchAction: slideable ? 'none' : 'manipulation',
      }}
    >
      <span aria-hidden="true" style={{ ...Q.fill, height: `${fill}%` }} />
      <span style={Q.body}>
        <span style={Q.value}>
          {on ? (shown !== null ? `${shown}${unit}` : 'On') : 'Off'}
        </span>
        <span style={Q.name} title={label}>{label}</span>
        {sub ? <span style={Q.sub}>{sub}</span> : null}
      </span>
    </div>
  );
}

const Q: Record<string, CSSProperties> = {
  tile: {
    position: 'relative', overflow: 'hidden', minWidth: 0,
    aspectRatio: '1 / 1', borderRadius: 16, cursor: 'pointer',
    background: 'var(--wt-glass)', border: '1px solid var(--wt-line)',
    userSelect: 'none', WebkitUserSelect: 'none',
    transition: 'border-color 160ms ease',
  },
  fill: {
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 0,
    background: 'linear-gradient(to top, rgba(250,187,90,0.42), rgba(250,187,90,0.16))',
    transition: 'height 90ms linear',
  },
  body: {
    position: 'absolute', inset: 0, zIndex: 1,
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    gap: 1, padding: '9px 10px',
  },
  value: { fontSize: 15, fontWeight: 700, color: 'var(--wt-text)', fontVariantNumeric: 'tabular-nums' },
  name: {
    fontSize: 10.5, fontWeight: 600, color: 'var(--wt-dim)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  sub: {
    fontSize: 9.5, color: 'var(--wt-faint, var(--wt-dim))',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
};

/* ------------------------------------------------------------ the dispatcher */

/**
 * One entity, rendered as whatever it actually is.
 *
 * `size="tile"` is the three-across strip on a room card: label and one
 * gesture, nothing that needs a second glance. `size="card"` is the room
 * panel's minicard, which can afford a second row.
 */
export function EntityControl({
  hass, id, s, size = 'card', style = 'bar',
}: {
  hass: Hass;
  id: string;
  s?: HassEntity;
  size?: 'tile' | 'card';
  style?: ControlStyle;
}) {
  const [domain] = id.split('.');
  const on = isOn(s);
  const name = nameOf(id, s);
  const call = (d: string, srv: string, data: Record<string, unknown> = {}) =>
    void hass.callService(d, srv, data, { entity_id: id });

  if (style === 'square') {
    const sq = square({ id, s, domain, on, name, call });
    // Not every domain suits a square. A cover wants Open/Stop/Close as three
    // distinct targets, and a one-shot script wants a button that looks
    // pressable. Those fall through to the bar cards below rather than being
    // forced into a shape that loses information.
    if (sq) return sq;
  }

  const head = (right?: React.ReactNode) => (
    <div style={S.head}>
      <span style={S.label} title={name}>{name}</span>
      {right ?? <span style={S.state}>{s ? s.state.replace(/_/g, ' ') : '—'}</span>}
    </div>
  );

  /* lights ------------------------------------------------------------- */
  if (domain === 'light') {
    const dim = isDimmable(id, s);
    const pct = brightnessPct(s);
    return (
      <div style={S.card}>
        {head(
          <Pill
            on={on}
            label={on ? (dim ? `${pct}%` : 'On') : 'Off'}
            ariaLabel={`Toggle ${name}`}
            onClick={() => call('light', 'toggle')}
          />,
        )}
        {dim ? (
          <Slider
            value={pct}
            disabled={!s}
            ariaLabel={`${name} brightness`}
            onCommit={(v) =>
              v <= 0
                ? call('light', 'turn_off')
                : call('light', 'turn_on', { brightness_pct: v })}
          />
        ) : null}
      </div>
    );
  }

  /* switches and fans --------------------------------------------------- */
  if (domain === 'switch' || domain === 'fan' || domain === 'humidifier') {
    return (
      <div style={S.card}>
        {head(
          <Pill
            on={on}
            label={on ? 'On' : 'Off'}
            ariaLabel={`Toggle ${name}`}
            onClick={() => call(domain, 'toggle')}
          />,
        )}
      </div>
    );
  }

  /* covers — blinds and doors ------------------------------------------- */
  if (domain === 'cover') {
    const posRaw = attr(s, 'current_position');
    const pos = typeof posRaw === 'number' ? posRaw : null;
    return (
      <div style={S.card}>
        {head()}
        <div style={S.trio}>
          <Pill on={false} label="Open" ariaLabel={`Open ${name}`} onClick={() => call('cover', 'open_cover')} />
          <Pill on={false} label="Stop" ariaLabel={`Stop ${name}`} onClick={() => call('cover', 'stop_cover')} />
          <Pill on={false} label="Close" ariaLabel={`Close ${name}`} onClick={() => call('cover', 'close_cover')} />
        </div>
        {pos !== null && size === 'card' ? (
          <Slider
            value={pos}
            ariaLabel={`${name} position`}
            onCommit={(v) => call('cover', 'set_cover_position', { position: v })}
          />
        ) : null}
      </div>
    );
  }

  /* locks ---------------------------------------------------------------- */
  if (domain === 'lock') {
    const locked = s?.state === 'locked';
    return (
      <div style={S.card}>
        {head(
          <Pill
            on={locked}
            tone="plain"
            label={locked ? 'Locked' : 'Unlocked'}
            ariaLabel={locked ? `Unlock ${name}` : `Lock ${name}`}
            onClick={() => call('lock', locked ? 'unlock' : 'lock')}
          />,
        )}
      </div>
    );
  }

  /* media ---------------------------------------------------------------- */
  if (domain === 'media_player') {
    const volRaw = attr(s, 'volume_level');
    const vol = typeof volRaw === 'number' ? Math.round(volRaw * 100) : null;
    const playing = s?.state === 'playing';
    const title = attr(s, 'media_title');
    return (
      <div style={S.card}>
        {head(
          <Pill
            on={playing}
            label={playing ? 'Pause' : 'Play'}
            ariaLabel={`${playing ? 'Pause' : 'Play'} ${name}`}
            onClick={() => call('media_player', 'media_play_pause')}
          />,
        )}
        {typeof title === 'string' && title ? <div style={S.sub}>{title}</div> : null}
        {vol !== null && size === 'card' ? (
          <Slider
            value={vol}
            ariaLabel={`${name} volume`}
            onCommit={(v) => call('media_player', 'volume_set', { volume_level: v / 100 })}
          />
        ) : null}
      </div>
    );
  }

  /* climate -------------------------------------------------------------- */
  if (domain === 'climate') {
    const t = attr(s, 'temperature');
    const cur = attr(s, 'current_temperature');
    const target = typeof t === 'number' ? t : null;
    const step = (delta: number) => {
      if (target === null) return;
      call('climate', 'set_temperature', { temperature: target + delta });
    };
    return (
      <div style={S.card}>
        {head(<span style={S.state}>{typeof cur === 'number' ? `now ${Math.round(cur)}°` : s?.state ?? '—'}</span>)}
        <div style={S.stepper}>
          <Pill on={false} label="−" ariaLabel={`Lower ${name}`} onClick={() => step(-1)} />
          <span style={S.big}>{target !== null ? `${Math.round(target)}°` : '—'}</span>
          <Pill on={false} label="+" ariaLabel={`Raise ${name}`} onClick={() => step(1)} />
        </div>
      </div>
    );
  }

  /* one-shot things ------------------------------------------------------ */
  if (domain === 'scene' || domain === 'script' || domain === 'button') {
    return (
      <div style={S.card}>
        {head(
          <Pill
            on={false}
            label="Run"
            ariaLabel={`Run ${name}`}
            onClick={() => call(domain, domain === 'scene' ? 'turn_on' : domain === 'script' ? 'turn_on' : 'press')}
          />,
        )}
      </div>
    );
  }

  /* vacuum --------------------------------------------------------------- */
  if (domain === 'vacuum') {
    const cleaning = s?.state === 'cleaning';
    return (
      <div style={S.card}>
        {head(
          <Pill
            on={cleaning}
            label={cleaning ? 'Dock' : 'Clean'}
            ariaLabel={cleaning ? `Return ${name} to dock` : `Start ${name}`}
            onClick={() => call('vacuum', cleaning ? 'return_to_base' : 'start')}
          />,
        )}
      </div>
    );
  }

  /* everything else is a readout ----------------------------------------- */
  return <div style={S.card}>{head()}</div>;
}

/**
 * Will this entity actually come back as a square?
 *
 * Layout has to know before it renders: squares tile into a grid, fallbacks
 * span the full width. Kept beside `square()` so the two cannot drift.
 */
export function rendersAsSquare(id: string, s?: HassEntity) {
  const [d] = id.split('.');
  if (d === 'light' || d === 'switch' || d === 'fan' || d === 'humidifier') return true;
  if (d === 'lock' || d === 'media_player') return true;
  if (d === 'climate') return typeof (s?.attributes as Record<string, unknown> | undefined)?.temperature === 'number';
  return false;
}

/**
 * Square rendering for the domains it genuinely fits.
 *
 * Returns null for anything that would lose meaning as a single square, so the
 * caller can fall back. Climate is deliberately a slider with no tap: there is
 * no safe thing for a tap on a thermostat to mean, and Google's SDM API
 * rate-limits commands hard enough to return 429 on four quick taps — one
 * gesture, one command, on release only.
 */
function square({ id, s, domain, on, name, call }: {
  id: string;
  s?: HassEntity;
  domain: string;
  on: boolean;
  name: string;
  call: (d: string, srv: string, data?: Record<string, unknown>) => void;
}) {
  if (domain === 'light') {
    const dim = isDimmable(id, s);
    return (
      <SquareControl
        label={name}
        value={dim ? brightnessPct(s) : null}
        on={on}
        slideable={dim}
        ariaLabel={dim ? `${name} — press to toggle, slide to dim` : `Toggle ${name}`}
        onToggle={() => call('light', 'toggle')}
        onCommit={(v) =>
          v <= 0 ? call('light', 'turn_off') : call('light', 'turn_on', { brightness_pct: v })}
      />
    );
  }

  if (domain === 'switch' || domain === 'fan' || domain === 'humidifier') {
    return (
      <SquareControl
        label={name}
        value={null}
        on={on}
        slideable={false}
        ariaLabel={`Toggle ${name}`}
        onToggle={() => call(domain, 'toggle')}
        onCommit={() => {}}
      />
    );
  }

  if (domain === 'lock') {
    const locked = s?.state === 'locked';
    return (
      <SquareControl
        label={name}
        sub={locked ? 'Locked' : 'Unlocked'}
        value={null}
        on={locked}
        slideable={false}
        ariaLabel={locked ? `Unlock ${name}` : `Lock ${name}`}
        onToggle={() => call('lock', locked ? 'unlock' : 'lock')}
        onCommit={() => {}}
      />
    );
  }

  if (domain === 'media_player') {
    const playing = s?.state === 'playing';
    const title = (s?.attributes as Record<string, unknown> | undefined)?.media_title;
    const volRaw = (s?.attributes as Record<string, unknown> | undefined)?.volume_level;
    const vol = typeof volRaw === 'number' ? Math.round(volRaw * 100) : null;
    return (
      <SquareControl
        label={name}
        sub={typeof title === 'string' && title ? title : undefined}
        value={vol}
        on={playing}
        slideable={vol !== null}
        ariaLabel={`${playing ? 'Pause' : 'Play'} ${name}, slide for volume`}
        onToggle={() => call('media_player', 'media_play_pause')}
        onCommit={(v) => call('media_player', 'volume_set', { volume_level: v / 100 })}
      />
    );
  }

  if (domain === 'climate') {
    const a = (s?.attributes ?? {}) as Record<string, unknown>;
    const t = a.temperature;
    const cur = a.current_temperature;
    if (typeof t !== 'number') return null;
    return (
      <SquareControl
        label={name}
        sub={typeof cur === 'number' ? `now ${Math.round(cur)}°` : s?.state}
        value={Math.round(t)}
        on={s?.state !== 'off'}
        slideable
        min={typeof a.min_temp === 'number' ? a.min_temp : 50}
        max={typeof a.max_temp === 'number' ? a.max_temp : 90}
        unit="°"
        ariaLabel={`${name} target temperature`}
        onCommit={(v) => call('climate', 'set_temperature', { temperature: v })}
      />
    );
  }

  return null;
}

const S: Record<string, CSSProperties> = {
  card: { display: 'grid', gap: 6, alignContent: 'start', minWidth: 0 },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 },
  label: {
    fontSize: 12.5, fontWeight: 600, color: 'var(--wt-text)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
  },
  state: { fontSize: 11, color: 'var(--wt-dim)', textTransform: 'capitalize', flexShrink: 0 },
  sub: {
    fontSize: 11, color: 'var(--wt-dim)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  pill: {
    flexShrink: 0, font: 'inherit', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.06em', padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
    color: 'var(--wt-dim)', background: 'var(--wt-glass)', border: '1px solid var(--wt-line)',
    transition: 'background 140ms ease, color 140ms ease, border-color 140ms ease',
  },
  pillOn: { color: 'var(--wt-onAccent)', background: 'var(--wt-gold)', borderColor: 'var(--wt-gold)' },
  pillOnPlain: { color: 'var(--wt-text)', background: 'var(--wt-glassHi)', borderColor: 'var(--wt-lineHi)' },
  trio: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 },
  stepper: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  big: { fontSize: 20, fontWeight: 700, color: 'var(--wt-text)', fontVariantNumeric: 'tabular-nums' },
};
