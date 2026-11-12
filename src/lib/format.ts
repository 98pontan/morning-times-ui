// Date helpers. The backend returns UTC timestamps; SQLite (local dev) drops the "+00:00",
// so a timestamp without a zone is treated as UTC, not local time.

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/;

export function parseDate(value: string): Date {
  return new Date(HAS_ZONE.test(value) || value.length <= 10 ? value : `${value}Z`);
}

const relative = new Intl.RelativeTimeFormat("sv", { numeric: "auto" });

export function timeAgo(value: string, now: Date = new Date()): string {
  const seconds = (parseDate(value).getTime() - now.getTime()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "nyss";
}

export function longDate(value: string | Date): string {
  const date = typeof value === "string" ? parseDate(value) : value;
  return date.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function shortDateTime(value: string): string {
  return parseDate(value).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
}
