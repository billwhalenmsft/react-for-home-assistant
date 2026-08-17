import { HaCard } from './ha/HaCard';
import { EntityTile } from './components/EntityTile';
import type { PanelProps } from './ha/types';

/**
 * Demo layout proving the core premise: a standard Lovelace card and a custom
 * React component rendered side by side, in the same grid, sharing one
 * connection.
 *
 * Panel config comes from configuration.yaml, so entities are not hardcoded:
 *
 *   panel_custom:
 *     - name: react-for-home-assistant
 *       url_path: react-ha
 *       module_url: /local/react-for-home-assistant.js
 *       sidebar_title: React
 *       sidebar_icon: mdi:react
 *       config:
 *         entities: [light.kitchen_all_lights, lock.front_door]
 */
export function App({ hass, panel }: PanelProps) {
  const entities = (panel?.config?.entities as string[] | undefined) ?? [];

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={S.h1}>React for Home Assistant</h1>
        <p style={S.sub}>
          Standard Lovelace cards and custom React components, same layout, one connection.
        </p>
      </header>

      {entities.length === 0 ? (
        <p style={S.empty}>
          No entities configured. Add a <code>config.entities</code> list to the{' '}
          <code>panel_custom</code> entry in <code>configuration.yaml</code>.
        </p>
      ) : (
        <div style={S.grid}>
          {entities.map((id) => (
            <section key={id} style={S.pair}>
              <h2 style={S.h2}>{id}</h2>

              <div style={S.label}>custom React component</div>
              <EntityTile hass={hass} entity={id} />

              <div style={S.label}>standard HA tile card</div>
              <HaCard hass={hass} config={{ type: 'tile', entity: id }} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1400, margin: '0 auto', color: 'var(--primary-text-color, #e8eaf2)' },
  header: { marginBottom: 24 },
  h1: { margin: 0, fontSize: 26, fontWeight: 700 },
  sub: { margin: '6px 0 0', color: 'var(--secondary-text-color, #9aa3b8)', fontSize: 14 },
  grid: { display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' },
  pair: { display: 'flex', flexDirection: 'column', gap: 8 },
  h2: { margin: 0, fontSize: 13, fontWeight: 600, opacity: 0.7, fontFamily: 'monospace' },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.45, marginTop: 6 },
  empty: { color: 'var(--secondary-text-color, #9aa3b8)', fontSize: 14, lineHeight: 1.7 },
};
