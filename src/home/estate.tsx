import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass, HassEntity } from '../ha/types';
import { Floorplan } from './floorplan';
import { RoomsGrid } from './RoomsGrid';
import { THEME_CSS } from './theme';
import { HousePulse, ForecastStrip } from './pulse';
import { IssMap, type IssState } from './skymap';

/**
 * WHALEN ESTATE — a Savant/Control4-class surface for Home Assistant.
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
  game: 'M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM11 13H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
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
.est-page { animation: estFadeUp .45s cubic-bezier(.2,.7,.3,1) both; }
.est-panel { transition: border-color .25s ease, transform .25s ease, background .25s ease; }
.est-panel:hover { border-color: ${T.lineHi}; }
.est-lift { transition: transform .2s ease, border-color .2s ease, background .2s ease; }
.est-lift:hover { transform: translateY(-2px); }
.est-pulse { animation: estBreathe 2.6s ease-in-out infinite; }
.est-working { background-image: linear-gradient(90deg, transparent, ${T.gold}, transparent); background-size: 55% 100%; background-repeat: no-repeat; animation: estSweep 1.1s linear infinite; }
.est-range { -webkit-appearance: none; appearance: none; height: 34px; background: transparent; width: 100%; cursor: pointer; }
.est-range::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(90deg, ${T.gold} var(--fill,50%), rgba(255,255,255,0.12) var(--fill,50%)); }
.est-range::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: ${T.goldHi}; border: 2px solid #2a251c; margin-top: -7px; box-shadow: 0 2px 10px rgba(0,0,0,.55); }
.est-range::-moz-range-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.12); }
.est-range::-moz-range-progress { height: 4px; border-radius: 2px; background: ${T.gold}; }
.est-range::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: ${T.goldHi}; border: 2px solid #2a251c; }
@media (prefers-reduced-motion: reduce) {
  .est-page, .est-pulse, .est-working { animation: none; }
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

const E = {
  headline: 'sensor.house_headline',
  weather: 'weather.forecast_home',
  person: 'device_tracker.bills_iphone_17',
  phoneBatt: 'sensor.iphone_battery_level',
  blink: 'alarm_control_panel.blink_indoor',
  panel: 'alarm_control_panel.panel',
  lock: 'lock.yale_front_door',
  // Both bays now run local ratgdo boards. cover.garage / cover.garage_door_2 are
  // alarm.com mirrors of these same two doors: they lag ~90 s behind reality, never
  // report the opening/closing transitions, and disappear with the subscription.
  garage1: 'cover.garage_main_garage_stall_door', // 16'x8' double
  garage2: 'cover.garage_single_door',            //  8'x8' single
  doors: [
    ['Front Door', 'binary_sensor.front_door'],
    ['Dining Slider', 'binary_sensor.dining_sliding_door'],
    ['Lower Slider', 'binary_sensor.lower_sliding_door'],
    ['Garage Entry', 'binary_sensor.garage_entry_door'],
  ] as const,
  motion: 'binary_sensor.lower_motion_motion',
  // --- sky lab (packages/sky_lab.yaml) ---------------------------------
  homeZone: 'zone.home',
  issPos: 'sensor.iss_position',
  issPassSummary: 'sensor.iss_pass_summary',
  issPassDir: 'sensor.iss_pass_direction',
  kp: 'sensor.planetary_k_index',
  apod: 'sensor.nasa_picture_of_the_day',
  auroraVerdict: 'sensor.aurora_verdict',
  laundryWasherFlag: 'input_boolean.washer_needs_unloading',
  laundryDryerFlag: 'input_boolean.dryer_needs_unloading',
  climate: 'climate.family_room',
  allLights: 'light.main_floor_all_lights',
  rooms: [
    { name: 'Kitchen', light: 'light.kitchen_all_lights', temp: 'sensor.blink_kitchen_dining_temperature' },
    { name: 'Living Room', light: 'light.living_room_living_room_main_lights', temp: 'sensor.blink_living_room_temperature' },
    { name: 'Dining', light: 'light.dining_room_dining_room_chandelier', temp: undefined },
    { name: 'Entry', light: 'light.entry_lights', temp: undefined },
  ],
  fixtures: [
    ['Island', 'light.kitchen_kitchen_island_lights'],
    ['Pendants', 'light.kitchen_kitchen_island_pendants'],
    ['Living Room', 'light.living_room_living_room_main_lights'],
    ['Chandelier', 'light.dining_room_dining_room_chandelier'],
    ['Foyer', 'light.front_foyer_front_foyer_main_lights'],
    ['Mudroom', 'light.mudroom_mudroom_main_lights'],
  ] as const,
  autopilotHue: 'switch.kitchen_hue_adaptive_lighting_kitchen_hue',
  autopilotDim: 'switch.lutron_dimmers_adaptive_lighting_lutron_dimmers',
  frame: 'media_player.samsung_the_frame_65_qn65ls03aafxza',
  marantz: 'media_player.marantz_sr6011',
  sonos: [
    ['Family Room', 'media_player.family_room_family_room'],
    ['Bedroom', 'media_player.bedroom_bedroom'],
    ["Rowan's Room", 'media_player.rowans_room_speaker'],
  ] as const,
  cams: [
    ['Front Door', 'camera.front_door'],
    ['Front Porch', 'camera.front_porch'],
    ['Wyoming Ave', 'camera.wyoming_ave'],
  ] as const,
  soil: 'sensor.ecowitt_soil_moisture_f3621',
  soilBatt: 'sensor.ecowitt_soil_moisture_battery_f3621',
  tentTemp: 'sensor.growhub_e42a_inside_temperature',
  tentHum: 'sensor.growhub_e42a_inside_humidity',
  tentVpd: 'sensor.growhub_e42a_inside_vpd',
  water: 'sensor.aerostream_h19_water_level',
  stage: 'sensor.growhub_e42a_grow_plan_stage',
  growOnline: [
    'binary_sensor.ecowitt_soil_moisture_f3621_online',
    'binary_sensor.ecowitt_gateway_gw1100b_online',
    'binary_sensor.growhub_e42a_connected',
    'binary_sensor.aerostream_h19_connected',
    'binary_sensor.drip_irrigation_a10_connected',
  ],
  plantA: { name: 'input_text.smcc_plant_a_name', planted: 'input_datetime.smcc_plant_a_planted' },
  plantB: { name: 'input_text.smcc_plant_b_name', planted: 'input_datetime.smcc_plant_b_planted' },
  moon: 'sensor.moon_phase',
  moonEmoji: 'sensor.moon_emoji',
  aurora: 'sensor.aurora_visibility_visibility',
  waste: 'sensor.waste_upcoming',
  washer: 'sensor.laundry_room_washer_machine_state',
  dryer: 'sensor.laundry_room_dryer_machine_state',
};

const SCENES: ReadonlyArray<[label: string, script: string]> = [
  ['Movie Time', 'script.whalen_movie_time'],
  ['All On', 'script.whalen_all_lights_on'],
  ['All Off', 'script.whalen_all_lights_off'],
  ['Half On', 'script.whalen_half_on'],
  ['Goodnight', 'script.whalen_goodnight'],
  ['Good Morning', 'script.whalen_morning_wake'],
];

/* ================================================================ shell */

