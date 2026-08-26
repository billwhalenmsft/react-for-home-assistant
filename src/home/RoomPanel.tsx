import { useMemo, type CSSProperties } from 'react';
import { useEntities } from '../ha/useEntities';
import type { Hass, HassEntity } from '../ha/types';
import { ROOM_DEVICES } from './rooms';
import { HOUSE } from '../house';
import { GarageControl } from './GarageControl';
import { ACTIONABLE, EntityControl, isOn, nameOf, rendersAsSquare, useControlStyle } from './Controls';

/**
 * One room, everything in it, all at once.
 *
 * This used to file a room's contents under Lighting / Climate / Media /
 * Access tabs. That looked tidy and cost a tap for every job: turning on a
 * lamp and pausing music in the same room meant crossing a tab boundary, and
 * whichever tab you were not on was invisible rather than merely further down.
 * A room has three to five things in it. There is nothing to paginate.
 *
 * So: one minicard per controllable entity, each carrying its own gesture
 * inline — toggle, slide to dim, open/stop/close, lock, play, set. Read-only
 * things fall to a quiet strip at the bottom, because a motion sensor is
 * something you glance at, not something you operate. Garage bays still skip
 * all of it for their purpose-built door control.
 *
 * State-only, no history queries: the recorder on this install blocks the UI
 * thread hard enough to freeze the renderer, so nothing here asks it anything.
 */

const AMBER = 'rgb(250,187,90)';

/** Bays get a door control instead of cards. */
const GARAGE = HOUSE.garageBays;

/** Cards first, in the order the house config lists them; readouts after. */
const split = (ids: string[]) => {
  const controls: string[] = [];
  const readouts: string[] = [];
  for (const id of ids) (ACTIONABLE.has(id.split('.')[0]) ? controls : readouts).push(id);
  return { controls, readouts };
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
  const { controls, readouts } = useMemo(() => split(ids), [ids]);
  const [ctrl] = useControlStyle(hass);
  const isGarage = !!GARAGE[room];

  return (
    <div
      style={variant === 'inline' ? { ...S.wrap, ...S.inline } : S.wrap}
      role="dialog"
      aria-label={`${room} controls`}
    >
      <div style={S.head}>
        <div style={{ minWidth: 0 }}>
          <div style={S.title}>{room}</div>
          {spec?.note ? <div style={S.note}>{spec.note}</div> : null}
        </div>
        <button type="button" onClick={onClose} style={S.close} aria-label="Close">✕</button>
      </div>

      {isGarage ? (
        <GarageControl hass={hass} {...GARAGE[room]} />
      ) : ids.length === 0 ? (
        <div style={S.empty}>Nothing wired in this room yet.</div>
      ) : (
        <>
          {controls.length ? (
            <div style={ctrl === 'square' ? S.squares : S.cards}>
              {controls.map((id) => {
                const sq = ctrl === 'square' && rendersAsSquare(id, states[id]);
                return (
                  <div
                    key={id}
                    // Squares tile; anything without a square form takes the
                    // full width as a bar card rather than being cropped into
                    // a cell that cannot hold it.
                    style={sq ? { minWidth: 0 } : { ...S.cell, gridColumn: '1 / -1' }}
                  >
                    <EntityControl hass={hass} id={id} s={states[id]} size="card" style={ctrl} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={S.empty}>Nothing here to operate — only readings.</div>
          )}

          {readouts.length ? (
            <div style={S.readouts}>
              {readouts.map((id) => <Readout key={id} id={id} s={states[id]} />)}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/** A thing you look at rather than press. Deliberately not a button. */
function Readout({ id, s }: { id: string; s?: HassEntity }) {
  const on = isOn(s);
  return (
    <div style={S.readout}>
      <span
        aria-hidden="true"
        style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: on ? AMBER : 'var(--wt-line)',
          boxShadow: on ? `0 0 9px ${AMBER}` : 'none',
        }}
      />
      <span style={S.readoutName}>{nameOf(id, s)}</span>
      <span style={S.readoutState}>{s ? s.state.replace(/_/g, ' ') : '—'}</span>
    </div>
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
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  title: { fontSize: 17, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--wt-text)' },
  note: { fontSize: 11, color: 'var(--wt-dim)', marginTop: 3, lineHeight: 1.4 },
  close: {
    border: '1px solid var(--wt-line)', background: 'transparent', color: 'var(--wt-dim)',
    borderRadius: 10, width: 28, height: 28, cursor: 'pointer', fontSize: 13, lineHeight: 1, flexShrink: 0,
  },
  cards: { display: 'grid', gap: 9 },
  squares: { display: 'grid', gap: 9, gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))' },
  cell: {
    padding: '11px 12px', borderRadius: 14, minWidth: 0,
    background: 'var(--wt-glass)', border: '1px solid var(--wt-line)',
  },
  readouts: { display: 'grid', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--wt-line)' },
  readout: { display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 9, minWidth: 0 },
  readoutName: {
    fontSize: 12, color: 'var(--wt-text)', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
  },
  readoutState: { fontSize: 11, color: 'var(--wt-dim)', textTransform: 'capitalize', flexShrink: 0 },
  empty: { fontSize: 12.5, color: 'var(--wt-dim)', padding: '10px 4px', lineHeight: 1.5 },
};
