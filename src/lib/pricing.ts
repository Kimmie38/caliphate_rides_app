// Fare = distance (km) × price per km.
// The price per km comes from the admin dashboard (default ₦500). Each ride type can
// optionally have its own price per km; when it doesn't, the main price is used.
// The backend computes the fare that is actually charged; the app uses the same rule to show it.

export type RideTypeId = "keke" | "car";

export type RideTypeConfig = {
  id: RideTypeId;
  name: string;
  seats: number;
  enabled: boolean;
  /** null = use the main price per km */
  ratePerKm: number | null;
};

export type PricingConfig = {
  currency: "NGN";
  ratePerKm: number;
  rideTypes: RideTypeConfig[];
  updatedAt?: string;
};

export const DEFAULT_PRICING: PricingConfig = {
  currency: "NGN",
  ratePerKm: 500,
  rideTypes: [
    { id: "keke", name: "Keke", seats: 3, enabled: true, ratePerKm: null },
    { id: "car", name: "Car", seats: 4, enabled: true, ratePerKm: null },
  ],
};

/** Distances are billed to one decimal place (100 m). */
export function billableKm(distanceKm: number): number {
  return Math.max(0.1, Math.round(distanceKm * 10) / 10);
}

export function rateFor(config: PricingConfig, rideType: RideTypeId): number {
  const t = config.rideTypes.find((r) => r.id === rideType);
  return t?.ratePerKm ?? config.ratePerKm;
}

export function computeFare(distanceKm: number, ratePerKm: number): number {
  return Math.round(billableKm(distanceKm) * ratePerKm);
}

export function formatNaira(amount: number): string {
  const n = Math.round(amount);
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "−" : ""}₦${s}`;
}

export function formatKm(km: number): string {
  return `${billableKm(km).toFixed(1)} km`;
}
