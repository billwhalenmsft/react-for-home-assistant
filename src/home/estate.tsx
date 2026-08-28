import {
  useEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode, type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useEntities, useEntity } from '../ha/useEntities';
import { useUserData } from '../ha/useUserData';
import type { Hass, HassEntity } from '../ha/types';
import { Floorplan } from './floorplan';
import { RoomsGrid } from './RoomsGrid';
import { useControlStyle } from './Controls';
import { THEME_CSS } from './theme';
import { HousePulse, PulseChart, ForecastStrip } from './pulse';
import { IssMap, type IssState } from './skymap';
import {
  SunArc, ambientWash, solarTimes, distanceMiles, utcMinutesToLocal, geomagneticLatitude,
} from './celestial';
import { PeopleGrid, FAMILY } from './people';
import { HOUSE } from '../house';
import type { Scene } from '../house';

/**
 * THE ESTATE PANEL — a Savant/Control4-class surface for Home Assistant.
 *
 * Nothing in this file names a specific home: every entity id, person and
 * room comes from the house config (../house). See src/house/sample.ts.
 *
 * Design language: deep graphite ground, glass panels, hairline borders,
 * champagne-gold accent, thin display type, generous negative space. One
 * accent metal, semantic status colors, motion kept subtle and honest.
 *
 * Architecture: one shell, six pages, all entity data through the selective
 * useEntities store (a wall tablet must not re-render on every state churn).
 */

/* ================================================================ tokens */

// Tokens resolve to CSS variables so the whole surface can be re-themed by
// swapping variable values on the root — see theme.ts. Nothing here does
// colour maths, which is what makes var() safe to drop in everywhere,
// including inside gradient strings.
const T = {
  ground: 'var(--wt-ground)',
  glass: 'var(--wt-glass)',
  glassHi: 'var(--wt-glassHi)',
  line: 'var(--wt-line)',
  lineHi: 'var(--wt-lineHi)',
  text: 'var(--wt-text)',
  dim: 'var(--wt-dim)',
  faint: 'var(--wt-faint)',
  gold: 'var(--wt-gold)',
  goldHi: 'var(--wt-goldHi)',
  goldDeep: 'var(--wt-goldDeep)',
  ok: 'var(--wt-ok)',
  warn: 'var(--wt-warn)',
  alert: 'var(--wt-alert)',
  info: 'var(--wt-info)',
  onAccent: 'var(--wt-onAccent)',
  radius: 'var(--wt-radius)',
  font: `'Segoe UI', 'Helvetica Neue', system-ui, -apple-system, sans-serif`,
};

const LABEL: CSSProperties = {
  fontSize: 10.5, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase',
  color: T.dim,
};

/* ================================================================ icons */

const P = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  rooms: 'M4 18h16v2H4zm0-5h16v2H4zm0-5h16v2H4zM4 3h16v2H4z',
  cinema: 'M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z',
  shield: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  leaf: 'M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z',
  sky: 'M12 2l2.4 4.8L20 8l-4 3.9.9 5.4L12 14.8 7.1 17.3 8 11.9 4 8l5.6-1.2L12 2z',
  power: 'M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A6.92 6.92 0 0 1 19 12a7 7 0 0 1-14 0c0-2.06.9-3.92 2.58-5.42L6.17 5.17A8.93 8.93 0 0 0 3 12a9 9 0 0 0 18 0c0-2.74-1.23-5.18-3.17-6.83z',
  lock: 'M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z',
  unlock: 'M18 8h-1V6a5 5 0 0 0-9.8-1.4l1.9.6A3.1 3.1 0 0 1 15.1 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  garage: 'M22 9L12 2 2 9v13h4v-9h12v9h4V9zM8 15h8v2H8v-2zm0 4h8v2H8v-2z',
  bulb: 'M9 21h6v-1H9v1zm3-19a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z',
  play: 'M8 5v14l11-7z',
  pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  minus: 'M19 13H5v-2h14v2z',
  tv: 'M21 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5v2h8v-2h5a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H3V5h18v12z',
  people: 'M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  game: 'M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM11 13H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  person: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5z',
  more: 'M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  cog: 'M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z',
  printer: 'M19 8h-1V3H6v5H5a3 3 0 00-3 3v6h4v4h12v-4h4v-6a3 3 0 00-3-3M8 5h8v3H8V5m8 15H8v-5h8v5m3-7a1 1 0 11-1-1 1 1 0 011 1Z',
};

function Icon({ d, size = 20, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ flex: 'none' }}>
      <path d={d} fill={color} />
    </svg>
  );
}

/* ============================================================ global css */

const GLOBAL_CSS = `
.est-root { font-family: ${T.font}; -webkit-font-smoothing: antialiased; }
.est-root *::-webkit-scrollbar { width: 8px; height: 8px; }
.est-root *::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
.est-root button { font-family: inherit; }
.est-root button:focus-visible, .est-root input:focus-visible {
  outline: 2px solid ${T.gold}; outline-offset: 2px;
}
@keyframes estFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes estBreathe { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes estSweep { 0% { background-position: -150% 0; } 100% { background-position: 250% 0; } }
@keyframes estSheetUp { from { transform: translateY(14px); opacity: 0; } to { transform: none; opacity: 1; } }
.est-page { animation: estFadeUp .45s cubic-bezier(.2,.7,.3,1) both; }
.est-panel { transition: border-color .25s ease, transform .25s ease, background .25s ease; }
.est-panel:hover { border-color: ${T.lineHi}; }
.est-lift { transition: transform .2s ease, border-color .2s ease, background .2s ease; }
.est-lift:hover { transform: translateY(-2px); }
.est-pulse { animation: estBreathe 2.6s ease-in-out infinite; }
.est-sheet { animation: estSheetUp .22s cubic-bezier(.2,.7,.3,1) both; }
/* Small controls read fine on a desktop and are a coin-flip under a thumb.
   On touch devices only, grow the HIT area without touching the layout: the
   pseudo-element is invisible, sits centred on the control, and never moves
   anything around it. Guarded by pointer:coarse so two adjacent links on a
   mouse-driven screen cannot start stealing each other's clicks. */
@media (pointer: coarse) {
  .est-tap { position: relative; }
  .est-tap::after {
    content: ''; position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    width: 100%; height: 100%; min-width: 44px; min-height: 44px;
  }
}
.est-working { background-image: linear-gradient(90deg, transparent, ${T.gold}, transparent); background-size: 55% 100%; background-repeat: no-repeat; animation: estSweep 1.1s linear infinite; }
.est-range { -webkit-appearance: none; appearance: none; height: 34px; background: transparent; width: 100%; cursor: pointer; }
.est-range::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(90deg, ${T.gold} var(--fill,50%), rgba(255,255,255,0.12) var(--fill,50%)); }
.est-range::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: ${T.goldHi}; border: 2px solid #2a251c; margin-top: -7px; box-shadow: 0 2px 10px rgba(0,0,0,.55); }
.est-range::-moz-range-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.12); }
.est-range::-moz-range-progress { height: 4px; border-radius: 2px; background: ${T.gold}; }
.est-range::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: ${T.goldHi}; border: 2px solid #2a251c; }
@media (prefers-reduced-motion: reduce) {
  .est-page, .est-pulse, .est-working, .est-sheet { animation: none; }
  .est-panel, .est-lift { transition: none; }
}
`;

/* ============================================================ primitives */

function Glass({ children, style, span, className }: {
  children: ReactNode; style?: CSSProperties; span?: number; className?: string;
}) {
  return (
    <section
      className={`est-panel ${className ?? ''}`}
      style={{
        background: T.glass, border: `1px solid ${T.line}`, borderRadius: T.radius,
        padding: 22, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        gridColumn: span ? `span ${span}` : undefined, minWidth: 0,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function PanelHead({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
      <div style={LABEL}>{label}</div>
      {right}
    </div>
  );
}

function Pill({ children, onClick, active, tone, big, ariaLabel }: {
  children: ReactNode; onClick?: () => void; active?: boolean;
  tone?: 'gold' | 'ghost' | 'alert'; big?: boolean; ariaLabel?: string;
}) {
  const gold = tone !== 'ghost' && (active || tone === 'gold');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className="est-lift"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer',
        padding: big ? '13px 22px' : '9px 16px', borderRadius: 999,
        fontSize: big ? 14 : 12.5, fontWeight: 600, letterSpacing: '0.04em',
        border: `1px solid ${gold ? T.goldDeep : tone === 'alert' ? T.alert : T.line}`,
        background: gold
          ? `linear-gradient(180deg, ${T.gold}, ${T.goldDeep})`
          : 'rgba(255,255,255,0.04)',
        color: gold ? '#191408' : tone === 'alert' ? T.alert : T.text,
        boxShadow: gold ? '0 4px 18px rgba(211,176,110,0.25)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

function GoldSlider({ value, onChange, ariaLabel }: {
  value: number; onChange: (v: number) => void; ariaLabel: string;
}) {
  return (
    <input
      type="range" min={0} max={100} value={Math.round(value)}
      aria-label={ariaLabel}
      className="est-range"
      style={{ ['--fill' as string]: `${value}%` }}
      onChange={(ev) => onChange(Number(ev.target.value))}
    />
  );
}

/** Circular progress ring with a big center readout. */
function Ring({ pct, size = 168, stroke = 7, color = T.gold, children }: {
  pct: number; size?: number; stroke?: number; color?: string; children: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - clamped / 100)}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.7,.3,1), stroke .4s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center',
      }}>
        {children}
      </div>
    </div>
  );
}

/* ============================================================== helpers */

