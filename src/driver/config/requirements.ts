import type { DocumentKind, VehicleType } from "../types";

// What a driver must provide to be approved. Adjust these to Caliphate Rides' policy
// (and later, move them to the backend so the admin dashboard can change them).

export const MIN_DRIVER_AGE = 18;
/** Warn drivers this many days before a document expires. */
export const EXPIRY_WARNING_DAYS = 30;

export type DocumentRequirement = {
  kind: DocumentKind;
  title: string;
  hint: string;
  photos: string[]; // labels for each photo (e.g. front, back)
  needsNumber?: string; // label for a document number, if any
  needsExpiry: boolean;
  required: (v: VehicleType, ownsVehicle: boolean) => boolean;
  /** Without a valid one of these, the driver can't go online. */
  blocksDriving: boolean;
};

export const DOCUMENTS: DocumentRequirement[] = [
  {
    kind: "licence", title: "Driver's licence", hint: "Your valid Nigerian driver's licence. All four corners in view, no glare.",
    photos: ["Front", "Back"], needsNumber: "Licence number", needsExpiry: true, required: () => true, blocksDriving: true,
  },
  {
    kind: "selfie", title: "Profile photo", hint: "A clear photo of your face, no cap or sunglasses. Riders see this photo.",
    photos: ["Your face"], needsExpiry: false, required: () => true, blocksDriving: false,
  },
  {
    kind: "vehicle_photo", title: "Vehicle photo", hint: "The whole vehicle from the front, with the number plate readable.",
    photos: ["Vehicle"], needsExpiry: false, required: () => true, blocksDriving: false,
  },
  {
    kind: "vehicle_licence", title: "Vehicle licence", hint: "The vehicle licence (registration papers) for this plate number.",
    photos: ["Vehicle licence"], needsExpiry: true, required: () => true, blocksDriving: true,
  },
  {
    kind: "ownership", title: "Proof of ownership", hint: "Proof of ownership certificate, or a signed letter from the owner allowing you to use the vehicle.",
    photos: ["Document"], needsExpiry: false, required: () => true, blocksDriving: false,
  },
  {
    kind: "insurance", title: "Insurance certificate", hint: "At least third-party insurance for this vehicle.",
    photos: ["Certificate"], needsNumber: "Policy number", needsExpiry: true, required: () => true, blocksDriving: true,
  },
  {
    kind: "roadworthiness", title: "Roadworthiness certificate", hint: "Current roadworthiness certificate for the car.",
    photos: ["Certificate"], needsExpiry: true, required: (v) => v === "car", blocksDriving: true,
  },
  {
    kind: "operating_permit", title: "Commercial operating permit", hint: "Your keke operating permit or union card, if you have one.",
    photos: ["Permit"], needsNumber: "Permit number", needsExpiry: true, required: () => false, blocksDriving: false,
  },
];

export const documentRequirement = (kind: DocumentKind) => DOCUMENTS.find((d) => d.kind === kind)!;

/** Documents that apply to this vehicle (required first, then optional). */
export function documentsFor(v: VehicleType, ownsVehicle: boolean) {
  return DOCUMENTS.filter((d) => d.required(v, ownsVehicle) || (v === "keke" && d.kind === "operating_permit"));
}

// The 23 local government areas of Sokoto State.
export const SOKOTO_LGAS = [
  "Binji", "Bodinga", "Dange Shuni", "Gada", "Goronyo", "Gudu", "Gwadabawa", "Illela", "Isa", "Kebbe",
  "Kware", "Rabah", "Sabon Birni", "Shagari", "Silame", "Sokoto North", "Sokoto South", "Tambuwal",
  "Tangaza", "Tureta", "Wamako", "Wurno", "Yabo",
];

export const BANKS = [
  "Access Bank", "Ecobank", "Fidelity Bank", "First Bank", "FCMB", "Globus Bank", "GTBank", "Jaiz Bank",
  "Keystone Bank", "Kuda", "Moniepoint", "OPay", "PalmPay", "Polaris Bank", "Providus Bank", "Stanbic IBTC",
  "Sterling Bank", "TAJBank", "Union Bank", "UBA", "Unity Bank", "Wema Bank", "Zenith Bank",
];

export const RELATIONSHIPS = ["Parent", "Brother or sister", "Spouse", "Uncle or aunt", "Employer", "Community leader", "Friend", "Other"];
