// Day-by-day summary table (min/max, precipitation, wind) used by the place cards and the weather map.
import type { DayForecast } from "../api/client";
import { dayLabel, formatMm, formatTemp, symbolIcon } from "../lib/weather";

export function DaysTable({ days }: { days: DayForecast[] }) {
  return (
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
  );
}