function useNow(everyMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

function useNarrow(breakpoint = 900): boolean {
  const [narrow, setNarrow] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return narrow;
}

const num = (e: HassEntity | undefined, fallback = NaN): number => {
  const v = Number(e?.state);
  return Number.isFinite(v) ? v : fallback;
};
const attr = (e: HassEntity | undefined, key: string): unknown =>
  (e?.attributes as Record<string, unknown> | undefined)?.[key];
const titleize = (s?: string) => (s ?? '—').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/* =============================================================== entity map */

const E = HOUSE.entities;


/**
 * Scenes, each carrying a plain description of what it will actually do.
 *
 * These are read off the real script bodies in scripts.yaml, not invented. A
 * confirmation that describes the wrong thing is worse than no confirmation:
 * it trains you to click through without reading. If a script changes, this
 * text has to change with it.
 */
const SCENES: ReadonlyArray<Scene> = HOUSE.scenes;


/* ================================================================ shell */

type Page = 'home' | 'rooms' | 'people' | 'profile' | 'cinema' | 'security' | 'grow' | 'sky' | 'printers' | 'settings';

/**
 * `optional` pages are OFF for everybody until a user turns them on in Setup.
 * The switch is per-user (frontend/set_user_data), so enabling Printers puts
 * it in your nav on every device you sign in on and changes nothing for the
 * rest of the house. Different from `adminOnly`, which is a role check the
 * user cannot alter.
 */
type NavItem = { id: Page; label: string; icon: string; adminOnly?: boolean; optional?: boolean };

/**
 * `adminOnly` keeps house-wide dials off non-admin phones entirely, rather
 * than showing a tab that leads to a page explaining they cannot use it.
 *
 * `optional` pages start hidden for everybody and appear only once their
 * owner switches them on in Profile -> Your pages.
 *
 * There is no `primary` flag any more. The phone bar used to show four
 * hard-coded destinations; it now shows the first four of YOUR order, so
 * moving a page to the top is what puts it on the bar. Nine tabs across a
 * 390px screen gave each ~43px and crushed the labels, hence still four.
 */
const NAV: ReadonlyArray<NavItem> = [
  { id: 'home', label: 'Home', icon: P.home },
  { id: 'rooms', label: 'Rooms', icon: P.rooms },
  { id: 'security', label: 'Security', icon: P.shield },
  { id: 'grow', label: 'Grow', icon: P.leaf },
  { id: 'people', label: 'People', icon: P.people },
  { id: 'cinema', label: 'Cinema', icon: P.cinema },
  { id: 'sky', label: 'Sky', icon: P.sky },
  { id: 'profile', label: 'Profile', icon: P.person },
  { id: 'printers', label: 'Printers', icon: P.printer, optional: true },
  { id: 'settings', label: 'Setup', icon: P.cog, adminOnly: true },
];

/**
 * Pages are addressable via the URL hash (#security, #grow, ...) so a push
 * notification can deep-link to the page that explains it. Without this every
 * page shares one URL and a notification tap lands on Home, which is exactly
 * the "clicking it doesn't open anything tangible" complaint.
 */
const PAGE_IDS = new Set<string>(NAV.map((n) => n.id));

/**
 * Which pages a person sees, and in what order. Stored per-user server-side
 * (see useUserData), so it follows them to any device they sign in on and
 * leaves everyone else's nav alone.
 */
type NavPrefs = { order: string[]; hidden: string[] };

/**
 * Home is where a stale or hidden link lands, and Profile is where these very
 * switches live -- hiding either would strand someone with no way back, so
 * neither can be switched off. Both can still be reordered.
 */
const LOCKED_VISIBLE = new Set<string>(['home', 'profile']);

const PAGE_HINT: Record<string, string> = {
  printers: 'Bambu H2D and X1C -- chamber cameras and job status.',
};

/** Default: everything on except the optional pages, in the order NAV declares. */
function defaultPrefs(): NavPrefs {
  return { order: NAV.map((n) => n.id), hidden: NAV.filter((n) => n.optional).map((n) => n.id) };
}

/** Role check, then the user's own hidden list, then their own order. */
function visibleNav(admin: boolean, prefs: NavPrefs) {
  const rank = new Map(prefs.order.map((id, i) => [id, i]));
  return NAV
    .filter((n) => admin || !n.adminOnly)
    .filter((n) => LOCKED_VISIBLE.has(n.id) || !prefs.hidden.includes(n.id))
    .sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
}

/** Role check and order, but ignoring hidden -- this is what Profile lists. */
function orderedNav(admin: boolean, prefs: NavPrefs) {
  const rank = new Map(prefs.order.map((id, i) => [id, i]));
  return NAV
    .filter((n) => admin || !n.adminOnly)
    .sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
}

function pageFromHash(): Page {
  const h = (window.location.hash || '').replace(/^#\/?/, '').split('?')[0];
  return PAGE_IDS.has(h) ? (h as Page) : 'home';
}

export function EstateApp({ hass }: { hass: Hass }) {
  const admin = hass.user?.is_admin === true;
  const [page, setPageState] = useState<Page>(pageFromHash);
  const narrow = useNarrow();

  // Per-user nav preferences: which pages are hidden, and what order they sit
  // in. `estate.optionalPages` was the previous shape (just a list of enabled
  // optional pages); it is still read so anyone who had already switched
  // Printers on keeps it, and the first save here writes the new shape.
  const [savedNav, saveNav] = useUserData<NavPrefs | null>(hass, 'estate.nav', null);
  const [legacyOptional] = useUserData<string[]>(hass, 'estate.optionalPages', []);

  const navPrefs = useMemo<NavPrefs>(() => {
    if (savedNav && Array.isArray(savedNav.order)) return savedNav;
    const d = defaultPrefs();
    return { ...d, hidden: d.hidden.filter((id) => !legacyOptional.includes(id)) };
  }, [savedNav, legacyOptional]);

  // Writing the hash keeps the URL shareable and gives the back button
  // something sensible to do; replaceState avoids stacking one history entry
  // per tab tap.
  const setPage = (p: Page) => {
    setPageState(p);
    const next = `#${p}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search + next);
    }
  };

  // React to the hash changing underneath us - a notification opened while the
  // dashboard is already on screen changes the hash without remounting.
  useEffect(() => {
    const onHash = () => setPageState(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Themes are built and shipped (see theme.ts) but the picker is hidden for
  // now, so this is pinned to the default. To re-enable: import useTheme,
  // swap this line for `const [theme, setTheme] = useTheme();`, and put
  // <ThemeSwitch value={theme} onChange={setTheme} /> back in the rail.
  const theme = 'estate';

  return (
    <div
      className="est-root"
      data-wt-theme={theme}
      style={{
        minHeight: '100vh', color: T.text, background:
          `radial-gradient(1100px 500px at 75% -8%, var(--wt-ambientA), transparent 60%),
           radial-gradient(900px 500px at -10% 108%, var(--wt-ambientB), transparent 55%),
           ${T.ground}`,
        display: 'flex', flexDirection: narrow ? 'column' : 'row',
      }}
    >
      <style>{THEME_CSS}</style>
      <style>{GLOBAL_CSS}</style>

      <AmbientLayer hass={hass} />

      {!narrow && <Rail page={page} setPage={setPage} admin={admin} prefs={navPrefs} />}

      <main style={{
        flex: 1, minWidth: 0, padding: narrow ? '20px 16px 96px' : '30px 38px 48px',
        maxWidth: 1520, margin: '0 auto', width: '100%', boxSizing: 'border-box',
        position: 'relative', zIndex: 1,
      }}>
        <Masthead hass={hass} narrow={narrow} />
        <div key={page} className="est-page" style={{ marginTop: 26 }}>
          {page === 'home' && <HomePage hass={hass} narrow={narrow} go={setPage} />}
          {page === 'rooms' && <RoomsPage hass={hass} narrow={narrow} />}
          {page === 'people' && <PeoplePage hass={hass} narrow={narrow} />}
          {page === 'profile' && <ProfilePage hass={hass} narrow={narrow}
            admin={admin} navPrefs={navPrefs} savePrefs={saveNav} />}
          {page === 'cinema' && <CinemaPage hass={hass} narrow={narrow} />}
          {page === 'security' && <SecurityPage hass={hass} narrow={narrow} />}
          {page === 'grow' && <GrowPage hass={hass} narrow={narrow} />}
          {page === 'sky' && <SkyPage hass={hass} narrow={narrow} />}
          {page === 'printers' && (!navPrefs.hidden.includes('printers')
            ? <PrintersPage hass={hass} narrow={narrow} />
            : <HomePage hass={hass} narrow={narrow} go={setPage} />)}
          {page === 'settings' && <SettingsPage hass={hass} narrow={narrow}
            prefs={navPrefs} savePrefs={saveNav} />}
        </div>
      </main>

      {narrow && <BottomBar page={page} setPage={setPage} admin={admin} prefs={navPrefs} />}
    </div>
  );
}

function Rail({ page, setPage, admin, prefs }: {
  page: Page; setPage: (p: Page) => void; admin: boolean; prefs: NavPrefs;
}) {
  const items = visibleNav(admin, prefs);
  return (
    <nav aria-label="Sections" style={{
      width: 86, flex: 'none', borderRight: `1px solid ${T.line}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '26px 0', position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center',
        background: `linear-gradient(160deg, ${T.gold}, ${T.goldDeep})`, color: T.onAccent,
        fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', marginBottom: 18,
        boxShadow: '0 6px 24px rgba(211,176,110,0.3)',
      }}>{HOUSE.name.slice(0, 1).toUpperCase()}</div>
      {items.map((n) => {
        const active = n.id === page;
        return (
          <button
            key={n.id} type="button" onClick={() => setPage(n.id)}
            aria-label={n.label} aria-current={active ? 'page' : undefined}
            className="est-lift"
            style={{
              width: 62, padding: '10px 0 8px', borderRadius: 14, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              background: active ? T.glassHi : 'transparent',
              border: `1px solid ${active ? T.lineHi : 'transparent'}`,
              color: active ? T.gold : T.dim,
            }}
          >
            <Icon d={n.icon} size={21} />
            <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {n.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function BottomBar({ page, setPage, admin, prefs }: {
  page: Page; setPage: (p: Page) => void; admin: boolean; prefs: NavPrefs;
}) {
  const [more, setMore] = useState(false);
  const items = visibleNav(admin, prefs);
  // The bar is the top four of the user's own order; the rest go in More.
  const primary = items.slice(0, 4);
  const rest = items.slice(4);
  const restActive = rest.some((n) => n.id === page);

  // Escape closes the sheet, and so does landing on a page: tapping a
  // destination should leave you looking at it, not at the menu.
  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMore(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [more]);

  const tab = (n: NavItem | 'more') => {
    const isMore = n === 'more';
    const active = isMore ? restActive && !more : (n as NavItem).id === page;
    const label = isMore ? 'More' : (n as NavItem).label;
    const icon = isMore ? P.more : (n as NavItem).icon;
    return (
      <button
        key={isMore ? 'more' : (n as NavItem).id}
        type="button"
        onClick={() => { if (isMore) { setMore((v) => !v); } else { setMore(false); setPage((n as NavItem).id); } }}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        aria-expanded={isMore ? more : undefined}
        style={{
          // flex:1 + minWidth:0 keeps five tabs evenly spread on a 320px phone
          // instead of overflowing the way space-around did with nine.
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: active || (isMore && more) ? T.gold : T.dim, padding: '4px 2px',
        }}
      >
        <Icon d={icon} size={22} />
        <span style={{
          fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
          maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{label}</span>
      </button>
    );
  };

  return (
    <>
      {more ? (
        <div
          onClick={() => setMore(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 39,
            background: 'rgba(6,8,10,0.55)', backdropFilter: 'blur(3px)',
          }}
        >
          <nav
            aria-label="More sections"
            onClick={(e) => e.stopPropagation()}
            className="est-sheet"
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 41,
              padding: '14px 14px calc(94px + env(safe-area-inset-bottom))',
              background: 'rgba(14,17,20,0.96)',
              backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
              borderTop: `1px solid ${T.lineHi}`,
              borderRadius: `${T.radius} ${T.radius} 0 0`,
              display: 'grid', gap: 8,
            }}
          >
            <div style={{
              width: 38, height: 4, borderRadius: 999, background: T.line,
              margin: '0 auto 6px',
            }} />
            {rest.map((n) => {
              const active = n.id === page;
              return (
                <button
                  key={n.id} type="button"
                  onClick={() => { setMore(false); setPage(n.id); }}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    font: 'inherit', textAlign: 'left', cursor: 'pointer',
                    // 54px tall: a real thumb target, which is the whole point
                    // of moving these out of a nine-across bar.
                    display: 'flex', alignItems: 'center', gap: 14, minHeight: 54,
                    padding: '0 16px', borderRadius: 14,
                    border: `1px solid ${active ? T.lineHi : T.line}`,
                    background: active ? T.glassHi : 'transparent',
                    color: active ? T.gold : T.text,
                  }}
                >
                  <Icon d={n.icon} size={22} />
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{n.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      ) : null}

      <nav aria-label="Sections" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        display: 'flex', alignItems: 'stretch',
        padding: '10px 4px calc(10px + env(safe-area-inset-bottom))',
        background: 'rgba(10,12,14,0.82)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
        borderTop: `1px solid ${T.line}`,
      }}>
        {primary.map(tab)}
        {rest.length > 0 ? tab('more') : null}
      </nav>
    </>
  );
}

/* ============================================================== masthead */

function Masthead({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  const now = useNow(1000);
  // Watch every person in the roster, not one hardcoded tracker - as family
  // members get the companion app they light up here with no code change.
  const ids = useMemo(
    () => [E.weather, E.headline, ...FAMILY.map((p) => p.id)],
    []
  );
  const e = useEntities(hass, ids);

  const w = e[E.weather];
  const temp = attr(w, 'temperature') as number | undefined;

  const homeFolks = FAMILY.filter((p) => e[p.id]?.state === 'home');
  const home = homeFolks.length > 0;
  // "Bill" / "Bill & Erin" / "Bill, Erin & Rowan"
  const names = homeFolks.map((p) => p.name);
  const whoIsHome = names.length === 0
    ? 'Nobody home'
    : names.length === 1
      ? `${names[0]} is home`
      : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]} are home`;

  const hh = now.getHours();
  const greeting = hh < 12 ? 'Good morning' : hh < 17 ? 'Good afternoon' : 'Good evening';
  // Greet whoever is actually signed in. Falls back to the bare greeting for
  // shared surfaces (wall tablet, Cast) where there is no meaningful user.
  const me = hass.user?.name?.trim().split(/\s+/)[0];

  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const [clock, meridiem] = time.split(' ');

  return (
    <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 20, justifyContent: 'space-between' }}>
      <div>
        <div style={{ ...LABEL, marginBottom: 8 }}>
          {HOUSE.name} · {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{
            fontSize: narrow ? 54 : 76, fontWeight: 200, letterSpacing: '-0.03em',
            lineHeight: 0.95, fontVariantNumeric: 'tabular-nums',
          }}>{clock}</span>
          <span style={{ fontSize: narrow ? 16 : 20, fontWeight: 300, color: T.dim }}>{meridiem}</span>
        </div>
        <p style={{ margin: '10px 0 0', color: T.dim, fontSize: 14.5, fontWeight: 300 }}>
          {me ? `${greeting}, ${me}` : greeting} · {e[E.headline]?.state ?? 'the house is handled'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Glass style={{ padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center', borderRadius: 18 }}>
          <span style={{ fontSize: 30, fontWeight: 200 }}>{temp != null ? Math.round(temp) : '—'}°</span>
          <div>
            <div style={{ fontSize: 12.5, color: T.text, fontWeight: 500 }}>{titleize(w?.state)}</div>
            <div style={{ fontSize: 11, color: T.dim }}>{HOUSE.locality}</div>
          </div>
        </Glass>
        <Glass style={{ padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'center', borderRadius: 18 }}>
          <span aria-hidden="true" className={home ? '' : 'est-pulse'} style={{
            width: 9, height: 9, borderRadius: 5, background: home ? T.ok : T.warn,
            boxShadow: `0 0 12px ${home ? T.ok : T.warn}`,
          }} />
          <span style={{ fontSize: 12.5, color: T.dim }}>{whoIsHome}</span>
        </Glass>
      </div>
    </header>
  );
}

/* ============================================================== attention */

/**
 * One item on the Needs-attention board.
 *
 * `onClear` is what makes this more than a read-out: some problems are facts
 * about the house that resolve themselves (a door gets shut), and some are
 * chores that stay true until a person does something. The second kind needs
 * a human to say "handled", and the board has to let them say it.
 */
/**
 * `scope` keeps tent housekeeping off the house board. The Home page is the
 * glanceable "is the house OK" surface, and a humidifier reservoir or an
 * offline probe is not a house problem - it belongs on the Grow page. Only a
 * genuine emergency (soil critical: the plants die if this is ignored) earns
 * a slot on both.
 */
type Attention = {
  text: string;
  tone: 'alert' | 'warn' | 'info';
  scope?: 'house' | 'grow' | 'both';
  onClear?: () => void;
};

const TONE_RANK: Record<Attention['tone'], number> = { alert: 0, warn: 1, info: 2 };

/** The chip board, shared by the house board and the tent board. */
function AttentionBoard({ items, span, label = 'Needs attention' }: {
  items: Attention[]; span: number; label?: string;
}) {
  if (items.length === 0) return null;
  return (
    <Glass span={span} style={{ borderColor: 'rgba(224,179,76,0.35)', background: 'rgba(224,179,76,0.06)' }}>
      <PanelHead label={label} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
        {items.map((a) => {
          const colour = a.tone === 'alert' ? T.alert : a.tone === 'warn' ? T.warn : T.dim;
          const chip: CSSProperties = {
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 500,
            border: '1px solid ' + colour, color: colour, background: 'transparent',
          };
          // A chore is a button; a fact is not. Only offer the tap where
          // tapping actually does something.
          return a.onClear ? (
            <button
              key={a.text} type="button" className="est-lift"
              onClick={a.onClear} aria-label={a.text + ' - mark done'}
              style={{ ...chip, cursor: 'pointer' }}
            >
              {a.text}
              <span aria-hidden="true" style={{ fontSize: 11, opacity: 0.75 }}>&#10003; done</span>
            </button>
          ) : (
            <span key={a.text} style={chip}>{a.text}</span>
          );
        })}
      </div>
    </Glass>
  );
}

function useAttention(hass: Hass): Attention[] {
  const ids = useMemo(() => [
    E.lock, E.garage1, E.garage2, E.soil, E.water, E.washer, E.dryer, E.waste,
    E.laundryWasherFlag, E.laundryDryerFlag,
    ...E.doors.map(([, id]) => id), ...E.growOnline,
  ], []);
  const e = useEntities(hass, ids);

  const items: Attention[] = [];
  const add = (
    text: string, tone: Attention['tone'],
    onClear?: () => void, scope: Attention['scope'] = 'house',
  ) => items.push({ text, tone, onClear, scope });

  // --- security: anything that leaves the house open ----------------------
  for (const [name, id] of E.doors) {
    if (e[id]?.state === 'on') add(`${name} is open`, 'warn');
  }
  for (const [id, name] of [[E.garage1, 'Double bay'], [E.garage2, 'Single bay']] as const) {
    const s = e[id]?.state;
    if (!s || s === 'unavailable' || s === 'unknown') add(`${name} door is offline`, 'alert');
    else if (s !== 'closed') add(`${name} door is ${s}`, 'warn');
  }
  if (e[E.lock]?.state === 'unlocked') add('Front door is unlocked', 'alert');

  // --- grow: the tent has no slack, so these outrank housekeeping ---------
  const soil = num(e[E.soil]);
  // Soil critical is the one tent condition that is genuinely urgent - ignore
  // it and the plants are gone - so it earns a place on the house board too.
  if (soil >= 0 && soil < 20) add(`Grow soil critical - ${Math.round(soil)}%`, 'alert', undefined, 'both');
  const water = num(e[E.water]);
  if (water >= 0 && water < 25) add(`Humidifier reservoir ${Math.round(water)}%`, 'warn', undefined, 'grow');
  const offline = E.growOnline.filter((id) => e[id] && e[id].state !== 'on').length;
  if (offline > 0) add(`${offline} grow device${offline > 1 ? 's' : ''} offline`, 'alert', undefined, 'grow');

  // --- laundry: standing chores, cleared by a person ----------------------
  // These persist after the machine goes idle, which is the whole point: the
  // old version dropped them exactly when someone needed to go empty it.
  for (const [flag, appliance, label] of [
    [E.laundryWasherFlag, 'washer', 'Washer needs unloading'],
    [E.laundryDryerFlag, 'dryer', 'Dryer needs unloading'],
  ] as const) {
    if (e[flag]?.state !== 'on') continue;
    add(label, 'warn', () => {
      void hass.callService('script', 'laundry_acknowledge', { appliance, who: 'Someone' });
    });
  }

  // --- purely informational ----------------------------------------------
  if (e[E.washer]?.state === 'run') add('Washer running', 'info');
  if (e[E.dryer]?.state === 'run') add('Dryer running', 'info');

  return items.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
}



/**
 * Confirmation for actions that reduce security.
 *
 * Asymmetric on purpose. Closing a garage door or locking the front door makes
 * the house safer, so those fire immediately - a confirmation there is pure
 * friction on the action you most want to be one tap. Opening and unlocking are
 * the directions you cannot take back from across town, and on a tile-sized
 * touch target they sit one mis-tap away.
 *
 * Portalled for the same reason the room modal is: this renders deep inside
 * Home Assistant's DOM, where position:fixed anchors to the nearest ancestor
 * with a transform or filter rather than the viewport.
 */
type Guarded = { title: string; body: string; verb: string; run: () => void };

function useGuard() {
  const [pending, setPending] = useState<Guarded | null>(null);

  useEffect(() => {
    if (!pending) return;
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setPending(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  const dialog = pending
    ? createPortal(
        <div
          role="dialog" aria-modal="true" aria-label={pending.title}
          className="est-root" data-wt-theme={shellThemeId()}
          onClick={(ev) => { ev.stopPropagation(); setPending(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 80, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 20,
            background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          {/* Deliberately hard-coded colors: this dialog must stay readable no
              matter what the active shell theme does to the tokens. */}
          <div
            onClick={(ev) => ev.stopPropagation()}
            style={{
              width: 'min(400px, 100%)', padding: '24px 24px 20px', borderRadius: 18,
              background: '#181d24',
              border: '1px solid rgba(211,176,110,0.5)',
              boxShadow: '0 30px 90px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.6)',
              color: '#f2efe9',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>{pending.title}</div>
            <div style={{ fontSize: 14, color: '#bcb5a7', marginTop: 9, lineHeight: 1.55 }}>
              {pending.body}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPending(null)}
                style={{
                  padding: '11px 20px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
                  border: '1px solid #4a525c', background: '#242b33', color: '#e8e5de',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { const go = pending.run; setPending(null); go(); }}
                style={{
                  padding: '11px 22px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
                  border: '1px solid #a8814a',
                  background: 'linear-gradient(180deg, #e8cf96, #c9a15c)',
                  color: '#191408',
                  boxShadow: '0 6px 22px rgba(211,176,110,0.4)',
                }}
              >
                {pending.verb}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return { guard: setPending, dialog };
}


/**
 * The theme id currently on the shell.
 *
 * Theme tokens are scoped to `.est-root[data-wt-theme="..."]` (see theme.ts),
 * and anything portalled to document.body renders OUTSIDE that element - so
 * every var(--wt-*) inside a portal resolves to nothing. The symptom is ugly
 * and specific: a gold Pill loses its gradient but keeps its hardcoded dark
 * text, and the confirm button of a security dialog becomes invisible.
 *
 * So portal roots re-declare the class and theme attribute, which puts them
 * back inside the same variable scope as the rest of the surface.
 */
function shellThemeId(): string {
  if (typeof document === 'undefined') return 'estate';
  return document.querySelector('.est-root[data-wt-theme]')?.getAttribute('data-wt-theme') ?? 'estate';
}

/* ======================================================== action feedback */

/**
 * Optimistic feedback for commands whose result arrives late.
 *
 * HA confirms a lock about a second after the bolt moves, and a garage door
 * only once it has finished its ~13s travel. Without this a tap looks like it
 * did nothing - exactly the "is the UI even responding?" problem.
 *
 * The busy flag holds until the entity reaches the state we asked for, or
 * until the deadline passes: a command that never lands (Z-Wave node gone
 * dead, ratgdo off WiFi) must not leave the control spinning forever.
 */
function useOptimistic(current: string | undefined, timeoutMs = 25000) {
  const [pending, setPending] = useState<{ target: string; at: number } | null>(null);

  useEffect(() => {
    if (!pending) return;
    if (current === pending.target) { setPending(null); return; }
    const left = Math.max(0, pending.at + timeoutMs - Date.now());
    const timer = setTimeout(() => setPending(null), left);
    return () => clearTimeout(timer);
  }, [pending, current, timeoutMs]);

  return {
    busy: pending !== null,
    run(target: string, fire: () => void) {
      setPending({ target, at: Date.now() });
      fire();
    },
  };
}

/** Sweeping hairline shown under a control while its command is in flight. */
function BusyBar({ show }: { show: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={show ? 'est-working' : undefined}
      style={{ height: 2, borderRadius: 2, marginTop: 10, opacity: show ? 1 : 0, transition: 'opacity .2s ease' }}
    />
  );
}

/** Verb shown while a command is in flight, given what the thing was before. */
function busyVerb(kind: FavKind, wasSecure: boolean) {
  if (kind === 'lock') return wasSecure ? 'Unlocking...' : 'Locking...';
  if (kind === 'light' || kind === 'switch') return wasSecure ? 'Turning on...' : 'Turning off...';
  return wasSecure ? 'Opening...' : 'Closing...';
}

/** Settled or transitional wording once nothing of ours is in flight. */
function restingLabel(kind: FavKind, st: string | undefined, offline: boolean) {
  if (offline) return 'Offline';
  if (st === 'opening') return 'Opening...';
  if (st === 'closing') return 'Closing...';
  if (kind === 'lock') return st === 'locked' ? 'Locked' : 'Unlocked';
  if (kind === 'light' || kind === 'switch') return st === 'on' ? 'On' : 'Off';
  return st === 'closed' ? 'Closed' : 'Open';
}

/**
 * Scripts fire and forget - there is no settled state to wait for, so the only
 * honest feedback is "the tap registered and the call went out". Flash a
 * confirmation briefly instead of leaving the button visually inert, which is
 * what made the scene buttons feel broken.
 */
function FirePill({ hass, script, label, tone, big, icon, active, onFired, confirm }: {
  hass: Hass; script: string; label: string;
  tone?: 'gold' | 'ghost' | 'alert'; big?: boolean; icon?: string;
  /** Stays lit as the most recently run scene. */
  active?: boolean;
  onFired?: () => void;
  /** What this will do. Present means ask before running. */
  confirm?: string;
}) {
  const [fired, setFired] = useState(false);
  const { guard, dialog } = useGuard();

  useEffect(() => {
    if (!fired) return;
    const timer = setTimeout(() => setFired(false), 1700);
    return () => clearTimeout(timer);
  }, [fired]);

  const fire = () => {
    setFired(true);
    onFired?.();
    void hass.callService('script', 'turn_on', {}, { entity_id: script });
  };

  return (
    <>
      <Pill
        tone={tone} big={big} active={(fired || active) && tone !== 'gold'} ariaLabel={label}
        onClick={() => {
          if (!confirm) { fire(); return; }
          guard({ title: label, body: confirm, verb: `Run ${label}`, run: fire });
        }}
      >
        {icon && !fired ? <Icon d={icon} size={15} /> : null}
        {fired ? 'Sent ✓' : label}
      </Pill>
      {dialog}
    </>
  );
}

type FavKind = 'lock' | 'cover' | 'light' | 'switch';
type Fav = { entity: string; name: string; kind: FavKind };

/**
 * Everything a person is allowed to pin to their rail.
 *
 * A curated catalog rather than a "favorite" button scattered across the UI:
 * a star buried on each control is easy to miss and hard to find again, and
 * you end up hunting the house for the one tile you want to unpin. One edit
 * button on the panel, one list, add and remove in the same place.
 */
const FAV_CATALOG: ReadonlyArray<Fav> = HOUSE.favourites.catalog;


/** What a brand-new user sees before they have edited anything. */
const FAV_DEFAULT: ReadonlyArray<string> = HOUSE.favourites.defaults;

/**
 * Compact tap-to-act tile for the Favorites row. One tap toggles, and the tile
 * narrates the whole round trip rather than going quiet until HA catches up.
 */
function ActionTile({ hass, entity, name, kind }: {
  hass: Hass; entity: string; name: string; kind: FavKind;
}) {
  const ids = useMemo(() => [entity], [entity]);
  const e = useEntities(hass, ids);
  const st = e[entity]?.state;
  const { busy, run } = useOptimistic(st);
  const { guard, dialog } = useGuard();

  const offline = !st || st === 'unavailable' || st === 'unknown';
  const moving = st === 'opening' || st === 'closing';
  const toggleKind = kind === 'light' || kind === 'switch';
  // "secure" means the resting, safe state: locked, closed, or off.
  const secure = kind === 'lock' ? st === 'locked'
    : toggleKind ? st !== 'on'
    : st === 'closed';
  const active = busy || moving;
  const label = busy ? busyVerb(kind, secure) : restingLabel(kind, st, offline);
  const tone = offline ? T.alert : active ? T.gold : secure ? T.ok : T.warn;

  const act = () => {
    if (offline || busy) return;
    if (toggleKind) {
      // Lights and switches are freely reversible - no confirmation earned.
      run(secure ? 'on' : 'off',
        () => void hass.callService(kind, secure ? 'turn_on' : 'turn_off', {}, { entity_id: entity }));
      return;
    }
    if (kind === 'lock') {
      const fire = () => run(secure ? 'unlocked' : 'locked',
        () => void hass.callService('lock', secure ? 'unlock' : 'lock', {}, { entity_id: entity }));
      if (!secure) { fire(); return; }        // locking is the safe direction
      guard({
        title: `Unlock ${name}?`,
        body: 'This releases the deadbolt. Anyone at the door can walk in until it is locked again.',
        verb: 'Unlock',
        run: fire,
      });
    } else {
      const fire = () => run(secure ? 'open' : 'closed',
        () => void hass.callService('cover', secure ? 'open_cover' : 'close_cover', {}, { entity_id: entity }));
      if (!secure) { fire(); return; }        // closing is the safe direction
      guard({
        title: `Open ${name}?`,
        body: 'This opens the garage door and leaves it open until something closes it.',
        verb: 'Open',
        run: fire,
      });
    }
  };

  return (
    <>
    <button
      type="button" onClick={act} disabled={offline || busy}
      aria-label={name + ' - ' + label} className="est-lift"
      style={{
        textAlign: 'left', cursor: offline || busy ? 'default' : 'pointer', minWidth: 0,
        padding: '14px 16px', borderRadius: 14, color: T.text,
        border: '1px solid ' + (active ? T.goldDeep : T.line),
        background: active ? 'rgba(224,179,76,0.08)' : 'rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span className={active ? 'est-pulse' : undefined} style={{ display: 'inline-flex' }}>
          <Icon d={kind === 'lock' ? (secure ? P.lock : P.unlock)
                   : toggleKind ? P.bulb : P.garage} size={22} color={tone} />
        </span>
        <span style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          <div style={{ fontSize: 11.5, color: tone, marginTop: 2 }}>{label}</div>
        </span>
      </div>
      <BusyBar show={active} />
    </button>
    {dialog}
    </>
  );
}

/**
 * The per-user favorites rail.
 *
 * Each HA user gets their own list (stored server-side against their account),
 * so Bill's rail and Erin's rail differ on the same wall tablet. Editing lives
 * on the panel rather than as a star on every control - one place to add and
 * remove beats hunting the house for the tile you want to unpin.
 */
function FavoritesPanel({ hass, span, narrow }: { hass: Hass; span: number; narrow: boolean }) {
  const [ids, saveIds, loaded] = useUserData<string[]>(
    hass, 'estate_favorites', [...FAV_DEFAULT]
  );
  const [editing, setEditing] = useState(false);

  const chosen = ids
    .map((id) => FAV_CATALOG.find((f) => f.entity === id))
    .filter((f): f is Fav => !!f);

  const toggle = (entity: string) => {
    saveIds(ids.includes(entity) ? ids.filter((x) => x !== entity) : [...ids, entity]);
  };

  return (
    <Glass span={span} style={{ padding: '16px 18px' }}>
      <PanelHead
        label="Favorites"
        right={
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="est-tap"
            aria-pressed={editing}
            style={{
              font: 'inherit', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${editing ? T.gold : T.line}`,
              background: 'transparent', color: editing ? T.gold : T.dim,
            }}
          >{editing ? 'Done' : 'Edit'}</button>
        }
      />

      {editing ? (
        <div>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: T.dim, fontWeight: 300 }}>
            Pick what you want on your rail. This list is yours - other people
            signed in to Home Assistant keep their own.
          </p>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: `repeat(${narrow ? 1 : 3}, minmax(0,1fr))` }}>
            {FAV_CATALOG.map((f) => {
              const on = ids.includes(f.entity);
              return (
                <button
                  key={f.entity} type="button" onClick={() => toggle(f.entity)}
                  aria-pressed={on}
                  style={{
                    font: 'inherit', textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12,
                    border: `1px solid ${on ? T.gold : T.line}`,
                    background: on ? 'rgba(224,179,76,0.08)' : 'transparent',
                    color: on ? T.text : T.dim,
                  }}
                >
                  <span style={{ fontSize: 15, width: 14, textAlign: 'center' }}>{on ? '✓' : '+'}</span>
                  <span style={{ fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : chosen.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: T.dim, fontWeight: 300 }}>
          {loaded ? 'Nothing pinned yet - tap Edit to choose.' : 'Loading your rail...'}
        </p>
      ) : (
        // Square-ish tiles: compact, thumb-sized, and they tile evenly instead
        // of stretching into wide rows on a big screen.
        <div style={{
          display: 'grid', gap: 10,
          gridTemplateColumns: `repeat(auto-fill, minmax(${narrow ? 130 : 150}px, 1fr))`,
        }}>
          {chosen.map((f) => (
            <ActionTile key={f.entity} hass={hass} entity={f.entity} name={f.name} kind={f.kind} />
          ))}
        </div>
      )}
    </Glass>
  );
}

/** Full-size front-door panel on the Security page. */
function FrontDoorCard({ hass }: { hass: Hass }) {
  const ids = useMemo(() => [E.lock], []);
  const e = useEntities(hass, ids);
  const st = e[E.lock]?.state;
  const { busy, run } = useOptimistic(st);
  const { guard, dialog } = useGuard();

  const offline = !st || st === 'unavailable' || st === 'unknown';
  const locked = st === 'locked';
  const tone = offline ? T.alert : busy ? T.gold : locked ? T.ok : T.alert;

  return (
    <Glass>
      <PanelHead label="Front Door" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Ring pct={100} size={96} stroke={5} color={tone}>
          <span className={busy ? 'est-pulse' : undefined} style={{ display: 'inline-flex' }}>
            <Icon d={locked ? P.lock : P.unlock} size={28} color={tone} />
          </span>
        </Ring>
        <div>
          <div style={{ fontSize: 18, fontWeight: 300, color: tone }}>
            {busy ? busyVerb('lock', locked) : restingLabel('lock', st, offline)}
          </div>
          <div style={{ marginTop: 10 }}>
            <Pill
              tone={locked ? 'ghost' : 'gold'}
              onClick={() => {
                if (offline || busy) return;
                const fire = () => run(locked ? 'unlocked' : 'locked',
                  () => void hass.callService('lock', locked ? 'unlock' : 'lock', {}, { entity_id: E.lock }));
                if (!locked) { fire(); return; }
                guard({
                  title: 'Unlock the front door?',
                  body: 'This releases the deadbolt. Anyone at the door can walk in until it is locked again.',
                  verb: 'Unlock',
                  run: fire,
                });
              }}
            >
              {busy ? 'Working...' : locked ? 'Unlock' : 'Lock now'}
            </Pill>
          </div>
          <BusyBar show={busy} />
        </div>
      </div>
      {dialog}
    </Glass>
  );
}

/** Full-size garage-bay panel on the Security page. */
function GarageCard({ hass, entity, name }: { hass: Hass; entity: string; name: string }) {
  const ids = useMemo(() => [entity], [entity]);
  const e = useEntities(hass, ids);
  const st = e[entity]?.state;
  const { busy, run } = useOptimistic(st);
  const { guard, dialog } = useGuard();

  const offline = !st || st === 'unavailable' || st === 'unknown';
  const moving = st === 'opening' || st === 'closing';
  const open = !offline && st !== 'closed';
  const active = busy || moving;
  const tone = offline ? T.alert : active ? T.gold : open ? T.warn : T.dim;

  // Mid-travel the useful action is Stop, and a stop has no settled target
  // state to wait for - so it fires directly rather than through run().
  const act = () => {
    if (offline || busy) return;
    if (moving) { void hass.callService('cover', 'stop_cover', {}, { entity_id: entity }); return; }
    const fire = () => run(open ? 'closed' : 'open',
      () => void hass.callService('cover', open ? 'close_cover' : 'open_cover', {}, { entity_id: entity }));
    if (open) { fire(); return; }             // closing is the safe direction
    guard({
      title: `Open the ${name.toLowerCase()}?`,
      body: 'This opens the garage door and leaves it open until something closes it.',
      verb: 'Open',
      run: fire,
    });
  };

  return (
    <Glass>
      <PanelHead label={name} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className={active ? 'est-pulse' : undefined} style={{ display: 'inline-flex' }}>
          <Icon d={P.garage} size={44} color={tone} />
        </span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 300, color: offline ? T.alert : open ? T.warn : T.text }}>
            {busy ? busyVerb('cover', !open) : restingLabel('cover', st, offline)}
          </div>
          <div style={{ marginTop: 10 }}>
            <Pill tone={open ? 'gold' : 'ghost'} onClick={act}>
              {moving ? 'Stop' : busy ? 'Working...' : open ? 'Close' : 'Open'}
            </Pill>
          </div>
          <BusyBar show={active} />
        </div>
      </div>
      {dialog}
    </Glass>
  );
}


/**
 * A page-wide wash that tracks the real sun.
 *
 * Its own tiny subscription on purpose: elevation changes continuously, and
 * hanging it off the shell would re-render every page on every tick. This
 * component owns two entities and paints one div.
 */
function AmbientLayer({ hass }: { hass: Hass }) {
  const ids = useMemo(() => [E.sun, E.weather], []);
  const e = useEntities(hass, ids);
  const elevation = (attr(e[E.sun], 'elevation') as number | undefined) ?? 0;
  const clouds = (attr(e[E.weather], 'cloud_coverage') as number | undefined) ?? 0;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: ambientWash(elevation, clouds),
        transition: 'background 4s linear',
      }}
    />
  );
}

