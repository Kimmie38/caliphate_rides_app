// Sample data used while EXPO_PUBLIC_USE_MOCK=true. Nothing here is real.
import { DEFAULT_PRICING, type PricingConfig, type RideTypeId } from "../lib/pricing";
import type { Driver, PaymentMethod, TripSummary, User, WalletTransaction } from "../types";

/** Payment method changes made during a sample ride (read by the ride simulation). */
export const mockRidePayments: Record<string, PaymentMethod> = {};

/** Hours ago, as an ISO date: keeps the sample history recent. */
const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

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
    { id: "r5", pickupName: "Gidan Dare", destinationName: "Babbar Kasuwa", rideType: "keke", distanceKm: 3.0, fare: 1500, paymentMethod: "wallet", driverName: "Abubakar Musa", completedAt: ago(3) },
    { id: "r4", pickupName: "Babbar Kasuwa", destinationName: "Sultan Bello Mosque", rideType: "keke", distanceKm: 2.2, fare: 1100, paymentMethod: "cash", driverName: "Abubakar Musa", completedAt: ago(5) },
    { id: "r3", pickupName: "Gidan Dare", destinationName: "UDUS City Campus", rideType: "keke", distanceKm: 5.6, fare: 2800, paymentMethod: "transfer", driverName: "Shehu Aliyu", completedAt: ago(27) },
    { id: "r2", pickupName: "UDUS City Campus", destinationName: "Karaye Specialist Hospital", rideType: "car", distanceKm: 4.1, fare: 2050, paymentMethod: "card", driverName: "Ibrahim Sani", completedAt: ago(30) },
    { id: "r1", pickupName: "Federal Secretariat", destinationName: "Sultan Abubakar III International Airport", rideType: "car", distanceKm: 13.9, fare: 6950, paymentMethod: "cash", driverName: "Ibrahim Sani", completedAt: ago(24 * 6 + 2) },
  ] as TripSummary[],
};

export function mockUser(phone: string, name = ""): User {
  return { id: "u_demo", phone, name, rating: 4.9, email: "", language: "en", memberSince: new Date(Date.now() - 40 * 86_400_000).toISOString() };
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
