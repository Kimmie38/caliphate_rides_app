import type { LatLng } from "../lib/geo";
import type { PaymentMethod } from "../lib/payments";
import type { RideTypeId } from "../lib/pricing";

export type { PaymentMethod };
export type VehicleType = RideTypeId; // "keke" | "car"

import type { Place } from "../types";

export type { Place };

// ---------------- Official onboarding record ----------------

export type DocumentKind =
  | "licence"
  | "selfie"
  | "vehicle_photo"
  | "vehicle_licence"
  | "ownership"
  | "roadworthiness"
  | "insurance"
  | "operating_permit";

export type DocumentStatus = "missing" | "pending" | "approved" | "rejected";

/** One version of a document. Every upload is kept, so the record shows what was submitted and when. */
export type DocumentVersion = {
  files: string[]; // photo URIs (front/back for the licence)
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
    lga: string;
    nin: string; // National Identification Number, 11 digits
    email: string;
  };
  vehicle: { make: string; model: string; year: string; colour: string; plate: string; ownsVehicle: boolean };
  guarantor: { fullName: string; phone: string; relationship: string; address: string };
  bank: { bankName: string; accountNumber: string; accountName: string };
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
  ratePerKm: number;
  fare: number;
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
  paymentMethod: PaymentMethod;
  completedAt: string;
};
