// Map of Sweden coloured by temperature at a chosen time, with details for the chosen county.
import { useMemo, useState } from "react";
import type { ForecastStep, MapRegion } from "../api/client";
import { useWeatherMap } from "../api/hooks";
import { parseDate } from "../lib/format";
import { TEMP_BINS, tempColor } from "../lib/scales";
import { project } from "../lib/swedenMap";
import { compass, formatMm, formatTemp, symbolIcon } from "../lib/weather";
import { DaysTable } from "./DaysTable";
import { ForecastCharts } from "./ForecastCharts";
import { ErrorBox, Loading } from "./Layout";
import { MapLabel, SwedenMap } from "./SwedenMap";

const TZ = "Europe/Stockholm";

/** The region's step at `time`: the same step if SMHI has it, else the latest one before it. */
export function stepAt(region: MapRegion, time: number): ForecastStep | null {
  let found: ForecastStep | null = null;
  for (const s of region.steps ?? []) {
    if (parseDate(s.time).getTime() <= time) found = s;
    else break;
  }
  return found ?? region.steps?.[0] ?? null;
}

const timeLabel = (t: number) =>
  new Date(t).toLocaleString("sv-SE", { weekday: "long", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
const dayKey = (t: number) => new Date(t).toLocaleDateString("sv-SE", { timeZone: TZ });

/** `near`: start with the county whose forecast town is closest, e.g. the reader's own place. */
export function WeatherMap({ near }: { near?: { lat: number; lon: number } }) {
  const map = useWeatherMap();
  const [picked, setCounty] = useState<number | null>(null);
  const [index, setIndex] = useState(0);

  const regions = map.data?.regions ?? [];
  // Time axis: the steps of the region with the most steps (they all share SMHI's model run).
  const times = useMemo(() => {
    const longest = regions.reduce<MapRegion | null>((a, r) => ((r.steps?.length ?? 0) > (a?.steps?.length ?? 0) ? r : a), null);
    return (longest?.steps ?? []).map((s) => parseDate(s.time).getTime());
  }, [regions]);
  // One button per day, jumping to the step closest to 14:00 (roughly the warmest hour).
  const dayButtons = useMemo(() => {
    const byDay = new Map<string, number>();
    times.forEach((t, i) => {
      const key = dayKey(t);
      const hour = Number(new Date(t).toLocaleString("sv-SE", { hour: "2-digit", hour12: false, timeZone: TZ }));
      const prev = byDay.get(key);
      const prevHour = prev == null ? null : Number(new Date(times[prev]).toLocaleString("sv-SE", { hour: "2-digit", hour12: false, timeZone: TZ }));
      if (prev == null || Math.abs(hour - 14) < Math.abs((prevHour ?? 0) - 14)) byDay.set(key, i);
    });
    return [...byDay.entries()].slice(0, 7);
  }, [times]);

  if (map.isPending) return <Loading label="Hämtar väderkartan…" />;
  if (map.error) return <ErrorBox error={map.error} />;
  if (!times.length) return <ErrorBox error={map.data.error ?? "SMHI:s prognoser kunde inte hämtas."} />;

  const i = Math.min(index, times.length - 1);
  const time = times[i];
  const closest = near
    ? regions.reduce((a, r) => (Math.hypot(r.lat - near.lat, r.lon - near.lon) < Math.hypot(a.lat - near.lat, a.lon - near.lon) ? r : a))
    : regions.find((r) => r.id === 1);
  const region = regions.find((r) => r.id === picked) ?? closest ?? regions[0];
  const step = stepAt(region, time);
  const tempAt = (id: number) => {
    const r = regions.find((x) => x.id === id);
    return r ? stepAt(r, time)?.temperature : null;
  };
  const todayKey = dayKey(Date.now());

  return (
    <div className="focus-card weather-map-card">
      <div className="focus-head">
        <div>
          <p className="kicker">Väderkarta</p>
          <h2 className="map-time">{timeLabel(time)}</h2>
        </div>
      </div>
      <div className="segmented day-buttons" role="group" aria-label="Dag">
        {dayButtons.map(([key, idx]) => (
          <button key={key} aria-pressed={dayKey(time) === key} onClick={() => setIndex(idx)}>
            {key === todayKey ? "Idag" : new Date(times[idx]).toLocaleDateString("sv-SE", { weekday: "short", timeZone: TZ })}
          </button>
        ))}
      </div>
      <div className="time-slider">
        <button className="icon" aria-label="Föregående tid" disabled={i === 0} onClick={() => setIndex(i - 1)}>
          ‹
        </button>
        <input
          type="range"
          min={0}
          max={times.length - 1}
          value={i}
          onChange={(e) => setIndex(Number(e.target.value))}
          aria-label="Tidpunkt"
          aria-valuetext={timeLabel(time)}
        />
        <button className="icon" aria-label="Nästa tid" disabled={i === times.length - 1} onClick={() => setIndex(i + 1)}>
          ›
        </button>
      </div>

      <div className="map-layout">
        <div className="map-box">
          <SwedenMap
            label="Temperatur per län"
            fill={(id) => tempColor(tempAt(id))}
            countyClass={(id) => {
              const level = regions.find((r) => r.id === id)?.warning_level;
              return level ? `has-warning level-${level.toLowerCase()}` : "";
            }}
            title={(id) => {
              const r = regions.find((x) => x.id === id);
              return r ? `${r.name}: ${formatTemp(tempAt(id))} i ${r.place}` : "";
            }}
            selected={region.id}
            onSelect={setCounty}
          >
            {regions.map((r) => {
              const [x, y] = project(r.lat, r.lon);
              const s = stepAt(r, time);
              return (
                <g key={r.id} pointerEvents="none">
                  <circle cx={x} cy={y} r={4} className="map-dot" />
                  <MapLabel x={x} y={y - 9} className="map-temp">
                    {formatTemp(s?.temperature)}
                  </MapLabel>
                </g>
              );
            })}
          </SwedenMap>
          <ul className="map-legend small" aria-label="Färgskala, temperatur">
            {TEMP_BINS.map((b) => (
              <li key={b.label}>
                <span className="swatch" style={{ background: b.color }} />
                {b.label}
              </li>
            ))}
          </ul>
          {regions.some((r) => r.warning_level) && (
            <p className="muted small">Län med tjock kantlinje har en aktiv varning från SMHI.</p>
          )}
        </div>

        <div className="map-details">
          <label className="county-select small">
            Län
            <select value={region.id} onChange={(e) => setCounty(Number(e.target.value))}>
              {[...regions].sort((a, b) => a.name.localeCompare(b.name, "sv")).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <h3 className="place-name">{region.place}</h3>
          {region.error && <div className="warn small">{region.error}</div>}
          {step && (
            <dl className="now-grid">
              <div className="now-temp">
                <dt className="visually-hidden">Temperatur</dt>
                <dd>
                  <span aria-hidden>{symbolIcon(step.symbol)}</span> {formatTemp(step.temperature)}
                </dd>
              </div>
              <div>
                <dt>Väder</dt>
                <dd>{step.symbol_text || "–"}</dd>
              </div>
              <div>
                <dt>Vind</dt>
                <dd>
                  {step.wind_speed != null ? `${Math.round(step.wind_speed)} m/s ${compass(step.wind_direction)}` : "–"}
                  {step.wind_gust != null && <span className="muted"> (byar {Math.round(step.wind_gust)})</span>}
                </dd>
              </div>
              <div>
                <dt>Nederbörd</dt>
                <dd>
                  {formatMm(step.precipitation)} mm{step.hours > 1 ? ` på ${step.hours} h` : "/h"}
                </dd>
              </div>
            </dl>
          )}
          {region.warning_level && <p className={`warning-badge level-${region.warning_level.toLowerCase()} small`}>Aktiv varning i länet – se nedan</p>}
        </div>
      </div>

      <h3 className="sidebar-title">Så ändras vädret i {region.place}</h3>
      <p className="muted small">Klicka i diagrammet för att visa den tiden på kartan.</p>
      <ForecastCharts
        steps={region.steps ?? []}
        selected={region.steps?.length ? new Date(time).toISOString() : null}
        onSelect={(t) => {
          const target = parseDate(t).getTime();
          let best = 0;
          times.forEach((v, k) => {
            if (Math.abs(v - target) < Math.abs(times[best] - target)) best = k;
          });
          setIndex(best);
        }}
      />
      {(region.days?.length ?? 0) > 0 && <DaysTable days={region.days ?? []} />}
      <p className="muted small">
        Prognos från SMHI för {region.place}, som får representera {region.name}. Uppdaterad{" "}
        {new Date(map.data.updated_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}.
      </p>
    </div>
  );
}
