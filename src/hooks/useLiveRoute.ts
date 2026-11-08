import { useEffect, useMemo, useRef, useState } from "react";
import { haversineKm, pathLengthKm, snapToPath, type LatLng } from "../lib/geo";
import { getRoute } from "../services/routing";

/** How far off the route (km) before we fetch a new one, like when the driver takes another street. */
const OFF_ROUTE_KM = 0.05;
/** Within this distance of the road, draw the car on the road itself. */
const ON_ROAD_KM = 0.03;
/** Don't fetch a new route more often than this. */
const MIN_REROUTE_MS = 10_000;

type Route = { path: LatLng[]; kmPerMin: number };

export type LiveRoute = {
  /** What's left of the road route, starting at the car. Empty until the route has loaded. */
  path: LatLng[];
  /** The car's position on the road (or its GPS position if it's off the route). */
  position: LatLng | null;
  /** Direction of the road under the car, or null to use the GPS heading. */
  heading: number | null;
  remainingKm: number | null;
  etaMin: number | null;
  /** Goes up each time a new route arrives (useful for re-framing the map). */
  version: number;
};

/**
 * Live road route for tracking, the way Bolt and Uber draw it: the green line follows the roads from
 * the car to where it's going, shrinks as the car drives, and is fetched again if the car leaves it.
 *
 * - `from`: the car's latest position (null hides the route).
 * - `to`: the pickup or the destination.
 * - `seed`: a route already known for this leg (e.g. the trip route from the fare quote), used instead of fetching.
 */
export function useLiveRoute(from: LatLng | null, to: LatLng | null, seed?: LatLng[]): LiveRoute {
  const [route, setRoute] = useState<Route | null>(null);
  const [version, setVersion] = useState(0);
  const fetching = useRef(false);
  const lastFetch = useRef(0);
  const lastIndex = useRef(1);
  const routeFor = useRef(""); // which destination the current route leads to
  const fromRef = useRef(from);
  fromRef.current = from;

  const toKey = to ? `${to.latitude.toFixed(5)},${to.longitude.toFixed(5)}` : "";
  const toKeyRef = useRef(toKey);
  toKeyRef.current = toKey;

  const load = (origin: LatLng, target: LatLng, key: string) => {
    if (fetching.current) return;
    fetching.current = true;
    lastFetch.current = Date.now();
    getRoute(origin, target)
      .then((r) => {
        if (key !== toKeyRef.current) return; // the destination changed while we were fetching
        lastIndex.current = 1;
        routeFor.current = key;
        setRoute({ path: r.path, kmPerMin: r.distanceKm / Math.max(1, r.durationMin) });
        setVersion((v) => v + 1);
      })
      .finally(() => { fetching.current = false; });
  };
  // New destination: start from the known route if there is one, otherwise fetch.
  useEffect(() => {
    setRoute(null);
    lastIndex.current = 1;
    routeFor.current = "";
    if (!to) return;
    const end = seed?.[seed.length - 1];
    if (seed && seed.length >= 2 && end && haversineKm(end, to) < 0.08) {
      const km = pathLengthKm(seed);
      routeFor.current = toKey;
      setRoute({ path: seed, kmPerMin: km / Math.max(1, Math.round((km / 22) * 60)) }); // ~22 km/h in town
      setVersion((v) => v + 1);
    } else if (fromRef.current) {
      load(fromRef.current, to, toKey);
    }
  }, [toKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Where the car is on the route right now.
  const snap = useMemo(() => {
    if (!route || !from) return null;
    const s = snapToPath(route.path, from, lastIndex.current - 1);
    return s;
  }, [route, from?.latitude, from?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps
  if (snap && snap.offsetKm < ON_ROAD_KM) lastIndex.current = snap.index;

  // First position, or the car has left the route: fetch a (new) road route.
  useEffect(() => {
    if (!from || !to) return;
    const haveRoute = routeFor.current === toKey;
    const offRoute = haveRoute && snap !== null && snap.offsetKm > OFF_ROUTE_KM;
    if ((!haveRoute || offRoute) && !fetching.current && Date.now() - lastFetch.current > (haveRoute ? MIN_REROUTE_MS : 0)) load(from, to, toKey);
  }); // runs on every position update; the checks above keep it cheap

  if (!route || !from || !to || !snap) {
    return { path: [], position: from, heading: null, remainingKm: null, etaMin: null, version };
  }
  const onRoad = snap.offsetKm < ON_ROAD_KM;
  const start = onRoad ? snap.point : from;
  const path = [start, ...route.path.slice(snap.index)];
  const remainingKm = pathLengthKm(path);
  return {
    path,
    position: start,
    heading: onRoad ? snap.heading : null,
    remainingKm,
    etaMin: Math.max(1, Math.ceil(remainingKm / Math.max(0.05, route.kmPerMin))),
    version,
  };
}
