import { createContext, useContext, useEffect } from "react";
import type { LatLng } from "../../lib/geo";
import type { RideTypeId } from "../../lib/pricing";

/** Things drawn on top of the map: pins, the driver, the route. */
export type Overlay =
  | { kind: "user" | "pickup" | "drop"; at: LatLng }
  | { kind: "driver"; at: LatLng; heading: number; rideType: RideTypeId }
  | { kind: "route"; path: LatLng[] };

/** Provided by the web map engine. Markers register themselves here instead of rendering native views. */
export const OverlayContext = createContext<{ set: (id: string, overlay: Overlay | null) => void } | null>(null);

/** In the web engine, keeps this overlay on the map while the component is mounted. No-op in the native engine. */
export function useWebOverlay(id: string, overlay: Overlay | null) {
  const ctx = useContext(OverlayContext);
  const key = ctx && overlay ? JSON.stringify(overlay) : ""; // only the web engine needs it
  useEffect(() => {
    if (!ctx) return;
    ctx.set(id, overlay);
  }, [ctx, id, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => ctx?.set(id, null), [ctx, id]);
  return ctx !== null;
}