/** The sun's real position today, as a banner. */
function SkyBanner({ hass, compact }: { hass: Hass; compact?: boolean }) {
  const ids = useMemo(() => [E.sun, E.moon, E.homeZone], []);
  const e = useEntities(hass, ids);
  const sun = e[E.sun];
  return (
    <SunArc
      lat={(attr(e[E.homeZone], 'latitude') as number | undefined) ?? HOUSE.coords.lat}
      solarNoonIso={attr(sun, 'next_noon') as string | undefined}
      sunriseIso={attr(sun, 'next_rising') as string | undefined}
      sunsetIso={attr(sun, 'next_setting') as string | undefined}
      elevation={(attr(sun, 'elevation') as number | undefined) ?? 0}
      azimuth={(attr(sun, 'azimuth') as number | undefined) ?? 180}
      moonPhase={e[E.moon]?.state}
      compact={compact}
    />
  );
}

/* ================================================================= home */

function HomePage({ hass, narrow, go }: { hass: Hass; narrow: boolean; go: (p: Page) => void }) {
  const attention = useAttention(hass);
  const cols = narrow ? 1 : 3;
  // Scripts hold no state HA can report, so "which scene is active" does not
  // exist as a fact. What DOES exist is which one this surface last ran, and
  // that is the honest thing to show - a scene that stays lit after you tap it.
  const [lastScene, setLastScene] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      <FavoritesPanel hass={hass} span={cols} narrow={narrow} />

      <Glass span={cols} style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span style={{ ...LABEL, marginRight: 6 }}>Scenes</span>
          {SCENES.map((s) => (
            <FirePill
              key={s.script} hass={hass} script={s.script} label={s.label}
              confirm={s.does}
              active={lastScene === s.script}
              onFired={() => setLastScene(s.script)}
            />
          ))}
          <span style={{ flex: 1 }} />
          <FirePill
            hass={hass} script={HOUSE.lockupScript} label="Lockup" tone="gold" big icon={P.lock}
            confirm="Locks the Yale, closes both garage doors, and turns every light off."
          />
        </div>
      </Glass>

      <AttentionBoard items={attention.filter((a) => a.scope !== 'grow')} span={cols} />

      <Glass span={narrow ? 1 : 2} style={{ padding: 14 }}>
        <div style={{ padding: '4px 8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={LABEL}>The Estate — live</div>
          <MoreLink onClick={() => go('rooms')} />
        </div>
        <Floorplan hass={hass} />
      </Glass>

      <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
        <ClimateDial hass={hass} />
        <SecuritySummary hass={hass} onMore={() => go('security')} />
      </div>

      <Glass span={narrow ? 1 : 2}>
        <PanelHead label="House Pulse — 24h" />
        <HousePulse hass={hass} />
      </Glass>

      <WeatherPanel hass={hass} />

      <LightingSummary hass={hass} onMore={() => go('rooms')} />
      <NowPlaying hass={hass} onMore={() => go('cinema')} />
      <GrowSummary hass={hass} onMore={() => go('grow')} />
      <SkySummary hass={hass} onMore={() => go('sky')} />
    </div>
  );
}

function WeatherPanel({ hass }: { hass: Hass }) {
  const ids = useMemo(() => [E.weather, E.moonEmoji], []);
  const e = useEntities(hass, ids);
  const w = e[E.weather];
  const temp = attr(w, 'temperature') as number | undefined;

  return (
    <Glass>
      <PanelHead label={HOUSE.locality} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontSize: 52, fontWeight: 200, lineHeight: 1 }}>{temp != null ? Math.round(temp) : '—'}°</span>
        <div>
          <div style={{ fontSize: 14 }}>{titleize(w?.state)}</div>
          <div style={{ fontSize: 11.5, color: T.dim }}>
            {(attr(w, 'humidity') as number | undefined) ?? '—'}% humidity · wind {(attr(w, 'wind_speed') as number | undefined)?.toFixed?.(0) ?? '—'} mph
          </div>
        </div>
      </div>
      <ForecastStrip hass={hass} />
    </Glass>
  );
}

function MoreLink({ onClick }: { onClick?: () => void }) {
  if (!onClick) return null;
  return (
    <button type="button" onClick={onClick} className="est-tap" style={{
      background: 'none', border: 'none', color: T.gold, fontSize: 11.5, cursor: 'pointer',
      letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, padding: 0,
    }}>Open →</button>
  );
}

