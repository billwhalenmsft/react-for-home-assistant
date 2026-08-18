import { useEffect, useMemo, useState } from 'react';
import { useEntities } from '../ha/useEntities';
import { HaCard } from '../ha/HaCard';
import type { Hass } from '../ha/types';
import { LightGrid } from './LightGrid';
import { C, Chip, Icon, ICONS, Panel } from './ui';
import {
  MODE_LIST, MODES, gridStyle, guessMode, loadMode, saveMode, tileGridStyle,
  type Mode, type ModeSpec,
} from './layout';

/**
 * A React rendering of the HUB view.
 *
 * The point of the page is the contrast with Lovelace, so it deliberately does
 * three things the sections view can't:
 *   1. fluid columns that fill the display instead of a fixed 500 px grid
 *   2. one model rendered as three device modes, switchable live
 *   3. custom React components and stock HA cards in the same layout
 */

const STATUS = [
  'sensor.house_headline',
  'alarm_control_panel.blink_indoor',
  'light.main_floor_all_lights',
  'media_player.samsung_the_frame_65_qn65ls03aafxza',
  'sensor.iphone_battery_level',
];

const CAMERAS = [
  { id: 'camera.front_door', name: 'Front Door' },
  { id: 'camera.front_porch', name: 'Front Porch' },
  { id: 'camera.wyoming_ave', name: 'Wyoming Ave' },
];

const SKY = ['sensor.moon_phase', 'sensor.aurora_visibility_visibility'];

