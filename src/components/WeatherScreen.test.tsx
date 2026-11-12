import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import type { Section, WeatherOverview } from "../api/client";
import { SectionSettingsPage } from "../pages/settings/SectionSettingsPage";
import { compass, formatMm, symbolIcon } from "../lib/weather";
import { WeatherScreen } from "./WeatherScreen";

const section: Section = { id: 7, slug: "vader", name: "Väder", kind: "weather", enabled: true, position: 2, settings: {} };
const step = (time: string, temperature: number, precipitation = 0) => ({
  time, hours: 1, temperature, symbol: 6, symbol_text: "Mulet", precipitation, wind_speed: 4.2, wind_gust: 9, wind_direction: 200,
});
const overview: WeatherOverview = {
  updated_at: "2026-11-12T15:00:00+01:00",
  error: null,
  warnings: [{
    id: 10766, event: "Snöfall", event_code: "SNOW", level: "ORANGE", level_name: "Orange varning",
    area_name: "Norra Stockholms län", areas: ["Stockholms län"], alerting: true,
    start: "2026-11-12T17:00:00Z", end: "2026-11-13T08:00:00Z", published: null,
    descriptions: { "Vad händer?": "Mycket snö." },
  }],
  places: [{
    name: "Stockholm", lat: 59.33, lon: 18.07, watch_item_id: 2, error: null,
    now: step("2026-11-12T15:00:00Z", 5.3),
    hours: [step("2026-11-12T15:00:00Z", 5.3, 1.3), step("2026-11-12T16:00:00Z", 5)],
    days: [{ date: "2026-11-13", min_temp: 0.6, max_temp: 3.6, precipitation: 4.4, symbol: 18, symbol_text: "Lätt regn", max_wind: 6.3 }],
  }],
};
const areas = [
  { id: 1, name: "Stockholms län", kind: "county", watch_item_id: 1, enabled: true, levels: ["YELLOW", "ORANGE"] },
  { id: 12, name: "Skåne län", kind: "county", watch_item_id: null, enabled: false, levels: ["YELLOW", "ORANGE", "RED"] },
  { id: 48, name: "Norra Östersjön", kind: "sea", watch_item_id: null, enabled: false, levels: [] },
];
const puts: { url: string; body: unknown }[] = [];

beforeEach(() => {
  puts.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PUT") puts.push({ url, body: JSON.parse(String(init.body)) });
    const body = url.endsWith("/weather") ? overview
      : url.endsWith("/sections") ? [section]
      : url.endsWith("/warning-areas") ? areas
      : url.includes("/warning-areas/") ? areas[0]
      : url.endsWith("/section-kinds") ? [{ kind: "weather", description: "", item_types: ["keyword", "place", "warning_area"] }]
      : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
});

const wrap = (ui: React.ReactNode, path = "/") => (
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
  </QueryClientProvider>
);

test("shows SMHI warnings and the forecast for followed places", async () => {
  render(wrap(<WeatherScreen section={section} />));
  expect(await screen.findByText("Orange varning")).toBeInTheDocument();
  expect(screen.getByText(/Norra Stockholms län/)).toBeInTheDocument();
  expect(screen.getByText(/larmar/)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Stockholm" })).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Timprognos för Stockholm" }).children).toHaveLength(2);
  expect(screen.getByText("1,3 mm")).toBeInTheDocument();
  expect(screen.getByText("1° / 4°")).toBeInTheDocument();
});

test("settings: follow an area and change which levels are emailed", async () => {
  render(wrap(
    <Routes>
      <Route path="/settings/sections/:id" element={<SectionSettingsPage />} />
    </Routes>,
    "/settings/sections/7",
  ));
  const levels = await screen.findByRole("group", { name: "Larmnivåer för Stockholms län" });
  const red = levels.querySelector<HTMLInputElement>(".level-red input")!;
  expect(red.checked).toBe(false);
  fireEvent.click(red);
  await waitFor(() =>
    expect(puts.at(-1)).toEqual({ url: "/api/sections/7/warning-areas/1", body: { enabled: true, levels: ["YELLOW", "ORANGE", "RED"] } }),
  );

  fireEvent.click(screen.getByRole("checkbox", { name: "Skåne län" }));
  await waitFor(() => expect(puts.at(-1)).toEqual({ url: "/api/sections/7/warning-areas/12", body: { enabled: true } }));
  // Warning areas are managed in their own panel, not offered as a free-form watch item type.
  expect(screen.queryByRole("option", { name: "Varningsområde" })).not.toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Plats (prognos)" })).toBeInTheDocument();
});

test("weather formatting helpers", () => {
  expect(compass(200)).toBe("S");
  expect(compass(350)).toBe("N");
  expect(formatMm(0.04)).toBe("0");
  expect(symbolIcon(26)).toBe("❄️");
  expect(symbolIcon(19)).toBe("🌧️");
});
