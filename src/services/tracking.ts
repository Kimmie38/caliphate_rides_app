import { io } from "socket.io-client";
import { ENV } from "../config/env";
import { pathLengthKm, pointAlong, type LatLng } from "../lib/geo";
import type { DriverPosition, Ride } from "../types";
import { getAuthToken } from "./http";
import { mockRidePayments, MOCK_DRIVERS } from "./mockData";
import { getRoute } from "./routing";

export type RideHandlers = {
  onRide: (ride: Ride) => void;
  onDriverPosition: (pos: DriverPosition) => void;
  onConnection?: (online: boolean) => void;
};

// Real-time contract (Socket.IO, authenticated with the rider's token)
// emit  "ride:subscribe"   { rideId }
// on    "ride:updated"     Ride            (status changes, driver assigned)
// on    "driver:position"  DriverPosition  (every 3–5 s from the driver app)
export function subscribeToRide(ride: Ride, handlers: RideHandlers): () => void {
  if (ENV.useMock) return simulateRide(ride, handlers);

  const socket = io(ENV.apiUrl, { transports: ["websocket"], auth: { token: getAuthToken() }, reconnection: true });
  socket.on("connect", () => {
    handlers.onConnection?.(true);
    socket.emit("ride:subscribe", { rideId: ride.id });
  });
  socket.on("disconnect", () => handlers.onConnection?.(false));
  socket.on("ride:updated", (r: Ride) => r.id === ride.id && handlers.onRide(r));
  socket.on("driver:position", (p: DriverPosition) => handlers.onDriverPosition(p));
  return () => {
    socket.emit("ride:unsubscribe", { rideId: ride.id });
    socket.disconnect();
  };
}

// ---- Sample-mode simulation: a driver accepts, drives to the pickup, waits, then drives the trip. ----
function simulateRide(initial: Ride, h: RideHandlers): () => void {
  let ride = initial;
  let stopped = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const later = (fn: () => void, ms: number) => timers.push(setTimeout(() => !stopped && fn(), ms));
  const emit = (patch: Partial<Ride>) => { ride = { ...ride, ...patch }; h.onRide(ride); };

  const drive = (path: LatLng[], durationMs: number, done: () => void) => {
    const total = pathLengthKm(path);
    const steps = Math.max(8, Math.round(durationMs / 1000));
    for (let i = 0; i <= steps; i++) {
      later(() => {
        const { point, heading } = pointAlong(path, (total * i) / steps);
        h.onDriverPosition({ location: point, heading, at: Date.now() });
        if (i === steps) done();
      }, (durationMs * i) / steps);
    }
  };

  later(async () => {
    const driver = MOCK_DRIVERS[ride.rideType];
    const start = { latitude: ride.pickup.location.latitude + 0.0085, longitude: ride.pickup.location.longitude - 0.0072 };
    h.onDriverPosition({ location: start, heading: 135, at: Date.now() });
    emit({ status: "accepted", driver });
    const approach = await getRoute(start, ride.pickup.location);
    if (stopped) return;
    drive(approach.path, 14000, () => {
      emit({ status: "arrived" });
      later(() => {
        emit({ status: "in_progress" });
        drive(ride.route, 20000, () => {
          const method = mockRidePayments[ride.id] ?? ride.paymentMethod;
          emit({ status: "completed", paymentMethod: method, paymentStatus: method === "wallet" ? "paid" : "pending" });
          // Cash and transfer: the driver taps "Cash received" / "Transfer received" in the driver app.
          later(() => {
            const now = mockRidePayments[ride.id] ?? ride.paymentMethod;
            if (now === "cash" || now === "transfer") emit({ paymentMethod: now, paymentStatus: "paid" });
          }, 7000);
        });
      }, 5000);
    });
  }, 3500);

  return () => { stopped = true; timers.forEach(clearTimeout); };
}
