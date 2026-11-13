// Temperature, precipitation and wind for one place, as three small charts on a shared time axis.
// SMHI steps get longer further ahead (1 h, then 3-12 h), so x is real time, not the step index.
import { useState, type MouseEvent } from "react";
import type { ForecastStep } from "../api/client";
import { parseDate } from "../lib/format";
import { compass, formatMm, formatTemp, symbolIcon } from "../lib/weather";

const W = 1000;
const TZ = "Europe/Stockholm";

export function ForecastCharts(props: { steps: ForecastStep[]; selected?: string | null; onSelect?: (time: string) => void }) {
  const { steps } = props;
  const [hover, setHover] = useState<number | null>(null);
  if (steps.length < 2) return <p className="muted">Ingen prognos att visa.</p>;

  const times = steps.map((s) => parseDate(s.time).getTime());
  const t0 = times[0] - steps[0].hours * 3_600_000;
  const t1 = times[times.length - 1];
  const x = (t: number) => ((t - t0) / (t1 - t0)) * W;

  const nearest = (t: number) => {
    let best = 0;
    times.forEach((v, i) => {
      if (Math.abs(v - t) < Math.abs(times[best] - t)) best = i;
    });
    return best;
  };
  const indexAt = (e: MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    return nearest(t0 + ratio * (t1 - t0));
  };
  const selectedIndex = props.selected ? nearest(parseDate(props.selected).getTime()) : null;
  const active = hover ?? selectedIndex;
  const cursorX = active != null ? x(times[active]) : null;

  // Local midnights for day separators, and a weekday label at each noon.
  const days: { start: number; label: string }[] = [];
  for (let t = t0; t <= t1; t += 3_600_000) {
    const d = new Date(t);
    const hour = Number(d.toLocaleString("sv-SE", { hour: "2-digit", hour12: false, timeZone: TZ }));
    if (hour === 0 && d.getUTCMinutes() === 0) {
      days.push({ start: t, label: d.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", timeZone: TZ }) });
    }
  }

  const temps = steps.map((s) => s.temperature);
  const rain = steps.map((s) => (s.precipitation ?? 0) / s.hours); // mm per hour, comparable across step lengths
  const wind = steps.map((s) => s.wind_speed);
  const gust = steps.map((s) => s.wind_gust);
  const hovered = active != null ? steps[active] : null;

  const panelProps = { x, times, days, cursorX };
  return (
    <div
      className="forecast-charts"
      onPointerMove={(e) => setHover(indexAt(e))}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => props.onSelect?.(steps[indexAt(e)].time)}
    >
      {hovered && (
        <div className={`forecast-tip ${cursorX! / W < 0.25 ? "start" : cursorX! / W > 0.75 ? "end" : ""}`} style={{ left: `${(cursorX! / W) * 100}%` }}>
          <strong>
            {parseDate(hovered.time).toLocaleString("sv-SE", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ })}
          </strong>
          <span>
            {symbolIcon(hovered.symbol)} {formatTemp(hovered.temperature)}
          </span>
          <span>{formatMm(hovered.precipitation)} mm{hovered.hours > 1 ? ` /${hovered.hours} h` : ""}</span>
          <span>
            {hovered.wind_speed != null ? `${Math.round(hovered.wind_speed)} (${Math.round(hovered.wind_gust ?? 0)}) m/s ${compass(hovered.wind_direction)}` : ""}
          </span>
        </div>
      )}
      <Panel title="Temperatur" unit="°C" height={130} values={temps} {...panelProps} zeroLine
        render={({ y }) => <path className="fc-line temp" d={line(temps, times, x, y)} fill="none" vectorEffect="non-scaling-stroke" />} />
      <Panel title="Nederbörd" unit="mm/h" height={70} values={rain} min={0} {...panelProps}
        render={({ y }) => (
          <g className="fc-bars">
            {steps.map((s, i) =>
              rain[i] > 0.05 ? (
                <rect key={s.time} x={x(times[i] - s.hours * 3_600_000) + 0.5} width={Math.max(x(times[i]) - x(times[i] - s.hours * 3_600_000) - 1, 1)}
                  y={y(rain[i])} height={Math.max(y(0) - y(rain[i]), 1)} />
              ) : null,
            )}
          </g>
        )} />
      <Panel title="Vind (byvind streckad)" unit="m/s" height={70} values={[...wind, ...gust]} min={0} {...panelProps}
        render={({ y }) => (
          <>
            <path className="fc-line gust" d={line(gust, times, x, y)} fill="none" vectorEffect="non-scaling-stroke" />
            <path className="fc-line wind" d={line(wind, times, x, y)} fill="none" vectorEffect="non-scaling-stroke" />
          </>
        )} />
      <div className="fc-days muted small" aria-hidden>
        {days.map((d) => (
          <span key={d.start} style={{ left: `${(x(d.start + 12 * 3_600_000) / W) * 100}%` }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function line(values: (number | null)[], times: number[], x: (t: number) => number, y: (v: number) => number) {
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v == null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(times[i]).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

function Panel(props: {
  title: string;
  unit: string;
  height: number;
  values: (number | null)[];
  min?: number;
  zeroLine?: boolean;
  x: (t: number) => number;
  times: number[];
  days: { start: number }[];
  cursorX: number | null;
  render: (scale: { y: (v: number) => number }) => React.ReactNode;
}) {
  const h = props.height;
  const nums = props.values.filter((v): v is number => v != null);
  let lo = Math.min(...nums, props.min ?? Infinity);
  let hi = Math.max(...nums, props.min != null ? props.min + 1 : -Infinity);
  if (hi - lo < 2) [lo, hi] = [lo - 1, hi + 1];
  const pad = 6;
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (h - 2 * pad);
  const fmt = (v: number) => (Math.abs(v) >= 10 ? Math.round(v) : Math.round(v * 10) / 10).toLocaleString("sv-SE");
  return (
    <figure className="fc-panel" style={{ height: h }}>
      <figcaption className="fc-title small">
        {props.title} <span className="muted">{props.unit}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" aria-hidden>
        {props.days.map((d) => (
          <line key={d.start} className="fc-grid" x1={props.x(d.start)} x2={props.x(d.start)} y1={0} y2={h} vectorEffect="non-scaling-stroke" />
        ))}
        {props.zeroLine && lo < 0 && hi > 0 && (
          <line className="fc-zero" x1={0} x2={W} y1={y(0)} y2={y(0)} vectorEffect="non-scaling-stroke" />
        )}
        {props.render({ y })}
        {props.cursorX != null && (
          <line className="chart-cursor" x1={props.cursorX} x2={props.cursorX} y1={0} y2={h} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <span className="fc-axis fc-axis-max">{fmt(hi)}</span>
      <span className="fc-axis fc-axis-min">{fmt(lo)}</span>
    </figure>
  );
}
