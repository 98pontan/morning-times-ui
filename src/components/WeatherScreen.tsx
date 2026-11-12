// Weather section: SMHI warnings for the followed areas, then a forecast per followed place.
import { Link } from "react-router";
import type { PlaceForecast, Section, WeatherWarning } from "../api/client";
import { useWeather } from "../api/hooks";
import { compass, dayLabel, formatMm, formatTemp, hourLabel, period, symbolIcon } from "../lib/weather";
import { ErrorBox, Loading } from "./Layout";

export function WeatherScreen({ section }: { section: Section }) {
  const weather = useWeather(section.id);
  if (weather.isPending) return <Loading label="Hämtar väder…" />;
  if (weather.error) return <ErrorBox error={weather.error} />;
  const { places, warnings, updated_at, error } = weather.data;

  return (
    <section className="weather" aria-label="Väder">
      <h2 className="sidebar-title">Varningar från SMHI</h2>
      {error && <ErrorBox error={error} />}
      {warnings.length === 0 && !error && <p className="muted">Inga varningar för de områden du följer.</p>}
      <ul className="warnings">
        {warnings.map((w) => (
          <WarningCard key={w.id} warning={w} />
        ))}
      </ul>

      {places.map((p) => (
        <PlaceCard key={`${p.name}-${p.lat}-${p.lon}`} place={p} />
      ))}
      {places.length === 0 && (
        <p className="muted">
          Ingen ort vald för prognos. <Link to={`/settings/sections/${section.id}`}>Lägg till en plats →</Link>
        </p>
      )}
      <p className="muted small">
        Uppdaterad {new Date(updated_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })} · Data
        från SMHI. <Link to={`/settings/sections/${section.id}`}>Välj områden och larmnivåer</Link>
      </p>
    </section>
  );
}

function WarningCard({ warning: w }: { warning: WeatherWarning }) {
  const descriptions = Object.entries(w.descriptions ?? {});
  return (
    <li className={`warning level-${w.level.toLowerCase()}`}>
      <details>
        <summary>
          <strong>{w.level_name}</strong>: {w.event} · {w.area_name}
          <span className="muted small">
            {" "}
            {period(w.start, w.end)}
            {w.alerting ? " · larmar" : ""}
          </span>
        </summary>
        <p className="muted small">Berör: {w.areas.join(", ")}</p>
        {descriptions.map(([title, text]) => (
          <div key={title}>
            <h4>{title}</h4>
            {text.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        ))}
      </details>
    </li>
  );
}

function PlaceCard({ place }: { place: PlaceForecast }) {
  const now = place.now;
  const hours = place.hours ?? [];
  const days = place.days ?? [];
  return (
    <div className="focus-card weather-place">
      <div className="focus-head">
        <div>
          <p className="kicker">Prognos</p>
          <h2>{place.name}</h2>
        </div>
        {now && (
          <div className="focus-price">
            <span className="focus-last">
              {symbolIcon(now.symbol)} {formatTemp(now.temperature)}
            </span>
            <span className="muted">
              {now.symbol_text}
              {now.wind_speed != null && ` · ${Math.round(now.wind_speed)} m/s ${compass(now.wind_direction)}`}
            </span>
          </div>
        )}
      </div>
      {place.error && <div className="warn small">{place.error}</div>}

      {hours.length > 0 && (
        <ol className="hours" aria-label={`Timprognos för ${place.name}`}>
          {hours.map((h) => (
            <li key={h.time}>
              <span className="muted small">{hourLabel(h.time)}</span>
              <span title={h.symbol_text}>{symbolIcon(h.symbol)}</span>
              <strong>{formatTemp(h.temperature)}</strong>
              <span className="small precip">{h.precipitation ? `${formatMm(h.precipitation)} mm` : ""}</span>
            </li>
          ))}
        </ol>
      )}

      {days.length > 0 && (
        <div className="table-scroll">
          <table className="table days">
            <thead>
              <tr>
                <th>Dag</th>
                <th />
                <th className="num">Min/max</th>
                <th className="num">Nederbörd</th>
                <th className="num hide-xs">Vind</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date}>
                  <td className="nowrap">{dayLabel(d.date)}</td>
                  <td>
                    {symbolIcon(d.symbol)} <span className="hide-xs">{d.symbol_text}</span>
                  </td>
                  <td className="num">
                    {formatTemp(d.min_temp)} / {formatTemp(d.max_temp)}
                  </td>
                  <td className="num">{formatMm(d.precipitation)} mm</td>
                  <td className="num hide-xs">{d.max_wind != null ? `${Math.round(d.max_wind)} m/s` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