type Page = 'home' | 'rooms' | 'cinema' | 'security' | 'grow' | 'sky';

const NAV: ReadonlyArray<{ id: Page; label: string; icon: string }> = [
  { id: 'home', label: 'Home', icon: P.home },
  { id: 'rooms', label: 'Rooms', icon: P.rooms },
  { id: 'cinema', label: 'Cinema', icon: P.cinema },
  { id: 'security', label: 'Security', icon: P.shield },
  { id: 'grow', label: 'Grow', icon: P.leaf },
  { id: 'sky', label: 'Sky', icon: P.sky },
];

export function EstateApp({ hass }: { hass: Hass }) {
  const [page, setPage] = useState<Page>('home');
  const narrow = useNarrow();

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

      {!narrow && <Rail page={page} setPage={setPage} />}

      <main style={{
        flex: 1, minWidth: 0, padding: narrow ? '20px 16px 96px' : '30px 38px 48px',
        maxWidth: 1520, margin: '0 auto', width: '100%', boxSizing: 'border-box',
      }}>
        <Masthead hass={hass} narrow={narrow} />
        <div key={page} className="est-page" style={{ marginTop: 26 }}>
          {page === 'home' && <HomePage hass={hass} narrow={narrow} go={setPage} />}
          {page === 'rooms' && <RoomsPage hass={hass} narrow={narrow} />}
          {page === 'cinema' && <CinemaPage hass={hass} narrow={narrow} />}
          {page === 'security' && <SecurityPage hass={hass} narrow={narrow} />}
          {page === 'grow' && <GrowPage hass={hass} narrow={narrow} />}
          {page === 'sky' && <SkyPage hass={hass} narrow={narrow} />}
        </div>
      </main>

      {narrow && <BottomBar page={page} setPage={setPage} />}
    </div>
  );
}

