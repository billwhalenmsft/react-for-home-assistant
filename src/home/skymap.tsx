import type { CSSProperties } from 'react';

/**
 * Live ISS ground position on an equirectangular world grid.
 *
 * There are no coastlines here, and that is deliberate: shipping a world
 * outline means shipping tens of kilobytes of path data into a card that is
 * already 300 KB, for decoration. What actually carries the picture is the
 * day/night terminator - it moves, it explains why a pass is or is not
 * visible, and it costs nothing but trigonometry.
 *
 * The terminator is real, not an approximation. wheretheiss.at returns the
 * subsolar point (solar_lat / solar_lon) in the same payload as the station's
 * position, so the great circle 90 degrees away from it can be solved exactly:
 *
 *   cos(zenith) = sin(lat)sin(sun_lat) + cos(lat)cos(sun_lat)cos(lon - sun_lon)
 *
 * Collapse the right-hand side to R*cos(lat - d) with d = atan2(sin(sun_lat),
 * cos(sun_lat)cos(lon - sun_lon)), and a column of longitude is dark wherever
 * |lat - d| > 90. That is one atan2 per column and no iteration.
 */

const W = 720;
const H = 360;
const RAD = Math.PI / 180;

const x = (lon: number) => ((lon + 180) / 360) * W;
const y = (lat: number) => ((90 - lat) / 180) * H;

export type IssState = {
  latitude: number;
  longitude: number;
  altitude?: number;
  velocity?: number;
  visibility?: string;
  solar_lat?: number;
  solar_lon?: number;
  footprint?: number;
};

/** Dark latitude band for one column of longitude, or null if fully lit. */
function nightBand(lon: number, sunLat: number, sunLon: number): [number, number] | null {
  const d =
    Math.atan2(
      Math.sin(sunLat * RAD),
      Math.cos(sunLat * RAD) * Math.cos((lon - sunLon) * RAD),
    ) / RAD;

  // Dark below d-90 (a southern cap) or above d+90 (a northern cap). At most
  // one of the two can intersect the -90..90 range for any given column.
  const south = d - 90;
  const north = d + 90;
  if (south > -90) return [-90, Math.min(90, south)];
  if (north < 90) return [Math.max(-90, north), 90];
  return null;
}

export function IssMap({ iss, homeLat, homeLon }: {
  iss: IssState | null; homeLat: number; homeLon: number;
}) {
  const sunLat = iss?.solar_lat;
  const sunLon = iss?.solar_lon;
  const haveSun = typeof sunLat === 'number' && typeof sunLon === 'number';

  // 3-degree columns: fine enough that the terminator reads as a smooth curve,
  // coarse enough to stay at 120 rects.
  const step = 3;
  const night: Array<{ x: number; y: number; h: number }> = [];
  if (haveSun) {
    for (let lon = -180; lon < 180; lon += step) {
      const band = nightBand(lon + step / 2, sunLat as number, sunLon as number);
      if (!band) continue;
      const top = y(band[1]);
      const bottom = y(band[0]);
      night.push({ x: x(lon), y: Math.min(top, bottom), h: Math.abs(bottom - top) });
    }
  }

  // Radio/visual horizon: footprint is a diameter in km; 111.32 km per degree.
  const footRadius = iss?.footprint ? (iss.footprint / 2) / 111.32 : 0;
  const sunlit = iss?.visibility === 'daylight';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 10 }}
      role="img"
      aria-label={
        iss
          ? `ISS at ${iss.latitude.toFixed(1)} degrees latitude, ${iss.longitude.toFixed(1)} degrees longitude`
          : 'ISS position unavailable'
      }
    >
      <rect x={0} y={0} width={W} height={H} fill="var(--wt-glassHi)" />

      {night.map((n, i) => (
        <rect key={i} x={n.x} y={n.y} width={W / (360 / step) + 0.6} height={n.h} fill="rgba(0,0,0,0.42)" />
      ))}

      {/* graticule */}
      <g stroke="var(--wt-line)" strokeWidth={0.6} opacity={0.55}>
        {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => (
          <line key={lon} x1={x(lon)} y1={0} x2={x(lon)} y2={H} />
        ))}
        {[-60, -30, 0, 30, 60].map((lat) => (
          <line key={lat} x1={0} y1={y(lat)} x2={W} y2={y(lat)} />
        ))}
      </g>
      <line x1={0} y1={y(0)} x2={W} y2={y(0)} stroke="var(--wt-lineHi)" strokeWidth={1.1} opacity={0.8} />

      {/* home */}
      <g>
        <circle cx={x(homeLon)} cy={y(homeLat)} r={4.5} fill="var(--wt-gold)" />
        <circle cx={x(homeLon)} cy={y(homeLat)} r={9} fill="none" stroke="var(--wt-gold)" strokeWidth={1} opacity={0.5} />
        <text x={x(homeLon) + 13} y={y(homeLat) + 4} fontSize={13} fill="var(--wt-gold)">Home</text>
      </g>

      {iss ? (
        <g>
          {footRadius > 0 ? (
            <ellipse
              cx={x(iss.longitude)}
              cy={y(iss.latitude)}
              rx={(footRadius / 360) * W}
              ry={(footRadius / 180) * H}
              fill={sunlit ? 'rgba(224,179,76,0.10)' : 'rgba(122,196,143,0.12)'}
              stroke={sunlit ? 'var(--wt-warn)' : 'var(--wt-ok)'}
              strokeWidth={0.9}
              opacity={0.75}
            />
          ) : null}
          <circle
            cx={x(iss.longitude)}
            cy={y(iss.latitude)}
            r={5.5}
            fill={sunlit ? 'var(--wt-warn)' : 'var(--wt-ok)'}
          />
          <text
            x={x(iss.longitude) + 12}
            y={y(iss.latitude) - 9}
            fontSize={13}
            fontWeight={600}
            fill={sunlit ? 'var(--wt-warn)' : 'var(--wt-ok)'}
          >
            ISS
          </text>
        </g>
      ) : (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={16} fill="var(--wt-dim)">
          waiting for ISS telemetry
        </text>
      )}
    </svg>
  );
}

export const MAP_NOTE: CSSProperties = { fontSize: 11, color: 'var(--wt-faint)', marginTop: 8 };
