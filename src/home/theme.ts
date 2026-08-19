import { useCallback, useEffect, useState } from 'react';

/**
 * Visual themes for the Estate surface.
 *
 * The design tokens in estate.tsx were flat hex literals. They now resolve to
 * CSS custom properties, so a theme is just a different set of variable values
 * on the root element — no component knows a theme exists. That works because
 * every token is either dropped straight into a style value or interpolated
 * into a CSS string (gradients included); nothing did colour maths on them,
 * which would have broken under var().
 *
 * `radius` is a variable too, which is what lets Metro be genuinely square and
 * Fluent genuinely tight rather than just recoloured.
 */

export interface Theme {
  id: string;
  label: string;
  /** shown in the switcher */
  swatch: string;
  vars: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: 'estate',
    label: 'Estate',
    swatch: '#d3b06e',
    vars: {
      ground: '#0a0c0e',
      glass: 'rgba(255,255,255,0.038)',
      glassHi: 'rgba(255,255,255,0.065)',
      line: 'rgba(255,255,255,0.08)',
      lineHi: 'rgba(211,176,110,0.45)',
      text: '#f0ede6',
      dim: '#97917f',
      faint: '#605b4e',
      gold: '#d3b06e',
      goldHi: '#e8cf96',
      goldDeep: '#a8814a',
      ok: '#7ac48f',
      warn: '#e0b34c',
      alert: '#e0795f',
      info: '#7fb4d1',
      planWash: 'rgba(0,0,0,0)',
      planWall: '#8f9cb0',
      radius: '22px',
      onAccent: '#191408',
      ambientA: 'rgba(211,176,110,0.09)',
      ambientB: 'rgba(88,128,150,0.10)',
    },
  },
  {
    id: 'daylight',
    label: 'Daylight',
    swatch: '#9a7434',
    vars: {
      ground: '#f3f0e9',
      glass: 'rgba(255,255,255,0.72)',
      glassHi: 'rgba(255,255,255,0.92)',
      line: 'rgba(32,27,18,0.12)',
      lineHi: 'rgba(154,116,52,0.55)',
      text: '#1d1913',
      dim: '#6a6253',
      faint: '#9a9280',
      gold: '#9a7434',
      goldHi: '#b98f45',
      goldDeep: '#75551f',
      ok: '#2f7d4a',
      warn: '#a5731a',
      alert: '#b0432c',
      info: '#2c6a8c',
      planWash: 'rgba(255,252,245,0.66)',
      planWall: '#6d6353',
      radius: '22px',
      onAccent: '#fffaf0',
      ambientA: 'rgba(154,116,52,0.10)',
      ambientB: 'rgba(60,110,140,0.10)',
    },
  },
  {
    id: 'fluent',
    label: 'Fluent',
    swatch: '#4cc2ff',
    vars: {
      ground: '#1f1f1f',
      glass: 'rgba(255,255,255,0.052)',
      glassHi: 'rgba(255,255,255,0.09)',
      line: 'rgba(255,255,255,0.093)',
      lineHi: 'rgba(76,194,255,0.55)',
      text: '#ffffff',
      dim: '#c8c6c4',
      faint: '#8a8886',
      gold: '#4cc2ff',
      goldHi: '#8fdcff',
      goldDeep: '#0078d4',
      ok: '#6ccb5f',
      warn: '#fce100',
      alert: '#ff99a4',
      info: '#4cc2ff',
      planWash: 'rgba(0,0,0,0)',
      planWall: '#9aa3ad',
      radius: '8px',
      onAccent: '#00223a',
      ambientA: 'rgba(76,194,255,0.10)',
      ambientB: 'rgba(120,120,140,0.08)',
    },
  },
  {
    id: 'metro',
    label: 'Metro',
    swatch: '#00b7c3',
    vars: {
      // Metro is flat by definition — opaque panels, square corners, no glass
      ground: '#000000',
      glass: '#141414',
      glassHi: '#232323',
      line: '#333333',
      lineHi: '#00b7c3',
      text: '#ffffff',
      dim: '#a6a6a6',
      faint: '#6b6b6b',
      gold: '#00b7c3',
      goldHi: '#4fd8e0',
      goldDeep: '#00838c',
      ok: '#10893e',
      warn: '#ffb900',
      alert: '#e81123',
      info: '#0063b1',
      planWash: 'rgba(0,0,0,0.18)',
      planWall: '#7d7d7d',
      radius: '0px',
      onAccent: '#001416',
      ambientA: 'rgba(0,183,195,0.07)',
      ambientB: 'rgba(0,99,177,0.07)',
    },
  },
];

/** CSS defining every theme's variables, scoped by a root data attribute. */
export const THEME_CSS = THEMES.map(
  (t) =>
    `.est-root[data-wt-theme="${t.id}"]{` +
    Object.entries(t.vars)
      .map(([k, v]) => `--wt-${k}:${v};`)
      .join('') +
    '}'
).join('\n');

const KEY = 'react-home:theme';

export function useTheme(): [string, (id: string) => void] {
  const [id, setId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && THEMES.some((t) => t.id === saved)) return saved;
    } catch {
      /* storage can be blocked; fall through to the default */
    }
    return THEMES[0].id;
  });

  const set = useCallback((next: string) => {
    setId(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* non-fatal */
    }
  }, []);

  // keep the colour-scheme hint in step so form controls and scrollbars match
  useEffect(() => {
    const light = id === 'daylight';
    document.documentElement.style.colorScheme = light ? 'light' : 'dark';
  }, [id]);

  return [id, set];
}
