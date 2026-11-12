// Small dependency-free SVG charts for the stock screen.
// The SVG stretches to its box (preserveAspectRatio="none"); text lives in HTML so it never stretches.
import { useState, type PointerEvent } from "react";
import { formatPrice } from "../lib/market";

const W = 1000;

function path(values: number[], height: number, pad = 2, include: number[] = []) {
  const min = Math.min(...values, ...include);
  const max = Math.max(...values, ...include);
  const span = max - min || 1;
  const x = (i: number) => (values.length === 1 ? W / 2 : (i / (values.length - 1)) * W);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - 2 * pad);
  return { d: values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(""), x, y, min, max };
}

/** Tiny trend line for a table row; colour follows first vs last value. */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="muted">–</span>;
  const h = 28;
  const { d } = path(values, h);
  const up = values[values.length - 1] >= values[0];
  return (
    <svg className={`sparkline ${up ? "up" : "down"}`} viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface Point {
  t: string;
  close: number;
}

/**
 * Price chart with hover read-out. `intraday` switches the time labels from dates to clock times.
 * `baseline` (dashed line, and up/down colour) defaults to the first point; pass yesterday's close for a 1-day chart.
 */
export function LineChart(props: { points: Point[]; intraday?: boolean; currency?: string; baseline?: number | null }) {
  const { points, intraday = false, currency = "" } = props;
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <div className="chart chart-empty muted">Ingen kursdata för perioden.</div>;

  const h = 240;
  const values = points.map((p) => p.close);
  const base = props.baseline ?? values[0];
  const { d, x, y, min, max } = path(values, h, 8, [base]);
  const up = values[values.length - 1] >= base;
  const label = (t: string) =>
    new Date(t).toLocaleString("sv-SE", intraday ? { weekday: "short", hour: "2-digit", minute: "2-digit" } : { dateStyle: "medium" });

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    setHover(Math.round(ratio * (points.length - 1)));
  };
  const hovered = hover == null ? null : points[hover];

  return (
    <div className={`chart ${up ? "up" : "down"}`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Kurs från ${label(points[0].t)} till ${label(points[points.length - 1].t)}`}>
        <line className="chart-base" x1="0" x2={W} y1={y(base)} y2={y(base)} vectorEffect="non-scaling-stroke" />
        <path className="chart-area" d={`${d}L${W},${h}L0,${h}Z`} />
        <path className="chart-line" d={d} fill="none" vectorEffect="non-scaling-stroke" />
        {hover != null && (
          <line className="chart-cursor" x1={x(hover)} x2={x(hover)} y1="0" y2={h} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <span className="chart-label chart-max">{formatPrice(max)}</span>
      <span className="chart-label chart-min">{formatPrice(min)}</span>
      <div className="chart-axis muted small">
        <span>{label(points[0].t)}</span>
        <span>{label(points[points.length - 1].t)}</span>
      </div>
      {hovered && (
        <div className="chart-tip" style={{ left: `${(hover! / (points.length - 1)) * 100}%` }}>
          <strong>
            {formatPrice(hovered.close)} {currency}
          </strong>
          <span className="muted">{label(hovered.t)}</span>
        </div>
      )}
    </div>
  );
}
