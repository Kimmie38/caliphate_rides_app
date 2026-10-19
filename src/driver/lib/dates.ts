// Dates are typed as DD/MM/YYYY (how Nigerians write them) and stored as YYYY-MM-DD.

/** "07/03/2028" -> "2028-03-07", or null if it isn't a real date. */
export function parseDmy(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "2028-03-07" -> "07/03/2028" */
export function toDmy(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Inserts slashes as the driver types: "07032028" -> "07/03/2028" */
export function maskDmy(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/");
}

const DAY = 86400000;
const startOfToday = (now = new Date()) => Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

/** Whole days from today until the date (negative = already past). */
export function daysUntil(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - startOfToday(now)) / DAY);
}

export function ageOn(dobIso: string, now = new Date()): number {
  const [y, m, d] = dobIso.split("-").map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

/** "12 Nov 2026" */
export function prettyDate(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

/** "12 Nov 2026, 14:05" for timestamps */
export function prettyDateTime(iso: string): string {
  const t = new Date(iso);
  const time = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  return `${prettyDate(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`)}, ${time}`;
}

export type ExpiryState = { kind: "ok" | "soon" | "expired"; days: number };
export function expiryState(iso: string | undefined, warnDays: number, now = new Date()): ExpiryState | null {
  if (!iso) return null;
  const days = daysUntil(iso, now);
  return { kind: days < 0 ? "expired" : days <= warnDays ? "soon" : "ok", days };
}
