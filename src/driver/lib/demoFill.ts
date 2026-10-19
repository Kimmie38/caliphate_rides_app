import { Image } from "react-native";
import { documentsFor } from "../config/requirements";
import type { DocumentVersion, DriverApplication, VehicleType } from "../types";

// Sample mode only (see src/config/demo.ts): stand-ins for anything left empty, so every
// sign-up step can be tapped through and the review screen and official record still look real.

declare const require: (id: string) => number;

/** The app logo stands in for document photos. */
const samplePhoto = () => Image.resolveAssetSource(require("../../../assets/logo.png")).uri;
const yearsFromNow = (n: number) => { const d = new Date(); d.setFullYear(d.getFullYear() + n); return d.toISOString().slice(0, 10); };
const or = (value: string, sample: string) => (value && value.trim() ? value : sample);

export function fillPersonal(p: DriverApplication["personal"], name?: string): DriverApplication["personal"] {
  return {
    fullName: or(p.fullName, name || "Musa Abdullahi"),
    dateOfBirth: or(p.dateOfBirth, "1992-04-14"),
    gender: p.gender || "male",
    address: or(p.address, "No. 12 Sultan Bello Road, Sokoto"),
    lga: or(p.lga, "Sokoto North"),
    nin: /^\d{11}$/.test(p.nin) ? p.nin : "12345678901",
    email: p.email,
  };
}

export function fillVehicle(v: DriverApplication["vehicle"], type: VehicleType): DriverApplication["vehicle"] {
  const keke = type === "keke";
  return {
    ...v,
    make: or(v.make, keke ? "Bajaj" : "Toyota"),
    model: or(v.model, keke ? "RE" : "Corolla"),
    year: or(v.year, keke ? "2021" : "2016"),
    colour: or(v.colour, keke ? "Yellow" : "Silver"),
    plate: /^[A-Z]{3} ?\d{2,3} ?[A-Z]{2}$/i.test(v.plate.trim()) ? v.plate : "SKT 482 AA",
  };
}

export function fillGuarantor(g: DriverApplication["guarantor"]): DriverApplication["guarantor"] {
  return {
    fullName: or(g.fullName, "Abubakar Usman"),
    phone: or(g.phone, "806 555 0142"),
    relationship: or(g.relationship, "Uncle or aunt"),
    address: or(g.address, "No. 4 Gidan Igwai, Sokoto"),
  };
}

export function fillBank(b: DriverApplication["bank"], name: string): DriverApplication["bank"] {
  return {
    bankName: or(b.bankName, "Jaiz Bank"),
    accountNumber: /^\d{10}$/.test(b.accountNumber) ? b.accountNumber : "0123456789",
    accountName: or(b.accountName, name),
  };
}

/** Adds a sample version of every required document that hasn't been added yet. */
export function fillDocuments(a: DriverApplication): DriverApplication["documents"] {
  const type = a.vehicleType ?? "keke";
  const docs = { ...a.documents };
  for (const req of documentsFor(type, a.vehicle.ownsVehicle)) {
    if (!req.required(type, a.vehicle.ownsVehicle) || docs[req.kind]?.current) continue;
    const version: DocumentVersion = {
      files: req.photos.map(samplePhoto),
      number: req.needsNumber ? "SKT-2026-04817" : undefined,
      expiry: req.needsExpiry ? yearsFromNow(2) : undefined,
      uploadedAt: new Date().toISOString(),
      status: "pending",
    };
    docs[req.kind] = { kind: req.kind, current: version, history: [] };
  }
  return docs;
}

/** Everything at once (used by the review step). */
export function fillAll(a: DriverApplication, name?: string): DriverApplication {
  const vehicleType = a.vehicleType ?? "keke";
  const personal = fillPersonal(a.personal, name);
  const withType = { ...a, vehicleType, personal, vehicle: fillVehicle(a.vehicle, vehicleType) };
  return {
    ...withType,
    guarantor: fillGuarantor(a.guarantor),
    bank: fillBank(a.bank, personal.fullName),
    documents: fillDocuments(withType),
  };
}
