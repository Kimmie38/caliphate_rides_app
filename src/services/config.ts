import { ENV } from "../config/env";
import { normalizePricing, type PricingConfig } from "../lib/pricing";
import { api, wait } from "./http";
import { mockState } from "./mockData";

// GET /config/pricing -> PricingConfig
// The admin dashboard edits this: base fare, price per km and minimum fare for each ride type.
export async function getPricing(): Promise<PricingConfig> {
  if (ENV.useMock) { await wait(150); return mockState.pricing; }
  return normalizePricing(await api<unknown>("/config/pricing"));
}
