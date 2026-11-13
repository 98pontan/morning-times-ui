// SVG map of Sweden's 21 counties (geometry in lib/swedenMap.ts). Callers colour the counties and draw
// labels/arrows on top through `children`, using project() for coordinates.
import type { KeyboardEvent, ReactNode } from "react";
import { COUNTIES, MAP_HEIGHT, MAP_WIDTH } from "../lib/swedenMap";

export function SwedenMap(props: {
  fill: (countyId: number) => string;
  /** Extra class per county, e.g. a warning outline. */
  countyClass?: (countyId: number) => string;
  title: (countyId: number) => string;
  selected?: number | null;
  onSelect?: (countyId: number) => void;
  /** Extra room around Sweden, e.g. for arrows to the neighbours: [top, right, bottom, left]. */
  margin?: [number, number, number, number];
  label: string;
  children?: ReactNode;
}) {
  const [top, right, bottom, left] = props.margin ?? [4, 4, 4, 4];
  const select = props.onSelect;
  const onKey = (id: number) => (e: KeyboardEvent) => {
    if (select && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      select(id);
    }
  };
  return (
    <svg
      className="sweden-map"
      viewBox={`${-left} ${-top} ${MAP_WIDTH + left + right} ${MAP_HEIGHT + top + bottom}`}
      role="group"
      aria-label={props.label}
    >
      {COUNTIES.map((c) => (
        <path
          key={c.id}
          d={c.d}
          fill={props.fill(c.id)}
          className={`county ${props.countyClass?.(c.id) ?? ""} ${props.selected === c.id ? "selected" : ""}`}
          role={select ? "button" : undefined}
          tabIndex={select ? 0 : undefined}
          aria-pressed={select ? props.selected === c.id : undefined}
          aria-label={props.title(c.id)}
          onClick={select ? () => select(c.id) : undefined}
          onKeyDown={select ? onKey(c.id) : undefined}
        >
          <title>{props.title(c.id)}</title>
        </path>
      ))}
      {/* The selected county is drawn again on top so its outline is not hidden by neighbours. */}
      {props.selected != null && (
        <path className="county-outline" d={COUNTIES.find((c) => c.id === props.selected)?.d} pointerEvents="none" />
      )}
      {props.children}
    </svg>
  );
}

/** Text with a halo in the surface colour, readable on any fill. */
export function MapLabel(props: { x: number; y: number; children: ReactNode; className?: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={props.x} y={props.y} textAnchor={props.anchor ?? "middle"} className={`map-label ${props.className ?? ""}`} pointerEvents="none">
      {props.children}
    </text>
  );
}