function LightingSummary({ hass, onMore }: { hass: Hass; onMore?: () => void }) {
  const ids = useMemo(() => [E.allLights, ...E.rooms.map((r) => r.light)], []);
  const e = useEntities(hass, ids);
  const all = e[E.allLights];
  const on = all?.state === 'on';
  const bri = ((attr(all, 'brightness') as number | undefined) ?? 0) / 2.55;

  return (
    <Glass>
      <PanelHead label="Lighting" right={<MoreLink onClick={onMore} />} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <button
          type="button" className="est-lift"
          aria-label={on ? 'Turn all lights off' : 'Turn all lights on'}
          onClick={() => void hass.callService('light', on ? 'turn_off' : 'turn_on', {}, { entity_id: E.allLights })}
          style={{
            width: 58, height: 58, borderRadius: 20, display: 'grid', placeItems: 'center', cursor: 'pointer',
            border: `1px solid ${on ? T.goldDeep : T.line}`,
            background: on ? `linear-gradient(170deg, ${T.gold}, ${T.goldDeep})` : 'rgba(255,255,255,0.05)',
            color: on ? '#191408' : T.dim,
            boxShadow: on ? '0 6px 26px rgba(211,176,110,0.35)' : 'none',
          }}
        >
          <Icon d={P.bulb} size={26} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 400 }}>{on ? 'Main floor lit' : 'Main floor dark'}</div>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>
            {E.rooms.filter((r) => e[r.light]?.state === 'on').map((r) => r.name).join(' · ') || 'All rooms off'}
          </div>
        </div>
      </div>
      {on && (
        <GoldSlider
          value={bri}
          ariaLabel="Main floor brightness"
          onChange={(v) => void hass.callService('light', 'turn_on', { brightness_pct: Math.round(v) }, { entity_id: E.allLights })}
        />
      )}
    </Glass>
  );
}

/**
 * The Nest face, drawn the way the device itself draws it: a dark dial that
 * glows from the rim with whatever the system is doing, a tick ring for the
 * scale, one bright marker at the target, and a separate small marker showing
 * where the room actually is.
 *
 * Hues are literal rather than theme tokens so this matches the Lovelace card
 * on Mission Control - both surfaces should read as the same device.
 */
const NEST_HUE = {
  heating: '#ff8a3d',
  cooling: '#4aa8ff',
  idle: '#7a8698',
  off: '#5b6473',
};

const TICK_COUNT = 60;
const FACE_START = 135;   // degrees in SVG space (0 = 3 o'clock)
const FACE_SWEEP = 270;

function NestFace({
  target, current, lo, hi, hue, active, off, capTop, capBottom, unit,
}: {
  target: number | null; current: number | null;
  lo: number; hi: number; hue: string;
  active: boolean; off: boolean;
  capTop: string; capBottom: string; unit: string;
}) {
  const S = 240, C = S / 2;
  const angleFor = (t: number) =>
    FACE_START + Math.min(1, Math.max(0, (t - lo) / (hi - lo))) * FACE_SWEEP;
  const pt = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [C + r * Math.cos(rad), C + r * Math.sin(rad)] as const;
  };

  const targetAngle = target != null ? angleFor(target) : null;
  const showCurrent =
    current != null && target != null && Math.abs(current - target) >= 1;

  const ticks = [];
  for (let i = 0; i < TICK_COUNT; i++) {
    const a = FACE_START + (i / (TICK_COUNT - 1)) * FACE_SWEEP;
    const lit = targetAngle != null && a <= targetAngle && !off;
    const major = i % 5 === 0;
    const [x1, y1] = pt(major ? 88 : 92, a);
    const [x2, y2] = pt(102, a);
    ticks.push(
      <line
        key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={lit ? hue : 'rgba(255,255,255,0.16)'}
        strokeWidth={major ? 2.6 : 1.8}
        strokeLinecap="round"
        opacity={lit && !active ? 0.72 : 1}
      />
    );
  }

  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ maxWidth: 250, display: 'block' }}>
      <defs>
        <radialGradient id="nestFaceFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0d1116" />
          <stop offset="62%" stopColor="#0d1116" />
          <stop offset="100%" stopColor={off ? '#161b22' : hue}
                stopOpacity={off ? 1 : active ? 0.42 : 0.16} />
        </radialGradient>
        <filter id="nestGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle cx={C} cy={C} r={84} fill="url(#nestFaceFill)" />
      <circle cx={C} cy={C} r={108} fill="none"
              stroke="rgba(255,255,255,0.10)" strokeWidth="1" />

      {ticks}

      {showCurrent && current != null && (() => {
        const a = angleFor(current);
        const [mx, my] = pt(97, a);
        const [tx, ty] = pt(70, a);
        return (
          <g>
            <circle cx={mx} cy={my} r={3.4} fill="#fff" opacity={0.9} />
            <text x={tx} y={ty} fill="rgba(255,255,255,0.66)" fontSize="11"
                  textAnchor="middle" dominantBaseline="middle">
              {Math.round(current)}
            </text>
          </g>
        );
      })()}

      {targetAngle != null && !off && (() => {
        const [x1, y1] = pt(84, targetAngle);
        const [x2, y2] = pt(106, targetAngle);
        return (
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={hue} strokeWidth="5"
                strokeLinecap="round" filter={active ? 'url(#nestGlow)' : undefined} />
        );
      })()}

      <text x={C} y={C - 28} textAnchor="middle" fill="rgba(255,255,255,0.45)"
            fontSize="10.5" letterSpacing="2.4">{capTop.toUpperCase()}</text>
      <text x={C} y={C + 16} textAnchor="middle"
            fill={off ? 'rgba(255,255,255,0.45)' : '#fff'}
            fontSize="62" fontWeight="200">
        {target != null ? Math.round(target) : '—'}
        <tspan fontSize="24" dy="-20">{unit}</tspan>
      </text>
      <text x={C} y={C + 46} textAnchor="middle" fill="rgba(255,255,255,0.55)"
            fontSize="12" fontWeight="300">{capBottom}</text>
    </svg>
  );
}

/**
 * The house has exactly ONE thermostat.
 *
 * It used to be listed here as two, "Main Floor / NEST" and "Lower Level /
 * ALARM.COM" — but those are two integrations reading the same Nest, not two
 * devices, and they report identical numbers because they are. The tabs
 * invited you to pick a zone the building does not have.
 *
 * The Nest entity is the one kept: supported_features 411 against the
 * alarm.com proxy's 3, so it alone offers humidity, the eco preset, fan modes
 * and hvac_action — and it is the one still standing after the subscription is
 * cancelled. The tab strip renders only when there is genuinely a choice, so
 * adding a real second zone later brings it back on its own.
 */
const CLIMATE_ZONES = [
  { label: 'Main Floor', badge: 'NEST', entity: E.climateNest },
] as const;

function ClimateDial({ hass }: { hass: Hass }) {
  const ids = useMemo(() => CLIMATE_ZONES.map((z) => z.entity), []);
  const e = useEntities(hass, ids);
  const [zi, setZi] = useState(0);

  const zone = CLIMATE_ZONES[zi];
  const clim = e[zone.entity];
  const current = attr(clim, 'current_temperature') as number | undefined;
  const target = attr(clim, 'temperature') as number | undefined;
  const humidity = attr(clim, 'current_humidity') as number | undefined;
  const preset = attr(clim, 'preset_mode') as string | undefined;
  const presets = (attr(clim, 'preset_modes') as string[] | undefined) ?? [];
  const action = (attr(clim, 'hvac_action') as string | undefined) ?? clim?.state;
  const loT = (attr(clim, 'min_temp') as number | undefined) ?? 50;
  const hiT = (attr(clim, 'max_temp') as number | undefined) ?? 90;
  const off = clim?.state === 'off';
  const cooling = action === 'cooling' || clim?.state === 'cool';

  // Google's SDM API rate-limits thermostat commands per user, and it does not
  // take much to trip: four taps a few hundred ms apart earned a 429
  // RESOURCE_EXHAUSTED. So taps move a local target and only the settled value
  // is sent, once the user stops pressing. One gesture, one command.
  const [draft, setDraft] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sendTimer = useRef<number | undefined>(undefined);
  const holdTimer = useRef<number | undefined>(undefined);

  // Switching zones must not carry one stat's draft over to the other.
  useEffect(() => { setDraftValue(null); setNotice(null); }, [zi]);
  useEffect(() => () => {
    window.clearTimeout(sendTimer.current);
    window.clearTimeout(holdTimer.current);
  }, []);

  // The authoritative draft lives in a ref, not in state. A fast drag delivers
  // several moves inside a single React tick, and batched state hands every
  // one of them the same stale base - so a twelve-degree drag would only ever
  // move one degree. The ref accumulates synchronously; state only renders it.
  const draftRef = useRef<number | null>(null);
  const setDraftValue = (v: number | null) => { draftRef.current = v; setDraft(v); };

  const shownTarget = draft ?? target;

  const bump = (delta: number) => {
    const base = draftRef.current ?? target;
    if (base == null) return;
    const next = Math.min(hiT, Math.max(loT, base + delta));
    if (next === draftRef.current) return;
    setDraftValue(next);
    setNotice(null);
    window.clearTimeout(sendTimer.current);
    sendTimer.current = window.setTimeout(() => {
      hass.callService(
        'climate', 'set_temperature',
        { temperature: next }, { entity_id: zone.entity }
      ).then(
        () => {
          // Hold the draft briefly so the ring doesn't snap back to the old
          // value while the SDM round-trip lands.
          holdTimer.current = window.setTimeout(() => setDraftValue(null), 4000);
        },
        (err: unknown) => {
          const msg = String((err as { message?: string })?.message ?? err);
          setNotice(
            /429|RESOURCE_EXHAUSTED|Too Many Requests/i.test(msg)
              ? 'Nest is rate-limiting — give it a moment'
              : 'Could not set temperature'
          );
          setDraftValue(null);
        }
      );
    }, 900);
  };

  const toggleEco = () => {
    hass.callService(
      'climate', 'set_preset_mode',
      { preset_mode: preset === 'eco' ? 'none' : 'eco' }, { entity_id: zone.entity }
    ).catch((err: unknown) => {
      const msg = String((err as { message?: string })?.message ?? err);
      setNotice(
        /429|RESOURCE_EXHAUSTED|Too Many Requests/i.test(msg)
          ? 'Nest is rate-limiting — give it a moment'
          : 'Could not change preset'
      );
    });
  };

  const zoneTab = (i: number) => {
    const z = CLIMATE_ZONES[i];
    const on = i === zi;
    return (
      <button
        key={z.entity}
        type="button"
        onClick={() => setZi(i)}
        aria-pressed={on}
        className="est-tap"
        style={{
          font: 'inherit', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '6px 11px', borderRadius: 999, cursor: 'pointer',
          border: `1px solid ${on ? T.gold : 'transparent'}`,
          background: 'transparent', color: on ? T.gold : T.faint,
        }}
      >{z.badge}</button>
    );
  };

  // Drag up = warmer, down = cooler. Vertical drag rather than an angular
  // grab: it is far more forgiving on a phone, where an angular ring competes
  // with page scroll (a well-known complaint about circular thermostat
  // sliders). Movement is consumed in whole degrees so the gesture tracks the
  // finger 1:1, and each step just resets the send debounce.
  const dragRef = useRef<{ y: number } | null>(null);
  const PX_PER_DEGREE = 10;

  const onDown = (e: ReactPointerEvent) => {
    if (off || target == null) return;
    dragRef.current = { y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent) => {
    const st = dragRef.current;
    if (!st) return;
    const steps = Math.trunc((st.y - e.clientY) / PX_PER_DEGREE);
    if (steps !== 0) {
      bump(steps);
      st.y -= steps * PX_PER_DEGREE; // consume what we applied
    }
  };
  const endDrag = () => { dragRef.current = null; };

  // Literal hue for the dial face so it matches the Lovelace card exactly.
  const hue = off
    ? NEST_HUE.off
    : /heating/i.test(action ?? '') || clim?.state === 'heat'
      ? NEST_HUE.heating
      : cooling
        ? NEST_HUE.cooling
        : NEST_HUE.idle;
  const sending = draft != null;

  const stepBtn = (delta: number, path: string, label: string) => (
    <button
      type="button"
      onClick={() => bump(delta)}
      aria-label={label}
      disabled={off}
      style={{
        width: 46, height: 46, borderRadius: 999, cursor: off ? 'default' : 'pointer',
        display: 'grid', placeItems: 'center',
        border: `1px solid ${T.line}`, background: 'transparent',
        color: off ? T.faint : T.text, opacity: off ? 0.5 : 1,
      }}
    ><Icon d={path} size={18} /></button>
  );

  return (
    <Glass style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <PanelHead
        label={`Climate — ${zone.label}`}
        right={
          CLIMATE_ZONES.length > 1
            ? <span style={{ display: 'flex', gap: 4 }}>{CLIMATE_ZONES.map((_, i) => zoneTab(i))}</span>
            : undefined
        }
      />

      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          touchAction: 'none', userSelect: 'none',
          cursor: off ? 'default' : 'ns-resize',
        }}
      >
        <NestFace
          target={shownTarget ?? null}
          current={current ?? null}
          lo={loT}
          hi={hiT}
          hue={hue}
          active={!!action && /heating|cooling/i.test(action)}
          off={off}
          unit="°"
          capTop={off ? 'Off' : sending ? 'Setting' : 'Target'}
          capBottom={
            current != null
              ? `Now ${Math.round(current)}°${humidity != null ? ` · ${Math.round(humidity)}% RH` : ''}`
              : ''
          }
        />
      </div>

      {/* Reserved line so the panel never reflows when a message appears. */}
      <div style={{
        minHeight: 18, marginTop: 10, fontSize: 12.5, fontWeight: 300, textAlign: 'center',
        color: notice ? T.warn : T.dim,
      }}>
        {notice ?? (off ? 'System off' : titleize(action))}
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 12, alignItems: 'center' }}>
        {stepBtn(-1, P.minus, `Lower ${zone.label} target temperature`)}
        {stepBtn(1, P.plus, `Raise ${zone.label} target temperature`)}
        {presets.includes('eco') && (
          <button
            type="button"
            onClick={toggleEco}
            aria-pressed={preset === 'eco'}
            style={{
              font: 'inherit', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
              height: 46, padding: '0 16px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${preset === 'eco' ? T.ok : T.line}`,
              background: 'transparent', color: preset === 'eco' ? T.ok : T.dim,
            }}
          >Eco</button>
        )}
      </div>
      <div style={{ fontSize: 11, color: T.faint, marginTop: 10 }}>
        Drag the dial up or down
      </div>
    </Glass>
  );
}

function SecuritySummary({ hass, onMore }: { hass: Hass; onMore?: () => void }) {
  const ids = useMemo(() => [E.lock, E.garage1, E.garage2, ...E.doors.map(([, id]) => id)], []);
  const e = useEntities(hass, ids);
  // Anything not positively 'closed' counts - including unavailable - so a board
  // that has dropped off WiFi can never render as "Perimeter secure".
  const notClosed = (id: string) => {
    const s = e[id]?.state;
    return !!s && s !== 'closed';
  };
  const issues =
    E.doors.filter(([, id]) => e[id]?.state === 'on').length +
    (notClosed(E.garage1) ? 1 : 0) +
    (notClosed(E.garage2) ? 1 : 0) +
    (e[E.lock]?.state === 'unlocked' ? 1 : 0);
  const secure = issues === 0;

  return (
    <Glass>
      <PanelHead label="Security" right={<MoreLink onClick={onMore} />} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Ring pct={100} size={104} stroke={5} color={secure ? T.ok : T.warn}>
          <Icon d={secure ? P.shield : P.unlock} size={30} color={secure ? T.ok : T.warn} />
        </Ring>
        <div>
          <div style={{ fontSize: 19, fontWeight: 300 }}>{secure ? 'Perimeter secure' : `${issues} open item${issues > 1 ? 's' : ''}`}</div>
          <div style={{ fontSize: 12.5, color: T.dim, marginTop: 4 }}>
            Yale {e[E.lock]?.state ?? '—'} · garages {e[E.garage1]?.state ?? '—'}/{e[E.garage2]?.state ?? '—'}
          </div>
        </div>
      </div>
    </Glass>
  );
}

function NowPlaying({ hass, onMore }: { hass: Hass; onMore?: () => void }) {
  const ids = useMemo(() => [E.frame, ...E.sonos.map(([, id]) => id)], []);
  const e = useEntities(hass, ids);
  const playingSonos = E.sonos.map(([, id]) => e[id]).find((s) => s?.state === 'playing');
  const active = playingSonos ?? (e[E.frame]?.state === 'playing' || e[E.frame]?.state === 'on' ? e[E.frame] : undefined);
  const art = attr(active, 'entity_picture') as string | undefined;
  const title = (attr(active, 'media_title') as string | undefined) ?? (active ? titleize(active.state) : 'Nothing playing');
  const sub = (attr(active, 'media_artist') as string | undefined)
    ?? (attr(active, 'friendly_name') as string | undefined) ?? '';

  return (
    <Glass style={{ position: 'relative', overflow: 'hidden' }}>
      {art && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, backgroundImage: `url(${art})`, backgroundSize: 'cover',
          backgroundPosition: 'center', opacity: 0.16, filter: 'blur(6px) saturate(1.2)',
        }} />
      )}
      <div style={{ position: 'relative' }}>
        <PanelHead label="Now Playing" right={<MoreLink onClick={onMore} />} />
        <div style={{ fontSize: 18, fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: T.dim, marginTop: 3 }}>{sub}</div>
        {active && (
          <div style={{ marginTop: 14 }}>
            <Pill onClick={() => void hass.callService('media_player', 'media_play_pause', {}, { entity_id: active.entity_id })} ariaLabel="Play or pause">
              <Icon d={active.state === 'playing' ? P.pause : P.play} size={15} />
              {active.state === 'playing' ? 'Pause' : 'Play'}
            </Pill>
          </div>
        )}
      </div>
    </Glass>
  );
}

