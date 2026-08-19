import type { CSSProperties } from 'react';
import { THEMES } from './theme';

/**
 * Compact theme picker. Colour swatches rather than names, so it stays legible
 * in the 86px nav rail and doesn't need translating.
 */
export function ThemeSwitch({
  value,
  onChange,
  vertical = true,
}: {
  value: string;
  onChange: (id: string) => void;
  vertical?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: 7,
        alignItems: 'center',
      }}
    >
      {THEMES.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={t.label}
            title={t.label}
            onClick={() => onChange(t.id)}
            style={{
              width: 20,
              height: 20,
              padding: 0,
              borderRadius: '50%',
              cursor: 'pointer',
              background: t.swatch,
              border: on ? '2px solid var(--wt-text)' : '2px solid transparent',
              boxShadow: on ? `0 0 0 2px var(--wt-ground), 0 0 12px ${t.swatch}` : 'none',
              transition: 'box-shadow 160ms ease, border-color 160ms ease',
            } as CSSProperties}
          />
        );
      })}
    </div>
  );
}
