import { useEntity } from '../ha/useEntities';
import type { Hass } from '../ha/types';

/**
 * Example CUSTOM component — plain React, no Lovelace card model.
 *
 * Note what it does NOT do: it never receives `hass.states`. It names the one
 * entity it needs, so it re-renders when that entity changes and never when
 * the weather station reports.
 */
export function EntityTile({ hass, entity }: { hass: Hass; entity: string }) {
  const e = useEntity(hass, entity);
  if (!e) return <div style={S.missing}>{entity} — not found</div>;

  const domain = entity.split('.')[0];
  const toggleable = ['light', 'switch', 'fan', 'input_boolean'].includes(domain);
  const on = e.state === 'on' || e.state === 'open' || e.state === 'playing';

  return (
    <button
      type="button"
      style={{ ...S.tile, ...(on ? S.on : null) }}
      disabled={!toggleable}
      onClick={() => toggleable && hass.callService(domain, 'toggle', { entity_id: entity })}
    >
      <span style={S.name}>{e.attributes.friendly_name ?? entity}</span>
      <span style={S.state}>{e.state}</span>
    </button>
  );
}

const S: Record<string, React.CSSProperties> = {
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    padding: '14px 16px',
    borderRadius: 18,
    border: '1px solid var(--divider-color, rgba(255,255,255,0.1))',
    background: 'var(--ha-card-background, rgba(255,255,255,0.06))',
    color: 'var(--primary-text-color, #e8eaf2)',
    font: 'inherit',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  on: {
    borderColor: 'var(--state-icon-active-color, #ffc48c)',
    boxShadow: '0 0 0 1px var(--state-icon-active-color, #ffc48c) inset',
  },
  name: { fontSize: 14, fontWeight: 600 },
  state: { fontSize: 12, color: 'var(--secondary-text-color, #9aa3b8)' },
  missing: { padding: 12, opacity: 0.6, fontSize: 13 },
};