function greeting(h: number) {
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** HA hands back raw states like "waxing_crescent"; nobody wants to read that. */
function titleCase(s?: string): string | undefined {
  if (!s) return undefined;
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function HomeAutomation({ hass }: { hass: Hass }) {
  const [mode, setMode] = useState<Mode>(() => loadMode(guessMode(window.innerWidth)));
  const spec = MODES[mode];

  useEffect(() => saveMode(mode), [mode]);

  return (
    <div
      style={{
        padding: spec.forceSingleColumn ? 12 : 20,
        color: C.text,
        maxWidth: spec.maxWidth === Infinity ? undefined : spec.maxWidth,
        margin: '0 auto',
        // a phone/tablet preview on a big monitor should read as a device,
        // not as a narrow column floating in the dark
        outline: spec.maxWidth === Infinity ? undefined : `1px solid ${C.line}`,
        borderRadius: spec.maxWidth === Infinity ? undefined : 24,
        minHeight: spec.maxWidth === Infinity ? undefined : '80vh',
      }}
    >
      <Masthead hass={hass} spec={spec} mode={mode} setMode={setMode} />

      <div style={{ ...gridStyle(spec), marginTop: spec.gap }}>
        <Panel title="Light Command" spec={spec} span={2}
               hint="every room · one switch — Hue and Lutron together">
          <LightGrid hass={hass} spec={spec} />
        </Panel>

        <Panel title="The House" spec={spec} span={2} hint="main floor">
          <HaCard hass={hass} config={{ type: 'picture', image: '/local/yard/fp_main.png' }} />
        </Panel>

        <Panel title="Eyes On" spec={spec} span={2} hint={`${CAMERAS.length} cameras`}>
          <CameraWall hass={hass} spec={spec} />
        </Panel>

        <Panel title="Cinema Deck" spec={spec} hint="stock media control">
          <HaCard
            hass={hass}
            config={{ type: 'media-control', entity: 'media_player.samsung_the_frame_65_qn65ls03aafxza' }}
          />
        </Panel>

        <Panel title="Autopilot" spec={spec} hint="adaptive lighting">
          <div style={{ display: 'grid', gap: 8 }}>
            <HaCard hass={hass} config={{ type: 'tile', entity: 'switch.lutron_dimmers_adaptive_lighting_lutron_dimmers', name: 'Dimmer Autopilot' }} />
            <HaCard hass={hass} config={{ type: 'tile', entity: 'switch.kitchen_hue_adaptive_lighting_kitchen_hue', name: 'Hue Autopilot' }} />
          </div>
        </Panel>

        <Panel title="Weather" spec={spec} span={2} hint="stock forecast card">
          <HaCard hass={hass} config={{ type: 'weather-forecast', entity: 'weather.forecast_home', forecast_type: 'daily' }} />
        </Panel>

        <Panel title="Sky Watch" spec={spec}>
          <SkyWatch hass={hass} spec={spec} />
        </Panel>
      </div>

      <footer style={{ marginTop: 28, paddingTop: 14, borderTop: `1px solid ${C.line}`, color: C.dim, fontSize: 11.5, lineHeight: 1.7 }}>
        React for Home Assistant · fluid columns, no 500 px grid · {MODE_LIST.length} device modes ·
        stock cards and React components share one WebSocket subscription.
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Masthead({
  hass, spec, mode, setMode,
}: { hass: Hass; spec: ModeSpec; mode: Mode; setMode: (m: Mode) => void }) {
  const ids = useMemo(() => STATUS, []);
  const e = useEntities(hass, ids);
  const hour = new Date().getHours();

  const lightsOn = e['light.main_floor_all_lights']?.state === 'on';
  const frame = e['media_player.samsung_the_frame_65_qn65ls03aafxza']?.state;
  const battery = e['sensor.iphone_battery_level']?.state;
  const blink = e['alarm_control_panel.blink_indoor']?.state;

  return (
    <header style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ minWidth: 0, flex: '1 1 260px' }}>
        <h1 style={{ margin: 0, fontSize: Math.round(22 * spec.fontScale), fontWeight: 720, letterSpacing: -0.3 }}>
          {greeting(hour)}, Bill
        </h1>
        <p style={{ margin: '4px 0 0', color: C.dim, fontSize: Math.round(13 * spec.fontScale) }}>
          {e['sensor.house_headline']?.state ?? 'Home Automation — React'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
          <Chip spec={spec} tone={blink === 'disarmed' ? 'idle' : 'active'} label={`Blink ${blink ?? '—'}`} />
          <Chip spec={spec} tone={lightsOn ? 'active' : 'idle'} label={lightsOn ? 'Lights on' : 'Lights off'} />
          <Chip spec={spec} tone={frame === 'playing' ? 'active' : 'idle'} label={`Frame ${frame ?? '—'}`} />
          {battery ? (
            <Chip spec={spec} tone={Number(battery) < 25 ? 'warn' : 'idle'} label={`📱 ${battery}%`} />
          ) : null}
        </div>
      </div>

      <ModeSwitch mode={mode} setMode={setMode} spec={spec} />
    </header>
  );
}

function ModeSwitch({ mode, setMode, spec }: { mode: Mode; setMode: (m: Mode) => void; spec: ModeSpec }) {
  return (
    <div
      role="group"
      aria-label="Device mode"
      style={{
        display: 'flex', gap: 4, padding: 4, borderRadius: 12,
        border: `1px solid ${C.line}`, background: 'rgba(255,255,255,0.04)',
      }}
    >
      {MODE_LIST.map((m) => {
        const active = m.id === mode;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            aria-pressed={active}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
              borderRadius: 9, border: 'none', cursor: 'pointer', font: 'inherit',
              fontSize: Math.round(12 * spec.fontScale), fontWeight: 650,
              background: active ? C.primary : 'transparent',
              color: active ? '#0c1418' : C.dim,
            }}
          >
            <Icon path={m.icon} size={15} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function CameraWall({ hass, spec }: { hass: Hass; spec: ModeSpec }) {
  const ids = useMemo(() => CAMERAS.map((c) => c.id), []);
  const ents = useEntities(hass, ids);

  return (
    <div style={tileGridStyle(spec, 240)}>
      {CAMERAS.map((cam) => {
        const pic = ents[cam.id]?.attributes.entity_picture as string | undefined;
        return (
          <figure key={cam.id} style={{ margin: 0, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.line}`, background: 'rgba(0,0,0,0.35)' }}>
            {pic ? (
              <img
                src={pic}
                alt={cam.name}
                loading="lazy"
                style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ aspectRatio: '16 / 9', display: 'grid', placeItems: 'center', color: C.dim, fontSize: 12 }}>
                <span><Icon path={ICONS.camera} size={22} /></span>
              </div>
            )}
            <figcaption style={{ padding: '7px 10px', fontSize: Math.round(12 * spec.fontScale), color: C.dim, display: 'flex', gap: 6, alignItems: 'center' }}>
              <Icon path={ICONS.camera} size={13} />
              {cam.name}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function SkyWatch({ hass, spec }: { hass: Hass; spec: ModeSpec }) {
  const ids = useMemo(() => SKY, []);
  const e = useEntities(hass, ids);
  const aurora = Number(e['sensor.aurora_visibility_visibility']?.state ?? 0);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon path={ICONS.sparkle} size={20} color={C.accent} />
        <div>
          <div style={{ fontSize: Math.round(13.5 * spec.fontScale), fontWeight: 650 }}>
            {titleCase(e['sensor.moon_phase']?.state) ?? '—'}
          </div>
          <div style={{ fontSize: Math.round(11.5 * spec.fontScale), color: C.dim }}>
            Aurora index {Number.isFinite(aurora) ? `${aurora}%` : '—'}
          </div>
        </div>
      </div>
      <HaCard hass={hass} config={{ type: 'tile', entity: 'weather.home', name: 'Open-Meteo' }} />
    </div>
  );
}
