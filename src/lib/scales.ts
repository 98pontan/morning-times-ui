// Colour scales for the maps. Values always appear as text too, so colour is never the only cue.

export interface Bin {
  max: number; // upper edge (exclusive); the last bin is open-ended
  color: string; // CSS colour or var()
  label: string;
}

function pick(bins: Bin[], value: number): Bin {
  return bins.find((b) => value < b.max) ?? bins[bins.length - 1];
}

/** Diverging blue <-> red around 0 °C with a neutral grey midpoint (the grey follows the theme). */
export const TEMP_BINS: Bin[] = [
  { max: -15, color: "#104281", label: "< −15°" },
  { max: -8, color: "#256abf", label: "−15…−8°" },
  { max: -3, color: "#5598e7", label: "−8…−3°" },
  { max: -1, color: "#9ec5f4", label: "−3…−1°" },
  { max: 1, color: "var(--scale-neutral)", label: "−1…1°" },
  { max: 5, color: "#f6c7bd", label: "1…5°" },
  { max: 10, color: "#ec8f7e", label: "5…10°" },
  { max: 16, color: "#d65045", label: "10…16°" },
  { max: Infinity, color: "#a62a2a", label: "> 16°" },
];

export const tempColor = (t: number | null | undefined) => (t == null ? "var(--scale-missing)" : pick(TEMP_BINS, t).color);

/** Sequential orange, light -> dark: spot price in öre/kWh. */
export const PRICE_BINS: Bin[] = [
  { max: 30, color: "#fde4d6", label: "< 30" },
  { max: 60, color: "#f9b896", label: "30–60" },
  { max: 100, color: "#f08a5a", label: "60–100" },
  { max: 150, color: "#d95926", label: "100–150" },
  { max: 250, color: "#a8401a", label: "150–250" },
  { max: Infinity, color: "#6e2a10", label: "> 250" },
];

export const priceColor = (p: number | null | undefined) => (p == null ? "var(--scale-missing)" : pick(PRICE_BINS, p).color);

/** Bidding zone per county. The real borders do not follow counties; this is close enough for a map. */
export const ZONE_OF_COUNTY: Record<number, string> = {
  25: "SE1",
  24: "SE2", 23: "SE2", 22: "SE2", 21: "SE2",
  12: "SE4", 10: "SE4", 7: "SE4", 13: "SE4",
};
export const zoneOf = (countyId: number) => ZONE_OF_COUNTY[countyId] ?? "SE3";

/** Where to put each zone's label: [lat, lon]. */
export const ZONE_LABEL_AT: Record<string, [number, number]> = {
  SE1: [67.2, 19.6],
  SE2: [63.6, 16.0],
  SE3: [59.6, 14.6],
  SE4: [56.25, 13.9],
};
