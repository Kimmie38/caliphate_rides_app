import { MIN_DRIVER_AGE, documentsFor } from "../config/requirements";
import type { DriverApplication } from "../types";
import { ageOn, daysUntil, parseDmy } from "./dates";
import { normalizeNgPhone } from "../../lib/phone";

// Each function returns field -> error message. Empty object = valid.
export type Errors = Record<string, string>;

export function validatePersonal(p: DriverApplication["personal"], dobText: string): Errors {
  const e: Errors = {};
  if (p.fullName.trim().split(/\s+/).length < 2) e.fullName = "Enter your full name as it appears on your licence.";
  const dob = parseDmy(dobText);
  if (!dob) e.dateOfBirth = "Enter your date of birth as DD/MM/YYYY.";
  else if (ageOn(dob) < MIN_DRIVER_AGE) e.dateOfBirth = `You need to be at least ${MIN_DRIVER_AGE} to drive with Caliphate Rides.`;
  else if (ageOn(dob) > 90) e.dateOfBirth = "Check the year of your date of birth.";
  if (!p.gender) e.gender = "Choose one.";
  if (p.address.trim().length < 8) e.address = "Enter your house address, including the area.";
  if (!p.lga) e.lga = "Choose your local government area.";
  if (!/^\d{11}$/.test(p.nin)) e.nin = "Your NIN has 11 digits. Dial *346# to get it if you don't have your slip.";
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) e.email = "Check the email address, or leave it empty.";
  return e;
}

/** Nigerian plates look like "ABC 123 XY". */
export function normalizePlate(input: string): string {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = s.match(/^([A-Z]{3})(\d{2,3})([A-Z]{2})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : input.toUpperCase().trim();
}

export function validateVehicle(v: DriverApplication["vehicle"]): Errors {
  const e: Errors = {};
  if (!v.make.trim()) e.make = "Enter the make, e.g. Bajaj or Toyota.";
  if (!v.model.trim()) e.model = "Enter the model, e.g. RE or Corolla.";
  const y = Number(v.year);
  if (!/^\d{4}$/.test(v.year) || y < 1990 || y > new Date().getFullYear() + 1) e.year = "Enter the year it was made, e.g. 2019.";
  if (!v.colour.trim()) e.colour = "Enter the colour.";
  if (!/^[A-Z]{3} \d{2,3} [A-Z]{2}$/.test(normalizePlate(v.plate))) e.plate = "Enter the plate number like ABC 123 XY.";
  return e;
}

export function validateGuarantor(g: DriverApplication["guarantor"], driverPhone: string): Errors {
  const e: Errors = {};
  if (g.fullName.trim().split(/\s+/).length < 2) e.fullName = "Enter your guarantor's full name.";
  const ph = normalizeNgPhone(g.phone);
  if (!ph) e.phone = "Enter a Nigerian mobile number.";
  else if (ph === driverPhone) e.phone = "Your guarantor needs their own phone number, not yours.";
  if (!g.relationship) e.relationship = "Choose how you know them.";
  if (g.address.trim().length < 8) e.address = "Enter their house address.";
  return e;
}

export function validateBank(b: DriverApplication["bank"]): Errors {
  const e: Errors = {};
  if (!b.bankName) e.bankName = "Choose your bank.";
  if (!/^\d{10}$/.test(b.accountNumber)) e.accountNumber = "Account numbers have 10 digits.";
  if (b.accountName.trim().split(/\s+/).length < 2) e.accountName = "Enter the account name exactly as your bank shows it.";
  return e;
}

/** Validates one document upload. */
export function validateDocument(input: { files: (string | undefined)[]; photoCount: number; number?: string; needsNumber?: string; expiryText?: string; needsExpiry: boolean }): Errors {
  const e: Errors = {};
  if (input.files.filter(Boolean).length < input.photoCount) e.files = input.photoCount > 1 ? "Add a photo of each side." : "Add a photo.";
  if (input.needsNumber && !(input.number ?? "").trim()) e.number = `Enter the ${input.needsNumber.toLowerCase()}.`;
  if (input.needsExpiry) {
    const iso = parseDmy(input.expiryText ?? "");
    if (!iso) e.expiry = "Enter the expiry date as DD/MM/YYYY.";
    else if (daysUntil(iso) < 0) e.expiry = "This document has expired. Renew it, then upload the new one.";
  }
  return e;
}

/** What's still missing before the application can be submitted. */
export function missingSections(app: DriverApplication): string[] {
  const missing: string[] = [];
  if (!app.vehicleType) missing.push("Vehicle type");
  if (Object.keys(validatePersonal(app.personal, toDmyOrEmpty(app.personal.dateOfBirth))).length) missing.push("Personal details");
  if (Object.keys(validateVehicle(app.vehicle)).length) missing.push("Vehicle details");
  if (app.vehicleType) {
    for (const d of documentsFor(app.vehicleType, app.vehicle.ownsVehicle)) {
      if (d.required(app.vehicleType, app.vehicle.ownsVehicle) && !app.documents[d.kind]?.current) missing.push(d.title);
    }
  }
  if (Object.keys(validateGuarantor(app.guarantor, "")).length) missing.push("Guarantor");
  if (Object.keys(validateBank(app.bank)).length) missing.push("Bank account");
  return missing;
}

function toDmyOrEmpty(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
