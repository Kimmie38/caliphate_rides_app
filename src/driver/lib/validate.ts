import { MIN_DRIVER_AGE, documentsFor } from "../config/requirements";
import type { DriverApplication } from "../types";
import { ageOn, daysUntil, parseDmy } from "./dates";
import { normalizeNgPhone } from "../../lib/phone";
import { t } from "../../i18n";

// Each function returns field -> error message. Empty object = valid.
export type Errors = Record<string, string>;

export function validatePersonal(p: DriverApplication["personal"], dobText: string): Errors {
  const e: Errors = {};
  if (p.fullName.trim().split(/\s+/).length < 2) e.fullName = t("Enter your full name as it appears on your licence.");
  const dob = parseDmy(dobText);
  if (!dob) e.dateOfBirth = t("Enter your date of birth as DD/MM/YYYY.");
  else if (ageOn(dob) < MIN_DRIVER_AGE) e.dateOfBirth = t("You need to be at least {0} to drive with Caliphate Rides.", MIN_DRIVER_AGE);
  else if (ageOn(dob) > 90) e.dateOfBirth = t("Check the year of your date of birth.");
  if (!p.gender) e.gender = t("Choose one.");
  if (p.address.trim().length < 8) e.address = t("Enter your house address, including the area.");
  if (!p.state) e.state = t("Choose your state.");
  if (!p.lga) e.lga = t("Choose your local government area.");
  if (!/^\d{11}$/.test(p.nin)) e.nin = t("Your NIN has 11 digits. Dial *346# to get it if you don't have your slip.");
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) e.email = t("Check the email address, or leave it empty.");
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
  if (!v.make.trim()) e.make = t("Enter the make, e.g. Bajaj or Toyota.");
  if (!v.model.trim()) e.model = t("Enter the model, e.g. RE or Corolla.");
  const y = Number(v.year);
  if (!/^\d{4}$/.test(v.year) || y < 1990 || y > new Date().getFullYear() + 1) e.year = t("Enter the year it was made, e.g. 2019.");
  if (!v.colour.trim()) e.colour = t("Enter the colour.");
  if (!/^[A-Z]{3} \d{2,3} [A-Z]{2}$/.test(normalizePlate(v.plate))) e.plate = t("Enter the plate number like ABC 123 XY.");
  return e;
}

export function validateGuarantor(g: DriverApplication["guarantor"], driverPhone: string): Errors {
  const e: Errors = {};
  if (g.fullName.trim().split(/\s+/).length < 2) e.fullName = t("Enter your guarantor's full name.");
  const ph = normalizeNgPhone(g.phone);
  if (!ph) e.phone = t("Enter a Nigerian mobile number.");
  else if (ph === driverPhone) e.phone = t("Your guarantor needs their own phone number, not yours.");
  if (!g.relationship) e.relationship = t("Choose how you know them.");
  if (g.address.trim().length < 8) e.address = t("Enter their house address.");
  return e;
}

/** The vehicle owner's details (only when the driver drives someone else's vehicle). */
export function validateOwner(o: DriverApplication["owner"], driverPhone: string): Errors {
  const e: Errors = {};
  if (o.fullName.trim().split(/\s+/).length < 2) e.fullName = t("Enter the owner's full name.");
  const ph = normalizeNgPhone(o.phone);
  if (!ph) e.phone = t("Enter the owner's Nigerian mobile number.");
  else if (driverPhone && ph === driverPhone) e.phone = t("Enter the owner's own number, not yours.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email.trim())) e.email = t("Enter the owner's email address.");
  if (o.address.trim().length < 8) e.address = t("Enter the owner's house address.");
  return e;
}

export function validateBank(b: DriverApplication["bank"]): Errors {
  const e: Errors = {};
  if (!b.bankName) e.bankName = t("Choose your bank.");
  if (!/^\d{10}$/.test(b.accountNumber)) e.accountNumber = t("Account numbers have 10 digits.");
  if (b.accountName.trim().split(/\s+/).length < 2) e.accountName = t("Enter the account name exactly as your bank shows it.");
  return e;
}

/** Validates one document upload. */
export function validateDocument(input: { files: (string | undefined)[]; photoCount: number; number?: string; needsNumber?: string; expiryText?: string; needsExpiry: boolean; variants?: string[]; variant?: string }): Errors {
  const e: Errors = {};
  if (input.variants?.length && !input.variants.includes(input.variant ?? "")) e.variant = t("Choose which document this is.");
  if (input.files.filter(Boolean).length < input.photoCount) e.files = input.photoCount > 1 ? t("Add a photo of each side.") : t("Add a photo.");
  if (input.needsNumber && !(input.number ?? "").trim()) e.number = t("Enter the {0}.", t(input.needsNumber).toLowerCase());
  if (input.needsExpiry) {
    const iso = parseDmy(input.expiryText ?? "");
    if (!iso) e.expiry = t("Enter the expiry date as DD/MM/YYYY.");
    else if (daysUntil(iso) < 0) e.expiry = t("This document has expired. Renew it, then upload the new one.");
  }
  return e;
}

/** What's still missing before the application can be submitted. */
export function missingSections(app: DriverApplication): string[] {
  const missing: string[] = [];
  if (!app.vehicleType) missing.push(t("Vehicle type"));
  if (Object.keys(validatePersonal(app.personal, toDmyOrEmpty(app.personal.dateOfBirth))).length) missing.push(t("Personal details"));
  if (Object.keys(validateVehicle(app.vehicle)).length) missing.push(t("Vehicle details"));
  if (!app.vehicle.ownsVehicle && Object.keys(validateOwner(app.owner ?? EMPTY_OWNER, "")).length) missing.push(t("Vehicle owner"));
  if (app.vehicleType) {
    for (const d of documentsFor(app.vehicleType, app.vehicle.ownsVehicle)) {
      if (d.required(app.vehicleType, app.vehicle.ownsVehicle) && !app.documents[d.kind]?.current) missing.push(t(d.title));
    }
  }
  if (Object.keys(validateGuarantor(app.guarantor, "")).length) missing.push(t("Guarantor"));
  if (Object.keys(validateBank(app.bank)).length) missing.push(t("Bank account"));
  return missing;
}

export const EMPTY_OWNER: DriverApplication["owner"] = { fullName: "", phone: "", email: "", address: "" };

function toDmyOrEmpty(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
