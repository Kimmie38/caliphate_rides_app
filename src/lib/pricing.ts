import { t } from "../i18n";
// Fares, the same rule as the server (caliphate-backend/src/lib/pricing.js):
//   fare = base fare + (billable km × price per km), rounded to the nearest ₦roundTo,
//          and never less than the minimum fare
// The admin sets every number in the dashboard, for each ride type. Until then: ₦500 per km,
// no base fare, ₦500 minimum. The server works out the fare that is actually charged; the app
// uses the same rule to show it (and in sample mode).

export type RideTypeId = "keke" | "car";

export type RideTypeConfig = {
  id: RideTypeId;
  name: string;
  seats: number;
  enabled: boolean;
  baseFare: number;
  perKm: number;
  minimumFare: number;
};

export type PricingConfig = {
  currency: "NGN";
  roundTo: number;
  rideTypes: RideTypeConfig[];
  updatedAt?: string;
};

export const DEFAULT_PRICING: PricingConfig = {
  currency: "NGN",
  roundTo: 50,
  rideTypes: [
    { id: "keke", name: "Keke", seats: 3, enabled: true, baseFare: 0, perKm: 500, minimumFare: 500 },
    { id: "car", name: "Car", seats: 4, enabled: true, baseFare: 0, perKm: 500, minimumFare: 500 },
  ],
};

/** Caliphate Rides' share in sample mode. With the backend, each trip carries its own commission. */
export const SAMPLE_COMMISSION_PERCENT = 15;

/** Distances are billed to one decimal place (100 m). */
export function billableKm(distanceKm: number): number {
  return Math.max(0.1, Math.round(distanceKm * 10) / 10);
}

export function faresFor(config: PricingConfig, rideType: RideTypeId): RideTypeConfig {
  return config.rideTypes.find((r) => r.id === rideType) ?? DEFAULT_PRICING.rideTypes.find((r) => r.id === rideType)!;
}

export function computeFare(distanceKm: number, fares: Pick<RideTypeConfig, "baseFare" | "perKm" | "minimumFare">, roundTo = 50): number {
  const raw = (fares.baseFare ?? 0) + billableKm(distanceKm) * fares.perKm;
  const step = roundTo > 0 ? roundTo : 1;
  return Math.max(fares.minimumFare ?? 0, Math.round(raw / step) * step);
}

/** How a fare splits between the driver and Caliphate Rides. */
export function splitFare(fare: number, commissionPercent: number) {
  const commission = Math.round((fare * commissionPercent) / 100);
  return { commissionPercent, commission, driverEarning: fare - commission };
}

/** How a fare was worked out, e.g. "₦300 + 3.0 km × ₦500" or "Minimum fare". */
export function fareBreakdown(r: { distanceKm: number; baseFare?: number; ratePerKm: number; minimumFare?: number; fare: number }): string {
  const km = `${r.distanceKm.toFixed(1)} km × ${formatNaira(r.ratePerKm)}`;
  const byDistance = (r.baseFare ?? 0) + billableKm(r.distanceKm) * r.ratePerKm;
  if (r.minimumFare && r.fare === r.minimumFare && byDistance < r.minimumFare) return t("Minimum fare ({0} is less)", km);
  return r.baseFare ? `${formatNaira(r.baseFare)} + ${km}` : t("{0} per km", km);
}

/** "₦300 + ₦500/km" style summary of a ride type's fares. */
export function describeFares(f: Pick<RideTypeConfig, "baseFare" | "perKm" | "minimumFare">): string {
  const parts = [f.baseFare ? `${formatNaira(f.baseFare)} + ${formatNaira(f.perKm)}/km` : `${formatNaira(f.perKm)}/km`];
  if (f.minimumFare) parts.push(t("min {0}", formatNaira(f.minimumFare)));
  return parts.join(" · ");
}

/** Old servers sent only a price per km; this fills the newer fields. */
export function normalizePricing(raw: any): PricingConfig {
  if (!raw || !Array.isArray(raw.rideTypes)) return DEFAULT_PRICING;
  return {
    currency: "NGN",
    roundTo: Number.isFinite(raw.roundTo) ? raw.roundTo : DEFAULT_PRICING.roundTo,
    rideTypes: DEFAULT_PRICING.rideTypes.map((def) => {
      const t = raw.rideTypes.find((r: any) => r?.id === def.id) ?? {};
      const num = (v: any, fallback: number) => (Number.isFinite(v) ? v : fallback);
      return {
        ...def,
        name: t.name || def.name,
        seats: num(t.seats, def.seats),
        enabled: typeof t.enabled === "boolean" ? t.enabled : def.enabled,
        baseFare: num(t.baseFare, 0),
        perKm: num(t.perKm, num(t.ratePerKm, num(raw.ratePerKm, def.perKm))),
        minimumFare: num(t.minimumFare, Number.isFinite(t.perKm) ? def.minimumFare : 0),
      };
    }),
    updatedAt: raw.updatedAt,
  };
}

export function formatNaira(amount: number): string {
  const n = Math.round(amount);
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "−" : ""}₦${s}`;
}

export function formatKm(km: number): string {
  return `${billableKm(km).toFixed(1)} km`;
}
