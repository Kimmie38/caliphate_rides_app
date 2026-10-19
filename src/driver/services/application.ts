import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV } from "../../config/env";
import type { DocumentKind, DocumentVersion, DriverApplication, TimelineEvent } from "../types";
import { api, getAuthToken, wait } from "../../services/http";

// Backend contract: the driver's official onboarding record
// GET  /drivers/me/application                   -> { application | null }
// PUT  /drivers/me/application   (draft fields)  -> { application }
// POST /drivers/me/documents     multipart: kind, number?, expiry?, files[]  -> { application }
//        (adds a new version; earlier versions stay on the record)
// POST /drivers/me/application/submit  { signedName }  -> { application }
// The admin dashboard reviews it: approve / request changes / reject, each added to the timeline.

const KEY = "crd.application";
const now = () => new Date().toISOString();
const ev = (event: string, by?: string): TimelineEvent => ({ at: now(), event, by });

export function emptyApplication(recordId = ""): DriverApplication {
  return {
    recordId,
    status: "draft",
    personal: { fullName: "", dateOfBirth: "", gender: "", address: "", lga: "", nin: "", email: "" },
    vehicle: { make: "", model: "", year: "", colour: "", plate: "", ownsVehicle: true },
    guarantor: { fullName: "", phone: "", relationship: "", address: "" },
    bank: { bankName: "", accountNumber: "", accountName: "" },
    documents: {},
    timeline: [],
    createdAt: now(),
  };
}

/** Sample record number: CR-DRV-<year>-<6 digits> (the server issues the real one). */
function newRecordId() {
  return `CR-DRV-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
}

async function mockLoad(): Promise<DriverApplication | null> {
  const s = await AsyncStorage.getItem(KEY);
  return s ? JSON.parse(s) : null;
}
async function mockSave(app: DriverApplication) {
  await AsyncStorage.setItem(KEY, JSON.stringify(app));
  return app;
}

export async function getApplication(): Promise<DriverApplication> {
  if (ENV.useMock) {
    const existing = await mockLoad();
    if (existing) return existing;
    const fresh = emptyApplication(newRecordId());
    fresh.timeline.push(ev("Application started"));
    return mockSave(fresh);
  }
  const r = await api<{ application: DriverApplication | null }>("/drivers/me/application");
  return r.application ?? emptyApplication();
}

/** Saves the editable fields (not documents, status or timeline, which the server controls). */
export async function saveDraft(app: DriverApplication): Promise<DriverApplication> {
  if (ENV.useMock) return mockSave(app);
  const { personal, vehicle, guarantor, bank, vehicleType } = app;
  return (await api<{ application: DriverApplication }>("/drivers/me/application", { method: "PUT", body: { personal, vehicle, guarantor, bank, vehicleType } })).application;
}

/** Uploads a new version of a document. Approved drivers' updates go back to review. */
export async function uploadDocument(
  app: DriverApplication,
  kind: DocumentKind,
  input: { files: string[]; number?: string; expiry?: string }
): Promise<DriverApplication> {
  if (!ENV.useMock) {
    const form = new FormData();
    form.append("kind", kind);
    if (input.number) form.append("number", input.number);
    if (input.expiry) form.append("expiry", input.expiry);
    input.files.forEach((uri, i) => form.append("files", { uri, name: `${kind}-${i + 1}.jpg`, type: "image/jpeg" } as any));
    const res = await fetch(`${ENV.apiUrl}/drivers/me/documents`, { method: "POST", headers: { Authorization: `Bearer ${getAuthToken()}` }, body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message ?? "Upload failed. Check your connection and try again.");
    return data.application;
  }
  await wait(700);
  const version: DocumentVersion = { files: input.files, number: input.number, expiry: input.expiry, uploadedAt: now(), status: "pending" };
  const prev = app.documents[kind];
  const isUpdate = !!prev?.current && app.status !== "draft";
  const next: DriverApplication = {
    ...app,
    documents: { ...app.documents, [kind]: { kind, current: version, history: prev?.current ? [prev.current, ...prev.history] : [] } },
    timeline: isUpdate ? [ev(`${labelFor(kind)} updated and sent for review`), ...app.timeline] : app.timeline,
  };
  await mockSave(next);
  if (isUpdate && app.status === "approved") {
    // Sample mode: the review team approves the new version after a few seconds.
    setTimeout(async () => {
      const cur = await mockLoad();
      const d = cur?.documents[kind];
      if (!cur || !d?.current || d.current.uploadedAt !== version.uploadedAt) return;
      d.current = { ...d.current, status: "approved" };
      cur.timeline = [ev(`${labelFor(kind)} approved`, "Review team"), ...cur.timeline];
      await mockSave(cur);
    }, 6000);
  }
  return next;
}

export async function submitApplication(app: DriverApplication, signedName: string): Promise<DriverApplication> {
  if (!ENV.useMock) {
    return (await api<{ application: DriverApplication }>("/drivers/me/application/submit", { method: "POST", body: { signedName } })).application;
  }
  await wait(800);
  const resubmit = app.status === "changes_requested";
  return mockSave({
    ...app,
    status: "submitted",
    declaration: { signedName, signedAt: now() },
    submittedAt: now(),
    reviewNote: undefined,
    timeline: [ev(resubmit ? "Changes sent for review" : "Application submitted for review", app.personal.fullName), ...app.timeline],
  });
}

/** Sample mode only: what the review team does from the admin dashboard. */
export async function mockReview(app: DriverApplication, decision: "approve" | "changes"): Promise<DriverApplication> {
  const docs = { ...app.documents };
  if (decision === "approve") {
    for (const k of Object.keys(docs) as DocumentKind[]) {
      const d = docs[k]!;
      if (d.current) docs[k] = { ...d, current: { ...d.current, status: "approved" } };
    }
    return mockSave({ ...app, documents: docs, status: "approved", approvedAt: now(), timeline: [ev("Application approved. Welcome to Caliphate Rides.", "Review team"), ...app.timeline] });
  }
  const note = "The photo of your vehicle licence is blurry. Take a new photo in good light.";
  const vl = docs.vehicle_licence;
  if (vl?.current) docs.vehicle_licence = { ...vl, current: { ...vl.current, status: "rejected", reviewNote: note } };
  return mockSave({ ...app, documents: docs, status: "changes_requested", reviewNote: note, timeline: [ev(`Changes requested: ${note}`, "Review team"), ...app.timeline] });
}

export async function resetMockApplication() {
  await AsyncStorage.removeItem(KEY);
}

function labelFor(kind: DocumentKind) {
  const map: Record<DocumentKind, string> = {
    licence: "Driver's licence", selfie: "Profile photo", vehicle_photo: "Vehicle photo", vehicle_licence: "Vehicle licence",
    ownership: "Proof of ownership", roadworthiness: "Roadworthiness certificate", insurance: "Insurance certificate", operating_permit: "Operating permit",
  };
  return map[kind];
}
