import { useCallback, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';

/**
 * Circular arc control — the gesture high-end panels use for brightness and
 * temperature, in place of a linear slider.
 *
 * A 270° sweep starting bottom-left, so the track's gap sits at the bottom
 * where the value label lives. Dragging anywhere on the dial sets the value;
 * it also takes keyboard arrows, since a drag-only control is unusable for
 * anyone not using a mouse or touch.
 */

export interface ArcDialProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** fires continuously while dragging */
  onChange: (v: number) => void;
  /** fires once on release — use for the service call if changes are costly */
  onCommit?: (v: number) => void;
  label?: string;
  unit?: string;
  size?: number;
  disabled?: boolean;
  ariaLabel: string;
}

const START = 135;        // degrees, measured clockwise from 12 o'clock
const SWEEP = 270;

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

const arcPath = (cx: number, cy: number, r: number, from: number, to: number) => {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
};

export function ArcDial({
  value, min = 0, max = 100, step = 1,
  onChange, onCommit, label, unit = '', size = 190, disabled, ariaLabel,
}: ArcDialProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const pct = (value - min) / (max - min || 1);
  const cx = size / 2, cy = size / 2, r = size / 2 - 16;

  const fromPointer = useCallback((e: RPointerEvent<SVGSVGElement>) => {
    const el = ref.current;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const dx = e.clientX - (b.left + b.width / 2);
    const dy = e.clientY - (b.top + b.height / 2);
    // angle clockwise from 12 o'clock
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    // fold into the 270° sweep starting at START
    let t = deg - START;
    if (t < 0) t += 360;
    if (t > SWEEP) return null;              // in the dead zone at the bottom
    return clamp(min + (t / SWEEP) * (max - min));
  }, [min, max, step]);

  const handle = (e: RPointerEvent<SVGSVGElement>, commit = false) => {
    if (disabled) return;
    const v = fromPointer(e);
    if (v === null) return;
    onChange(v);
    if (commit) onCommit?.(v);
  };

  const key = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step
      : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : 0;
    if (!d) return;
    e.preventDefault();
    const v = clamp(value + d);
    onChange(v);
    onCommit?.(v);
  };

  const [kx, ky] = polar(cx, cy, r, START + SWEEP * pct);

  return (
    <div style={{ ...S.wrap, opacity: disabled ? 0.45 : 1 }}>
      <svg
        ref={ref}
        width={size}
        height={size}
        role="slider"
        aria-label={ariaLabel}
        aria-valuenow={Math.round(value)}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={key}
        onPointerDown={(e) => { if (disabled) return; setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); handle(e); }}
        onPointerMove={(e) => dragging && handle(e)}
        onPointerUp={(e) => { setDragging(false); handle(e, true); }}
        style={{ touchAction: 'none', cursor: disabled ? 'default' : 'pointer', outline: 'none' }}
      >
        <path d={arcPath(cx, cy, r, START, START + SWEEP)} stroke="var(--wt-line)" strokeWidth={10} fill="none" strokeLinecap="round" />
        <path
          d={arcPath(cx, cy, r, START, START + Math.max(0.001, SWEEP * pct))}
          stroke="var(--wt-gold)"
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          style={{ transition: dragging ? 'none' : 'd 240ms ease' }}
        />
        <circle cx={kx} cy={ky} r={9} fill="var(--wt-goldHi)" stroke="var(--wt-ground)" strokeWidth={3} />
      </svg>

      <div style={S.readout}>
        <div style={S.value}>
          {Math.round(value)}
          <span style={S.unit}>{unit}</span>
        </div>
        {label ? <div style={S.label}>{label}</div> : null}
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  wrap: { position: 'relative', display: 'grid', placeItems: 'center' },
  readout: { position: 'absolute', textAlign: 'center', pointerEvents: 'none' },
  value: { fontSize: 34, fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--wt-text)', lineHeight: 1 },
  unit: { fontSize: 15, fontWeight: 400, color: 'var(--wt-dim)', marginLeft: 2 },
  label: {
    marginTop: 5, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: 'var(--wt-dim)',
  },
};
