import type { LatLng } from "./lib/geo";
import type { PaymentMethod } from "./lib/payments";
import type { RideTypeId } from "./lib/pricing";

export type { PaymentMethod };

export type PlaceCategory =
  | "market" | "mosque" | "school" | "health" | "gov" | "landmark"
  | "transport" | "shopping" | "hotel" | "airport" | "saved" | "pin" | "search";

export type Place = {
  id: string;
  name: string;
  subtitle?: string;
  category: PlaceCategory;
  location: LatLng;
  /** Set for Google results that still need their coordinates looked up. */
  googlePlaceId?: string;
};

export type User = { id: string; phone: string; name: string; rating?: number };

export type Vehicle = { type: RideTypeId; make: string; color: string; plate: string };
/** Where riders send bank transfers. Account number is the 10-digit NUBAN. */
export type BankAccount = { bankName: string; accountNumber: string; accountName: string };
export type Driver = { id: string; name: string; phone: string; rating: number; trips: number; vehicle: Vehicle; bank?: BankAccount };


export type Quote = {
  rideType: RideTypeId;
  distanceKm: number;
  durationMin: number;
  ratePerKm: number;
  fare: number;
  route: LatLng[];
};

export type RideStatus =
  | "searching" // looking for a driver
  | "accepted" // driver is on the way to the pickup
  | "arrived" // driver is waiting at the pickup
  | "in_progress" // on the trip
  | "completed"
  | "cancelled"
  | "no_drivers";

export type Ride = {
  id: string;
  status: RideStatus;
  pickup: Place;
  destination: Place;
  rideType: RideTypeId;
  paymentMethod: PaymentMethod;
  /** pending until Paystack (in app) or the driver (cash / transfer) confirms the money arrived */
  paymentStatus: "pending" | "paid";
  distanceKm: number;
  ratePerKm: number;
  fare: number;
  route: LatLng[];
  driver?: Driver;
  createdAt: string;
};

export type DriverPosition = { location: LatLng; heading: number; at: number };

export type TripSummary = {
  id: string;
  pickupName: string;
  destinationName: string;
  rideType: RideTypeId;
  distanceKm: number;
  fare: number;
  paymentMethod: PaymentMethod;
  driverName: string;
  completedAt: string;
};

export type WalletTransaction = {
  id: string;
  kind: "topup" | "ride" | "refund";
  label: string;
  amount: number; // positive = money in
  at: string;
  method?: string;
};
