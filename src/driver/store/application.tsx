import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DOCUMENTS, EXPIRY_WARNING_DAYS } from "../config/requirements";
import { daysUntil } from "../lib/dates";
import * as svc from "../services/application";
import type { DocumentKind, DriverApplication } from "../types";
import { useSession } from "../../store/session";

type Value = {
  application: DriverApplication | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Changes editable fields and saves the draft in the background. */
  update: (fn: (a: DriverApplication) => DriverApplication) => void;
  uploadDocument: (kind: DocumentKind, input: { files: string[]; number?: string; expiry?: string }) => Promise<void>;
  submit: (signedName: string) => Promise<void>;
  mockReview: (d: "approve" | "changes") => Promise<void>;
  resetMock: () => Promise<void>;
};

const Ctx = createContext<Value | null>(null);

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [application, setApplication] = useState<DriverApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<DriverApplication | null>(null);
  latest.current = application;

  const refresh = useCallback(async () => {
    try {
      setApplication(await svc.getApplication());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't load your application. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "signedIn") { setLoading(true); refresh(); }
    if (status === "signedOut") { setApplication(null); setLoading(false); }
  }, [status, refresh]);

  // While a document update is being reviewed, check back every few seconds.
  const pendingReview = !!application && application.status === "approved" &&
    Object.values(application.documents).some((d) => d?.current?.status === "pending");
  useEffect(() => {
    if (!pendingReview) return;
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [pendingReview, refresh]);

  const update = useCallback((fn: (a: DriverApplication) => DriverApplication) => {
    setApplication((a) => {
      if (!a) return a;
      const next = fn(a);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { svc.saveDraft(next).catch(() => {}); }, 600);
      return next;
    });
  }, []);

  const value: Value = {
    application, loading, error, refresh, update,
    uploadDocument: async (kind, input) => {
      if (!latest.current) return;
      if (saveTimer.current) { clearTimeout(saveTimer.current); await svc.saveDraft(latest.current).catch(() => {}); }
      setApplication(await svc.uploadDocument(latest.current, kind, input));
    },
    submit: async (signedName) => {
      if (!latest.current) return;
      await svc.saveDraft(latest.current);
      setApplication(await svc.submitApplication(latest.current, signedName));
    },
    mockReview: async (d) => { if (latest.current) setApplication(await svc.mockReview(latest.current, d)); },
    resetMock: async () => { await svc.resetMockApplication(); await refresh(); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApplication(): Value {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApplication must be used inside ApplicationProvider");
  return ctx;
}

/** Documents that stop the driver going online: expired, or missing an approved version. */
export function drivingBlockers(app: DriverApplication | null): { kind: DocumentKind; title: string; reason: string }[] {
  if (!app?.vehicleType) return [];
  const out: { kind: DocumentKind; title: string; reason: string }[] = [];
  for (const d of DOCUMENTS) {
    if (!d.blocksDriving || !d.required(app.vehicleType, app.vehicle.ownsVehicle)) continue;
    const doc = app.documents[d.kind];
    const versions = [doc?.current, ...(doc?.history ?? [])].filter(Boolean);
    const valid = versions.find((v) => v!.status === "approved" && (!v!.expiry || daysUntil(v!.expiry) >= 0));
    if (!valid) {
      const expired = versions.some((v) => v!.expiry && daysUntil(v!.expiry) < 0);
      out.push({ kind: d.kind, title: d.title, reason: expired ? "expired" : "not approved yet" });
    }
  }
  return out;
}

/** Approved documents expiring soon, nearest first. */
export function expiringSoon(app: DriverApplication | null) {
  if (!app) return [];
  return DOCUMENTS.flatMap((d) => {
    const v = app.documents[d.kind]?.current;
    if (!v?.expiry) return [];
    const days = daysUntil(v.expiry);
    return days >= 0 && days <= EXPIRY_WARNING_DAYS ? [{ kind: d.kind, title: d.title, days, expiry: v.expiry }] : [];
  }).sort((a, b) => a.days - b.days);
}
