import type { LatLng } from "../lib/geo";
import type { PaymentMethod } from "../lib/payments";
import type { RideTypeId } from "../lib/pricing";

export type { PaymentMethod };
export type VehicleType = RideTypeId; // "keke" | "car"

import type { Place } from "../types";

export type { Place };

// ---------------- Official onboarding record ----------------

export type DocumentKind =
  | "licence" // driver's licence or learner's permit
  | "proof_of_address"
  | "selfie"
  | "vehicle_photo"
  | "vehicle_licence"
  | "ownership"
  | "owner_letter" // driving someone else's vehicle: the owner's signed authorisation
  | "owner_id" // ... and the owner's government ID
  | "roadworthiness"
  | "insurance"
  | "operating_permit";

export type DocumentStatus = "missing" | "pending" | "approved" | "rejected";

/** One version of a document. Every upload is kept, so the record shows what was submitted and when. */
export type DocumentVersion = {
  files: string[]; // photo URIs (front/back for the licence)
  /** Which kind of document it is, when there's a choice (e.g. "Learner's permit", "International passport"). */
  variant?: string;
  number?: string; // licence number, policy number…
  expiry?: string; // YYYY-MM-DD
  uploadedAt: string; // ISO
  status: DocumentStatus;
  reviewNote?: string;
};

export type DriverDocument = {
  kind: DocumentKind;
  current?: DocumentVersion;
  history: DocumentVersion[]; // older versions, newest first
};

export type ApplicationStatus =
  | "draft" // still filling in
  | "submitted" // sent, waiting for review
  | "changes_requested" // reviewer asked for fixes
  | "approved" // can drive
  | "rejected"
  | "suspended"; // e.g. licence expired or account on hold

export type TimelineEvent = { at: string; event: string; by?: string };

export type DriverApplication = {
  /** Official record number, e.g. CR-DRV-2026-000123 */
  recordId: string;
  status: ApplicationStatus;
  vehicleType?: VehicleType;
  personal: {
    fullName: string;
    dateOfBirth: string; // YYYY-MM-DD
    gender: "" | "male" | "female";
    address: string;
    state: string; // Sokoto, Kano, Kaduna, FCT (Abuja) or Plateau
    lga: string;
    nin: string; // National Identification Number, 11 digits
    email: string;
  };
  vehicle: { make: string; model: string; year: string; colour: string; plate: string; ownsVehicle: boolean };
  guarantor: { fullName: string; phone: string; relationship: string; address: string };
  /** Only when the driver drives someone else's vehicle (vehicle.ownsVehicle = false). */
  owner: { fullName: string; phone: string; email: string; address: string };
  bank: {
    bankName: string; accountNumber: string; accountName: string;
    /** Set once the bank has confirmed whose account it is (backend only). */
    verifiedName?: string; verified?: boolean; verifyError?: string;
  };
  documents: Partial<Record<DocumentKind, DriverDocument>>;
  declaration?: { signedName: string; signedAt: string };
  reviewNote?: string;
  timeline: TimelineEvent[];
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
};

// ---------------- Trips ----------------

export type DriverPosition = { location: LatLng; heading: number; at: number };

export type RideRequest = {
  id: string;
  rider: { name: string; rating: number; phone: string };
  pickup: Place;
  destination: Place;
  rideType: VehicleType;
  distanceKm: number;
  durationMin: number;
  baseFare?: number;
  ratePerKm: number;
  minimumFare?: number;
  /** What the rider pays */
  fare: number;
  /** Caliphate Rides' share (commission %), and what's left for the driver */
  commissionPercent: number;
  commission: number;
  driverEarning: number;
  paymentMethod: PaymentMethod;
  route: LatLng[];
  expiresAt: number; // ms timestamp
};

export type TripStage = "to_pickup" | "arrived" | "in_progress" | "payment" | "done";

export type Trip = RideRequest & {
  stage: TripStage;
  acceptedAt: string;
  paymentStatus: "pending" | "paid";
};

export type EarningsTrip = {
  id: string;
  destinationName: string;
  rideType: VehicleType;
  distanceKm: number;
  fare: number;
  commission?: number;
  driverEarning?: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: "pending" | "paid";
  completedAt: string;
};

// ---------------- Money ----------------

/**
 * One movement in the driver's balance (amount > 0 = money for the driver).
 * fare: rider paid in the app · commission: Caliphate Rides' share of a trip · withdrawal: sent to the bank ·
 * withdrawal_returned: a payout failed · payment: the driver paid what they owed · adjustment: a correction
 */
export type LedgerEntry = {
  id: string;
  kind: "fare" | "commission" | "withdrawal" | "withdrawal_returned" | "payment" | "adjustment";
  label: string;
  amount: number;
  balanceAfter?: number;
  at: string;
};

export type Withdrawal = {
  id: string;
  amount: number;
  status: "processing" | "successful" | "failed";
  bankName: string;
  accountEnding: string;
  failureReason?: string;
  createdAt: string;
  completedAt?: string;
};

/** GET /driver/wallet */
export type DriverWallet = {
  /** > 0: can be withdrawn. < 0: commission the driver owes. */
  balance: number;
  owed: number;
  /** Owes more than the limit: can't go online until they pay. */
  blocked: boolean;
  settings: { commissionPercent: number; owedLimit: number; minWithdrawal: number };
  bank: { bankName: string; accountEnding: string; verifiedName?: string; canWithdraw: boolean; problem?: string };
  ledger: LedgerEntry[];
  withdrawals: Withdrawal[];
};
