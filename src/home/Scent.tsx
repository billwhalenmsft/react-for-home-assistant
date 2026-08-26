import { useMemo, type CSSProperties } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass, HassEntity } from '../ha/types';
import { HOUSE } from '../house';
import type { ScentDiffuser } from '../house';

/**
 * A diffuser, shown in the room it actually scents.
 *
 * Scent used to live in one panel listing all six devices. That reads as an
 * inventory of hardware rather than as part of a room — you had to know which
 * box was in which room to make sense of it. A diffuser is a property of a
 * room in exactly the way a lamp is, so it belongs on the room's card.
 *
 * `size="tile"` is the strip on a room card: active fragrance and both bottle
 * levels, which is what "is it running and is it about to run out" needs.
 * `size="card"` adds the intensity control, for when you have opened the room
 * and are actually adjusting something.
 */

const num = (s: HassEntity | undefined, fallback: number) => {
  const v = Number(s?.state);
  return Number.isFinite(v) ? v : fallback;
};

const attr = (s: HassEntity | undefined, k: string) =>
  (s?.attributes as Record<string, unknown> | undefined)?.[k];

/** Resolve room-config names to the diffusers they refer to. */
export function diffusersFor(names: string[] | undefined): ScentDiffuser[] {
  if (!names?.length || !HOUSE.scent) return [];
  return names
    .map((n) => HOUSE.scent!.diffusers.find((d) => d.name === n))
    .filter((d): d is ScentDiffuser => !!d);
}

/** Every entity a set of diffusers needs, for one batched subscription. */
export function diffuserEntityIds(list: ScentDiffuser[]) {
  const out: string[] = [];
  for (const d of list) {
    out.push(d.connected, d.active, d.intensity);
    for (const s of d.slots) out.push(s.fragrance, s.remaining);
  }
  return out;
}

export function DiffuserBlock({
  hass, diffusers, size = 'card',
}: {
  hass: Hass;
  diffusers: ScentDiffuser[];
  size?: 'tile' | 'card';
}) {
  const ids = useMemo(() => diffuserEntityIds(diffusers), [diffusers]);
  const e = useEntities(hass, ids);
  if (!diffusers.length) return null;

  return (
    <div style={S.wrap}>
      {diffusers.map((d) => {
        const online = e[d.connected]?.state === 'on';
        const raw = e[d.active]?.state;
        const active = !raw || ['none', 'unknown', 'unavailable'].includes(raw) ? null : raw;
        const intensity = e[d.intensity]?.state ?? 'off';
        const steps = (attr(e[d.intensity], 'options') as string[] | undefined)
          ?? ['off', 'subtle', 'medium', 'strong'];

        return (
          <div key={d.name} style={{ ...S.block, opacity: online ? 1 : 0.55 }}>
            <div style={S.head}>
              {/*
                The device's own name is only worth showing when it is not
                simply the room you are already looking at — "Family Room" on
                the Family Room card is noise. Two diffusers in one room is
                exactly when it earns its place.
              */}
              <span style={S.title}>
                {diffusers.length > 1 ? d.name : 'Scent'}
              </span>
              <span style={{ ...S.active, color: active ? AMBER : 'var(--wt-dim)' }}>
                {online ? (active ?? 'Idle') : 'Offline'}
              </span>
            </div>

            <div style={S.bars}>
              {d.slots.map((s, i) => {
                const fr = e[s.fragrance]?.state;
                const label = fr && !['unknown', 'unavailable'].includes(fr) ? fr : `Slot ${i + 1}`;
                return <BottleBar key={i} label={label} pct={num(e[s.remaining], NaN)} />;
              })}
            </div>

            {size === 'card' ? (
              <div style={S.steps} role="group" aria-label={`${d.name} intensity`}>
                {steps.map((step) => {
                  const on = intensity === step;
                  return (
                    <button
                      key={step}
                      type="button"
                      className="est-tap"
                      aria-pressed={on}
                      onClick={() => void hass.callService(
                        'select', 'select_option', { option: step }, { entity_id: d.intensity },
                      )}
                      style={{ ...S.step, ...(on ? S.stepOn : null) }}
                    >{step}</button>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

const AMBER = 'rgb(250,187,90)';

/** Colour carries the urgency: a bottle under 15% should be visible at a glance. */
function BottleBar({ label, pct }: { label: string; pct: number }) {
  const known = Number.isFinite(pct);
  const tone = !known
    ? 'var(--wt-dim)'
    : pct < 15 ? 'var(--wt-alert, #e0685f)'
    : pct < 30 ? 'var(--wt-warn, #d9a441)'
    : 'var(--wt-ok, #5fa76b)';
  return (
    <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
      <div style={S.barHead}>
        <span style={S.barLabel}>{label}</span>
        <span style={{ ...S.barPct, color: tone }}>{known ? `${Math.round(pct)}%` : '—'}</span>
      </div>
      <div style={S.track}>
        <div style={{
          width: `${known ? Math.max(2, Math.min(100, pct)) : 0}%`,
          height: '100%', background: tone, borderRadius: 999, transition: 'width .3s ease',
        }} />
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  wrap: { display: 'grid', gap: 9, minWidth: 0 },
  block: { display: 'grid', gap: 8, minWidth: 0 },
  head: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, minWidth: 0 },
  title: {
    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--wt-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  active: {
    fontSize: 11, textAlign: 'right', minWidth: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  bars: { display: 'grid', gap: 7 },
  barHead: { display: 'flex', justifyContent: 'space-between', gap: 8, minWidth: 0 },
  barLabel: {
    fontSize: 11.5, color: 'var(--wt-dim)', whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
  },
  barPct: { fontSize: 11.5, fontWeight: 700, flex: 'none', fontVariantNumeric: 'tabular-nums' },
  track: { height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.09)', overflow: 'hidden' },
  steps: { display: 'flex', gap: 4 },
  step: {
    flex: 1, minWidth: 0, font: 'inherit', fontSize: 10.5,
    textTransform: 'uppercase', letterSpacing: '0.04em',
    padding: '6px 2px', borderRadius: 8, cursor: 'pointer',
    border: '1px solid var(--wt-line)', background: 'transparent', color: 'var(--wt-dim)',
  },
  stepOn: {
    borderColor: 'var(--wt-gold)', background: 'rgba(211,176,110,0.12)', color: 'var(--wt-gold)',
  },
};
