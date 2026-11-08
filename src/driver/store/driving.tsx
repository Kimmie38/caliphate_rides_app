import * as Location from "expo-location";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ENV } from "../../config/env";
import { inServiceArea, relocateTo, serviceCenter } from "../../lib/area";
import type { LatLng } from "../../lib/geo";
import { formatNaira } from "../../lib/pricing";
import * as trips from "../services/trips";
import type { DriverPosition, RideRequest, Trip, TripStage, VehicleType } from "../types";

type LocationStatus = "loading" | "ready" | "denied" | "outside" | "demo";

type Value = {
  position: DriverPosition;
  locationStatus: LocationStatus;
  online: boolean;
  goOnline: (vehicleType: VehicleType) => void;
  goOffline: () => void;
  request: RideRequest | null;
  accept: () => Promise<void>;
  decline: () => void;
  trip: Trip | null;
  advance: (to: TripStage) => Promise<void>;
  confirmReceived: () => Promise<void>;
  finishTrip: () => void;
  notice: string | null;
  clearNotice: () => void;
};

const Ctx = createContext<Value | null>(null);

export function DrivingProvider({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = useState<DriverPosition>({ location: serviceCenter(), heading: 0, at: Date.now() });
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("loading");
  const [online, setOnline] = useState(false);
  const [request, setRequest] = useState<RideRequest | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const posRef = useRef(position.location);
  const busy = useRef({ request: false, trip: false });
  busy.current = { request: !!request, trip: !!trip };
  const disconnect = useRef<(() => void) | null>(null);
  const tripRef = useRef<Trip | null>(null);
  tripRef.current = trip;

  // First fix of the driver's position.
  useEffect(() => {
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== "granted") return setLocationStatus("denied");
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => Location.getLastKnownPositionAsync());
        if (!pos) return setLocationStatus("denied");
        const here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        if (!inServiceArea(here)) {
          if (ENV.useMock && ENV.demoAtMyLocation) { relocateTo(here); setLocationStatus("demo"); }
          else setLocationStatus("outside");
        } else setLocationStatus("ready");
        posRef.current = here;
        setPosition({ location: here, heading: pos.coords.heading ?? 0, at: Date.now() });
      } catch {
        setLocationStatus("denied");
      }
    })();
  }, []);

  // While online, follow the phone's GPS and share it with the server (and the rider during a trip).
  // Note: this runs while the app is open. Tracking with the screen off needs a background task
  // (expo-task-manager) in a development build; that comes with the backend.
  useEffect(() => {
    if (!online || locationStatus === "denied") return;
    let sub: Location.LocationSubscription | null = null;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 10 }, (p) => {
      const next: DriverPosition = { location: { latitude: p.coords.latitude, longitude: p.coords.longitude }, heading: p.coords.heading ?? 0, at: Date.now() };
      posRef.current = next.location;
      setPosition(next);
      trips.sendPosition(next);
    }).then((s) => { sub = s; }).catch(() => {});
    // GPS only reports movement, so a driver parked at a rank would go quiet. Check in regularly so the
    // server keeps offering them rides (it treats drivers it hasn't heard from in 90 s as gone).
    const heartbeat = setInterval(() => trips.sendPosition({ location: posRef.current, heading: 0, at: Date.now() }), 15_000);
    return () => { sub?.remove(); clearInterval(heartbeat); };
  }, [online, locationStatus]);

  const handlers: trips.DriverHandlers = {
    onRequest: (r) => setRequest(r),
    onCancelled: (id) => {
      setRequest((r) => (r?.id === id ? null : r));
      if (tripRef.current?.id === id) { setTrip(null); setNotice("The rider cancelled this trip."); }
    },
    onPaid: (id) => setTrip((t) => (t && t.id === id ? { ...t, paymentStatus: "paid" } : t)),
    onPaymentChanged: (p) => {
      setTrip((t) => (t && t.id === p.rideId ? { ...t, paymentMethod: p.paymentMethod, paymentStatus: p.paymentStatus } : t));
      setRequest((r) => (r && r.id === p.rideId ? { ...r, paymentMethod: p.paymentMethod } : r));
    },
    onBalance: (b) => {
      if (b.blocked) setNotice(`You owe ${formatNaira(-b.balance)} in commission, more than the ${formatNaira(b.owedLimit)} limit. Pay it from Earnings to keep getting trips.`);
    },
    onError: (message) => {
      disconnect.current?.();
      disconnect.current = null;
      setOnline(false);
      setRequest(null);
      setNotice(message);
    },
  };
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const goOnline = useCallback((vehicleType: VehicleType) => {
    disconnect.current?.();
    disconnect.current = trips.connectDriver(
      {
        onRequest: (r) => handlersRef.current.onRequest(r),
        onCancelled: (id) => handlersRef.current.onCancelled(id),
        onPaid: (id) => handlersRef.current.onPaid(id),
        onError: (message) => handlersRef.current.onError?.(message),
        onBalance: (b) => handlersRef.current.onBalance?.(b),
        onPaymentChanged: (p) => handlersRef.current.onPaymentChanged?.(p),
      },
      () => posRef.current,
      vehicleType,
      () => !busy.current.request && !busy.current.trip,
    );
    setOnline(true);
  }, []);

  const goOffline = useCallback(() => {
    disconnect.current?.();
    disconnect.current = null;
    setOnline(false);
    setRequest(null);
  }, []);

  useEffect(() => () => disconnect.current?.(), []);

  // After a restart, pick up a trip that's still in progress.
  useEffect(() => {
    trips.getCurrentTrip().then((t) => { if (t && t.stage !== "done") setTrip((cur) => cur ?? t); }).catch(() => {});
  }, []);

  // A request disappears if the driver doesn't answer in time.
  useEffect(() => {
    if (!request) return;
    const t = setTimeout(() => setRequest((r) => (r?.id === request.id ? null : r)), Math.max(0, request.expiresAt - Date.now()));
    return () => clearTimeout(t);
  }, [request]);

  const value: Value = {
    position, locationStatus, online, goOnline, goOffline,
    request,
    accept: async () => {
      if (!request) return;
      await trips.acceptRequest(request.id);
      setTrip({ ...request, stage: "to_pickup", acceptedAt: new Date().toISOString(), paymentStatus: "pending" });
      setRequest(null);
    },
    decline: () => {
      if (request) trips.declineRequest(request.id);
      setRequest(null);
    },
    trip,
    advance: async (to) => {
      if (!trip) return;
      const server = await trips.moveTrip(trip.id, to);
      if (to === "payment") {
        // Wallet is charged automatically; card waits for the payment provider; cash and transfer wait for the driver.
        // With the backend, use what it says (e.g. a wallet that was too low stays unpaid).
        const paymentMethod = server?.paymentMethod ?? trip.paymentMethod;
        const paid = server ? server.paymentStatus === "paid" : trip.paymentMethod === "wallet";
        setTrip({ ...trip, paymentMethod, stage: "payment", paymentStatus: paid ? "paid" : "pending" });
        if (trip.paymentMethod === "card") trips.mockCardPayment(trip.id, { onPaid: (id) => handlersRef.current.onPaid(id) });
        return;
      }
      setTrip({ ...trip, stage: to });
    },
    confirmReceived: async () => {
      if (!trip) return;
      await trips.confirmPaymentReceived(trip.id);
      setTrip({ ...trip, paymentStatus: "paid" });
    },
    finishTrip: () => {
      if (trip) trips.recordMockTrip(trip);
      setTrip(null);
    },
    notice,
    clearNotice: () => setNotice(null),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDriving(): Value {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDriving must be used inside DrivingProvider");
  return ctx;
}

export type { LatLng };
