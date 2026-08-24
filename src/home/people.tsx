import { useMemo } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass } from '../ha/types';

/**
 * The family, and how much of them Home Assistant can actually see.
 *
 * Deliberately shows the gaps rather than hiding them. Right now exactly one
 * device_tracker exists for a household of six, so five of these cards read
 * "no device linked" - which is the honest state and doubles as the setup
 * checklist. A page that quietly rendered five blank circles would look
 * broken; one that says what is missing is useful.
 *
 * NO PIN CODES HERE, on purpose. This is the page most likely to end up on a
 * wall tablet in a kitchen, and lock codes on an always-on screen in a room
 * guests walk through is precisely the wrong place for them. Code management
 * stays in HA proper.
 */

export type Person = {
  id: string;
  name: string;
  /** Companion-app battery sensor, once that person has the app installed. */
  battery?: string;
  note?: string;
};

export const FAMILY: ReadonlyArray<Person> = [
  { id: 'person.wiljr0k5', name: 'Bill', battery: 'sensor.iphone_battery_level' },
  { id: 'person.erin', name: 'Erin', battery: 'sensor.erins_iphone_17_pro_max_battery_level' },
  { id: 'person.isaiah', name: 'Isaiah', note: 'St Paul' },
  { id: 'person.rowan', name: 'Rowan' },
  { id: 'person.alex', name: 'Alex' },
  { id: 'person.silas', name: 'Silas' },
];

type Presence = { label: string; tone: string; known: boolean };

function presenceOf(state: string | undefined, trackers: number): Presence {
  if (!trackers) return { label: 'No device linked', tone: 'var(--wt-faint)', known: false };
  if (state === 'home') return { label: 'Home', tone: 'var(--wt-ok)', known: true };
  if (state === 'not_home') return { label: 'Away', tone: 'var(--wt-warn)', known: true };
  if (!state || state === 'unknown' || state === 'unavailable') {
    return { label: 'Not reporting', tone: 'var(--wt-faint)', known: false };
  }
  // Any other state is a named zone, which is the most useful thing to show.
  return { label: state.replace(/_/g, ' '), tone: 'var(--wt-info)', known: true };
}

function Avatar({ picture, name, tone }: { picture?: string; name: string; tone: string }) {
  const size = 62;
  return picture ? (
    <img
      src={picture}
      alt=""
      width={size}
      height={size}
      style={{
        width: size, height: size, borderRadius: '50%', objectFit: 'cover',
        border: `2px solid ${tone}`, display: 'block', flex: 'none',
      }}
    />
  ) : (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: '50%', flex: 'none',
        display: 'grid', placeItems: 'center',
        border: `2px solid ${tone}`, background: 'rgba(255,255,255,0.05)',
        fontSize: 24, fontWeight: 300, color: 'var(--wt-dim)',
      }}
    >
      {name.slice(0, 1)}
    </div>
  );
}

export function PeopleGrid({ hass, narrow }: { hass: Hass; narrow: boolean }) {
  const ids = useMemo(
    () => [...FAMILY.map((p) => p.id), ...FAMILY.map((p) => p.battery).filter(Boolean) as string[]],
    [],
  );
  const e = useEntities(hass, ids);

  const linked = FAMILY.filter((p) => {
    const trackers = (e[p.id]?.attributes?.device_trackers as string[] | undefined) ?? [];
    return trackers.length > 0;
  }).length;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {linked < FAMILY.length ? (
        <div style={{
          padding: '12px 16px', borderRadius: 12, fontSize: 12.5,
          border: '1px solid rgba(224,179,76,0.35)', color: 'var(--wt-warn)',
          background: 'rgba(224,179,76,0.06)',
        }}>
          <strong>{linked} of {FAMILY.length}</strong> have a device linked. Presence, arrival
          automations and per-person alerts stay dark until the Home Assistant Companion app is
          installed and signed in on each phone — iOS and Android both.
        </div>
      ) : null}

      <div style={{
        display: 'grid', gap: 14,
        gridTemplateColumns: `repeat(${narrow ? 1 : 3}, minmax(0,1fr))`,
      }}>
        {FAMILY.map((p) => {
          const ent = e[p.id];
          const trackers = (ent?.attributes?.device_trackers as string[] | undefined) ?? [];
          const pres = presenceOf(ent?.state, trackers.length);
          const picture = ent?.attributes?.entity_picture as string | undefined;
          const batt = p.battery ? e[p.battery] : undefined;
          const battNum = batt ? Number(batt.state) : NaN;

          return (
            <div
              key={p.id}
              className="est-lift"
              style={{
                display: 'flex', gap: 14, alignItems: 'center', minWidth: 0,
                padding: '16px 18px', borderRadius: 14,
                border: `1px solid ${pres.known ? 'var(--wt-lineHi)' : 'var(--wt-line)'}`,
                background: 'rgba(255,255,255,0.04)',
                opacity: pres.known ? 1 : 0.72,
              }}
            >
              <Avatar picture={picture} name={p.name} tone={pres.tone} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--wt-text)' }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: pres.tone, marginTop: 3 }}>{pres.label}</div>
                {Number.isFinite(battNum) ? (
                  <div style={{ fontSize: 11.5, color: 'var(--wt-dim)', marginTop: 4 }}>
                    {Math.round(battNum)}% battery
                  </div>
                ) : p.note ? (
                  <div style={{ fontSize: 11, color: 'var(--wt-faint)', marginTop: 4 }}>{p.note}</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: 'var(--wt-faint)' }}>
        Photos come from each person entity in Home Assistant — drop a square-ish shot in
        <code style={{ margin: '0 4px' }}>house-photos\Profiles\</code> and it gets published
        automatically. Lock codes are deliberately not shown on this page.
      </div>
    </div>
  );
}
