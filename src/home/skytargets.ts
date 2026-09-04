/**
 * What is worth looking at, and where it actually is.
 *
 * Generated from the same table that seeded `todo.night_sky`, so a target's
 * name here always matches the to-do item it belongs to - the list holds the
 * checked/unchecked state, this holds the astronomy.
 *
 * `kind` decides how honest the panel can be about tonight:
 *   fixed  - real RA/Dec, so true altitude is computed for right now
 *   planet - moves along the ecliptic; we ship no ephemeris, so notes only
 *   event  - a date window (meteor showers, eclipse-shaped things)
 *   live   - already answered by a sensor in the house (ISS, aurora, launches)
 */
export type SkyKind = 'fixed' | 'planet' | 'event' | 'live';

export interface SkyTarget {
  name: string;
  kind: SkyKind;
  /** Right ascension in HOURS (J2000). Present for `fixed` only. */
  ra?: number;
  /** Declination in DEGREES (J2000). Present for `fixed` only. */
  dec?: number;
  /** Months (1-12) this is worth attempting, when that is the limiting factor. */
  months?: number[];
  note: string;
}

export const SKY_TARGETS: SkyTarget[] = [
  { name: "Orion Nebula (M42)", kind: "fixed", ra: 5.5880, dec: -5.390, note: "Naked-eye smudge in Orion's sword; stunning in any scope." },
  { name: "Andromeda Galaxy (M31)", kind: "fixed", ra: 0.7120, dec: 41.270, note: "The farthest thing you can see unaided. 2.5 million light years." },
  { name: "The Pleiades (M45)", kind: "fixed", ra: 3.7900, dec: 24.120, note: "Count the stars with the naked eye, then use binoculars." },
  { name: "Double Cluster in Perseus", kind: "fixed", ra: 2.3300, dec: 57.140, note: "Two open clusters in one binocular field." },
  { name: "Ring Nebula (M57)", kind: "fixed", ra: 18.8850, dec: 33.030, note: "A tiny smoke ring between two stars in Lyra." },
  { name: "Hercules Globular Cluster (M13)", kind: "fixed", ra: 16.6950, dec: 36.460, note: "Half a million stars in one ball." },
  { name: "Whirlpool Galaxy (M51)", kind: "fixed", ra: 13.4980, dec: 47.200, note: "Face-on spiral with a companion. Needs a dark night." },
  { name: "Lagoon Nebula (M8)", kind: "fixed", ra: 18.0600, dec: -24.380, note: "Low in the south in summer. Bright and big." },
  { name: "Dumbbell Nebula (M27)", kind: "fixed", ra: 19.9940, dec: 22.720, note: "The easiest planetary nebula to find." },
  { name: "Beehive Cluster (M44)", kind: "fixed", ra: 8.6700, dec: 19.670, note: "A hazy patch in Cancer that binoculars shatter into stars." },
  { name: "Albireo, the gold and blue double", kind: "fixed", ra: 19.5120, dec: 27.960, note: "The prettiest colour contrast in the sky." },
  { name: "Mizar and Alcor", kind: "fixed", ra: 13.3990, dec: 54.930, note: "The naked-eye test in the Big Dipper's handle." },
  { name: "Sirius, the brightest star", kind: "fixed", ra: 6.7520, dec: -16.720, note: "Twinkles hard and flashes colour when low." },
  { name: "Betelgeuse", kind: "fixed", ra: 5.9190, dec: 7.410, note: "A red supergiant that will go supernova. Not tonight." },
  { name: "Vega", kind: "fixed", ra: 18.6150, dec: 38.780, note: "Nearly overhead on summer evenings." },
  { name: "Arcturus", kind: "fixed", ra: 14.2610, dec: 19.180, note: "Follow the arc of the Dipper's handle to it." },
  { name: "Antares", kind: "fixed", ra: 16.4900, dec: -26.430, note: "The red heart of Scorpius, low in the south." },
  { name: "Polaris, and true north", kind: "fixed", ra: 2.5300, dec: 89.260, note: "Its altitude equals your latitude. Yours should read 45 degrees." },
  { name: "Great Cluster in Pegasus (M15)", kind: "fixed", ra: 21.5000, dec: 12.170, note: "A tight globular, easy in autumn." },
  { name: "Wild Duck Cluster (M11)", kind: "fixed", ra: 18.8510, dec: -6.270, note: "A dense open cluster shaped like a flying V." },
  { name: "Bode's Galaxy (M81)", kind: "fixed", ra: 9.9260, dec: 69.070, note: "Circumpolar from here, so it never fully sets." },
  { name: "Triangulum Galaxy (M33)", kind: "fixed", ra: 1.5640, dec: 30.660, note: "Big but faint. The real dark-sky test." },
  { name: "Owl Cluster (NGC 457)", kind: "fixed", ra: 1.3200, dec: 58.290, note: "Looks like a little owl, or E.T., with two bright eyes." },
  { name: "Coathanger Cluster", kind: "fixed", ra: 19.4330, dec: 20.190, note: "Exactly what it sounds like, in binoculars." },
  { name: "Orion's Belt", kind: "fixed", ra: 5.6000, dec: -1.200, note: "Three stars in a row. The anchor of the winter sky." },
  { name: "The Big Dipper", kind: "fixed", ra: 12.5000, dec: 55.000, note: "Never sets from Minnesota. Your all-year signpost." },
  { name: "Cassiopeia's W", kind: "fixed", ra: 0.9450, dec: 60.720, note: "Opposite the Dipper across Polaris." },
  { name: "The Northern Cross in Cygnus", kind: "fixed", ra: 20.3700, dec: 40.260, note: "Flies down the Milky Way on summer nights." },
  { name: "The Summer Triangle", kind: "fixed", ra: 19.5000, dec: 35.000, note: "Vega, Deneb and Altair. Three stars, three constellations." },
  { name: "The Milky Way core in Sagittarius", kind: "fixed", ra: 17.7600, dec: -28.940, note: "Low south in summer. Needs a dark site to really show." },
  { name: "Jupiter and its four moons", kind: "planet", note: "The moons visibly move night to night. Binoculars are enough." },
  { name: "Saturn's rings", kind: "planet", note: "The moment that makes people buy a telescope." },
  { name: "Venus as a crescent", kind: "planet", note: "It goes through phases like the Moon." },
  { name: "Mars at opposition", kind: "planet", note: "Only worth it near opposition, roughly every 26 months." },
  { name: "Mercury at greatest elongation", kind: "planet", note: "Hardest naked-eye planet. Twilight only, near the horizon." },
  { name: "The Perseids", kind: "event", months: [8], note: "Peaks August 11-13. The reliable one, and it is warm out." },
  { name: "The Geminids", kind: "event", months: [12], note: "Peaks December 13-14. Best shower of the year if you can stand the cold." },
  { name: "A total lunar eclipse", kind: "event", note: "The Moon turns red. Safe to look at, no filter needed." },
  { name: "Earthshine on a crescent Moon", kind: "event", note: "The dark part glows, lit by Earth. Best just after new Moon." },
  { name: "Craters along the terminator", kind: "event", note: "First quarter, not full. Shadows are what make craters visible." },
  { name: "Catch an ISS pass overhead", kind: "live", note: "The Sky page already predicts these. Look for a bright dot that does not blink." },
  { name: "See the aurora from the backyard", kind: "live", note: "Aurora Watch is armed and will push when Kp climbs." },
  { name: "Spot a Starlink train", kind: "live", note: "A line of dots, days after a launch. The Sky page tracks launches." },
  { name: "The Milky Way from a truly dark sky", kind: "event", months: [6, 7, 8, 9], note: "Not from the backyard. This one is a trip north." },
];

