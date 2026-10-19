// Sample data used while EXPO_PUBLIC_USE_MOCK=true. Nothing here is real.
import { DEFAULT_PRICING, type PricingConfig, type RideTypeId } from "../lib/pricing";
import type { Driver, PaymentMethod, TripSummary, User, WalletTransaction } from "../types";

/** Payment method changes made during a sample ride (read by the ride simulation). */
export const mockRidePayments: Record<string, PaymentMethod> = {};

export const mockState = {
  pricing: { ...DEFAULT_PRICING, rideTypes: DEFAULT_PRICING.rideTypes.map((r) => ({ ...r })) } as PricingConfig,
  wallet: {
    balance: 3500,
    transactions: [
      { id: "tx2", kind: "ride", label: "Ride to Babbar Kasuwa", amount: -1500, at: "2026-10-12T09:30:00Z" },
      { id: "tx1", kind: "topup", label: "Top up", amount: 5000, at: "2026-10-12T08:55:00Z", method: "Bank transfer" },
    ] as WalletTransaction[],
  },
  history: [
    { id: "r3", pickupName: "Gidan Dare", destinationName: "Babbar Kasuwa", rideType: "keke", distanceKm: 3.0, fare: 1500, paymentMethod: "wallet", driverName: "Abubakar Musa", completedAt: "2026-10-12T09:30:00Z" },
    { id: "r2", pickupName: "Gidan Dare", destinationName: "UDUS City Campus", rideType: "keke", distanceKm: 5.6, fare: 2800, paymentMethod: "transfer", driverName: "Shehu Aliyu", completedAt: "2026-10-10T07:52:00Z" },
    { id: "r1", pickupName: "Federal Secretariat", destinationName: "Sultan Abubakar III International Airport", rideType: "car", distanceKm: 13.9, fare: 6950, paymentMethod: "cash", driverName: "Ibrahim Sani", completedAt: "2026-10-03T16:30:00Z" },
  ] as TripSummary[],
};

export function mockUser(phone: string, name = ""): User {
  return { id: "u_demo", phone, name, rating: 4.9 };
}

export const MOCK_DRIVERS: Record<RideTypeId, Driver> = {
  keke: {
    id: "d_keke", name: "Abubakar Musa", phone: "+2348030000001", rating: 4.9, trips: 1284,
    vehicle: { type: "keke", make: "Bajaj RE", color: "Yellow", plate: "SKT 482 KB" },
    bank: { bankName: "Jaiz Bank", accountNumber: "0123456789", accountName: "Abubakar Musa" },
  },
  car: {
    id: "d_car", name: "Ibrahim Sani", phone: "+2348030000002", rating: 4.8, trips: 642,
    vehicle: { type: "car", make: "Toyota Corolla", color: "Silver", plate: "SKT 913 LA" },
    bank: { bankName: "Access Bank", accountNumber: "0987654321", accountName: "Ibrahim Sani" },
  },
};
