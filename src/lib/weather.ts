// Formatting for the weather page and the brief's weather block.
import { parseDate } from "./format";

const TZ = "Europe/Stockholm";

export const LEVELS = [
  { code: "YELLOW", label: "Gul" },
  { code: "ORANGE", label: "Orange" },
  { code: "RED", label: "Röd" },
  { code: "MESSAGE", label: "Meddelande" },
] as const;

export function formatTemp(value: number | null | undefined): string {
  return value == null ? "–" : `${Math.round(value)}°`;
}

export function formatMm(value: number | null | undefined): string {
  if (value == null) return "–";
  return value < 0.1 ? "0" : value.toLocaleString("sv-SE", { maximumFractionDigits: 1 });
}

/** Wind direction (degrees the wind comes from) as a compass point, e.g. 200 -> "S". */
export function compass(degrees: number | null | undefined): string {
  if (degrees == null) return "";
  const points = ["N", "NO", "O", "SO", "S", "SV", "V", "NV"];
  return points[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}

export function hourLabel(value: string): string {
  return parseDate(value).toLocaleTimeString("sv-SE", { hour: "2-digit", timeZone: TZ });
}

export function dayLabel(isoDate: string, today: Date = new Date()): string {
  const todayIso = today.toLocaleDateString("sv-SE", { timeZone: TZ });
  const tomorrow = new Date(today.getTime() + 86_400_000).toLocaleDateString("sv-SE", { timeZone: TZ });
  if (isoDate === todayIso) return "Idag";
  if (isoDate === tomorrow) return "Imorgon";
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "numeric" });
}

/** "tor 13/11 18:00 – fre 14/11 09:00" in Swedish time. */
export function period(start: string | null | undefined, end: string | null | undefined): string {
  const fmt = (v: string) =>
    parseDate(v).toLocaleString("sv-SE", {
      weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ,
    });
  if (!start && !end) return "";
  return `${start ? fmt(start) : "?"} – ${end ? fmt(end) : "tills vidare"}`;
}

/** Map from a SMHI symbol (1-27) to a small emoji, so the forecast is readable at a glance. */
export function symbolIcon(symbol: number | null | undefined): string {
  if (symbol == null) return "";
  if (symbol === 1) return "☀️";
  if (symbol <= 3) return "🌤️";
  if (symbol === 4) return "⛅";
  if (symbol <= 6) return "☁️";
  if (symbol === 7) return "🌫️";
  if (symbol === 11 || symbol === 21) return "⛈️";
  if (symbol <= 10 || (symbol >= 18 && symbol <= 20)) return "🌧️";
  if (symbol <= 14 || (symbol >= 22 && symbol <= 24)) return "🌨️";
  return "❄️";
}
