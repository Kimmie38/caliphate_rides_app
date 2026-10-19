import { io, type Socket } from "socket.io-client";
import { ENV } from "../../config/env";
import { landmarks } from "../../data/landmarks";
import { haversineKm, type LatLng } from "../../lib/geo";
import type { PaymentMethod } from "../../lib/payments";
import { computeFare, DEFAULT_PRICING, rateFor, billableKm } from "../../lib/pricing";
import type { DriverPosition, EarningsTrip, RideRequest, Trip, TripStage, VehicleType } from "../types";
import { api, getAuthToken, wait } from "../../services/http";
import { getRoute } from "../../services/routing";

// Backend contract (driver side)
// Socket.IO (auth: { token })
//   emit "driver:online"    { online, vehicleType }
//   emit "driver:position"  { location, heading, at }      every few seconds while online
//   on   "ride:request"     RideRequest                    a nearby rider wants a trip
//   on   "ride:cancelled"   { rideId }                     the rider cancelled
//   on   "ride:paid"        { rideId }                     in-app payment confirmed by Paystack
// REST
//   POST /driver/rides/:id/accept | /decline | /arrived | /start | /complete
//   POST /driver/rides/:id/payment-received   { received: true }   (cash and transfer)
//   GET  /driver/earnings                       -> { trips: EarningsTrip[] }

export type DriverHandlers = {
  onRequest: (r: RideRequest) => void;
  onCancelled: (rideId: string) => void;
  onPaid: (rideId: string) => void;
};

let socket: Socket | null = null;

/** Goes online. `isFree` tells the sample simulation when to send the next request. */
export function connectDriver(handlers: DriverHandlers, getPosition: () => LatLng, vehicleType: VehicleType, isFree: () => boolean): () => void {
  if (ENV.useMock) return simulateRequests(handlers, getPosition, vehicleType, isFree);
  socket = io(ENV.apiUrl, { transports: ["websocket"], auth: { token: getAuthToken() }, reconnection: true });
  socket.on("connect", () => socket?.emit("driver:online", { online: true, vehicleType }));
  socket.on("ride:request", handlers.onRequest);
  socket.on("ride:cancelled", (p: { rideId: string }) => handlers.onCancelled(p.rideId));
  socket.on("ride:paid", (p: { rideId: string }) => handlers.onPaid(p.rideId));
  return () => {
    socket?.emit("driver:online", { online: false });
    socket?.disconnect();
    socket = null;
  };
}

export function sendPosition(p: DriverPosition) {
  socket?.emit("driver:position", p);
}

export async function acceptRequest(id: string) {
  if (ENV.useMock) return wait(400);
  await api(`/driver/rides/${id}/accept`, { method: "POST" });
}
export async function declineRequest(id: string) {
  if (ENV.useMock) return;
  await api(`/driver/rides/${id}/decline`, { method: "POST" }).catch(() => {});
}

const STAGE_ENDPOINT: Partial<Record<TripStage, string>> = { arrived: "arrived", in_progress: "start", payment: "complete" };
export async function moveTrip(id: string, to: TripStage) {
  if (ENV.useMock) return wait(300);
  const ep = STAGE_ENDPOINT[to];
  if (ep) await api(`/driver/rides/${id}/${ep}`, { method: "POST" });
}

export async function confirmPaymentReceived(id: string) {
  if (ENV.useMock) return wait(400);
  await api(`/driver/rides/${id}/payment-received`, { method: "POST", body: { received: true } });
}

// ---------------- Earnings ----------------
const mockEarnings: EarningsTrip[] = [
  { id: "e3", destinationName: "Babbar Kasuwa", rideType: "keke", distanceKm: 3.0, fare: 1500, paymentMethod: "cash", completedAt: isoDaysAgo(0, 9, 14) },
  { id: "e2", destinationName: "UDUS City Campus", rideType: "keke", distanceKm: 5.6, fare: 2800, paymentMethod: "wallet", completedAt: isoDaysAgo(0, 7, 52) },
  { id: "e1", destinationName: "Central Motor Park", rideType: "keke", distanceKm: 4.4, fare: 2200, paymentMethod: "transfer", completedAt: isoDaysAgo(1, 17, 5) },
  { id: "e0", destinationName: "Zabira Mall", rideType: "keke", distanceKm: 2.7, fare: 1350, paymentMethod: "card", completedAt: isoDaysAgo(2, 12, 40) },
];

function isoDaysAgo(days: number, h: number, m: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export async function getEarnings(): Promise<EarningsTrip[]> {
  if (ENV.useMock) { await wait(250); return [...mockEarnings]; }
  return (await api<{ trips: EarningsTrip[] }>("/driver/earnings")).trips;
}

export function recordMockTrip(t: Trip) {
  if (!ENV.useMock) return;
  mockEarnings.unshift({ id: t.id, destinationName: t.destination.name, rideType: t.rideType, distanceKm: t.distanceKm, fare: t.fare, paymentMethod: t.paymentMethod, completedAt: new Date().toISOString() });
}

// ---------------- Sample mode: ride requests near you ----------------
const RIDERS = [
  { name: "Aisha Bello", rating: 4.9, phone: "+2348030000101" },
  { name: "Musa Abdullahi", rating: 4.7, phone: "+2348030000102" },
  { name: "Fatima Usman", rating: 5.0, phone: "+2348030000103" },
  { name: "Yusuf Garba", rating: 4.8, phone: "+2348030000104" },
];
const METHODS: PaymentMethod[] = ["cash", "transfer", "wallet", "card", "cash"];

function simulateRequests(h: DriverHandlers, getPosition: () => LatLng, vehicleType: VehicleType, isFree: () => boolean): () => void {
  let stopped = false;
  let making = false;
  let freeSince = Date.now();
  let n = 0;
  const make = async () => {
    if (stopped || making) return;
    making = true;
    const here = getPosition();
    const all = landmarks();
    const near = all.filter((l) => haversineKm(here, l.location) < 3.5);
    const pickup = (near.length ? near : all)[n % (near.length || all.length)];
    const dests = all.filter((l) => { const km = haversineKm(pickup.location, l.location); return km > 1.2 && km < 7; });
    const destination = dests[(n * 7) % dests.length] ?? all[(n + 3) % all.length];
    const route = await getRoute(pickup.location, destination.location);
    making = false;
    if (stopped || !isFree()) return;
    const ratePerKm = rateFor(DEFAULT_PRICING, vehicleType);
    const km = billableKm(route.distanceKm);
    h.onRequest({
      id: `req_${Date.now()}`,
      rider: RIDERS[n % RIDERS.length],
      pickup, destination, rideType: vehicleType,
      distanceKm: km, durationMin: route.durationMin, ratePerKm, fare: computeFare(km, ratePerKm),
      paymentMethod: METHODS[n % METHODS.length],
      route: route.path,
      expiresAt: Date.now() + 20000,
    });
    n++;
  };
  // A new request about 6 seconds after the driver becomes free.
  const tick = setInterval(() => {
    if (!isFree()) { freeSince = Date.now(); return; }
    if (Date.now() - freeSince >= 6000) { freeSince = Date.now() + 60000; make(); }
  }, 1000);
  return () => { stopped = true; clearInterval(tick); };
}

/** Sample mode: the rider pays by card a few seconds after the trip ends. */
export function mockCardPayment(rideId: string, h: Pick<DriverHandlers, "onPaid">) {
  if (ENV.useMock) setTimeout(() => h.onPaid(rideId), 4000);
}