function GrowSummary({ hass, onMore }: { hass: Hass; onMore?: () => void }) {
  const ids = useMemo(() => [E.soil, ...E.growOnline], []);
  const e = useEntities(hass, ids);
  const soil = num(e[E.soil]);
  const online = E.growOnline.filter((id) => e[id]?.state === 'on').length;
  const color = soil < 20 ? T.alert : soil < 30 ? T.warn : T.ok;

  return (
    <Glass>
      <PanelHead label="The Collective" right={<MoreLink onClick={onMore} />} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Ring pct={soil} size={104} stroke={5} color={color}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 300 }}>{Number.isFinite(soil) ? Math.round(soil) : '—'}%</div>
            <div style={{ fontSize: 9.5, color: T.dim, letterSpacing: '0.14em' }}>SOIL</div>
          </div>
        </Ring>
        <div>
          <div style={{ fontSize: 15, fontWeight: 300 }}>{online}/{E.growOnline.length} systems online</div>
          <div style={{ fontSize: 12.5, color: online === E.growOnline.length ? T.ok : T.alert, marginTop: 4 }}>
            {online === E.growOnline.length ? 'All life support nominal' : 'CHECK THE TENT'}
          </div>
        </div>
      </div>
    </Glass>
  );
}

function SkySummary({ hass, onMore }: { hass: Hass; onMore?: () => void }) {
  const ids = useMemo(() => [E.weather, E.moon, E.moonEmoji, E.aurora], []);
  const e = useEntities(hass, ids);
  const clouds = (attr(e[E.weather], 'cloud_coverage') as number | undefined) ?? 100;
  const moonOk = ['new_moon', 'waxing_crescent', 'waning_crescent', 'first_quarter', 'last_quarter'].includes(e[E.moon]?.state ?? '');
  const go = clouds < 30 && moonOk;

  return (
    <Glass>
      <PanelHead label="Sky Watch" right={<MoreLink onClick={onMore} />} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 44 }} aria-hidden="true">{e[E.moonEmoji]?.state ?? '🌙'}</span>
        <div>
          <div style={{ fontSize: 17, fontWeight: 300, color: go ? T.ok : clouds < 60 ? T.warn : T.dim }}>
            {go ? 'GO for telescope' : clouds < 60 ? 'Marginal night' : 'Clouded out'}
          </div>
          <div style={{ fontSize: 12.5, color: T.dim, marginTop: 3 }}>
            {Math.round(clouds)}% cloud · {titleize(e[E.moon]?.state)} · aurora {e[E.aurora]?.state ?? '0'}%
          </div>
        </div>
      </div>
    </Glass>
  );
}

/* ================================================================ rooms */

/**
 * Scent — the diffusers, and which bottle is about to run out.
 *
 * Lives on the Rooms page rather than getting its own nav entry: scent is a
 * property of a room, and a seventh destination for six devices would not earn
 * the space. The whole panel disappears when the house config has no `scent`.
 *
 * The number that matters is the bottle that is nearly out, so low bottles are
 * coloured and counted in the header rather than being one of twelve equal bars
 * you have to scan. Intensity is the one control worth having here, and it is
 * freely reversible, so it acts immediately with no confirm — matching how
 * lights and switches behave everywhere else in this panel.
 */

function ScentPanel({ hass }: { hass: Hass }) {
  const scent = HOUSE.scent;
  const ids = useMemo(() => {
    if (!scent) return [];
    const out = [scent.lowest, scent.needsRefill, scent.refills];
    // Only the slot levels — enough to count what is low house-wide. The
    // per-diffuser detail lives on the room cards now.
    for (const d of scent.diffusers) for (const sl of d.slots) out.push(sl.remaining);
    return out;
  }, [scent]);
  const e = useEntities(hass, ids);
  if (!scent) return null;

  const lowCount = scent.diffusers.reduce((n, d) =>
    n + d.slots.filter((sl) => {
      const v = num(e[sl.remaining], NaN);
      return Number.isFinite(v) && v < 15;
    }).length, 0);

  const lowest = e[scent.lowest]?.state;

  return (
    <Glass>
      <PanelHead
        label="Scent"
        right={
          <span style={{ fontSize: 12, color: lowCount > 0 ? T.warn : T.dim }}>
            {lowCount > 0 ? `${lowCount} bottle${lowCount > 1 ? 's' : ''} low` : 'All topped up'}
          </span>
        }
      />
      <p style={{ margin: 0, fontSize: 13, color: T.dim, fontWeight: 300, lineHeight: 1.5 }}>
        {lowCount > 0
          ? `Lowest bottle ${lowest ?? '—'}%. Refill: ${e[scent.refills]?.state ?? '—'}.`
          : `Every diffuser has fragrance. Lowest bottle ${lowest ?? '—'}%.`}
        {' '}Levels and intensity for each diffuser are on its room's card.
      </p>
    </Glass>
  );
}

function RoomsPage({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  // Was a flat list of every fixture in the house. Rooms are now browsed
  // room-first — pick the room, then what's in it — which is how this kind of
  // system is meant to read. See RoomsGrid.
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Favourites first. Whatever you pinned is what you came to touch, and
          making it wait below a panorama and a room grid put two scrolls
          between you and the thing you actually wanted. */}
      <FavoritesPanel hass={hass} span={1} narrow={narrow} />

      {/* A grid of separate boxes cannot show that the kitchen, great room and
          dining are one connected space. A photo says it in a glance -- when
          there is one. Optional: no photo, no empty frame. */}
      {HOUSE.panorama ? (
        <div
          style={{
            position: 'relative', borderRadius: T.radius, overflow: 'hidden',
            border: `1px solid ${T.line}`, lineHeight: 0,
          }}
        >
          <img
            src={HOUSE.panorama.src}
            alt={HOUSE.panorama.caption}
            loading="lazy"
            style={{ width: '100%', display: 'block', objectFit: 'cover',
                     maxHeight: narrow ? 150 : 260 }}
          />
          <div
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0) 32%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.45))',
            }}
          />
          {/* lineHeight is reset here on purpose: the wrapper zeroes it to kill
              the inline gap under the <img>, and that inherits into this caption
              and collapses both lines onto the same baseline. */}
          <div style={{ position: 'absolute', left: 18, bottom: 14, pointerEvents: 'none', lineHeight: 1.35 }}>
            <div style={{ ...LABEL, color: 'rgba(255,255,255,0.72)' }}>{HOUSE.panorama.label}</div>
            <div style={{ fontSize: 15, fontWeight: 300, color: '#fff', marginTop: 2 }}>
              {HOUSE.panorama.caption}
            </div>
          </div>
        </div>
      ) : null}

      <RoomsGrid hass={hass} narrow={narrow} />

      <ScentPanel hass={hass} />
    </div>
  );
}

/**
 * Per-person settings for whoever is signed in.
 *
 * Notification preferences are input_booleans, not frontend user-data: an
 * automation has to evaluate them at fire time, and Jinja cannot read the
 * frontend store. The entity id is derived from the signed-in user's first
 * name (`input_boolean.notif_<first>_<category>`), so adding a family member
 * is six booleans in packages/profiles.yaml and nothing here changes.
 *
 * Locations are Home Assistant zones, which are global rather than per-user —
 * one shared list of places, and every person's tracker is evaluated against
 * all of them. That is HA's model, not a choice made here.
 */
const NOTIF_CATEGORIES: ReadonlyArray<{ key: string; label: string; blurb: string }> = [
  { key: 'security', label: 'Security', blurb: 'Doors, garage, lock, motion, night sweep' },
  { key: 'grow', label: 'Grow tent', blurb: 'Soil, reservoir, VPD, tent hardware' },
  { key: 'laundry', label: 'Laundry', blurb: 'Washer, dryer, dishwasher' },
  { key: 'deliveries', label: 'Deliveries', blurb: 'Packages, mail, bins out' },
  { key: 'sky', label: 'Sky & weather', blurb: 'Storms, aurora, telescope, birds' },
  { key: 'daily', label: 'Daily brief', blurb: 'The 8:05 morning summary' },
];

type ZoneRow = { id: string; name: string; latitude: number; longitude: number; radius: number };

function ReorderButton({ children, label, disabled, onClick }: {
  children: ReactNode; label: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
      style={{
        width: 24, height: 16, lineHeight: '14px', fontSize: 8, padding: 0, borderRadius: 4,
        cursor: disabled ? 'default' : 'pointer',
        background: disabled ? 'transparent' : 'rgba(255,255,255,0.05)',
        border: '1px solid ' + (disabled ? 'transparent' : T.line),
        color: disabled ? T.faint : T.dim,
      }}>{children}</button>
  );
}

