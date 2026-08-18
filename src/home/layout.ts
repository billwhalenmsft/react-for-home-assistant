/**
 * Device modes.
 *
 * This is the thing Lovelace's sections view cannot do. Its columns are a fixed
 * 500 px and it caps how many fit; on a 3813 px monitor that leaves 41–56% of
 * the screen unused, and on a phone the same grid just stacks.
 *
 * Here the layout is fluid — `auto-fill` + `minmax` — so it fills whatever
 * width it is given, and the mode changes the *shape* of the page (tile size,
 * density, touch targets) rather than just how many columns survive.
 */

export type Mode = 'desktop' | 'tablet' | 'phone';

export interface ModeSpec {
  id: Mode;
  label: string;
  icon: string;
  /** narrowest a column may get before the grid drops one */
  minCol: number;
  /** cap on total content width; Infinity = fill the display */
  maxWidth: number;
  gap: number;
  tileHeight: number;
  fontScale: number;
  /** phone gets one column regardless of available width */
  forceSingleColumn: boolean;
}

export const MODES: Record<Mode, ModeSpec> = {
  desktop: {
    id: 'desktop',
    label: 'Desktop',
    icon: 'M4 6h16v10H4zM2 18h20v2H2z',
    minCol: 330,
    maxWidth: Infinity,
    gap: 16,
    tileHeight: 62,
    fontScale: 1,
    forceSingleColumn: false,
  },
  tablet: {
    id: 'tablet',
    label: 'Tablet',
    icon: 'M5 3h14a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1zm7 15.5a1 1 0 100 2 1 1 0 000-2z',
    minCol: 420,
    maxWidth: 1600,
    gap: 20,
    tileHeight: 76,
    fontScale: 1.08,
    forceSingleColumn: false,
  },
  phone: {
    id: 'phone',
    label: 'Phone',
    icon: 'M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1zm5 16.5a1 1 0 100 2 1 1 0 000-2z',
    minCol: 260,
    maxWidth: 460,
    gap: 12,
    tileHeight: 72,
    fontScale: 1.05,
    forceSingleColumn: true,
  },
};

export const MODE_LIST: ModeSpec[] = [MODES.desktop, MODES.tablet, MODES.phone];

/**
 * Panel flow.
 *
 * `auto-fill` + `minmax` rather than a fixed column count: the track count is
 * derived from the width the page actually gets, so the same code fills a
 * 3813 px monitor and a phone. Lovelace's sections view builds fixed 500 px
 * columns and caps how many survive, which is why it strands 41–56% of a wide
 * screen no matter how the cards are configured.
 *
 * `align-items: start` keeps a tall panel from stretching its row-mates.
 */
export function gridStyle(spec: ModeSpec): React.CSSProperties {
  return {
    display: 'grid',
    gap: spec.gap,
    gridTemplateColumns: spec.forceSingleColumn
      ? '1fr'
      : `repeat(auto-fill, minmax(${spec.minCol}px, 1fr))`,
    alignItems: 'start',
  };
}

/** Panels that carry wide content ask for more than one track. */
export function panelSpanStyle(spec: ModeSpec, span?: number): React.CSSProperties {
  if (!span || spec.forceSingleColumn) return {};
  return { gridColumn: `span ${span}` };
}

/** Inner grid for tiles inside one panel. */
export function tileGridStyle(spec: ModeSpec, min = 150): React.CSSProperties {
  return {
    display: 'grid',
    gap: Math.round(spec.gap * 0.5),
    gridTemplateColumns: spec.forceSingleColumn
      ? '1fr 1fr'
      : `repeat(auto-fill, minmax(${min}px, 1fr))`,
  };
}

/** Remember the chosen mode so a wall tablet keeps its setting across reloads. */
const KEY = 'react-home:mode';

export function loadMode(fallback: Mode = 'desktop'): Mode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'desktop' || v === 'tablet' || v === 'phone') return v;
  } catch {
    /* private mode / storage disabled — fall through */
  }
  return fallback;
}

export function saveMode(mode: Mode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* non-fatal */
  }
}

/** Sensible default from the actual viewport, used only on first ever load. */
export function guessMode(width: number): Mode {
  if (width < 620) return 'phone';
  if (width < 1250) return 'tablet';
  return 'desktop';
}
