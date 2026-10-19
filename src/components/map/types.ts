import type React from "react";
import type { LatLng } from "../../lib/geo";

export type Insets = { top: number; bottom: number; left?: number; right?: number };

/** What screens can ask of the map. */
export type RideMapHandle = {
  /** Fit one or more points into the visible part of the map (above the sheet, below the header). */
  frame: (points: LatLng[], inset: Insets, animated?: boolean) => void;
};

export type RideMapProps = {
  /** Where the map opens. Defaults to the centre of the service area. */
  center?: LatLng;
  zoom?: number;
  /** Called when the map stops moving after the rider drags it, with the new centre. */
  onCenterChange?: (center: LatLng) => void;
  /** Show our curated Sokoto places on the map. */
  showPlaces?: boolean;
  children?: React.ReactNode;
};
