// Hybrid payments: riders pay in the app, or pay the driver directly.
// In-app payments are confirmed by the payment provider (Monnify); direct payments are confirmed by the driver
// ("Cash received" / "Transfer received" in the driver app), so every trip has a payment record.

import { t } from "../i18n";

export type PaymentMethod = "wallet" | "card" | "cash" | "transfer";

export type PaymentOption = {
  id: PaymentMethod;
  label: string;
  detail: string;
  inApp: boolean;
  icon: "wallet" | "card" | "cash" | "transfer";
};

export const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: "wallet", label: "Wallet", detail: "Paid from your balance when the trip ends", inApp: true, icon: "wallet" },
  { id: "card", label: "Card", detail: "Pay by card or bank transfer in the app when the trip ends", inApp: true, icon: "card" },
  { id: "cash", label: "Cash", detail: "Pay the driver in cash at the end of the trip", inApp: false, icon: "cash" },
  { id: "transfer", label: "Bank transfer", detail: "Transfer to the driver's account at the end of the trip", inApp: false, icon: "transfer" },
];

const inLanguage = (o: PaymentOption): PaymentOption => ({ ...o, label: t(o.label), detail: t(o.detail) });
/** The options in the chosen language. */
export const paymentOptions = () => PAYMENT_OPTIONS.map(inLanguage);
export const paymentOption = (m: PaymentMethod) => inLanguage(PAYMENT_OPTIONS.find((o) => o.id === m)!);
export const isInApp = (m: PaymentMethod) => PAYMENT_OPTIONS.find((o) => o.id === m)!.inApp;
