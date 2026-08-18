import type { CSSProperties, ReactNode } from 'react';
import { panelSpanStyle, type ModeSpec } from './layout';

/**
 * Shared chrome. Every colour resolves through Home Assistant's own theme
 * custom properties with a literal fallback, so the panel follows whatever
 * theme the view is set to (whalen_command, glass, family) instead of shipping
 * a second design system that drifts.
 */

export const C = {
  text: 'var(--primary-text-color, #e8eaf2)',
  dim: 'var(--secondary-text-color, #9aa3b8)',
  card: 'var(--ha-card-background, var(--card-background-color, rgba(255,255,255,0.05)))',
  line: 'var(--divider-color, rgba(255,255,255,0.10))',
  accent: 'var(--state-icon-active-color, #ffc48c)',
  primary: 'var(--primary-color, #37b6c4)',
};

export function Panel({
  title,
  hint,
  spec,
  span,
  children,
}: {
  title: string;
  hint?: ReactNode;
  spec: ModeSpec;
  /** grid tracks to occupy on wide screens */
  span?: number;
  children: ReactNode;
}) {
  const inner: CSSProperties = {
    background: C.card,
    border: `1px solid ${C.line}`,
    borderRadius: 18,
    padding: spec.forceSingleColumn ? 14 : 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 0,
    width: '100%',
    ...panelSpanStyle(spec, span),
  };

  return (
    <>
      <section style={inner}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h2
            style={{
              margin: 0,
              fontSize: Math.round(13 * spec.fontScale),
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: C.text,
            }}
          >
            {title}
          </h2>
          {hint ? (
            <span style={{ fontSize: Math.round(11 * spec.fontScale), color: C.dim, marginLeft: 'auto' }}>
              {hint}
            </span>
          ) : null}
        </header>
        {children}
      </section>
    </>
  );
}

export function Chip({
  label,
  tone = 'idle',
  onClick,
  spec,
}: {
  label: ReactNode;
  tone?: 'idle' | 'active' | 'warn';
  onClick?: () => void;
  spec: ModeSpec;
}) {
  const tones = {
    idle: { bg: 'rgba(255,255,255,0.05)', fg: C.dim, bd: C.line },
    active: { bg: 'rgba(255,196,140,0.14)', fg: C.accent, bd: 'rgba(255,196,140,0.35)' },
    warn: { bg: 'rgba(255,120,90,0.14)', fg: '#ff9c7f', bd: 'rgba(255,120,90,0.35)' },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: spec.forceSingleColumn ? '7px 12px' : '5px 11px',
        borderRadius: 999,
        border: `1px solid ${tones.bd}`,
        background: tones.bg,
        color: tones.fg,
        font: 'inherit',
        fontSize: Math.round(12 * spec.fontScale),
        fontWeight: 600,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

/** Small inline SVG so the panel carries no icon-font dependency. */
export function Icon({ path, size = 18, color }: { path: string; size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d={path} fill={color ?? 'currentColor'} />
    </svg>
  );
}

export const ICONS = {
  bulb: 'M12 2a7 7 0 00-4 12.7V17a1 1 0 001 1h6a1 1 0 001-1v-2.3A7 7 0 0012 2zM9 20h6v1a1 1 0 01-1 1h-4a1 1 0 01-1-1v-1z',
  power: 'M13 3h-2v10h2V3zm4.8 2.2l-1.4 1.4A7 7 0 1112 5V3a9 9 0 105.8 2.2z',
  camera: 'M4 6h3l2-2h6l2 2h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm8 3.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z',
  home: 'M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z',
  sparkle: 'M12 2l1.9 5.6L19.5 9l-4.4 3.4 1.5 5.6L12 15l-4.6 3 1.5-5.6L4.5 9l5.6-1.4L12 2z',
};
