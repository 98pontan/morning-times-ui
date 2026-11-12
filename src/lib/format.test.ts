import { parseDate, timeAgo } from "./format";

test("timestamps without a zone are UTC", () => {
  expect(parseDate("2026-11-10T06:30:00").toISOString()).toBe("2026-11-10T06:30:00.000Z");
  expect(parseDate("2026-11-10T06:30:00+00:00").toISOString()).toBe("2026-11-10T06:30:00.000Z");
});

test("relative times in Swedish", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  expect(timeAgo("2026-11-10T11:30:00Z", now)).toBe("för 30 minuter sedan");
  expect(timeAgo("2026-11-10T11:59:50Z", now)).toBe("nyss");
});
