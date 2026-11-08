import { io, type Socket } from "socket.io-client";
import { ENV } from "../../config/env";
import { landmarks } from "../../data/landmarks";
import { haversineKm, type LatLng } from "../../lib/geo";
import type { PaymentMethod } from "../../lib/payments";
import { computeFare, DEFAULT_PRICING, faresFor, billableKm, splitFare, SAMPLE_COMMISSION_PERCENT, formatNaira } from "../../lib/pricing";
import type { DriverPosition, DriverWallet, EarningsTrip, LedgerEntry, RideRequest, Trip, TripStage, VehicleType, Withdrawal } from "../types";
import { api, getAuthToken, wait } from "../../services/http";
import { getRoute } from "../../services/routing";

// Backend contract (driver side)
// Socket.IO (auth: { token })
//   emit "driver:online"    { online, vehicleType }
//   emit "driver:position"  { location, heading, at }      every few seconds while online
//   on   "ride:request"     RideRequest                    a nearby rider wants a trip
//   on   "ride:cancelled"   { rideId }                     the rider cancelled
//   on   "ride:paid"        { rideId }                     in-app payment confirmed by the payment provider
//   on   "driver:error"     { message }                    going online wasn't allowed (not approved, expired document, owes commission)
//   on   "driver:balance"   { balance, owedLimit, blocked } the balance changed (trip paid, commission, payout)
//   on   "ride:payment"     { rideId, paymentMethod, paymentStatus }  the rider changed how they'll pay
// REST
//   POST /driver/rides/:id/accept | /decline | /arrived | /start | /complete
//   POST /driver/rides/:id/payment-received   { received: true }   (cash and transfer)
//   GET  /driver/earnings                       -> { trips: EarningsTrip[] }
//   GET  /driver/rides/current                  -> { trip | null }   (after a restart)
//   GET  /driver/wallet                         -> DriverWallet
//   POST /driver/withdrawals  { amount }        -> { withdrawal, balance }   (to the driver's bank)
//   POST /driver/wallet/pay   { amount? }       -> { checkoutUrl }           (pay commission owed: payment page)
//   POST /driver/bank/verify                    -> { bank }

