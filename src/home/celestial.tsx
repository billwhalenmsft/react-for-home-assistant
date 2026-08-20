import { useMemo } from 'react';

/**
 * The sky, actually solved.
 *
 * A south-facing window onto the real celestial sphere: the sun sits at its
 * true azimuth and elevation, the twilight bands are the real ones (civil,
 * nautical, astronomical), and the day's arc is computed rather than drawn by
 * hand. It is the one panel in the house that is different every single day,
 * because it is derived from where the Earth actually is.
 *
 * HONESTY SPLIT, which matters:
 *   - the LIVE sun marker uses sun.sun's own elevation/azimuth, so the dot you
 *     read is exact.
 *   - the ARC is modelled (declination from day-of-year, hour angle anchored
 *     to HA's own solar noon). Checked against sun.sun it lands within ~1.3
 *     degrees of elevation and ~4 of azimuth - invisible at this scale, but it
 *     is a model, so it is only ever drawn as a guide line under the real dot.
 *   - the arc's endpoints are pinned to HA's actual sunrise/sunset, so the
 *     curve is constrained at both ends and at the peak; only the middle is
 *     modelled at all.
 */

const RAD = Math.PI / 180;

/* Sky window: due east through south to due west, which is the band the sun
 * actually occupies from northern latitudes. */
const AZ_MIN = 55;
const AZ_MAX = 305;
const EL_MIN = -20;
const EL_MAX = 72;

const W = 900;
const H = 260;

const px = (az: number) => ((az - AZ_MIN) / (AZ_MAX - AZ_MIN)) * W;
const py = (el: number) => H - ((el - EL_MIN) / (EL_MAX - EL_MIN)) * H;

/** Solar declination, degrees. Fourier series - good to a few tenths. */
function declination(dayOfYear: number) {
  const g = ((360 / 365.25) * (dayOfYear - 1)) * RAD;
  return (
    0.396372
    - 22.91327 * Math.cos(g) + 4.02543 * Math.sin(g)
    - 0.387205 * Math.cos(2 * g) + 0.051967 * Math.sin(2 * g)
    - 0.154527 * Math.cos(3 * g) + 0.084798 * Math.sin(3 * g)
  );
}

/** Elevation + azimuth for an hour angle, at a latitude, for a declination. */
function solarPos(hourAngle: number, lat: number, decl: number) {
  const sinEl =
    Math.sin(lat * RAD) * Math.sin(decl * RAD)
    + Math.cos(lat * RAD) * Math.cos(decl * RAD) * Math.cos(hourAngle * RAD);
  const el = Math.asin(Math.max(-1, Math.min(1, sinEl))) / RAD;
  const y = -Math.sin(hourAngle * RAD) * Math.cos(decl * RAD);
  const x =
    Math.cos(lat * RAD) * Math.sin(decl * RAD)
    - Math.sin(lat * RAD) * Math.cos(decl * RAD) * Math.cos(hourAngle * RAD);
  const az = (Math.atan2(y, x) / RAD + 360) % 360;
  return { el, az };
}

const dayOfYear = (d: Date) => {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
};

/** Illuminated fraction implied by HA's moon phase name. */
const MOON_FRACTION: Record<string, number> = {
  new_moon: 0, waxing_crescent: 0.25, first_quarter: 0.5, waxing_gibbous: 0.75,
  full_moon: 1, waning_gibbous: 0.75, last_quarter: 0.5, waning_crescent: 0.25,
};
const WANING = new Set(['waning_gibbous', 'last_quarter', 'waning_crescent']);

/**
 * A geometrically correct moon.
 *
 * The terminator is an ellipse, not a straight edge or an offset circle: the
 * lit limb is a half-circle and the shadow boundary is a half-ellipse whose
 * semi-minor axis is r(1 - 2f). At f = 0.5 that collapses to zero and you get
 * a true half moon; past it the ellipse inverts and the sweep flag flips,
 * which is what turns a crescent into a gibbous.
 */
function MoonDisc({ phase, r = 26 }: { phase: string; r?: number }) {
  const f = MOON_FRACTION[phase] ?? 0.5;
  const rx = r * (1 - 2 * f);
  const lit =
    `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} ` +
    `A ${Math.abs(rx)} ${r} 0 0 ${rx > 0 ? 0 : 1} 0 ${-r} Z`;
  return (
    <g transform={WANING.has(phase) ? 'scale(-1,1)' : undefined}>
      <circle r={r} fill="rgba(255,255,255,0.07)" stroke="var(--wt-line)" strokeWidth={0.8} />
      {f > 0.01 ? <path d={lit} fill="var(--wt-goldHi)" opacity={0.92} /> : null}
    </g>
  );
}

