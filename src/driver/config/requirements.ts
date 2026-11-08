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
  /** When there's more than one acceptable document, the driver picks which one this is. */
  variants?: string[];
  variantLabel?: string;
  needsNumber?: string; // label for a document number, if any
  needsExpiry: boolean;
  required: (v: VehicleType, ownsVehicle: boolean) => boolean;
  /** Without a valid one of these, the driver can't go online. */
  blocksDriving: boolean;
};

export const DOCUMENTS: DocumentRequirement[] = [
  {
    kind: "licence", title: "Driver's licence or learner's permit", hint: "Your government-issued Nigerian driver's licence or learner's permit. All four corners in view, no glare.",
    photos: ["Front", "Back"], variants: ["Driver's licence", "Learner's permit"], variantLabel: "Which one is it?",
    needsNumber: "Licence or permit number", needsExpiry: true, required: () => true, blocksDriving: true,
  },
  {
    kind: "proof_of_address", title: "Proof of address", hint: "A utility bill (electricity, water or waste) or tenancy agreement from the last 3 months, showing your name and house address.",
    photos: ["Document"], variants: ["Electricity bill", "Water bill", "Waste bill", "Tenancy agreement", "Other"], variantLabel: "What is it?",
    needsExpiry: false, required: () => true, blocksDriving: false,
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
    kind: "ownership", title: "Proof of ownership", hint: "The vehicle's proof of ownership certificate, in the owner's name.",
    photos: ["Document"], needsExpiry: false, required: () => true, blocksDriving: false,
  },
  {
    kind: "owner_letter", title: "Owner's letter of authorisation",
    hint: "A letter signed by the vehicle owner saying you may drive this vehicle for Caliphate Rides. It should show the owner's full name, phone number, the plate number, the date and their signature.",
    photos: ["Letter"], needsExpiry: false, required: (_v, owns) => !owns, blocksDriving: false,
  },
  {
    kind: "owner_id", title: "Owner's government ID", hint: "The vehicle owner's government-issued ID. All four corners in view, no glare.",
    photos: ["ID"], variants: ["NIN slip or card", "International passport", "Driver's licence", "Voter's card"], variantLabel: "Which ID is it?",
    needsNumber: "ID number", needsExpiry: false, required: (_v, owns) => !owns, blocksDriving: false,
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
