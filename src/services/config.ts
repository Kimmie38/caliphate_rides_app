import { ENV } from "../config/env";
import type { PricingConfig } from "../lib/pricing";
import { api, wait } from "./http";
import { mockState } from "./mockData";

// GET /config/pricing -> PricingConfig
// The admin dashboard edits this (price per km, default ₦500, and optional per-ride-type prices).
export async function getPricing(): Promise<PricingConfig> {
  if (ENV.useMock) { await wait(150); return mockState.pricing; }
  return api<PricingConfig>("/config/pricing");
}
