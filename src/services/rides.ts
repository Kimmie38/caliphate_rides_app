import { ENV } from "../config/env";
import { computeFare, rateFor, billableKm, type PricingConfig, type RideTypeId } from "../lib/pricing";
import type { PaymentMethod, Place, Quote, Ride, TripSummary, WalletTransaction } from "../types";
import { api, ApiError, wait } from "./http";
import { mockRidePayments, mockState } from "./mockData";
import { getRoute } from "./routing";

// Backend contract
// POST /rides/quote        { pickup, destination }                          -> { quotes: Quote[] }
// POST /rides              { pickup, destination, rideType, paymentMethod } -> { ride }
// POST /rides/:id/cancel   { reason? }                                      -> { ride }
// POST /rides/:id/rate     { stars, comment? }                              -> { ok }
// GET  /rides/history                                                       -> { trips: TripSummary[] }
// GET  /wallet                                                              -> { balance, transactions }
// POST /wallet/topup       { amount }                                       -> { authorizationUrl }  (Paystack)
// PATCH /rides/:id/payment { paymentMethod }                                -> { ride }   (change how to pay)
// POST /rides/:id/pay                                                       -> { authorizationUrl }  (card, Paystack)

const toPoint = (p: Place) => ({ name: p.name, latitude: p.location.latitude, longitude: p.location.longitude });

/** One quote per enabled ride type. Fare = billable km × price per km. */
export async function getQuotes(pickup: Place, destination: Place, pricing: PricingConfig): Promise<Quote[]> {
  if (!ENV.useMock) {
    const r = await api<{ quotes: Quote[] }>("/rides/quote", { method: "POST", body: { pickup: toPoint(pickup), destination: toPoint(destination) } });
    return r.quotes;
  }
  const route = await getRoute(pickup.location, destination.location);
  const km = billableKm(route.distanceKm);
  return pricing.rideTypes
    .filter((t) => t.enabled)
    .map((t) => {
      const ratePerKm = rateFor(pricing, t.id);
      const speedFactor = t.id === "keke" ? 1.15 : 1; // keke are a little slower
      return {
        rideType: t.id,
        distanceKm: km,
        durationMin: Math.max(2, Math.round(route.durationMin * speedFactor)),
        ratePerKm,
        fare: computeFare(km, ratePerKm),
        route: route.path,
      };
    });
}

export async function requestRide(input: {
  pickup: Place; destination: Place; rideType: RideTypeId; paymentMethod: PaymentMethod; quote: Quote;
}): Promise<Ride> {
  if (!ENV.useMock) {
    const r = await api<{ ride: Ride }>("/rides", {
      method: "POST",
      body: { pickup: toPoint(input.pickup), destination: toPoint(input.destination), rideType: input.rideType, paymentMethod: input.paymentMethod },
    });
    return r.ride;
  }
  await wait(500);
  if (input.paymentMethod === "wallet" && input.quote.fare > mockState.wallet.balance) {
    throw new ApiError("Your wallet balance is too low for this trip. Pay with cash or add money to your wallet.", 402, "insufficient_balance");
  }
  return {
    id: `ride_${Date.now()}`,
    status: "searching",
    pickup: input.pickup,
    destination: input.destination,
    rideType: input.rideType,
    paymentMethod: input.paymentMethod,
    paymentStatus: "pending",
    distanceKm: input.quote.distanceKm,
    ratePerKm: input.quote.ratePerKm,
    fare: input.quote.fare,
    route: input.quote.route,
    createdAt: new Date().toISOString(),
  };
}

export async function cancelRide(rideId: string, reason?: string): Promise<void> {
  if (ENV.useMock) { await wait(300); return; }
  await api(`/rides/${rideId}/cancel`, { method: "POST", body: { reason } });
}

export async function rateRide(rideId: string, stars: number, comment?: string): Promise<void> {
  if (ENV.useMock) { await wait(300); return; }
  await api(`/rides/${rideId}/rate`, { method: "POST", body: { stars, comment } });
}

/** Records a finished ride in the sample data so Activity and Wallet update. */
export function recordMockCompletion(ride: Ride) {
  if (!ENV.useMock) return;
  mockState.history.unshift({
    id: ride.id,
    pickupName: ride.pickup.name,
    destinationName: ride.destination.name,
    rideType: ride.rideType,
    distanceKm: ride.distanceKm,
    fare: ride.fare,
    paymentMethod: ride.paymentMethod,
    driverName: ride.driver?.name ?? "Driver",
    completedAt: new Date().toISOString(),
  });
  if (ride.paymentMethod === "wallet") {
    mockState.wallet.balance -= ride.fare;
    mockState.wallet.transactions.unshift({ id: `tx_${ride.id}`, kind: "ride", label: `Ride to ${ride.destination.name}`, amount: -ride.fare, at: new Date().toISOString() });
  }
}

export async function getHistory(): Promise<TripSummary[]> {
  if (ENV.useMock) { await wait(250); return [...mockState.history]; }
  return (await api<{ trips: TripSummary[] }>("/rides/history")).trips;
}

export async function getWallet(): Promise<{ balance: number; transactions: WalletTransaction[] }> {
  if (ENV.useMock) { await wait(250); return { balance: mockState.wallet.balance, transactions: [...mockState.wallet.transactions] }; }
  return api("/wallet");
}

/** Starts a Paystack top-up. Returns the checkout URL to open, or null in sample mode (balance is credited directly). */
export async function startTopUp(amount: number): Promise<string | null> {
  if (ENV.useMock) {
    await wait(600);
    mockState.wallet.balance += amount;
    mockState.wallet.transactions.unshift({ id: `tx_${Date.now()}`, kind: "topup", label: "Top up", amount, at: new Date().toISOString(), method: "Sample payment" });
    return null;
  }
  return (await api<{ authorizationUrl: string }>("/wallet/topup", { method: "POST", body: { amount } })).authorizationUrl;
}

/** Switch how a ride is paid (before or after the trip). Wallet payments are taken straight away. */
export async function changePayment(ride: Ride, paymentMethod: PaymentMethod): Promise<Pick<Ride, "paymentMethod" | "paymentStatus">> {
  if (!ENV.useMock) {
    const r = await api<{ ride: Ride }>(`/rides/${ride.id}/payment`, { method: "PATCH", body: { paymentMethod } });
    return { paymentMethod: r.ride.paymentMethod, paymentStatus: r.ride.paymentStatus };
  }
  await wait(300);
  mockRidePayments[ride.id] = paymentMethod;
  if (paymentMethod === "wallet" && ride.status === "completed") {
    if (ride.fare > mockState.wallet.balance) throw new ApiError("Your wallet balance is too low. Choose another way to pay or add money in Wallet.", 402, "insufficient_balance");
    mockState.wallet.balance -= ride.fare;
    mockState.wallet.transactions.unshift({ id: `tx_${ride.id}`, kind: "ride", label: `Ride to ${ride.destination.name}`, amount: -ride.fare, at: new Date().toISOString() });
    return { paymentMethod, paymentStatus: "paid" };
  }
  return { paymentMethod, paymentStatus: "pending" };
}

/** Card payment through Paystack. Returns the checkout URL to open, or null in sample mode (treated as paid). */
export async function payByCard(ride: Ride): Promise<string | null> {
  if (ENV.useMock) { await wait(900); return null; }
  return (await api<{ authorizationUrl: string }>(`/rides/${ride.id}/pay`, { method: "POST" })).authorizationUrl;
}
