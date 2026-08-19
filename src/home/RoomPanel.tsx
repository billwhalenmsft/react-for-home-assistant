import { useMemo, useState, type CSSProperties } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass, HassEntity } from '../ha/types';
import { ROOM_DEVICES } from './rooms';
import { GarageControl } from './GarageControl';
import { ArcDial } from './ArcDial';

/**
 * One room's controls, organised by SERVICE rather than as a flat entity list.
 *
 * Lighting / Climate / Media / Access are the services a system of this shape
 * presents. A room only shows the tabs it actually has, so the Study doesn't
 * grow an empty Climate tab. Garage bays skip tabs entirely and get their
 * purpose-built door control.
 *
 * State-only, no history queries: the recorder on this install blocks the UI
 * thread hard enough to freeze the renderer, so nothing here asks it anything.
 */

const AMBER = 'rgb(250,187,90)';

const pretty = (id: string) =>
  (id.split('.')[1] ?? id).replace(/_/g, ' ').replace(/\b(\w)/g, (m) => m.toUpperCase()).trim();

const nameOf = (id: string, s?: HassEntity) => {
  const n = (s?.attributes as Record<string, unknown> | undefined)?.friendly_name;
  return typeof n === 'string' ? n : pretty(id);
};

const ON = new Set(['on', 'open', 'playing', 'run', 'unlocked', 'cleaning', 'home']);

type Service = 'Lighting' | 'Climate' | 'Media' | 'Access';

const serviceOf = (id: string): Service | null => {
  const [d] = id.split('.');
  if (d === 'light' || d === 'switch') return 'Lighting';
  if (d === 'climate') return 'Climate';
  if (d === 'media_player') return 'Media';
  if (d === 'lock' || d === 'cover' || d === 'binary_sensor') return 'Access';
  return null;
};

const ORDER: Service[] = ['Lighting', 'Climate', 'Media', 'Access'];

/** Bays get a door control instead of tabs. */
const GARAGE: Record<string, {
  cover: string; light?: string; lock?: string; obstruction?: string; openings?: string;
}> = {
  'Single Bay': {
    cover: 'cover.garage_single_door',
    light: 'light.garage_single_light',
    lock: 'lock.garage_single_remotes',
    obstruction: 'binary_sensor.garage_single_obstruction',
    openings: 'sensor.garage_single_openings',
  },
  'Double Bay': {
    cover: 'cover.garage_main_garage_stall_door',
    light: 'light.garage_main_garage_stall_light',
    lock: 'lock.garage_main_garage_stall_lock_remotes',
    obstruction: 'binary_sensor.garage_main_garage_stall_obstruction',
    openings: 'sensor.garage_main_garage_stall_openings',
  },
};