export type DriverHandlers = {
  onRequest: (r: RideRequest) => void;
  onCancelled: (rideId: string) => void;
  onPaid: (rideId: string) => void;
  /** The server refused to put the driver online; show the message and go offline. */
  onError?: (message: string) => void;
  /** The balance changed on the server. */
  onBalance?: (b: { balance: number; owedLimit: number; blocked: boolean }) => void;
  onPaymentChanged?: (p: { rideId: string; paymentMethod: PaymentMethod; paymentStatus: "pending" | "paid" }) => void;
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
  socket.on("driver:error", (p: { message?: string }) => handlers.onError?.(p?.message ?? "You can't go online right now."));
  socket.on("driver:balance", (p: { balance: number; owedLimit: number; blocked: boolean }) => handlers.onBalance?.(p));
  socket.on("ride:payment", (p: { rideId: string; paymentMethod: PaymentMethod; paymentStatus: "pending" | "paid" }) => handlers.onPaymentChanged?.(p));
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
/** Moves the trip on. Returns how the ride is paid as the server sees it (e.g. after completing). */
export async function moveTrip(id: string, to: TripStage): Promise<{ paymentMethod: PaymentMethod; paymentStatus: "pending" | "paid" } | null> {
  if (ENV.useMock) { await wait(300); return null; }
  const ep = STAGE_ENDPOINT[to];
  if (!ep) return null;
  const r = await api<{ ride?: { paymentMethod: PaymentMethod; paymentStatus: "pending" | "paid" } }>(`/driver/rides/${id}/${ep}`, { method: "POST" });
  return r.ride ? { paymentMethod: r.ride.paymentMethod, paymentStatus: r.ride.paymentStatus } : null;
}

/** The trip in progress, so the app can pick up where it left off after a restart. */
export async function getCurrentTrip(): Promise<Trip | null> {
  if (ENV.useMock) return null;
  return (await api<{ trip: Trip | null }>("/driver/rides/current")).trip;
}

export async function confirmPaymentReceived(id: string) {
  if (ENV.useMock) return wait(400);
  await api(`/driver/rides/${id}/payment-received`, { method: "POST", body: { received: true } });
}

// ---------------- Earnings ----------------
const withSplit = (t: Omit<EarningsTrip, "commission" | "driverEarning">): EarningsTrip => ({ ...t, ...splitFare(t.fare, SAMPLE_COMMISSION_PERCENT), paymentStatus: "paid" });
const mockEarnings: EarningsTrip[] = [
  withSplit({ id: "e3", destinationName: "Babbar Kasuwa", rideType: "keke", distanceKm: 3.0, fare: 1500, paymentMethod: "cash", completedAt: isoDaysAgo(0, 9, 14) }),
  withSplit({ id: "e2", destinationName: "UDUS City Campus", rideType: "keke", distanceKm: 5.6, fare: 2800, paymentMethod: "wallet", completedAt: isoDaysAgo(0, 7, 52) }),
  withSplit({ id: "e1", destinationName: "Central Motor Park", rideType: "keke", distanceKm: 4.4, fare: 2200, paymentMethod: "transfer", completedAt: isoDaysAgo(1, 17, 5) }),
  withSplit({ id: "e0", destinationName: "Zabira Mall", rideType: "keke", distanceKm: 2.7, fare: 1350, paymentMethod: "card", completedAt: isoDaysAgo(2, 12, 40) }),
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
  const trip: EarningsTrip = {
    id: t.id, destinationName: t.destination.name, rideType: t.rideType, distanceKm: t.distanceKm, fare: t.fare,
    commission: t.commission, driverEarning: t.driverEarning, paymentMethod: t.paymentMethod, paymentStatus: "paid", completedAt: new Date().toISOString(),
  };
  mockEarnings.unshift(trip);
  addTripToMockLedger(trip);
}

// ---------------- Money: balance, withdrawals, paying what's owed ----------------
// Commission comes off the balance for every trip. Card and wallet trips are paid to Caliphate Rides, so
// their full fare is added. Cash and transfer trips are paid to the driver, so the balance can go below
// zero: that's commission owed.

const mockMoney = { ledger: [] as LedgerEntry[], withdrawals: [] as Withdrawal[], balance: 0 };
const inApp = (m: string) => m === "card" || m === "wallet";

function mockPost(kind: LedgerEntry["kind"], label: string, amount: number, at = new Date().toISOString()) {
  mockMoney.balance += amount;
  mockMoney.ledger.unshift({ id: `l_${mockMoney.ledger.length}_${Date.now()}`, kind, label, amount, balanceAfter: mockMoney.balance, at });
}
function addTripToMockLedger(t: EarningsTrip) {
  if (inApp(t.paymentMethod)) mockPost("fare", `${t.paymentMethod === "card" ? "Card" : "Wallet"} payment for trip to ${t.destinationName}`, t.fare, t.completedAt);
  mockPost("commission", `Commission (${SAMPLE_COMMISSION_PERCENT}%) on trip to ${t.destinationName}`, -(t.commission ?? 0), t.completedAt);
}
[...mockEarnings].reverse().forEach(addTripToMockLedger);

const MOCK_SETTINGS = { commissionPercent: SAMPLE_COMMISSION_PERCENT, owedLimit: 5000, minWithdrawal: 1000 };

export async function getDriverWallet(bankName = "your bank", accountNumber = ""): Promise<DriverWallet> {
  if (!ENV.useMock) return api<DriverWallet>("/driver/wallet");
  await wait(250);
  const b = mockMoney.balance;
  return {
    balance: b, owed: b < 0 ? -b : 0, blocked: b < -MOCK_SETTINGS.owedLimit, settings: MOCK_SETTINGS,
    bank: { bankName, accountEnding: accountNumber.slice(-4) || "6789", verifiedName: "SAMPLE ACCOUNT NAME", canWithdraw: true },
    ledger: [...mockMoney.ledger], withdrawals: [...mockMoney.withdrawals],
  };
}

export async function withdraw(amount: number, bankName = "your bank"): Promise<{ withdrawal: Withdrawal; balance: number }> {
  if (!ENV.useMock) return api("/driver/withdrawals", { method: "POST", body: { amount } });
  await wait(700);
  if (amount < MOCK_SETTINGS.minWithdrawal) throw new Error(`You can withdraw ${formatNaira(MOCK_SETTINGS.minWithdrawal)} or more.`);
  if (amount > mockMoney.balance) throw new Error(`Your balance is ${formatNaira(Math.max(0, mockMoney.balance))}.`);
  const w: Withdrawal = { id: `w_${Date.now()}`, amount, status: "processing", bankName, accountEnding: "6789", createdAt: new Date().toISOString() };
  mockMoney.withdrawals.unshift(w);
  mockPost("withdrawal", `Withdrawal to ${bankName} ••6789`, -amount);
  setTimeout(() => { w.status = "successful"; w.completedAt = new Date().toISOString(); }, 5000); // sample: the bank confirms
  return { withdrawal: w, balance: mockMoney.balance };
}

/** Pay commission owed. Returns the payment checkout to open, or null in sample mode (paid straight away). */
export async function payOwed(amount?: number): Promise<string | null> {
  if (!ENV.useMock) return (await api<{ checkoutUrl: string }>("/driver/wallet/pay", { method: "POST", body: amount ? { amount } : {} })).checkoutUrl;
  await wait(700);
  const owed = Math.max(0, -mockMoney.balance);
  if (owed) mockPost("payment", "You paid Caliphate Rides", amount ?? owed);
  return null;
}

export async function recheckBank(): Promise<void> {
  if (ENV.useMock) { await wait(400); return; }
  await api("/driver/bank/verify", { method: "POST" });
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
    const fares = faresFor(DEFAULT_PRICING, vehicleType);
    const km = billableKm(route.distanceKm);
    const fare = computeFare(km, fares, DEFAULT_PRICING.roundTo);
    h.onRequest({
      id: `req_${Date.now()}`,
      rider: RIDERS[n % RIDERS.length],
      pickup, destination, rideType: vehicleType,
      distanceKm: km, durationMin: route.durationMin,
      baseFare: fares.baseFare, ratePerKm: fares.perKm, minimumFare: fares.minimumFare,
      fare, ...splitFare(fare, SAMPLE_COMMISSION_PERCENT),
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