function ProfilePage({ hass, narrow, admin, navPrefs, savePrefs }: {
  hass: Hass; narrow: boolean; admin: boolean;
  navPrefs: NavPrefs; savePrefs: (v: NavPrefs) => void;
}) {
  const who = (hass.user?.name || '').trim().split(/\s+/)[0].toLowerCase();
  const prefIds = useMemo(
    () => NOTIF_CATEGORIES.map((c) => 'input_boolean.notif_' + who + '_' + c.key),
    [who]
  );
  const prefs = useEntities(hass, prefIds);
  const hasPrefs = prefIds.some((id) => prefs[id]);
  const [ctrlStyle, setCtrlStyle] = useControlStyle(hass);

  const [zones, setZones] = useState<ZoneRow[] | null>(null);
  const [form, setForm] = useState({ name: '', lat: '', lon: '', radius: '100' });
  const [msg, setMsg] = useState<string | null>(null);

  const loadZones = () => {
    hass.connection
      .sendMessagePromise<ZoneRow[]>({ type: 'zone/list' })
      .then(setZones)
      .catch(() => setZones([]));
  };
  useEffect(loadZones, []);

  const addZone = () => {
    const lat = parseFloat(form.lat);
    const lon = parseFloat(form.lon);
    const radius = parseInt(form.radius, 10);
    if (!form.name.trim() || Number.isNaN(lat) || Number.isNaN(lon)) {
      setMsg('Name, latitude and longitude are all required.');
      return;
    }
    setMsg(null);
    hass.connection
      .sendMessagePromise({
        type: 'zone/create',
        name: form.name.trim(),
        latitude: lat,
        longitude: lon,
        radius: Number.isNaN(radius) ? 100 : radius,
        icon: 'mdi:map-marker',
        passive: false,
      })
      .then(() => { setForm({ name: '', lat: '', lon: '', radius: '100' }); loadZones(); })
      .catch((e) => setMsg('Could not add: ' + String((e as { message?: string })?.message ?? e)));
  };

  const removeZone = (z: ZoneRow) => {
    hass.connection
      .sendMessagePromise({ type: 'zone/delete', zone_id: z.id })
      .then(loadZones)
      .catch((e) => setMsg('Could not remove: ' + String((e as { message?: string })?.message ?? e)));
  };

  const formCols = narrow ? 1 : 2;
  const field = (label: string, key: 'name' | 'lat' | 'lon' | 'radius', ph: string, w = 1) => (
    <label style={{ display: 'grid', gap: 4, gridColumn: 'span ' + Math.min(w, formCols) }}>
      <span style={{ ...LABEL, fontSize: 9.5 }}>{label}</span>
      <input
        value={form[key]}
        placeholder={ph}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        style={{
            // 16px: anything smaller and iOS Safari zooms the whole page in on
          // focus, which is its own kind of scrunched.
          font: 'inherit', fontSize: 16, padding: '11px 12px', borderRadius: 10,
          border: '1px solid ' + T.line, background: 'rgba(255,255,255,0.04)', color: T.text,
        }}
      />
    </label>
  );

  const pageRows = orderedNav(admin, navPrefs);

  /* Swap with the neighbour rather than splice-and-insert: with a short list
     and two arrow buttons that is exactly what the user is asking for, and it
     behaves identically on a desktop rail and a phone -- no drag libraries, no
     touch/pointer-event divergence. Ids this user cannot see (an admin-only
     page, for a family member) are kept on the end so their position survives
     somebody else's reordering. */
  const movePage = (id: string, dir: -1 | 1) => {
    const ids: string[] = pageRows.map((n) => n.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    savePrefs({ ...navPrefs, order: [...ids, ...navPrefs.order.filter((x) => !ids.includes(x))] });
  };

  const togglePage = (id: string) => {
    if (LOCKED_VISIBLE.has(id)) return;
    savePrefs({
      ...navPrefs,
      hidden: navPrefs.hidden.includes(id)
        ? navPrefs.hidden.filter((x) => x !== id)
        : [...navPrefs.hidden, id],
    });
  };

  const cols = narrow ? 1 : 2;
  return (
    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      <Glass span={cols}>
        <PanelHead label={'Signed in as ' + (hass.user?.name || 'unknown')} />
        <p style={{ margin: 0, fontSize: 13, color: T.dim, fontWeight: 300 }}>
          These settings follow your Home Assistant account, not this device.
          Someone else signing in here sees their own.
        </p>
      </Glass>

      <Glass span={cols}>
        <PanelHead label="Your pages" />
        <p style={{ margin: '0 0 4px', fontSize: 13, color: T.dim, fontWeight: 300 }}>
          Which sections you see, and the order they appear in. On a phone the
          top four are the bar along the bottom and the rest sit under More.
          Home and Profile cannot be switched off.
        </p>
        {pageRows.map((n, i) => {
          const hidden = navPrefs.hidden.includes(n.id);
          const locked = LOCKED_VISIBLE.has(n.id);
          const dim = hidden && !locked;
          return (
            <div key={n.id} style={{
              padding: '11px 0', borderBottom: '1px solid ' + T.line,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <ReorderButton label={'Move ' + n.label + ' up'} disabled={i === 0}
                  onClick={() => movePage(n.id, -1)}>{'\u25B2'}</ReorderButton>
                <ReorderButton label={'Move ' + n.label + ' down'} disabled={i === pageRows.length - 1}
                  onClick={() => movePage(n.id, 1)}>{'\u25BC'}</ReorderButton>
              </div>
              <Icon d={n.icon} size={17} color={dim ? T.faint : T.gold} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: dim ? T.dim : T.text }}>
                  {n.label}
                  {!hidden && i < 4 && (
                    <span style={{ fontSize: 10.5, color: T.faint, marginLeft: 7 }}>phone bar</span>
                  )}
                </div>
                {PAGE_HINT[n.id] && (
                  <div style={{ fontSize: 11.5, color: T.dim, marginTop: 2 }}>{PAGE_HINT[n.id]}</div>
                )}
              </div>
              {locked
                ? <span style={{ fontSize: 11.5, color: T.faint }}>Always on</span>
                : <Pill active={!hidden} onClick={() => togglePage(n.id)}>
                    {hidden ? 'Hidden' : 'Shown'}
                  </Pill>}
            </div>
          );
        })}
      </Glass>

      <Glass span={cols}>
        <PanelHead label="Controls" />
        <p style={{ margin: '0 0 12px', fontSize: 13, color: T.dim, fontWeight: 300 }}>
          How lights and the thermostat are operated on the Rooms page.
        </p>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {([
            { key: 'square', title: 'Square tiles', blurb: 'Press to switch, press and slide up or down to set the level.' },
            { key: 'bar', title: 'Rows and sliders', blurb: 'A labelled row per device with a full-width slider beneath it.' },
          ] as const).map((o) => {
            const on = ctrlStyle === o.key;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setCtrlStyle(o.key)}
                aria-pressed={on}
                style={{
                  font: 'inherit', textAlign: 'left', cursor: 'pointer',
                  display: 'grid', gap: 3, padding: '12px 14px', borderRadius: 12,
                  border: '1px solid ' + (on ? T.gold : T.line),
                  background: on ? 'rgba(250,187,90,0.10)' : 'rgba(255,255,255,0.03)',
                  color: T.text,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{o.title}</span>
                <span style={{ fontSize: 11.5, color: T.dim, fontWeight: 300, lineHeight: 1.45 }}>{o.blurb}</span>
              </button>
            );
          })}
        </div>
      </Glass>

      <Glass>
        <PanelHead label="Notifications" />
        {!hasPrefs ? (
          <p style={{ margin: 0, fontSize: 13, color: T.dim, fontWeight: 300 }}>
            No preferences exist for this account yet. Add the six
            {' '}notif_{who || 'name'}_* booleans in packages/profiles.yaml.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {NOTIF_CATEGORIES.map((c) => {
              const id = 'input_boolean.notif_' + who + '_' + c.key;
              const on = prefs[id]?.state === 'on';
              const missing = !prefs[id];
              return (
                <button
                  key={c.key} type="button" disabled={missing}
                  onClick={() => void hass.callService('input_boolean', 'toggle', {}, { entity_id: id })}
                  aria-pressed={on}
                  style={{
                    font: 'inherit', textAlign: 'left', cursor: missing ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px', borderRadius: 12,
                    border: '1px solid ' + (on ? T.ok : T.line),
                    background: on ? 'rgba(95,208,138,0.07)' : 'transparent',
                    opacity: missing ? 0.45 : 1, color: T.text,
                  }}
                >
                  <span aria-hidden="true" style={{
                    width: 34, height: 20, borderRadius: 999, flex: 'none',
                    background: on ? T.ok : 'rgba(255,255,255,0.14)',
                    position: 'relative', transition: 'background .18s',
                  }}>
                    <span style={{
                      position: 'absolute', top: 3, left: on ? 17 : 3,
                      width: 14, height: 14, borderRadius: 999, background: '#fff',
                      transition: 'left .18s',
                    }} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.label}</div>
                    <div style={{ fontSize: 11.5, color: T.dim, marginTop: 1 }}>{c.blurb}</div>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Glass>

      <Glass>
        <PanelHead label="Locations" />
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: T.dim, fontWeight: 300 }}>
          Places the house recognises — work, school, a friend's. Zones are
          shared by the household: every phone is checked against every zone.
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          {zones === null ? (
            <span style={{ fontSize: 13, color: T.dim }}>Loading…</span>
          ) : zones.length === 0 ? (
            <span style={{ fontSize: 13, color: T.dim }}>No editable zones yet.</span>
          ) : zones.map((z) => (
            <div key={z.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 12, border: '1px solid ' + T.line,
            }}>
              <span style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{z.name}</div>
                <div style={{ fontSize: 11, color: T.dim }}>
                  {z.latitude.toFixed(4)}, {z.longitude.toFixed(4)} · {z.radius} m
                </div>
              </span>
              <button
                type="button" onClick={() => removeZone(z)} aria-label={'Remove ' + z.name}
                style={{
                  font: 'inherit', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                  border: '1px solid ' + T.line, background: 'transparent', color: T.dim,
                }}
              >Remove</button>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: `repeat(${formCols}, minmax(0,1fr))` }}>
          {field('Name', 'name', 'School', 2)}
          {field('Latitude', 'lat', HOUSE.sampleCoords.lat)}
          {field('Longitude', 'lon', HOUSE.sampleCoords.lon)}
          {field('Radius (m)', 'radius', '100', 2)}
        </div>
        {msg ? <p style={{ margin: '10px 0 0', fontSize: 12.5, color: T.warn }}>{msg}</p> : null}
        <button
          type="button" onClick={addZone}
          style={{
            marginTop: 12, font: 'inherit', fontSize: 12.5, fontWeight: 600,
            padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
            border: 'none', background: T.gold, color: T.onAccent,
          }}
        >Add location</button>
        <p style={{ margin: '10px 0 0', fontSize: 11, color: T.faint }}>
          Tip: right-click a spot in Google Maps and copy the coordinates.
        </p>
      </Glass>
    </div>
  );
}

function PeoplePage({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Glass style={{ padding: 18 }}>
        <PanelHead label="The family" />
        <PeopleGrid hass={hass} narrow={narrow} />
      </Glass>
    </div>
  );
}

function CinemaPage({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  const ids = useMemo(() => [E.frame, E.marantz, ...E.sonos.map(([, id]) => id)], []);
  const e = useEntities(hass, ids);
  const frame = e[E.frame];
  const art = attr(frame, 'entity_picture') as string | undefined;
  const source = attr(frame, 'source') as string | undefined;
  const vol = ((attr(frame, 'volume_level') as number | undefined) ?? 0) * 100;
  const marantzOn = e[E.marantz] && e[E.marantz].state !== 'off' && e[E.marantz].state !== 'unavailable';
  const cols = narrow ? 1 : 3;

  const src = (s: 'TV' | 'HDMI') =>
    void hass.callService('media_player', 'select_source', { source: s }, { entity_id: E.frame });

  return (
    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      <Glass span={narrow ? 1 : 2} style={{ position: 'relative', overflow: 'hidden', minHeight: 280 }}>
        {art && (
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, backgroundImage: `url(${art})`,
            backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35,
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,.9), rgba(0,0,0,.2))',
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,.9), rgba(0,0,0,.2))',
          }} />
        )}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 240 }}>
          <PanelHead label="The Frame · 65″" />
          <div style={{ fontSize: 26, fontWeight: 250 }}>
            {(attr(frame, 'media_title') as string | undefined) ?? titleize(frame?.state)}
          </div>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 4 }}>
            {source ? (source === 'HDMI' ? 'Xbox · HDMI' : `Source · ${source}`) : 'Idle'}
          </div>
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <Pill active={source === 'TV'} onClick={() => src('TV')}><Icon d={P.tv} size={15} /> TV</Pill>
            <Pill active={source === 'HDMI'} onClick={() => src('HDMI')}><Icon d={P.game} size={15} /> Xbox</Pill>
            <Pill onClick={() => void hass.callService('media_player', 'media_play_pause', {}, { entity_id: E.frame })} ariaLabel="Play or pause">
              <Icon d={frame?.state === 'playing' ? P.pause : P.play} size={15} />
            </Pill>
            <Pill tone="ghost" onClick={() => void hass.callService('media_player', 'turn_off', {}, { entity_id: E.frame })}>
              <Icon d={P.power} size={14} /> Off
            </Pill>
          </div>
          <div style={{ marginTop: 14, maxWidth: 380 }}>
            <GoldSlider
              value={vol}
              ariaLabel="Frame volume"
              onChange={(v) => void hass.callService('media_player', 'volume_set', { volume_level: v / 100 }, { entity_id: E.frame })}
            />
          </div>
        </div>
      </Glass>

      <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
        <Glass style={{ opacity: marantzOn ? 1 : 0.75 }}>
          <PanelHead label="Marantz SR6011" />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Pill active={!!marantzOn} onClick={() => void hass.callService('media_player', marantzOn ? 'turn_off' : 'turn_on', {}, { entity_id: E.marantz })}>
              <Icon d={P.power} size={14} /> {marantzOn ? 'On' : 'Off'}
            </Pill>
            <span style={{ fontSize: 12, color: T.dim }}>{marantzOn ? titleize(e[E.marantz]?.state) : 'Standing by'}</span>
          </div>
        </Glass>

        <Glass>
          <PanelHead label="Sonos" />
          <div style={{ display: 'grid', gap: 12 }}>
            {E.sonos.map(([name, id]) => {
              const s = e[id];
              const playing = s?.state === 'playing';
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    aria-label={`Play or pause ${name}`}
                    onClick={() => void hass.callService('media_player', 'media_play_pause', {}, { entity_id: id })}
                    className="est-lift"
                    style={{
                      width: 34, height: 34, borderRadius: 12, display: 'grid', placeItems: 'center',
                      cursor: 'pointer', border: `1px solid ${playing ? T.goldDeep : T.line}`,
                      background: playing ? 'rgba(211,176,110,0.18)' : 'rgba(255,255,255,0.04)',
                      color: playing ? T.gold : T.dim,
                    }}
                  >
                    <Icon d={playing ? P.pause : P.play} size={15} />
                  </button>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5 }}>{name}</div>
                    <div style={{ fontSize: 11, color: T.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(attr(s, 'media_title') as string | undefined) ?? titleize(s?.state)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Glass>
      </div>
    </div>
  );
}

/* ============================================================== security */

function SecurityPage({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  const ids = useMemo(() => [
    E.lock, E.garage1, E.garage2, E.blink, E.motion,
    ...E.doors.map(([, id]) => id), ...E.cams.map(([, id]) => id),
  ], []);
  const e = useEntities(hass, ids);
  const cols = narrow ? 1 : 3;

  return (
    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      <FrontDoorCard hass={hass} />

      {([[E.garage1, 'Double Bay'], [E.garage2, 'Single Bay']] as const).map(([id, name]) => (
        <GarageCard key={id} hass={hass} entity={id} name={name} />
      ))}

      <Glass span={cols}>
        <PanelHead label="Perimeter" right={
          <span style={{ fontSize: 11.5, color: T.dim }}>contacts via Alarm.com bridge · garage via ratgdo (local)</span>
        } />
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: `repeat(${narrow ? 2 : 5}, minmax(0,1fr))` }}>
          {E.doors.map(([name, id]) => {
            const open = e[id]?.state === 'on';
            return (
              <div key={id} style={{
                padding: '12px 14px', borderRadius: 15, textAlign: 'center',
                border: `1px solid ${open ? 'rgba(224,121,95,0.5)' : T.line}`,
                background: open ? 'rgba(224,121,95,0.09)' : 'rgba(255,255,255,0.03)',
              }}>
                <div style={{ fontSize: 12.5, color: open ? T.alert : T.text }}>{name}</div>
                <div style={{ fontSize: 10.5, marginTop: 3, color: open ? T.alert : T.ok, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {open ? 'Open' : 'Closed'}
                </div>
              </div>
            );
          })}
          <div style={{
            padding: '12px 14px', borderRadius: 15, textAlign: 'center',
            border: `1px solid ${T.line}`, background: 'rgba(255,255,255,0.03)',
          }}>
            <div style={{ fontSize: 12.5 }}>Lower Motion</div>
            <div style={{ fontSize: 10.5, marginTop: 3, color: e[E.motion]?.state === 'on' ? T.warn : T.dim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {e[E.motion]?.state === 'on' ? 'Motion' : 'Clear'}
            </div>
          </div>
        </div>
      </Glass>

      <Glass span={cols}>
        <PanelHead label="Recent clips" right={
          <Pill tone="ghost" onClick={() => void hass.callService('alarm_control_panel', e[E.blink]?.state === 'disarmed' ? 'alarm_arm_away' : 'alarm_disarm', {}, { entity_id: E.blink })}>
            Blink {e[E.blink]?.state === 'disarmed' ? 'Arm' : 'Disarm'}
          </Pill>
        } />
        <ClipsBank narrow={narrow} />
      </Glass>
    </div>
  );
}

/* ============================================================ blink clips */

/*
 * A bank of recorded clips, replacing the live Blink tiles.
 *
 * Live view was throttled to uselessness and would not play on an iPhone, so
 * what actually exists is a folder of MP4s on the NAS at
 * Z:\config\www\blink_clips, served locally at /local/blink_clips. Playback
 * never touches Blink.
 *
 * These are for REVIEW, not reaction: measured on 2026-08-28, a clip lands
 * between 44 s and 50 minutes after the motion that caused it, because Blink
 * records to their cloud before anything can download it. Anything that needs
 * to act fast hangs off binary_sensor.<camera>_motion instead.
 *
 * HA serves www/ but will not list a directory, so discovery comes from
 * index.json, written by shell_command.index_blink_clips and refreshed every
 * two minutes by automation.blink_refresh_clip_index.
 */

type ClipRow = { f: string; t: number; b: number };
type Clip = ClipRow & { cam: string };

const CLIP_DIR = '/local/blink_clips';

const CAM_LABEL: Record<string, string> = {
  front_door: 'Front Door',
  front_porch: 'Front Porch',
  wyoming_ave: 'Wyoming Ave',
  kitchen_dining: 'Kitchen / Dining',
  cat_room: 'Cat Room',
  living_room: 'Living Room',
};

/*
 * Two writers, two naming schemes, and they overlap:
 *   20260828_123454_WyomingAve.mp4   the blink-clips container, local time
 *   wyoming_ave_20260828T173454.mp4  blink.save_recent_clips, UTC
 * Both are normalised to a single camera key so the filters do not show the
 * same camera twice.
 */
function parseClip(r: ClipRow): Clip {
  const a = /^\d{8}_\d{6}_(.+)\.mp4$/.exec(r.f);
  if (a) return { ...r, cam: a[1].replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase() };
  const b = /^(.+)_\d{8}T\d{6}\.mp4$/.exec(r.f);
  return { ...r, cam: b ? b[1].toLowerCase() : 'other' };
}

/*
 * The same event is often saved twice, once by each writer, seconds apart and
 * byte-for-byte identical. Same camera + same size within an hour is treated
 * as one clip. Deliberately not deduping on size alone: two genuinely
 * different events days apart could collide.
 */
function dedupe(clips: Clip[]): Clip[] {
  const seen = new Map<string, number>();
  const out: Clip[] = [];
  for (const c of clips) {
    const key = `${c.cam}|${c.b}`;
    const prev = seen.get(key);
    if (prev != null && Math.abs(prev - c.t) < 3600) continue;
    seen.set(key, c.t);
    out.push(c);
  }
  return out;
}

function ago(t: number, now: number): string {
  const s = Math.max(0, Math.floor(now / 1000 - t));
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(t * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const PAGE_SIZE = 12;

function ClipsBank({ narrow }: { narrow: boolean }) {
  const [clips, setClips] = useState<Clip[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [cam, setCam] = useState<string>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const now = useNow(60000);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch(`${CLIP_DIR}/index.json`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((rows: ClipRow[]) => {
          if (cancelled) return;
          setClips(dedupe(rows.map(parseClip).sort((x, y) => y.t - x.t)));
          setFailed(false);
        })
        .catch(() => { if (!cancelled) setFailed(true); });
    };
    load();
    const h = window.setInterval(load, 120000);
    return () => { cancelled = true; window.clearInterval(h); };
  }, []);

  const cams = useMemo(() => {
    const c = new Map<string, number>();
    for (const x of clips ?? []) c.set(x.cam, (c.get(x.cam) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [clips]);

  if (failed) {
    return (
      <div style={{ fontSize: 12.5, color: T.dim, padding: '10px 0' }}>
        Could not read the clip index. It is written by
        {' '}<code>shell_command.index_blink_clips</code>{' '}
        every two minutes.
      </div>
    );
  }
  if (!clips) {
    return <div style={{ fontSize: 12.5, color: T.faint, padding: '10px 0' }}>Loading clips...</div>;
  }
  if (!clips.length) {
    return <div style={{ fontSize: 12.5, color: T.faint, padding: '10px 0' }}>No clips recorded yet.</div>;
  }

  const shown = (cam === 'all' ? clips : clips.filter((c) => c.cam === cam)).slice(0, limit);
  const total = cam === 'all' ? clips.length : clips.filter((c) => c.cam === cam).length;

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '2px 0 14px' }}>
        <Pill active={cam === 'all'} onClick={() => { setCam('all'); setLimit(PAGE_SIZE); }}>
          All {clips.length}
        </Pill>
        {cams.map(([id, n]) => (
          <Pill key={id} active={cam === id} onClick={() => { setCam(id); setLimit(PAGE_SIZE); }}>
            {(CAM_LABEL[id] ?? id)} {n}
          </Pill>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: `repeat(${narrow ? 1 : 3}, minmax(0,1fr))` }}>
        {shown.map((c) => (
          <figure key={c.f} style={{
            margin: 0, borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.line}`,
            background: 'rgba(0,0,0,0.4)',
          }}>
            {/* #t=0.5 makes the browser show a frame instead of a black box.
                playsInline keeps iOS from hijacking into fullscreen. */}
            <video
              src={`${CLIP_DIR}/${encodeURIComponent(c.f)}#t=0.5`}
              controls preload="metadata" playsInline
              style={{ width: '100%', aspectRatio: '16/9', display: 'block', background: '#000' }}
            />
            <figcaption style={{
              display: 'flex', justifyContent: 'space-between', gap: 8,
              padding: '8px 11px 9px', fontSize: 12, color: T.dim,
            }}>
              <span style={{ color: T.text }}>{CAM_LABEL[c.cam] ?? c.cam}</span>
              <span>{ago(c.t, now.getTime())}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {shown.length < total && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <Pill active={false} onClick={() => setLimit((n) => n + PAGE_SIZE)}>
            Show more ({total - shown.length} left)
          </Pill>
        </div>
      )}
    </>
  );
}

/* ================================================================= grow */

function daysSince(e: HassEntity | undefined): number | undefined {
  const ts = attr(e, 'timestamp') as number | undefined;
  if (!ts) return undefined;
  return Math.floor((Date.now() / 1000 - ts) / 86400);
}

function GrowPage({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  const ids = useMemo(() => [
    E.soil, E.soilBatt, E.tentTemp, E.tentHum, E.tentVpd, E.water, E.stage,
    E.plantA.name, E.plantA.planted, E.plantA.stage,
    E.plantB.name, E.plantB.planted, E.plantB.stage, ...E.growOnline,
  ], []);
  const e = useEntities(hass, ids);
  const soil = num(e[E.soil]);
  const water = num(e[E.water]);
  const cols = narrow ? 1 : 3;
  const soilColor = soil < 20 ? T.alert : soil < 30 ? T.warn : T.ok;
  // Tent housekeeping lives here rather than on the house board.
  const tentAttention = useAttention(hass).filter((a) => a.scope === 'grow' || a.scope === 'both');

  const stat = (label: string, value: string) => (
    <div>
      <div style={{ fontSize: 22, fontWeight: 250 }}>{value}</div>
      <div style={{ ...LABEL, fontSize: 9.5, marginTop: 3 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      <AttentionBoard items={tentAttention} span={cols} label="Tent needs attention" />
      <Glass style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <PanelHead label="Soil — the one number" />
        <Ring pct={soil} color={soilColor}>
          <div>
            <div style={{ fontSize: 46, fontWeight: 200 }}>{Number.isFinite(soil) ? Math.round(soil) : '—'}<span style={{ fontSize: 20 }}>%</span></div>
            <div style={{ fontSize: 10, color: T.dim, letterSpacing: '0.16em', marginTop: 2 }}>MOISTURE</div>
          </div>
        </Ring>
        <div style={{ fontSize: 11.5, color: T.dim, marginTop: 12 }}>
          Probe battery {e[E.soilBatt]?.state ?? '—'}%
        </div>
      </Glass>

      <Glass span={narrow ? 1 : 2}>
        <PanelHead label="Tent climate" right={<span style={{ fontSize: 11.5, color: T.dim }}>{titleize(e[E.stage]?.state)}</span>} />
        <div style={{ display: 'flex', gap: narrow ? 22 : 44, flexWrap: 'wrap', marginTop: 6 }}>
          {stat('Temp', `${num(e[E.tentTemp]) ? num(e[E.tentTemp]).toFixed(1) : '—'}°F`)}
          {stat('Humidity', `${num(e[E.tentHum]) ? Math.round(num(e[E.tentHum])) : '—'}%`)}
          {stat('VPD', `${e[E.tentVpd]?.state ?? '—'} kPa`)}
          {stat('Reservoir', `${Number.isFinite(water) ? Math.round(water) : '—'}%`)}
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {E.growOnline.map((id) => {
            const on = e[id]?.state === 'on';
            const name = ((attr(e[id], 'friendly_name') as string | undefined) ?? id)
              .replace(/ (Online|Connected).*$/i, '').replace(/^Ecowitt Soil Moisture Sensor F3621 /, '');
            return (
              <span key={id} style={{
                fontSize: 11, padding: '5px 11px', borderRadius: 999,
                border: `1px solid ${on ? 'rgba(122,196,143,0.35)' : 'rgba(224,121,95,0.5)'}`,
                color: on ? T.ok : T.alert,
              }}>{name}</span>
            );
          })}
        </div>
      </Glass>

      {([['🍌', E.plantA], ['🫐', E.plantB]] as const).map(([emoji, plant]) => {
        const day = daysSince(e[plant.planted]);
        const pct = day != null ? Math.min(100, (day / 75) * 100) : 0;
        const stageEnt = e[plant.stage];
        const options = (attr(stageEnt, 'options') as string[] | undefined) ?? [];
        const stageIdx = options.indexOf(stageEnt?.state ?? '');
        const setStage = (delta: number) => {
          const next = options[stageIdx + delta];
          if (next) void hass.callService('input_select', 'select_option', { option: next }, { entity_id: plant.stage });
        };
        return (
          <Glass key={plant.name}>
            <PanelHead label={`${emoji} ${e[plant.name]?.state ?? 'Plant'}`} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Ring pct={pct} size={96} stroke={5} color={T.gold}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 300 }}>{day ?? '—'}</div>
                  <div style={{ fontSize: 9, color: T.dim, letterSpacing: '0.14em' }}>DAY</div>
                </div>
              </Ring>
              <div style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.7 }}>
                ~75-day autoflower run<br />
                {day != null ? `${Math.max(0, 75 - day)} days to harvest window` : 'set planted date'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <button type="button" aria-label="Previous stage" onClick={() => setStage(-1)}
                disabled={stageIdx <= 0}
                className="est-tap"
                style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${T.line}`, background: 'rgba(255,255,255,0.05)', color: T.dim, cursor: 'pointer', fontFamily: 'inherit' }}>‹</button>
              <span style={{ flex: 1, textAlign: 'center', fontSize: 12.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold, fontWeight: 600 }}>
                {stageEnt?.state ? titleize(stageEnt.state) : '—'}
              </span>
              <button type="button" aria-label="Next stage" onClick={() => setStage(1)}
                disabled={stageIdx < 0 || stageIdx >= options.length - 1}
                className="est-tap"
                style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${T.line}`, background: 'rgba(255,255,255,0.05)', color: T.dim, cursor: 'pointer', fontFamily: 'inherit' }}>›</button>
            </div>
          </Glass>
        );
      })}

      <GrowVpdCoach hass={hass} />

      <Glass span={narrow ? 1 : 2}>
        <PanelHead label="Grow Pulse — 24h" right={<span style={{ fontSize: 11.5, color: T.dim }}>soil &amp; humidity share the % scale</span>} />
        <PulseChart hass={hass} series={[
          { entity: E.soil, label: 'Soil', color: '#7ac48f' },
          { entity: E.tentHum, label: 'TentRH', color: '#7fd1c8' },
        ]} />
      </Glass>

      <GrowControls hass={hass} />

    </div>
  );
}

/** Stage-aware VPD verdict — same bands the SMCC coach used. */
function GrowVpdCoach({ hass }: { hass: Hass }) {
  const ids = useMemo(() => [E.tentVpd, E.plantA.stage], []);
  const e = useEntities(hass, ids);
  const vpd = num(e[E.tentVpd]);
  const stage = e[E.plantA.stage]?.state ?? '';
  const BANDS: Record<string, [number, number]> = {
    germination: [0.4, 0.8], seedling: [0.4, 0.8], 'early veg': [0.8, 1.0],
    'late veg': [1.0, 1.25], flowering: [1.2, 1.6], flushing: [1.2, 1.6],
  };
  const band = BANDS[stage.toLowerCase().replace(/_/g, ' ')] ?? [0.8, 1.2];
  const low = vpd < band[0], high = vpd > band[1];
  const ok = !low && !high && Number.isFinite(vpd);

  return (
    <Glass>
      <PanelHead label="VPD Coach" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Ring pct={Math.min(100, (vpd / 2) * 100)} size={96} stroke={5} color={ok ? T.ok : T.warn}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 300 }}>{Number.isFinite(vpd) ? vpd.toFixed(2) : '—'}</div>
            <div style={{ fontSize: 8.5, color: T.dim, letterSpacing: '0.14em' }}>kPa</div>
          </div>
        </Ring>
        <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          <div style={{ color: ok ? T.ok : T.warn, fontWeight: 600 }}>
            {ok ? 'Dialed in' : low ? 'Too low — nudge RH down or temp up' : 'Too high — raise humidity'}
          </div>
          <div style={{ color: T.dim, marginTop: 3 }}>
            Target for {titleize(stage)}: {band[0]}–{band[1]} kPa
          </div>
        </div>
      </div>
    </Glass>
  );
}

/** Tent hardware — safe direct toggles; the guard is for security actions only. */
function GrowControls({ hass }: { hass: Hass }) {
  const ids = useMemo(() => [E.growLight, E.ductFan, E.circFan, E.humidifier, E.lightPlan, E.water], []);
  const e = useEntities(hass, ids);
  const waterWarn = attr(e[E.humidifier], 'water_warning') === true;

  const item = (id: string, name: string, domain: string, icon: string) => {
    const on = e[id]?.state === 'on';
    return (
      <button key={id} type="button" className="est-lift"
        aria-pressed={on} aria-label={`Toggle ${name}`}
        onClick={() => void hass.callService(domain, 'toggle', {}, { entity_id: id })}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 14,
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, textAlign: 'left',
          border: `1px solid ${on ? T.goldDeep : T.line}`,
          background: on ? 'rgba(211,176,110,0.16)' : 'rgba(255,255,255,0.04)',
          color: on ? T.gold : T.dim,
        }}
      >
        <Icon d={icon} size={17} /> {name}
        <span style={{ marginLeft: 'auto', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{on ? 'On' : 'Off'}</span>
      </button>
    );
  };

  return (
    <Glass>
      <PanelHead label="Tent hardware" right={<span style={{ fontSize: 11, color: T.dim }}>{e[E.lightPlan]?.state ?? ''}</span>} />
      <div style={{ display: 'grid', gap: 9 }}>
        {item(E.growLight, 'Grow Light', 'light', P.bulb)}
        {item(E.ductFan, 'Exhaust Fan', 'fan', P.power)}
        {item(E.circFan, 'Circulation Fan', 'fan', P.power)}
        {item(E.humidifier, 'Humidifier', 'humidifier', P.power)}
      </div>
      {waterWarn && (
        <div style={{ marginTop: 12, fontSize: 12, color: T.warn }}>
          ⚠ Unit reports a water warning — it will refuse to run until the float is happy.
        </div>
      )}
    </Glass>
  );
}

/* ================================================================== sky */

function activeShower(d: Date): string {
  const m = d.getMonth() + 1, day = d.getDate();
  if ((m === 7 && day >= 17) || (m === 8 && day <= 24)) return m === 8 && day >= 11 && day <= 13 ? 'Perseids — PEAK' : 'Perseids active';
  if (m === 10) return 'Orionids active';
  if (m === 11 && day >= 6) return 'Leonids active';
  if (m === 12 && day >= 4 && day <= 17) return day >= 12 && day <= 14 ? 'Geminids — PEAK' : 'Geminids active';
  if (m === 1 && day <= 5) return 'Quadrantids active';
  if (m === 4 && day >= 16 && day <= 25) return 'Lyrids active';
  if ((m === 4 && day >= 26) || (m === 5 && day <= 28)) return 'Eta Aquariids active';
  return 'No major shower';
}


/**
 * The sky wherever you actually are.
 *
 * Only appears when the phone is away from home and reporting GPS. Everything
 * here is solved from that live position rather than from sun.sun, because
 * sun.sun only ever describes one house - and the whole point of this panel is
 * the night you are standing somewhere else.
 */
function TravelSky({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  const ids = useMemo(() => [E.phone, E.homeZone, E.moon, E.moonEmoji, E.kp], []);
  const e = useEntities(hass, ids);
  const now = useNow(60000);

  const lat = attr(e[E.phone], 'latitude') as number | undefined;
  const lon = attr(e[E.phone], 'longitude') as number | undefined;
  const away = e[E.phone]?.state !== 'home';
  if (!away || typeof lat !== 'number' || typeof lon !== 'number') return null;

  const homeLat = (attr(e[E.homeZone], 'latitude') as number | undefined) ?? HOUSE.coords.lat;
  const homeLon = (attr(e[E.homeZone], 'longitude') as number | undefined) ?? HOUSE.coords.lon;
  const miles = distanceMiles(homeLat, homeLon, lat, lon);
  // Under ~25 miles the sky is identical to the one at home; showing a second
  // near-identical set of times would be noise, not information.
  if (miles < 25) return null;

  const t = solarTimes(lat, lon, now);
  const magLat = Math.abs(geomagneticLatitude(lat, lon));
  const kp = num(e[E.kp], -1);
  // The auroral oval sits near 67 deg magnetic at Kp 0 and pushes ~2 deg
  // equatorward per Kp step.
  const ovalEdge = 67 - 2 * Math.max(0, kp);
  const auroraReach = kp >= 0 && magLat >= ovalEdge;

  const cell: CSSProperties = {
    padding: '12px 14px', borderRadius: 12,
    border: `1px solid ${T.line}`, background: 'rgba(255,255,255,0.04)',
  };

  return (
    <Glass span={narrow ? 1 : 3} style={{ borderColor: 'rgba(122,160,224,0.35)' }}>
      <PanelHead
        label="Where you are tonight"
        right={
          <span style={{ fontSize: 11.5, color: T.dim }}>
            {Math.round(miles).toLocaleString()} mi from home · {lat.toFixed(2)}, {lon.toFixed(2)}
          </span>
        }
      />
      <div style={{
        display: 'grid', gap: 12, marginBottom: 14,
        gridTemplateColumns: `repeat(${narrow ? 2 : 4}, minmax(0,1fr))`,
      }}>
        {([
          ['Sunset', utcMinutesToLocal(t.sunsetUTC, now)],
          ['Full dark', utcMinutesToLocal(t.duskUTC, now)],
          ['Sunrise', utcMinutesToLocal(t.sunriseUTC, now)],
          ['Sun peaks', `${t.maxElevation.toFixed(0)}°`],
        ] as const).map(([label, value]) => (
          <div key={label} style={cell}>
            <div style={LABEL}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 300, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <SunArc
        lat={lat}
        solarNoonIso={new Date(Date.UTC(
          now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0,
        ).valueOf() + t.noonUTC * 60000).toISOString()}
        sunriseIso={t.sunriseUTC === null ? undefined : new Date(Date.UTC(
          now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0,
        ).valueOf() + t.sunriseUTC * 60000).toISOString()}
        sunsetIso={t.sunsetUTC === null ? undefined : new Date(Date.UTC(
          now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0,
        ).valueOf() + t.sunsetUTC * 60000).toISOString()}
        elevation={-10}
        azimuth={180}
        moonPhase={e[E.moon]?.state}
      />

      <div style={{
        display: 'grid', gap: 12, marginTop: 14,
        gridTemplateColumns: narrow ? '1fr' : '1fr 1fr',
      }}>
        <div style={cell}>
          <div style={LABEL}>Moon tonight</div>
          <div style={{ fontSize: 15, marginTop: 4 }}>
            {e[E.moonEmoji]?.state ?? ''} {titleize(e[E.moon]?.state)}
          </div>
          <div style={{ fontSize: 11, color: T.faint, marginTop: 4 }}>
            Phase is the same everywhere on Earth — only the times move.
          </div>
        </div>
        <div style={cell}>
          <div style={LABEL}>Aurora reach</div>
          <div style={{ fontSize: 15, marginTop: 4, color: auroraReach ? T.info : T.dim }}>
            {kp < 0 ? 'Kp unavailable'
              : auroraReach ? `Possible — Kp ${kp.toFixed(1)} reaches ${magLat.toFixed(0)}° magnetic`
              : `Unlikely — need Kp ${Math.max(0, Math.ceil((67 - magLat) / 2))}+ here`}
          </div>
          <div style={{ fontSize: 11, color: T.faint, marginTop: 4 }}>
            {magLat.toFixed(1)}° geomagnetic — the oval follows the magnetic pole, not the map.
          </div>
        </div>
      </div>
    </Glass>
  );
}

function SkyPage({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  const now = useNow(30000);
  const ids = useMemo(() => [
    E.weather, E.moon, E.moonEmoji, E.aurora, E.homeZone,
    E.issPos, E.issPassSummary, E.issPassDir, E.kp, E.apod, E.auroraVerdict,
    E.nextLaunch, E.nextLaunchName, E.nextLaunchDetail, E.nextLaunchCountdown,
    E.nextSpacex, E.nextSpacexMission, E.nextSpacexCountdown,
    E.epicImage, E.epicWhen,
  ], []);
  const e = useEntities(hass, ids);

  const clouds = (attr(e[E.weather], 'cloud_coverage') as number | undefined) ?? 100;
  const moonOk = ['new_moon', 'waxing_crescent', 'waning_crescent', 'first_quarter', 'last_quarter']
    .includes(e[E.moon]?.state ?? '');
  const go = clouds < 30 && moonOk;
  const cols = narrow ? 1 : 3;

  // Kp is the honest aurora number; the NOAA "visibility %" sensor is a
  // derived convenience and disagrees with it often enough to be confusing.
  const kp = num(e[E.kp], -1);
  const kpStrong = kp >= 5;

  const issEnt = e[E.issPos];
  const iss: IssState | null = issEnt && typeof attr(issEnt, 'latitude') === 'number'
    ? {
        latitude: attr(issEnt, 'latitude') as number,
        longitude: attr(issEnt, 'longitude') as number,
        altitude: attr(issEnt, 'altitude') as number | undefined,
        velocity: attr(issEnt, 'velocity') as number | undefined,
        visibility: attr(issEnt, 'visibility') as string | undefined,
        solar_lat: attr(issEnt, 'solar_lat') as number | undefined,
        solar_lon: attr(issEnt, 'solar_lon') as number | undefined,
        footprint: attr(issEnt, 'footprint') as number | undefined,
      }
    : null;

  const homeLat = (attr(e[E.homeZone], 'latitude') as number | undefined) ?? HOUSE.coords.lat;
  const homeLon = (attr(e[E.homeZone], 'longitude') as number | undefined) ?? HOUSE.coords.lon;

  const apod = e[E.apod];
  const apodUrl = attr(apod, 'url') as string | undefined;
  const apodIsImage = (attr(apod, 'media_type') as string | undefined) !== 'video';

  return (
    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      <Glass span={cols} style={{
        textAlign: 'center', padding: '40px 24px',
        background: kpStrong
          ? 'linear-gradient(180deg, rgba(122,160,224,0.16), rgba(255,255,255,0.02))'
          : go
            ? 'linear-gradient(180deg, rgba(122,196,143,0.10), rgba(255,255,255,0.02))'
            : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        borderColor: kpStrong ? 'rgba(122,160,224,0.45)' : go ? 'rgba(122,196,143,0.35)' : T.line,
      }}>
        <div style={{ fontSize: 60, marginBottom: 4 }} aria-hidden="true">
          {kpStrong ? '🌌' : (e[E.moonEmoji]?.state ?? '🌙')}
        </div>
        <div style={{ fontSize: 32, fontWeight: 200, color: kpStrong ? T.info : go ? T.ok : clouds < 60 ? T.warn : T.dim }}>
          {kpStrong ? 'AURORA WATCH' : go ? 'GO for the telescope' : clouds < 60 ? 'Marginal night' : 'Clouded out'}
        </div>
        <div style={{ fontSize: 13.5, color: T.dim, marginTop: 8 }}>
          {activeShower(now)} · {e[E.auroraVerdict]?.state ?? 'space weather loading'}
        </div>
      </Glass>

      <TravelSky hass={hass} narrow={narrow} />

      <Glass span={cols} style={{ padding: '14px 16px 8px' }}>
        <PanelHead label="The sky at home" />
        <SkyBanner hass={hass} />
      </Glass>

      {/* ---------------------------------------------------- the map */}
      <Glass span={cols} style={{ padding: 16 }}>
        <PanelHead
          label="ISS · live ground track"
          right={
            <span style={{ fontSize: 11.5, color: T.dim }}>
              {iss
                ? `${Math.round(iss.altitude ?? 0)} km · ${Math.round(iss.velocity ?? 0).toLocaleString()} km/h · ${iss.visibility === 'daylight' ? 'in sunlight' : 'in shadow'}`
                : 'awaiting telemetry'}
            </span>
          }
        />
        <IssMap iss={iss} homeLat={homeLat} homeLon={homeLon} />
        <div style={{ fontSize: 11, color: T.faint, marginTop: 8 }}>
          Shaded band is real night, solved from the sub-solar point. The ring is the
          station's horizon — when it overlaps Home and the sky here is dark, it is overhead.
        </div>
      </Glass>

      {/* ------------------------------------------------- next pass */}
      <Glass>
        <PanelHead label="Next visible pass" />
        <div style={{ fontSize: 21, fontWeight: 300 }}>{e[E.issPassSummary]?.state ?? '—'}</div>
        <div style={{ fontSize: 12.5, color: T.dim, marginTop: 6 }}>{e[E.issPassDir]?.state ?? '—'}</div>
        <div style={{ fontSize: 11, color: T.faint, marginTop: 8 }}>
          Above 40° and after dark is worth walking outside for.
        </div>
      </Glass>

      {/* ------------------------------------------------ space weather */}
      <Glass style={{ textAlign: 'center' }}>
        <PanelHead label="Planetary Kp" />
        <div style={{ fontSize: 46, fontWeight: 200, color: kp >= 5 ? T.info : kp >= 4 ? T.warn : T.text }}>
          {kp < 0 ? '—' : kp.toFixed(1)}
        </div>
        <div style={{
          height: 6, borderRadius: 3, marginTop: 10, overflow: 'hidden',
          background: 'rgba(255,255,255,0.10)',
        }}>
          <div style={{
            width: `${Math.max(0, Math.min(kp, 9)) / 9 * 100}%`, height: '100%',
            background: kp >= 5 ? T.info : kp >= 4 ? T.warn : T.ok,
          }} />
        </div>
        <div style={{ fontSize: 11, color: T.dim, marginTop: 6 }}>Kp 5+ reaches Minnesota</div>
      </Glass>

      <Glass style={{ textAlign: 'center' }}>
        <PanelHead label="Cloud cover" />
        <div style={{ fontSize: 46, fontWeight: 200 }}>{Math.round(clouds)}%</div>
        <div style={{ fontSize: 11.5, color: T.dim, marginTop: 4 }}>&lt; 30% is telescope-grade</div>
      </Glass>

      <Glass style={{ textAlign: 'center' }}>
        <PanelHead label="Moon" />
        <div style={{ fontSize: 42, marginBottom: 2 }} aria-hidden="true">{e[E.moonEmoji]?.state ?? ''}</div>
        <div style={{ fontSize: 19, fontWeight: 300 }}>{titleize(e[E.moon]?.state)}</div>
        <div style={{ fontSize: 11.5, color: moonOk ? T.ok : T.warn, marginTop: 4 }}>
          {moonOk ? 'Dark enough for deep-sky' : 'Bright — planets & doubles only'}
        </div>
      </Glass>

      {/* ------------------------------------------------ launches */}
      <Glass span={narrow ? 1 : 2}>
        <PanelHead
          label="Launch window"
          right={<span style={{ fontSize: 11.5, color: T.dim }}>worldwide, next up</span>}
        />
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: narrow ? '1fr' : '1fr 1fr' }}>
          {([
            [E.nextLaunchCountdown, E.nextLaunchName, E.nextLaunchDetail, 'Next off the pad'],
            [E.nextSpacexCountdown, E.nextSpacexMission, null, 'Next SpaceX'],
          ] as const).map(([cd, name, detail, label]) => {
            const clock = e[cd]?.state ?? '—';
            const soon = /T-\d+ min|lifting off|in flight/.test(clock);
            return (
              <div key={label} style={{
                padding: '14px 16px', borderRadius: 12,
                border: `1px solid ${soon ? T.goldDeep : T.line}`,
                background: soon ? 'rgba(224,179,76,0.07)' : 'rgba(255,255,255,0.04)',
              }}>
                <div style={LABEL}>{label}</div>
                <div style={{
                  fontSize: 27, fontWeight: 200, marginTop: 6,
                  color: soon ? T.gold : T.text, fontVariantNumeric: 'tabular-nums',
                }}>
                  {clock}
                </div>
                <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>{e[name]?.state ?? '—'}</div>
                {detail ? (
                  <div style={{ fontSize: 11.5, color: T.dim, marginTop: 4 }}>{e[detail]?.state ?? ''}</div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: T.faint, marginTop: 10 }}>
          One push fires 15 minutes before the next launch — not for all ~360 on the board.
        </div>
      </Glass>

      {/* --------------------------------------------- EPIC full disc */}
      <Glass style={{ padding: 16 }}>
        <PanelHead
          label="Earth, from a million miles"
          right={<span style={{ fontSize: 11, color: T.dim }}>{(e[E.epicWhen]?.state ?? '').slice(0, 10)}</span>}
        />
        {e[E.epicImage]?.state?.startsWith('http') ? (
          <img
            src={e[E.epicImage].state}
            alt="NASA EPIC full-disc image of Earth from the DSCOVR satellite"
            loading="lazy"
            style={{ width: '100%', borderRadius: 10, display: 'block', background: '#000' }}
          />
        ) : (
          <div style={{ fontSize: 12.5, color: T.dim, padding: '18px 0' }}>Waiting for DSCOVR.</div>
        )}
        <div style={{ fontSize: 11, color: T.faint, marginTop: 8 }}>
          DSCOVR sits at L1 and photographs the entire sunlit face of the planet once a day.
        </div>
      </Glass>

      {/* ------------------------------------------------------ APOD */}
      <Glass span={narrow ? 1 : 2} style={{ padding: 16 }}>
        <PanelHead
          label="NASA · picture of the day"
          right={<span style={{ fontSize: 11.5, color: T.dim }}>{(attr(apod, 'date') as string) ?? ''}</span>}
        />
        {apodUrl && apodIsImage ? (
          <img
            src={apodUrl}
            alt={apod?.state ?? 'NASA astronomy picture of the day'}
            loading="lazy"
            style={{ width: '100%', borderRadius: 10, display: 'block', maxHeight: 360, objectFit: 'cover' }}
          />
        ) : (
          <div style={{ fontSize: 12.5, color: T.dim, padding: '18px 0' }}>
            {apodUrl ? "Today's entry is a video — open it on apod.nasa.gov." : 'Waiting for NASA.'}
          </div>
        )}
        <div style={{ fontSize: 15, fontWeight: 500, marginTop: 10 }}>{apod?.state ?? ''}</div>
        <div style={{ fontSize: 12, color: T.dim, marginTop: 6, lineHeight: 1.5 }}>
          {((attr(apod, 'explanation') as string) ?? '').slice(0, 320)}
          {((attr(apod, 'explanation') as string) ?? '').length > 320 ? '…' : ''}
        </div>
        {attr(apod, 'copyright') ? (
          <div style={{ fontSize: 10.5, color: T.faint, marginTop: 6 }}>
            © {String(attr(apod, 'copyright')).trim()}
          </div>
        ) : null}
      </Glass>
    </div>
  );
}

/* ============================================================== settings */

/**
 * The Settings page edits Home Assistant's truth — every control writes an
 * input_number / input_datetime helper that the automations read. Nothing here
 * is stored in the UI: delete this panel and the house behaves identically.
 */

function SettingSlider({ hass, entity, label, hint }: {
  hass: Hass; entity: string; label: string; hint: string;
}) {
  const ent = useEntity(hass, entity);
  const min = (attr(ent, 'min') as number | undefined) ?? 0;
  const max = (attr(ent, 'max') as number | undefined) ?? 100;
  const step = (attr(ent, 'step') as number | undefined) ?? 1;
  const unit = (attr(ent, 'unit_of_measurement') as string | undefined) ?? '';
  const live = num(ent, min);
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? live;

  const commit = () => {
    if (drag == null) return;
    void hass.callService('input_number', 'set_value', { value: drag }, { entity_id: entity });
    setDrag(null);
  };

  return (
    <div style={{ padding: '14px 0', borderBottom: `1px solid ${T.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.gold, fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(shown)}{unit}
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={shown}
        aria-label={label}
        className="est-range"
        style={{ ['--fill' as string]: `${((shown - min) / Math.max(1, max - min)) * 100}%` }}
        onChange={(ev) => setDrag(Number(ev.target.value))}
        onPointerUp={commit} onKeyUp={commit} onBlur={commit}
      />
      <div style={{ fontSize: 11.5, color: T.dim, marginTop: 2 }}>{hint}</div>
    </div>
  );
}

function SettingTime({ hass, entity, label, hint }: {
  hass: Hass; entity: string; label: string; hint: string;
}) {
  const ent = useEntity(hass, entity);
  const value = (ent?.state ?? '22:45:00').slice(0, 5);
  return (
    <div style={{ padding: '14px 0', borderBottom: `1px solid ${T.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: 11.5, color: T.dim, marginTop: 2 }}>{hint}</div>
        </div>
        <input
          type="time" value={value} aria-label={label}
          onChange={(ev) => {
            if (ev.target.value) void hass.callService('input_datetime', 'set_datetime', { time: ev.target.value + ':00' }, { entity_id: entity });
          }}
          style={{
            fontFamily: 'inherit', fontSize: 16, fontWeight: 600, color: T.gold,
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.line}`,
            borderRadius: 10, padding: '8px 12px', colorScheme: 'dark',
          }}
        />
      </div>
    </div>
  );
}

function SettingAutomationToggle({ hass, entity, label, hint }: {
  hass: Hass; entity: string; label: string; hint: string;
}) {
  const ent = useEntity(hass, entity);
  const on = ent?.state === 'on';
  return (
    <div style={{ padding: '14px 0', borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: T.dim, marginTop: 2 }}>{hint}</div>
      </div>
      <Pill active={on} onClick={() => void hass.callService('automation', on ? 'turn_off' : 'turn_on', {}, { entity_id: entity })}>
        {on ? 'Alerting' : 'Muted'}
      </Pill>
    </div>
  );
}

/* ============================================================== printers */

/*
 * Bambu printers. Status and live chamber view only -- no pause/resume/stop.
 * Those buttons need Developer / LAN Only mode on the printer, which costs
 * Bambu cloud and the Handy app, and the integration does not even create the
 * button entities while `mqtt_signature_required` is true. Both machines
 * report mqtt_encryption on, so there is nothing to wire up here.
 *
 * The camera is a still refreshed every 10 s, the same trick the security
 * cameras use -- a permanently live RTSP stream per printer is a lot of
 * bandwidth for a tab that mostly answers "is it still going?".
 */
const PRINTERS = [
  { p: 'h2d', label: 'H2D', dual: true },
  { p: 'study_x1c', label: 'X1C', dual: false },
] as const;

function PrintersPage({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  const now = useNow(10000);
  const [camFailed, setCamFailed] = useState<Record<string, boolean>>({});
  const ids = useMemo(() => PRINTERS.flatMap((m) => [
    `camera.${m.p}_camera`,
    `image.${m.p}_cover_image`,
    `binary_sensor.${m.p}_online`,
    `binary_sensor.${m.p}_hms_errors`,
    `sensor.${m.p}_print_status`,
    `sensor.${m.p}_current_stage`,
    `sensor.${m.p}_task_name`,
    `sensor.${m.p}_print_progress`,
    `sensor.${m.p}_current_layer`,
    `sensor.${m.p}_total_layer_count`,
    `sensor.${m.p}_remaining_time`,
    `sensor.${m.p}_bed_temperature`,
    `sensor.${m.p}_chamber_temperature`,
    ...(m.dual
      ? [`sensor.${m.p}_left_nozzle_temperature`, `sensor.${m.p}_right_nozzle_temperature`]
      : [`sensor.${m.p}_nozzle_temperature`]),
  ]), []);
  const e = useEntities(hass, ids);
  const cols = narrow ? 1 : 2;

  const st = (id: string) => e[id]?.state;
  const bad = (v?: string) => !v || v === 'unavailable' || v === 'unknown';
  const fmt = (id: string, suffix = '') => {
    const v = st(id);
    if (bad(v)) return '--';
    // Temps and remaining-minutes both arrive with useless precision --
    // "0.216666666666667 min" is not a number anyone reads.
    const n = Number(v);
    return Number.isFinite(n) ? `${Math.round(n)}${suffix}` : `${v}${suffix}`;
  };

  return (
    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {PRINTERS.map((m) => {
        const online = st(`binary_sensor.${m.p}_online`) === 'on';
        const status = st(`sensor.${m.p}_print_status`);
        const running = status === 'running';
        const pct = Math.max(0, Math.min(100, Number(st(`sensor.${m.p}_print_progress`) ?? 0)));
        const pic = attr(e[`camera.${m.p}_camera`], 'entity_picture') as string | undefined;
        // Same cache-buster the security cameras use: a fresh URL every 10 s.
        const failed = camFailed[m.p] === true;
        const url = online && pic && !failed
          ? `${pic}&est=${Math.floor(now.getTime() / 10000)}`
          : undefined;
        // Fallback: the sliced model preview for the running job. Only exists
        // while something is loaded, so it can legitimately be absent.
        const cover = attr(e[`image.${m.p}_cover_image`], 'entity_picture') as string | undefined;
        const nozzles: ReadonlyArray<readonly [string, string]> = m.dual
          ? [['Left', `sensor.${m.p}_left_nozzle_temperature`],
             ['Right', `sensor.${m.p}_right_nozzle_temperature`]]
          : [['Nozzle', `sensor.${m.p}_nozzle_temperature`]];

        return (
          <Glass key={m.p}>
            <PanelHead label={`\u{1F5A8} ${m.label}`} right={
              <span style={{ fontSize: 12, color: online ? (running ? T.gold : T.dim) : '#e2725b' }}>
                {online ? (bad(status) ? 'idle' : status) : 'offline'}
              </span>
            } />

            <div style={{
              borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.line}`,
              background: 'rgba(0,0,0,0.4)', aspectRatio: '16/9', marginBottom: 14,
            }}>
              {url ? (
                <img src={url} alt={`${m.label} chamber`}
                  onError={() => setCamFailed((f) => ({ ...f, [m.p]: true }))}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : online && cover ? (
                <div style={{ position: 'relative', height: '100%' }}>
                  <img src={cover} alt={`${m.label} model preview`}
                    style={{
                      width: '100%', height: '100%', objectFit: 'contain', display: 'block',
                      background: 'rgba(0,0,0,0.35)',
                    }} />
                  <div style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 12px 7px',
                    fontSize: 10.5, color: 'rgba(255,255,255,0.72)', textAlign: 'center',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                  }}>
                    Model preview. Chamber video needs LAN Only Mode on the printer.
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid', placeItems: 'center', height: '100%', gap: 8,
                  color: T.faint, fontSize: 12, textAlign: 'center', padding: '0 22px',
                }}>
                  {!online ? <span>Printer offline</span> : failed ? (
                    <>
                      <span style={{ color: T.dim }}>No chamber video</span>
                      <span style={{ fontSize: 11, lineHeight: 1.5 }}>
                        The printer reports its stream URL as <b>disable</b>. Bambu only
                        publishes it in LAN Only Mode, which would cost the cloud features.
                      </span>
                      <Pill active={false} onClick={() => setCamFailed((f) => ({ ...f, [m.p]: false }))}>
                        Retry
                      </Pill>
                    </>
                  ) : <span>No signal</span>}
                </div>
              )}
            </div>

            {running && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: T.dim, marginBottom: 5 }}>
                  <span>{bad(st(`sensor.${m.p}_task_name`)) ? 'Printing' : st(`sensor.${m.p}_task_name`)}</span>
                  <span>{pct}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: T.line, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: T.gold, transition: 'width .6s ease' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '9px 16px', fontSize: 13 }}>
              <Stat label="Stage" value={fmt(`sensor.${m.p}_current_stage`)} />
              <Stat label="Remaining" value={fmt(`sensor.${m.p}_remaining_time`, ' min')} />
              <Stat label="Layer"
                value={bad(st(`sensor.${m.p}_current_layer`)) ? '--'
                  : `${st(`sensor.${m.p}_current_layer`)} / ${fmt(`sensor.${m.p}_total_layer_count`)}`} />
              <Stat label="Bed" value={fmt(`sensor.${m.p}_bed_temperature`, '\u00B0')} />
              {nozzles.map(([n, id]) => <Stat key={id} label={n} value={fmt(id, '\u00B0')} />)}
              <Stat label="Chamber" value={fmt(`sensor.${m.p}_chamber_temperature`, '\u00B0')} />
            </div>

            {st(`binary_sensor.${m.p}_hms_errors`) === 'on' && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: '#e2725b' }}>
                HMS error reported -- check the printer.
              </div>
            )}
          </Glass>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: `1px solid ${T.line}`, paddingBottom: 6 }}>
      <span style={{ color: T.dim }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function SettingsPage({ hass, narrow, prefs, savePrefs }: {
  hass: Hass; narrow: boolean;
  prefs: NavPrefs; savePrefs: (v: NavPrefs) => void;
}) {
  const cols = narrow ? 1 : 2;
  const admin = hass.user?.is_admin === true;

  /* Non-admins never get the house dials: thresholds and schedules are global
     facts -- one soil alert level for the whole tent -- so only administrators
     shape them. They get the real Profile page instead of a placeholder, which
     is where their own alert switches and locations already live. Setup is
     hidden from their nav entirely; this branch only catches a stale link or a
     notification deep-link to #settings. */
  if (!admin) return <ProfilePage hass={hass} narrow={narrow}
    admin={admin} navPrefs={prefs} savePrefs={savePrefs} />;

  return (
    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      <Glass span={cols} style={{ padding: '16px 22px' }}>
        <div style={{ fontSize: 13.5, color: T.dim, lineHeight: 1.6 }}>
          <b style={{ color: T.gold }}>Administrator view.</b> These controls edit the{' '}
          <b style={{ color: T.text }}>house's own settings</b> — the helpers that alerts and
          schedules read. Changes apply instantly, survive every UI update, and affect the
          whole household. Family members see a personal profile page here instead.
        </div>
      </Glass>

      <Glass>
        <PanelHead label="🌿 Grow alerts" />
        <SettingSlider hass={hass} entity="input_number.soil_alert_threshold"
          label="Soil dry alert" hint="Critical push when soil moisture sits below this for 30 minutes." />
        <SettingSlider hass={hass} entity="input_number.reservoir_alert_threshold"
          label="Reservoir low alert" hint="Push when the humidifier tank reads below this for 30 minutes." />
        <SettingAutomationToggle hass={hass} entity="automation.smcc_humidifier_reservoir_low"
          label="Reservoir alerting" hint="Muted while the tank is out for cleaning — flip back on when it returns." />
      </Glass>

      <Glass>
        <PanelHead label="🛡️ Security" />
        <SettingSlider hass={hass} entity="input_number.garage_open_alert_minutes"
          label="Garage open nag" hint="Minutes a garage door can sit open before the phone hears about it." />
        <SettingTime hass={hass} entity="input_datetime.night_sweep_time"
          label="Night security sweep" hint="Nightly check — silent when everything is locked and closed." />
      </Glass>

      <Glass>
        <PanelHead label="🔭 Sky" />
        <SettingSlider hass={hass} entity="input_number.telescope_cloud_max"
          label="Telescope cloud ceiling" hint="Telescope Tonight only fires below this cloud cover." />
      </Glass>

      <Glass>
        <PanelHead label="🌗 Lighting autopilot" />
        <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.7 }}>
          Bed and wake times for Adaptive Lighting live in its own integration options
          (currently 22:30 / 06:30). A future pass can surface them here; until then:
          HA → Settings → Integrations → Adaptive Lighting → Configure.
        </div>
      </Glass>
    </div>
  );
}