export function RoomPanel({
  hass, floor, room, onClose, variant = 'overlay',
}: {
  hass: Hass;
  floor: string;
  room: string;
  onClose: () => void;
  variant?: 'overlay' | 'inline';
}) {
  const spec = ROOM_DEVICES[floor]?.[room];
  const ids = useMemo(() => spec?.entities ?? [], [spec]);
  const states = useEntities(hass, ids);

  const groups = useMemo(() => {
    const g = new Map<Service, string[]>();
    for (const id of ids) {
      const svc = serviceOf(id);
      if (!svc) continue;
      g.set(svc, [...(g.get(svc) ?? []), id]);
    }
    return g;
  }, [ids]);

  const tabs = ORDER.filter((s) => groups.has(s));
  const [tab, setTab] = useState<Service | null>(null);
  const active = tab && tabs.includes(tab) ? tab : tabs[0];
  const isGarage = !!GARAGE[room];

  return (
    <div
      style={variant === 'inline' ? { ...S.wrap, ...S.inline } : S.wrap}
      role="dialog"
      aria-label={`${room} controls`}
    >
      <div style={S.head}>
        <div>
          <div style={S.title}>{room}</div>
          {spec?.note ? <div style={S.note}>{spec.note}</div> : null}
        </div>
        <button type="button" onClick={onClose} style={S.close} aria-label="Close">✕</button>
      </div>

      {isGarage ? (
        <GarageControl hass={hass} {...GARAGE[room]} />
      ) : tabs.length === 0 ? (
        <div style={S.empty}>Nothing wired in this room yet.</div>
      ) : (
        <>
          {tabs.length > 1 && (
            <div style={S.tabs} role="tablist">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={t === active}
                  onClick={() => setTab(t)}
                  style={{ ...S.tab, ...(t === active ? S.tabOn : null) }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {active === 'Lighting' ? (
            <Lighting hass={hass} ids={groups.get('Lighting') ?? []} states={states} />
          ) : active === 'Climate' ? (
            <Climate hass={hass} ids={groups.get('Climate') ?? []} states={states} />
          ) : (
            <Rows hass={hass} ids={groups.get(active as Service) ?? []} states={states} />
          )}
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- lighting */

function Lighting({ hass, ids, states }: { hass: Hass; ids: string[]; states: Record<string, HassEntity> }) {
  // the dial drives the first dimmable light; the rest get toggle rows
  const dimmable =
    ids.find((id) => {
      const s = states[id];
      return (
        id.startsWith('light.') &&
        s &&
        ((s.attributes as Record<string, unknown>)?.brightness !== undefined || s.state === 'on')
      );
    }) ?? ids.find((id) => id.startsWith('light.'));

  const s = dimmable ? states[dimmable] : undefined;
  const bri = (s?.attributes as Record<string, unknown> | undefined)?.brightness;
  const pct = typeof bri === 'number' ? Math.round(bri / 2.55) : s?.state === 'on' ? 100 : 0;
  const [local, setLocal] = useState<number | null>(null);

  const commit = (v: number) => {
    if (!dimmable) return;
    setLocal(null);
    if (v <= 0) void hass.callService('light', 'turn_off', {}, { entity_id: dimmable });
    else void hass.callService('light', 'turn_on', { brightness_pct: v }, { entity_id: dimmable });
  };

  const rest = ids.filter((id) => id !== dimmable);

  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
      {dimmable ? (
        <>
          <ArcDial
            value={local ?? pct}
            onChange={setLocal}
            onCommit={commit}
            unit="%"
            label={nameOf(dimmable, s)}
            ariaLabel={`${nameOf(dimmable, s)} brightness`}
          />
          <button
            type="button"
            onClick={() => void hass.callService('light', 'toggle', {}, { entity_id: dimmable })}
            style={{ ...S.wide, ...(s?.state === 'on' ? S.wideOn : null) }}
          >
            {s?.state === 'on' ? 'Turn off' : 'Turn on'}
          </button>
        </>
      ) : null}
      {rest.length ? (
        <div style={{ ...S.list, width: '100%' }}>
          {rest.map((id) => <Row key={id} hass={hass} id={id} s={states[id]} />)}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ climate */

function Climate({ hass, ids, states }: { hass: Hass; ids: string[]; states: Record<string, HassEntity> }) {
  const id = ids[0];
  const s = states[id];
  const a = (s?.attributes ?? {}) as Record<string, unknown>;
  const target = typeof a.temperature === 'number' ? a.temperature : 70;
  const current = typeof a.current_temperature === 'number' ? a.current_temperature : undefined;
  const [local, setLocal] = useState<number | null>(null);

  return (
    <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
      <ArcDial
        value={local ?? target}
        min={55}
        max={85}
        unit="°"
        label={s?.state ? `${s.state}${current !== undefined ? ` · now ${Math.round(current)}°` : ''}` : 'Thermostat'}
        ariaLabel={`${nameOf(id, s)} target temperature`}
        onChange={setLocal}
        onCommit={(v) => {
          setLocal(null);
          void hass.callService('climate', 'set_temperature', { temperature: v }, { entity_id: id });
        }}
      />
    </div>
  );
}

/* --------------------------------------------------------------------- rows */

function Rows({ hass, ids, states }: { hass: Hass; ids: string[]; states: Record<string, HassEntity> }) {
  return (
    <div style={S.list}>
      {ids.map((id) => <Row key={id} hass={hass} id={id} s={states[id]} />)}
    </div>
  );
}

function Row({ hass, id, s }: { hass: Hass; id: string; s?: HassEntity }) {
  const [domain] = id.split('.');
  const on = s ? ON.has(s.state) : false;
  const can = ['light', 'switch', 'fan', 'cover', 'lock', 'media_player'].includes(domain);

  const act = () => {
    const st = s?.state;
    if (domain === 'light' || domain === 'switch' || domain === 'fan') {
      void hass.callService(domain, 'toggle', {}, { entity_id: id });
    } else if (domain === 'cover') {
      void hass.callService('cover', st === 'open' ? 'close_cover' : 'open_cover', {}, { entity_id: id });
    } else if (domain === 'lock') {
      void hass.callService('lock', st === 'locked' ? 'unlock' : 'lock', {}, { entity_id: id });
    } else if (domain === 'media_player') {
      void hass.callService('media_player', 'media_play_pause', {}, { entity_id: id });
    }
  };

  return (
    <button
      type="button"
      disabled={!can}
      onClick={() => can && act()}
      style={{ ...S.row, ...(on ? S.rowOn : null), cursor: can ? 'pointer' : 'default' }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: on ? AMBER : 'var(--wt-line)',
          boxShadow: on ? `0 0 10px ${AMBER}` : 'none',
        }}
      />
      <span style={S.label}>{nameOf(id, s)}</span>
      <span style={S.state}>{s ? s.state.replace(/_/g, ' ') : '—'}</span>
    </button>
  );
}

const S: Record<string, CSSProperties> = {
  wrap: {
    position: 'absolute', right: 12, top: 12,
    width: 'min(360px, 82%)', maxHeight: 'calc(100% - 24px)', overflowY: 'auto',
    padding: 16, borderRadius: 'var(--wt-radius)',
    background: 'var(--wt-ground)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--wt-line)', boxShadow: '0 18px 50px rgba(0,0,0,0.55)', zIndex: 5,
  },
  inline: { position: 'static', width: '100%', maxHeight: '80vh' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--wt-text)' },
  note: { fontSize: 11, color: 'var(--wt-dim)', marginTop: 3, lineHeight: 1.4 },
  close: {
    border: '1px solid var(--wt-line)', background: 'transparent', color: 'var(--wt-dim)',
    borderRadius: 10, width: 28, height: 28, cursor: 'pointer', fontSize: 13, lineHeight: 1,
  },
  tabs: { display: 'flex', gap: 4, marginBottom: 14, padding: 3, borderRadius: 999, background: 'var(--wt-glass)' },
  tab: {
    flex: 1, padding: '7px 6px', borderRadius: 999, cursor: 'pointer', font: 'inherit',
    fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--wt-dim)', background: 'transparent', border: 'none',
  },
  tabOn: { color: 'var(--wt-onAccent)', background: 'var(--wt-gold)' },
  wide: {
    width: '100%', padding: '11px 12px', borderRadius: 'calc(var(--wt-radius) / 1.8)', cursor: 'pointer',
    font: 'inherit', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'var(--wt-text)', background: 'var(--wt-glass)', border: '1px solid var(--wt-line)',
  },
  wideOn: { color: 'var(--wt-onAccent)', background: 'var(--wt-gold)', borderColor: 'var(--wt-gold)' },
  list: { display: 'grid', gap: 7 },
  row: {
    display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10,
    padding: '9px 11px', borderRadius: 12, textAlign: 'left', font: 'inherit',
    background: 'var(--wt-glass)', border: '1px solid var(--wt-line)', color: 'var(--wt-text)',
    transition: 'background 160ms ease, border-color 160ms ease',
  },
  rowOn: { background: 'var(--wt-glassHi)', borderColor: 'var(--wt-lineHi)' },
  label: { fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  state: { fontSize: 11, color: 'var(--wt-dim)', textTransform: 'capitalize' },
  empty: { fontSize: 12.5, color: 'var(--wt-dim)', padding: '10px 4px', lineHeight: 1.5 },
};