function Rail({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
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
      }}>W</div>
      {NAV.map((n) => {
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

function BottomBar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  return (
    <nav aria-label="Sections" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      display: 'flex', justifyContent: 'space-around',
      padding: '10px 8px calc(10px + env(safe-area-inset-bottom))',
      background: 'rgba(10,12,14,0.82)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
      borderTop: `1px solid ${T.line}`,
    }}>
      {NAV.map((n) => {
        const active = n.id === page;
        return (
          <button
            key={n.id} type="button" onClick={() => setPage(n.id)} aria-label={n.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: active ? T.gold : T.dim, padding: '2px 10px',
            }}
          >
            <Icon d={n.icon} size={22} />
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{n.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ============================================================== masthead */

function Masthead({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  const now = useNow(1000);
  const ids = useMemo(() => [E.weather, E.person, E.headline], []);
  const e = useEntities(hass, ids);

  const w = e[E.weather];
  const temp = attr(w, 'temperature') as number | undefined;
  const home = e[E.person]?.state === 'home';
  const hh = now.getHours();
  const greeting = hh < 12 ? 'Good morning' : hh < 17 ? 'Good afternoon' : 'Good evening';

  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const [clock, meridiem] = time.split(' ');

  return (
    <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 20, justifyContent: 'space-between' }}>
      <div>
        <div style={{ ...LABEL, marginBottom: 8 }}>
          Whalen Estate · {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{
            fontSize: narrow ? 54 : 76, fontWeight: 200, letterSpacing: '-0.03em',
            lineHeight: 0.95, fontVariantNumeric: 'tabular-nums',
          }}>{clock}</span>
          <span style={{ fontSize: narrow ? 16 : 20, fontWeight: 300, color: T.dim }}>{meridiem}</span>
        </div>
        <p style={{ margin: '10px 0 0', color: T.dim, fontSize: 14.5, fontWeight: 300 }}>
          {greeting}, Bill · {e[E.headline]?.state ?? 'the house is handled'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Glass style={{ padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center', borderRadius: 18 }}>
          <span style={{ fontSize: 30, fontWeight: 200 }}>{temp != null ? Math.round(temp) : '—'}°</span>
          <div>
            <div style={{ fontSize: 12.5, color: T.text, fontWeight: 500 }}>{titleize(w?.state)}</div>
            <div style={{ fontSize: 11, color: T.dim }}>Savage, MN</div>
          </div>
        </Glass>
        <Glass style={{ padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'center', borderRadius: 18 }}>
          <span aria-hidden="true" className={home ? '' : 'est-pulse'} style={{
            width: 9, height: 9, borderRadius: 5, background: home ? T.ok : T.warn,
            boxShadow: `0 0 12px ${home ? T.ok : T.warn}`,
          }} />
          <span style={{ fontSize: 12.5, color: T.dim }}>{home ? 'Bill is home' : 'Away'}</span>
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
type Attention = {
  text: string;
  tone: 'alert' | 'warn' | 'info';
  onClear?: () => void;
};

const TONE_RANK: Record<Attention['tone'], number> = { alert: 0, warn: 1, info: 2 };

function useAttention(hass: Hass): Attention[] {
  const ids = useMemo(() => [
    E.lock, E.garage1, E.garage2, E.soil, E.water, E.washer, E.dryer, E.waste,
    E.laundryWasherFlag, E.laundryDryerFlag,
    ...E.doors.map(([, id]) => id), ...E.growOnline,
  ], []);
  const e = useEntities(hass, ids);

  const items: Attention[] = [];
  const add = (text: string, tone: Attention['tone'], onClear?: () => void) =>
    items.push({ text, tone, onClear });

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
  if (soil >= 0 && soil < 20) add(`Grow soil critical - ${Math.round(soil)}%`, 'alert');
  const water = num(e[E.water]);
  if (water >= 0 && water < 25) add(`Humidifier reservoir ${Math.round(water)}%`, 'warn');
  const offline = E.growOnline.filter((id) => e[id] && e[id].state !== 'on').length;
  if (offline > 0) add(`${offline} grow device${offline > 1 ? 's' : ''} offline`, 'alert');

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
function busyVerb(kind: 'lock' | 'cover', wasSecure: boolean) {
  if (kind === 'lock') return wasSecure ? 'Unlocking...' : 'Locking...';
  return wasSecure ? 'Opening...' : 'Closing...';
}

/** Settled or transitional wording once nothing of ours is in flight. */
function restingLabel(kind: 'lock' | 'cover', st: string | undefined, offline: boolean) {
  if (offline) return 'Offline';
  if (st === 'opening') return 'Opening...';
  if (st === 'closing') return 'Closing...';
  if (kind === 'lock') return st === 'locked' ? 'Locked' : 'Unlocked';
  return st === 'closed' ? 'Closed' : 'Open';
}

/**
 * Scripts fire and forget - there is no settled state to wait for, so the only
 * honest feedback is "the tap registered and the call went out". Flash a
 * confirmation briefly instead of leaving the button visually inert, which is
 * what made the scene buttons feel broken.
 */
function FirePill({ hass, script, label, tone, big, icon }: {
  hass: Hass; script: string; label: string;
  tone?: 'gold' | 'ghost' | 'alert'; big?: boolean; icon?: string;
}) {
  const [fired, setFired] = useState(false);

  useEffect(() => {
    if (!fired) return;
    const timer = setTimeout(() => setFired(false), 1700);
    return () => clearTimeout(timer);
  }, [fired]);

  return (
    <Pill
      tone={tone} big={big} active={fired && tone !== 'gold'} ariaLabel={label}
      onClick={() => {
        setFired(true);
        void hass.callService('script', 'turn_on', {}, { entity_id: script });
      }}
    >
      {icon && !fired ? <Icon d={icon} size={15} /> : null}
      {fired ? 'Sent ✓' : label}
    </Pill>
  );
}

const FAVORITES: ReadonlyArray<{ entity: string; name: string; kind: 'lock' | 'cover' }> = [
  { entity: E.lock, name: 'Front Door', kind: 'lock' },
  { entity: E.garage1, name: 'Main Bay', kind: 'cover' },
  { entity: E.garage2, name: 'Single Bay', kind: 'cover' },
];

/**
 * Compact tap-to-act tile for the Favorites row. One tap toggles, and the tile
 * narrates the whole round trip rather than going quiet until HA catches up.
 */
function ActionTile({ hass, entity, name, kind }: {
  hass: Hass; entity: string; name: string; kind: 'lock' | 'cover';
}) {
  const ids = useMemo(() => [entity], [entity]);
  const e = useEntities(hass, ids);
  const st = e[entity]?.state;
  const { busy, run } = useOptimistic(st);

  const offline = !st || st === 'unavailable' || st === 'unknown';
  const moving = st === 'opening' || st === 'closing';
  const secure = kind === 'lock' ? st === 'locked' : st === 'closed';
  const active = busy || moving;
  const label = busy ? busyVerb(kind, secure) : restingLabel(kind, st, offline);
  const tone = offline ? T.alert : active ? T.gold : secure ? T.ok : T.warn;

  const act = () => {
    if (offline || busy) return;
    if (kind === 'lock') {
      run(secure ? 'unlocked' : 'locked',
        () => void hass.callService('lock', secure ? 'unlock' : 'lock', {}, { entity_id: entity }));
    } else {
      run(secure ? 'open' : 'closed',
        () => void hass.callService('cover', secure ? 'open_cover' : 'close_cover', {}, { entity_id: entity }));
    }
  };

  return (
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
          <Icon d={kind === 'lock' ? (secure ? P.lock : P.unlock) : P.garage} size={22} color={tone} />
        </span>
        <span style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          <div style={{ fontSize: 11.5, color: tone, marginTop: 2 }}>{label}</div>
        </span>
      </div>
      <BusyBar show={active} />
    </button>
  );
}

/** Full-size front-door panel on the Security page. */
function FrontDoorCard({ hass }: { hass: Hass }) {
  const ids = useMemo(() => [E.lock], []);
  const e = useEntities(hass, ids);
  const st = e[E.lock]?.state;
  const { busy, run } = useOptimistic(st);

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
                run(locked ? 'unlocked' : 'locked',
                  () => void hass.callService('lock', locked ? 'unlock' : 'lock', {}, { entity_id: E.lock }));
              }}
            >
              {busy ? 'Working...' : locked ? 'Unlock' : 'Lock now'}
            </Pill>
          </div>
          <BusyBar show={busy} />
        </div>
      </div>
    </Glass>
  );
}

/** Full-size garage-bay panel on the Security page. */
function GarageCard({ hass, entity, name }: { hass: Hass; entity: string; name: string }) {
  const ids = useMemo(() => [entity], [entity]);
  const e = useEntities(hass, ids);
  const st = e[entity]?.state;
  const { busy, run } = useOptimistic(st);

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
    run(open ? 'closed' : 'open',
      () => void hass.callService('cover', open ? 'close_cover' : 'open_cover', {}, { entity_id: entity }));
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
    </Glass>
  );
}

/* ================================================================= home */

function HomePage({ hass, narrow, go }: { hass: Hass; narrow: boolean; go: (p: Page) => void }) {
  const attention = useAttention(hass);
  const cols = narrow ? 1 : 3;

  return (
    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      <Glass span={cols} style={{ padding: '16px 18px' }}>
        <PanelHead label="Favorites" />
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: `repeat(${narrow ? 1 : 3}, minmax(0,1fr))` }}>
          {FAVORITES.map((f) => (
            <ActionTile key={f.entity} hass={hass} entity={f.entity} name={f.name} kind={f.kind} />
          ))}
        </div>
      </Glass>

      <Glass span={cols} style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span style={{ ...LABEL, marginRight: 6 }}>Scenes</span>
          {SCENES.map(([label, script]) => (
            <FirePill key={script} hass={hass} script={script} label={label} />
          ))}
          <span style={{ flex: 1 }} />
          <FirePill hass={hass} script="script.whalen_lockup" label="Lockup" tone="gold" big icon={P.lock} />
        </div>
      </Glass>

      {attention.length > 0 && (
        <Glass span={cols} style={{ borderColor: 'rgba(224,179,76,0.35)', background: 'rgba(224,179,76,0.06)' }}>
          <PanelHead label="Needs attention" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {attention.map((a) => {
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
      )}

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
      <PanelHead label="Savage, Minnesota" />
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
    <button type="button" onClick={onClick} style={{
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

function ClimateDial({ hass }: { hass: Hass }) {
  const ids = useMemo(() => [E.climate], []);
  const clim = useEntities(hass, ids)[E.climate];
  const current = attr(clim, 'current_temperature') as number | undefined;
  const target = attr(clim, 'temperature') as number | undefined;
  const action = (attr(clim, 'hvac_action') as string | undefined) ?? clim?.state;
  const pct = current != null ? ((current - 55) / (90 - 55)) * 100 : 0;
  const cooling = action === 'cooling' || clim?.state === 'cool';

  const bump = (delta: number) => {
    if (target == null) return;
    void hass.callService('climate', 'set_temperature', { temperature: target + delta }, { entity_id: E.climate });
  };

  return (
    <Glass style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <PanelHead label="Climate — Family Room" />
      <Ring pct={pct} color={cooling ? T.info : T.gold}>
        <div>
          <div style={{ fontSize: 44, fontWeight: 200, lineHeight: 1 }}>
            {current != null ? Math.round(current) : '—'}°
          </div>
          <div style={{ fontSize: 11, color: T.dim, marginTop: 4, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {titleize(action)} · set {target != null ? Math.round(target) : '—'}°
          </div>
        </div>
      </Ring>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <Pill onClick={() => bump(-1)} ariaLabel="Lower target temperature"><Icon d={P.minus} size={15} /></Pill>
        <Pill onClick={() => bump(1)} ariaLabel="Raise target temperature"><Icon d={P.plus} size={15} /></Pill>
      </div>
      <div style={{ fontSize: 11, color: T.faint, marginTop: 12 }}>Nest joins after the OAuth fix</div>
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

function RoomsPage({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  // Was a flat list of every fixture in the house. Rooms are now browsed
  // room-first — pick the room, then what's in it — which is how this kind of
  // system is meant to read. See RoomsGrid.
  return <RoomsGrid hass={hass} narrow={narrow} />;
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
  const now = useNow(10000); // refresh camera stills every 10 s
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
        <PanelHead label="Eyes on the estate" right={
          <Pill tone="ghost" onClick={() => void hass.callService('alarm_control_panel', e[E.blink]?.state === 'disarmed' ? 'alarm_arm_away' : 'alarm_disarm', {}, { entity_id: E.blink })}>
            Blink {e[E.blink]?.state === 'disarmed' ? 'Arm' : 'Disarm'}
          </Pill>
        } />
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: `repeat(${narrow ? 1 : 3}, minmax(0,1fr))` }}>
          {E.cams.map(([name, id]) => {
            const pic = attr(e[id], 'entity_picture') as string | undefined;
            const url = pic ? `${pic}&est=${Math.floor(now.getTime() / 10000)}` : undefined;
            return (
              <figure key={id} className="est-lift" style={{
                margin: 0, borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.line}`,
                background: 'rgba(0,0,0,0.4)', aspectRatio: '16/9', position: 'relative',
              }}>
                {url
                  ? <img src={url} alt={`${name} camera`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: T.faint, fontSize: 12 }}>No signal</div>}
                <figcaption style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 12px 8px',
                  fontSize: 12, color: '#fff', background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                }}>{name}</figcaption>
              </figure>
            );
          })}
        </div>
      </Glass>
    </div>
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
    E.plantA.name, E.plantA.planted, E.plantB.name, E.plantB.planted, ...E.growOnline,
  ], []);
  const e = useEntities(hass, ids);
  const soil = num(e[E.soil]);
  const water = num(e[E.water]);
  const cols = narrow ? 1 : 3;
  const soilColor = soil < 20 ? T.alert : soil < 30 ? T.warn : T.ok;

  const stat = (label: string, value: string) => (
    <div>
      <div style={{ fontSize: 22, fontWeight: 250 }}>{value}</div>
      <div style={{ ...LABEL, fontSize: 9.5, marginTop: 3 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
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
          </Glass>
        );
      })}

      <Glass style={{ display: 'grid', placeItems: 'center', minHeight: 140 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: T.dim, marginBottom: 10 }}>Full mission control lives on the SMCC board</div>
          <Pill tone="gold" onClick={() => { window.location.href = '/grow-tent'; }}>Enter the Grow Room</Pill>
        </div>
      </Glass>
    </div>
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

function SkyPage({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  const now = useNow(30000);
  const ids = useMemo(() => [
    E.weather, E.moon, E.moonEmoji, E.aurora, E.homeZone,
    E.issPos, E.issPassSummary, E.issPassDir, E.kp, E.apod, E.auroraVerdict,
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

  const homeLat = (attr(e[E.homeZone], 'latitude') as number | undefined) ?? 44.72;
  const homeLon = (attr(e[E.homeZone], 'longitude') as number | undefined) ?? -93.38;

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
