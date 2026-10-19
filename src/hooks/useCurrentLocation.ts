import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { ENV } from "../config/env";
import { inServiceArea, relocateTo, serviceCenter } from "../lib/area";
import type { LatLng } from "../lib/geo";

export type LocationState =
  | { status: "loading"; location: LatLng }
  | { status: "ready"; location: LatLng }
  | { status: "denied"; location: LatLng }
  | { status: "outside"; location: LatLng }
  | { status: "demo"; location: LatLng }; // sample mode outside Sokoto: Sokoto's layout moved to your position

/** The rider's position. Falls back to the centre of the service area when permission is denied. */
export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>({ status: "loading", location: serviceCenter() });

  const locate = useCallback(async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") return setState({ status: "denied", location: serviceCenter() });
      const last = await Location.getLastKnownPositionAsync();
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => last);
      if (!pos) return setState({ status: "denied", location: serviceCenter() });
      const here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      if (inServiceArea(here)) return setState({ status: "ready", location: here });
      if (ENV.useMock && ENV.demoAtMyLocation) {
        // Try-it-anywhere: put central Sokoto (and every landmark) around where you are.
        relocateTo(here);
        return setState({ status: "demo", location: here });
      }
      setState({ status: "outside", location: here });
    } catch {
      setState({ status: "denied", location: serviceCenter() });
    }
  }, []);

  useEffect(() => { locate(); }, [locate]);

  return { ...state, refresh: locate };
}