/* ------------------------------------------------------------------ where */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** Julian date. */
function julian(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

/**
 * Greenwich mean sidereal time, in hours.
 *
 * The low-precision series is plenty here: we are deciding whether something
 * is comfortably up, not pointing a mount at it.
 */
function gmst(d: Date): number {
  const t = julian(d) - 2451545.0;
  return ((18.697374558 + 24.06570982441908 * t) % 24 + 24) % 24;
}

/**
 * Altitude of a fixed target above the horizon right now, in degrees.
 * Negative means it has not risen, or has already set.
 */
export function altitudeOf(ra: number, dec: number, lat: number, lon: number, at: Date): number {
  const lst = (gmst(at) + lon / 15 + 24) % 24;          // local sidereal time, hours
  const hourAngle = (lst - ra) * 15 * D2R;               // radians
  const decR = dec * D2R;
  const latR = lat * D2R;
  const sinAlt =
    Math.sin(decR) * Math.sin(latR) +
    Math.cos(decR) * Math.cos(latR) * Math.cos(hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * R2D;
}

export interface SkyNow {
  dark: boolean;
  cloudPct?: number;
  cloudMax?: number;
  moonPhase?: string;
  lat: number;
  lon: number;
  at: Date;
  /** Free-text answers already computed by the house, for `live` targets. */
  issPass?: string;
  aurora?: string;
  launch?: string;
}

export interface SkyVerdict {
  label: string;
  /** 'go' = worth walking outside for, 'soon' = conditionally, 'no' = not tonight. */
  tone: 'go' | 'soon' | 'no';
}

/** A full Moon does not stop you seeing Jupiter, but it ruins a faint galaxy. */
function moonWashes(name: string, phase?: string): boolean {
  if (!phase) return false;
  const bright = phase === 'full_moon' || phase === 'waxing_gibbous' || phase === 'waning_gibbous';
  const faint = /Galaxy|Nebula|Milky Way|Triangulum/.test(name);
  return bright && faint;
}

export function verdictFor(t: SkyTarget, now: SkyNow): SkyVerdict {
  const clouded =
    now.cloudPct !== undefined && now.cloudMax !== undefined && now.cloudPct > now.cloudMax;

  if (t.kind === 'live') {
    if (/ISS/.test(t.name)) return { label: now.issPass ?? 'Next pass on the Sky page', tone: 'soon' };
    if (/aurora/i.test(t.name)) return { label: now.aurora ?? 'Aurora Watch is armed', tone: 'soon' };
    return { label: now.launch ? `After: ${now.launch}` : 'Watch for a recent launch', tone: 'soon' };
  }

  if (t.kind === 'event') {
    const m = now.at.getMonth() + 1;
    if (t.months && !t.months.includes(m)) return { label: 'Out of season', tone: 'no' };
    if (t.months) return { label: 'In season now', tone: 'go' };
    return { label: 'Needs the right date', tone: 'soon' };
  }

  if (t.kind === 'planet') return { label: 'Depends where it is tonight', tone: 'soon' };

  // fixed
  if (t.ra === undefined || t.dec === undefined) return { label: '', tone: 'soon' };
  const alt = altitudeOf(t.ra, t.dec, now.lat, now.lon, now.at);
  if (alt < 0) return { label: 'Below the horizon', tone: 'no' };
  if (!now.dark) return { label: `${Math.round(alt)}\u00b0 up \u00b7 wait for dark`, tone: 'soon' };
  if (clouded) return { label: `${Math.round(alt)}\u00b0 up \u00b7 clouded out`, tone: 'no' };
  if (moonWashes(t.name, now.moonPhase)) return { label: `${Math.round(alt)}\u00b0 up \u00b7 moon too bright`, tone: 'soon' };
  if (alt < 20) return { label: `Low \u00b7 ${Math.round(alt)}\u00b0 above the horizon`, tone: 'soon' };
  return { label: `Up now \u00b7 ${Math.round(alt)}\u00b0`, tone: 'go' };
}
