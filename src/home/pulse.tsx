import { useEffect, useMemo, useState } from 'react';
import type { Hass } from '../ha/types';

/**
 * House Pulse — a real 24 h recorder-history chart, hand-rolled SVG.
 * Smooth bezier areas with gradient fills; endpoint dots carry live values.
 */

export interface Series { entity: string; label: string; color: string }

const SERIES: Series[] = [
  { entity: 'sensor.blink_kitchen_dining_temperature', label: 'Kitchen', color: '#d3b06e' },
  { entity: 'sensor.blink_living_room_temperature', label: 'LivingRoom', color: '#7fd1c8' },
  { entity: 'sensor.ecowitt_outdoor_temp_6b', label: 'Outside', color: '#9b8cf5' },
];

type Point = { t: number; v: number };

function smoothPath(pts: Point[], sx: (t: number) => number, sy: (v: number) => number): string {
  if (pts.length === 0) return '';
  let d = `M ${sx(pts[0].t).toFixed(1)} ${sy(pts[0].v).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const mx = (sx(p0.t) + sx(p1.t)) / 2;
    d += ` C ${mx.toFixed(1)} ${sy(p0.v).toFixed(1)}, ${mx.toFixed(1)} ${sy(p1.v).toFixed(1)}, ${sx(p1.t).toFixed(1)} ${sy(p1.v).toFixed(1)}`;
  }
  return d;
}

export function HousePulse({ hass }: { hass: Hass }) {
  return <PulseChart hass={hass} series={SERIES} />;
}

export function PulseChart({ hass, series }: { hass: Hass; series: Series[] }) {
  const [data, setData] = useState<Record<string, Point[]> | null>(null);
  const ids = useMemo(() => series.map((s) => s.entity), []);

  useEffect(() => {
    let alive = true;
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 3600 * 1000);
    hass.connection
      .sendMessagePromise<Record<string, Array<Record<string, unknown>>>>({
        type: 'history/history_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: ids,
        minimal_response: true,
        no_attributes: true,
      })
      .then((res) => {
        if (!alive || !res) return;
        const out: Record<string, Point[]> = {};
        for (const id of ids) {
          const rows = res[id] ?? [];
          const pts: Point[] = [];
          for (const row of rows) {
            const v = Number((row.s as string) ?? (row.state as string));
            const rawT = (row.lu as number) ?? (row.last_updated as string);
            const t = typeof rawT === 'number' ? rawT * 1000 : Date.parse(String(rawT ?? ''));
            if (Number.isFinite(v) && Number.isFinite(t)) pts.push({ t, v });
          }
          const step = Math.max(1, Math.floor(pts.length / 120));
          out[id] = pts.filter((_, i) => i % step === 0);
        }
        setData(out);
      })
      .catch(() => { if (alive) setData({}); });
    return () => { alive = false; };
  }, [hass.connection, ids]);

  const W = 900, H = 260, PAD = 34;
  const all = data ? Object.values(data).flat() : [];
  const hasData = all.length > 4;

  let content = null;
  if (hasData && data) {
    const t0 = Math.min(...all.map((p) => p.t));
    const t1 = Math.max(...all.map((p) => p.t));
    const v0 = Math.min(...all.map((p) => p.v)) - 2;
    const v1 = Math.max(...all.map((p) => p.v)) + 2;
    const sx = (t: number) => PAD + ((t - t0) / Math.max(1, t1 - t0)) * (W - PAD * 2);
    const sy = (v: number) => H - 26 - ((v - v0) / Math.max(0.1, v1 - v0)) * (H - 56);

    content = (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="24 hour temperatures">
        <defs>
          {series.map((s) => (
            <linearGradient key={s.entity} id={`pg-${s.label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={26 + f * (H - 56)} y2={26 + f * (H - 56)}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        {series.map((s) => {
          const pts = data[s.entity] ?? [];
          if (pts.length < 2) return null;
          const line = smoothPath(pts, sx, sy);
          const last = pts[pts.length - 1];
          const area = `${line} L ${sx(last.t).toFixed(1)} ${H - 26} L ${sx(pts[0].t).toFixed(1)} ${H - 26} Z`;
          return (
            <g key={s.entity}>
              <path d={area} fill={`url(#pg-${s.label})`} />
              <path d={line} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={sx(last.t)} cy={sy(last.v)} r="4.5" fill={s.color} />
              <text x={Math.min(sx(last.t) + 10, W - 4)} y={sy(last.v) + 4} fontSize="13" fontWeight="600"
                fill={s.color} textAnchor={sx(last.t) > W - 70 ? 'end' : 'start'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(last.v)}
              </text>
            </g>
          );
        })}
        <text x={PAD} y={H - 6} fontSize="10.5" fill="rgba(240,237,230,0.4)" letterSpacing="2">24 HOURS AGO</text>
        <text x={W - PAD} y={H - 6} fontSize="10.5" fill="rgba(240,237,230,0.4)" letterSpacing="2" textAnchor="end">NOW</text>
      </svg>
    );
  } else {
    content = (
      <div style={{ height: 180, display: 'grid', placeItems: 'center', color: 'rgba(240,237,230,0.35)', fontSize: 13 }}>
        {data === null ? 'Reading the recorder' : 'History will appear as the recorder fills'}
      </div>
    );
  }

  return (
    <div>
      {content}
      <div style={{ display: 'flex', gap: 18, marginTop: 6, flexWrap: 'wrap' }}>
        {series.map((s) => (
          <span key={s.entity} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'rgba(240,237,230,0.65)' }}>
            <span style={{ width: 16, height: 3, borderRadius: 2, background: s.color }} />
            {s.label === 'LivingRoom' ? 'Living Room' : s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ forecast -- */

const COND_EMOJI: Record<string, string> = {
  'clear-night': '\u{1F319}', sunny: '☀️', partlycloudy: '⛅', cloudy: '☁️', fog: '\u{1F32B}️',
  rainy: '\u{1F327}️', pouring: '\u{1F327}️', lightning: '⛈️', 'lightning-rainy': '⛈️',
  snowy: '\u{1F328}️', 'snowy-rainy': '\u{1F328}️', hail: '\u{1F328}️', windy: '\u{1F32C}️', 'windy-variant': '\u{1F32C}️',
};

interface ForecastDay { datetime: string; condition?: string; temperature?: number; templow?: number }

export function ForecastStrip({ hass }: { hass: Hass }) {
  const [days, setDays] = useState<ForecastDay[]>([]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;
    hass.connection
      .subscribeMessage<{ forecast: ForecastDay[] }>(
        (msg) => { if (alive && msg?.forecast) setDays(msg.forecast.slice(0, 5)); },
        { type: 'weather/subscribe_forecast', entity_id: 'weather.forecast_home', forecast_type: 'daily' }
      )
      .then((u) => { unsub = u; })
      .catch(() => {});
    return () => { alive = false; unsub?.(); };
  }, [hass.connection]);

  if (days.length === 0) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 16 }}>
      {days.map((d) => {
        const day = new Date(d.datetime).toLocaleDateString('en-US', { weekday: 'short' });
        return (
          <div key={d.datetime} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,237,230,0.5)' }}>{day}</div>
            <div style={{ fontSize: 22, margin: '6px 0 4px' }} aria-hidden="true">{COND_EMOJI[d.condition ?? ''] ?? '·'}</div>
            <div style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
              {d.temperature != null ? Math.round(d.temperature) : '—'}°
              <span style={{ color: 'rgba(240,237,230,0.4)' }}> {d.templow != null ? Math.round(d.templow) : ''}°</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