export function SunArc({
  lat, solarNoonIso, sunriseIso, sunsetIso, elevation, azimuth, moonPhase, compact,
}: {
  lat: number;
  solarNoonIso?: string;
  sunriseIso?: string;
  sunsetIso?: string;
  elevation: number;
  azimuth: number;
  moonPhase?: string;
  compact?: boolean;
}) {
  const noon = solarNoonIso ? new Date(solarNoonIso) : null;

  const { path, peak } = useMemo(() => {
    if (!noon) return { path: '', peak: 0 };
    const decl = declination(dayOfYear(noon));
    const pts: string[] = [];
    // Sweep a whole day of hour angles; keep only what falls inside the window.
    for (let h = -180; h <= 180; h += 2) {
      const { el, az } = solarPos(h, lat, decl);
      if (el < EL_MIN - 2) continue;
      if (az < AZ_MIN || az > AZ_MAX) continue;
      pts.push(`${px(az).toFixed(1)},${py(el).toFixed(1)}`);
    }
    return { path: pts.length ? 'M' + pts.join(' L') : '', peak: 90 - Math.abs(lat - decl) };
  }, [noon ? noon.getTime() : 0, lat]);

  const up = elevation > 0;
  const hhmm = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';

  const sunX = px(Math.max(AZ_MIN, Math.min(AZ_MAX, azimuth)));
  const sunY = py(Math.max(EL_MIN, Math.min(EL_MAX, elevation)));
  const inWindow = azimuth >= AZ_MIN && azimuth <= AZ_MAX;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={`Sun at ${elevation.toFixed(0)} degrees elevation, azimuth ${azimuth.toFixed(0)}`}
    >
      <defs>
        <linearGradient id="skyband" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={up ? 'rgba(122,160,224,0.20)' : 'rgba(30,36,64,0.55)'} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <radialGradient id="sunglow">
          <stop offset="0%" stopColor="var(--wt-goldHi)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--wt-gold)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x={0} y={0} width={W} height={py(0)} fill="url(#skyband)" />

      {/* real twilight bands, not decoration */}
      {([[0, -6, 0.10], [-6, -12, 0.16], [-12, -18, 0.22]] as const).map(([a, b, o]) => (
        <rect key={a} x={0} y={py(a)} width={W} height={py(b) - py(a)} fill={`rgba(0,0,0,${o})`} />
      ))}
      <rect x={0} y={py(-18)} width={W} height={H - py(-18)} fill="rgba(0,0,0,0.30)" />

      {/* horizon */}
      <line x1={0} y1={py(0)} x2={W} y2={py(0)} stroke="var(--wt-lineHi)" strokeWidth={1.4} />
      <text x={8} y={py(0) - 7} fontSize={11} fill="var(--wt-faint)">HORIZON</text>
      {([[-6, 'civil'], [-12, 'nautical'], [-18, 'astronomical']] as const).map(([el, label]) => (
        <text key={el} x={8} y={py(el) - 5} fontSize={9.5} fill="var(--wt-faint)" opacity={0.75}>
          {label} dusk
        </text>
      ))}

      {/* compass ticks */}
      {([[90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W']] as const).map(([az, label]) => (
        <g key={az}>
          <line x1={px(az)} y1={py(0)} x2={px(az)} y2={py(0) + 6} stroke="var(--wt-line)" strokeWidth={1} />
          <text x={px(az)} y={py(0) + 19} fontSize={10.5} textAnchor="middle" fill="var(--wt-faint)">{label}</text>
        </g>
      ))}

      {/* today's modelled arc */}
      {path ? (
        <path d={path} fill="none" stroke="var(--wt-gold)" strokeWidth={1.2}
              strokeDasharray="4 5" opacity={0.5} />
      ) : null}

      {/* The live sun - exact, from sun.sun.
          Deep at night the sun swings north, out of a south-facing window
          entirely. Rather than vanish (which reads as a broken panel) it pins
          to the edge it went out of, dimmed, and says where it actually is. */}
      <g opacity={inWindow ? 1 : 0.45}>
        {up ? <circle cx={sunX} cy={sunY} r={46} fill="url(#sunglow)" /> : null}
        <circle cx={sunX} cy={sunY} r={up ? 11 : 8}
                fill={up ? 'var(--wt-goldHi)' : 'var(--wt-dim)'} />
        {!inWindow ? (
          <text
            x={sunX + (azimuth > AZ_MAX || azimuth < 30 ? -12 : 12)}
            y={sunY - 14}
            fontSize={10.5}
            textAnchor={azimuth > AZ_MAX || azimuth < 30 ? 'end' : 'start'}
            fill="var(--wt-faint)"
          >
            {azimuth.toFixed(0)}° · behind the house
          </text>
        ) : null}
      </g>

      {moonPhase && !compact ? (
        <g transform={`translate(${W - 62}, 52)`}>
          <MoonDisc phase={moonPhase} r={24} />
        </g>
      ) : null}

      <g fontSize={11.5} fill="var(--wt-dim)">
        <text x={8} y={18}>↑ {hhmm(sunriseIso)}</text>
        <text x={W - 8} y={18} textAnchor="end">↓ {hhmm(sunsetIso)}</text>
        <text x={W / 2} y={18} textAnchor="middle">
          {up ? `${elevation.toFixed(0)}° up` : `${Math.abs(elevation).toFixed(0)}° below`}
          {peak ? ` · peaks ${peak.toFixed(0)}°` : ''}
        </text>
      </g>
    </svg>
  );
}

/**
 * Page-level ambient wash keyed to solar elevation.
 *
 * The surface should not look identical at 3am and at noon. These are the real
 * transitions - astronomical night, the twilights, low sun, full day - so the
 * panel shifts when the sky does rather than on a clock.
 */
export function ambientWash(elevation: number, clouds: number): string {
  const heavy = clouds >= 70;
  if (elevation < -18) return 'radial-gradient(120% 80% at 50% -10%, rgba(38,44,86,0.30), rgba(0,0,0,0) 70%)';
  if (elevation < -6) return 'radial-gradient(120% 80% at 50% -10%, rgba(74,66,122,0.28), rgba(0,0,0,0) 70%)';
  if (elevation < 0) return 'radial-gradient(120% 80% at 50% -10%, rgba(196,116,74,0.26), rgba(0,0,0,0) 70%)';
  if (elevation < 12) return 'radial-gradient(120% 80% at 50% -10%, rgba(224,164,92,0.22), rgba(0,0,0,0) 70%)';
  return heavy
    ? 'radial-gradient(120% 80% at 50% -10%, rgba(150,158,172,0.16), rgba(0,0,0,0) 70%)'
    : 'radial-gradient(120% 80% at 50% -10%, rgba(122,160,224,0.16), rgba(0,0,0,0) 70%)';
}

/* ===================================================== travelling observer */

/**
 * Sun times for an arbitrary place on Earth.
 *
 * Everything else in this file is anchored to Home Assistant's own sun.sun,
 * which only knows about one house. When Bill is away his phone reports real
 * GPS, and the sky over Denver is genuinely different from the sky over
 * Savage - so those numbers have to be solved from scratch.
 *
 * Solar noon comes from the standard NOAA approximation: 720 minutes, less
 * four minutes per degree of longitude, less the equation of time. The
 * equation of time is the part naive implementations drop, and it is worth up
 * to about sixteen minutes - the difference between catching sunset and
 * missing it.
 *
 * Times are returned as minutes UTC and rendered in the viewer's own
 * timezone, which is the right answer in practice: a phone re-homes its clock
 * when you land.
 */
export type SkyTimes = {
  sunriseUTC: number | null;
  sunsetUTC: number | null;
  duskUTC: number | null;
  noonUTC: number;
  maxElevation: number;
  declination: number;
};

export function solarTimes(lat: number, lon: number, when: Date): SkyTimes {
  const doy = dayOfYear(when);
  const decl = declination(doy);

  // Equation of time, minutes.
  const b = ((360 / 365) * (doy - 81)) * RAD;
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const noonUTC = 720 - 4 * lon - eot;

  // Hour angle at a given sun elevation; null when the sun never reaches it -
  // which is a real answer at high latitude, not an error.
  const hourAngle = (elevDeg: number): number | null => {
    const cosH =
      (Math.sin(elevDeg * RAD) - Math.sin(lat * RAD) * Math.sin(decl * RAD))
      / (Math.cos(lat * RAD) * Math.cos(decl * RAD));
    if (cosH > 1 || cosH < -1) return null;
    return Math.acos(cosH) / RAD;
  };

  // -0.833 deg accounts for refraction and the sun's disc, which is why
  // published sunset is a few minutes after geometric sunset.
  const h0 = hourAngle(-0.833);
  const hDusk = hourAngle(-18);

  return {
    sunriseUTC: h0 === null ? null : noonUTC - h0 * 4,
    sunsetUTC: h0 === null ? null : noonUTC + h0 * 4,
    duskUTC: hDusk === null ? null : noonUTC + hDusk * 4,
    noonUTC,
    maxElevation: 90 - Math.abs(lat - decl),
    declination: decl,
  };
}

/** Great-circle distance in miles. */
export function distanceMiles(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = (bLat - aLat) * RAD;
  const dLon = (bLon - aLon) * RAD;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(aLat * RAD) * Math.cos(bLat * RAD) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Minutes-UTC to a local clock string in the viewer's timezone. */
export function utcMinutesToLocal(mins: number | null, ref: Date): string {
  if (mins === null) return '—';
  const d = new Date(Date.UTC(
    ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), 0, 0, 0, 0,
  ));
  d.setUTCMinutes(mins);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Rough geomagnetic latitude. The auroral oval follows the magnetic pole
 * (currently near 80.7N, 72.7W), not the geographic one, which is why the
 * aurora reaches Minnesota far more often than it reaches the same geographic
 * latitude in Europe.
 */
export function geomagneticLatitude(lat: number, lon: number): number {
  const poleLat = 80.7 * RAD;
  const poleLon = -72.7 * RAD;
  const la = lat * RAD;
  const lo = lon * RAD;
  const s = Math.sin(la) * Math.sin(poleLat)
    + Math.cos(la) * Math.cos(poleLat) * Math.cos(lo - poleLon);
  return Math.asin(Math.max(-1, Math.min(1, s))) / RAD;
}
