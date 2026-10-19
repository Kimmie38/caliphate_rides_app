/** Accepts "0803 214 5567", "803 214 5567" or "+234 803 214 5567"; returns "+2348032145567" or null. */
export function normalizeNgPhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("234")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10 || !/^[789]/.test(d)) return null;
  return `+234${d}`;
}

/** "+2348032145567" -> "+234 803 214 5567" */
export function formatNgPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").replace(/^234/, "");
  return `+234 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`.trim();
}

/** Formats as the rider types: "8032145567" -> "803 214 5567" */
export function maskLocal(input: string): string {
  const d = input.replace(/\D/g, "").replace(/^0/, "").slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(" ");
}
