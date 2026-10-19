import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import { DEFAULT_PRICING, type PricingConfig, type RideTypeId } from "../lib/pricing";
import { getPricing } from "../services/config";
import * as rides from "../services/rides";
import { subscribeToRide } from "../services/tracking";
import type { DriverPosition, PaymentMethod, Place, Quote, Ride } from "../types";

type QuotesStatus = "idle" | "loading" | "ready" | "error";

type RideValue = {
  pricing: PricingConfig;
  refreshPricing: () => Promise<PricingConfig>;

  pickup: Place | null;
  destination: Place | null;
  setPickup: (p: Place | null) => void;
  setDestination: (p: Place | null) => void;

  rideType: RideTypeId;
  setRideType: (t: RideTypeId) => void;
  payment: PaymentMethod;
  setPayment: (m: PaymentMethod) => void;

  quotes: Quote[];
  quotesStatus: QuotesStatus;
  quotesError: string | null;
  loadQuotes: () => Promise<void>;
  selectedQuote: Quote | null;

  activeRide: Ride | null;
  driverPosition: DriverPosition | null;
  online: boolean;
  requestRide: () => Promise<Ride>;
  cancelActiveRide: (reason?: string) => Promise<void>;
  /** Change how the current ride is paid (in app or directly to the driver). */
  changeActivePayment: (m: PaymentMethod) => Promise<void>;
  /** Pay the current ride by card through Paystack. */
  payActiveByCard: () => Promise<void>;
  /** Clears the finished ride and the destination, ready for the next booking. */
  finishRide: () => void;
};

const RideContext = createContext<RideValue | null>(null);

export function RideProvider({ children }: { children: React.ReactNode }) {
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [pickup, setPickup] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [rideType, setRideType] = useState<RideTypeId>("keke");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesStatus, setQuotesStatus] = useState<QuotesStatus>("idle");
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [driverPosition, setDriverPosition] = useState<DriverPosition | null>(null);
  const [online, setOnline] = useState(true);
  const recorded = useRef<string | null>(null);

  const refreshPricing = useCallback(async () => {
    try {
      const p = await getPricing();
      setPricing(p);
      return p;
    } catch {
      return pricing;
    }
  }, [pricing]);

  useEffect(() => { refreshPricing(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Always quote with the latest admin price, so a change in the dashboard shows up on the next booking.
  const loadQuotes = useCallback(async () => {
    if (!pickup || !destination) return;
    setQuotesStatus("loading");
    setQuotesError(null);
    try {
      const p = await refreshPricing();
      const q = await rides.getQuotes(pickup, destination, p);
      setQuotes(q);
      if (q.length && !q.some((x) => x.rideType === rideType)) setRideType(q[0].rideType);
      setQuotesStatus("ready");
    } catch (e: any) {
      setQuotesError(e?.message ?? "Couldn't work out the fare. Try again.");
      setQuotesStatus("error");
    }
  }, [pickup, destination, refreshPricing, rideType]);

  const selectedQuote = quotes.find((q) => q.rideType === rideType) ?? null;

  const requestRide = useCallback(async () => {
    if (!pickup || !destination || !selectedQuote) throw new Error("Choose a pickup and destination first.");
    const ride = await rides.requestRide({ pickup, destination, rideType, paymentMethod: payment, quote: selectedQuote });
    setDriverPosition(null);
    setActiveRide(ride);
    return ride;
  }, [pickup, destination, rideType, payment, selectedQuote]);

  // Live updates for the active ride (status changes + driver GPS).
  const activeId = activeRide?.id;
  // Keep listening after the trip ends until the payment is confirmed (the driver confirms cash and transfers).
  const activeDone = activeRide
    ? ["cancelled", "no_drivers"].includes(activeRide.status) || (activeRide.status === "completed" && activeRide.paymentStatus === "paid")
    : true;
  useEffect(() => {
    if (!activeRide || activeDone) return;
    return subscribeToRide(activeRide, {
      onRide: (r) => setActiveRide(r),
      onDriverPosition: (p) => setDriverPosition(p),
      onConnection: setOnline,
    });
  }, [activeId, activeDone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeRide?.status === "completed" && recorded.current !== activeRide.id) {
      recorded.current = activeRide.id;
      rides.recordMockCompletion(activeRide);
    }
  }, [activeRide]);

  const cancelActiveRide = useCallback(async (reason?: string) => {
    if (!activeRide) return;
    await rides.cancelRide(activeRide.id, reason);
    setActiveRide(null);
    setDriverPosition(null);
  }, [activeRide]);

  const changeActivePayment = useCallback(async (m: PaymentMethod) => {
    if (!activeRide) return;
    const patch = await rides.changePayment(activeRide, m);
    setPayment(m);
    setActiveRide((r) => (r ? { ...r, ...patch } : r));
  }, [activeRide]);

  const payActiveByCard = useCallback(async () => {
    if (!activeRide) return;
    const url = await rides.payByCard(activeRide);
    if (url) await Linking.openURL(url); // the server marks the ride paid when Paystack confirms (ride:updated)
    else setActiveRide((r) => (r ? { ...r, paymentMethod: "card", paymentStatus: "paid" } : r));
  }, [activeRide]);

  const finishRide = useCallback(() => {
    setActiveRide(null);
    setDriverPosition(null);
    setDestination(null);
    setQuotes([]);
    setQuotesStatus("idle");
  }, []);

  const value: RideValue = {
    pricing, refreshPricing,
    pickup, destination, setPickup,
    setDestination: (p) => { setDestination(p); setQuotes([]); setQuotesStatus("idle"); },
    rideType, setRideType, payment, setPayment,
    quotes, quotesStatus, quotesError, loadQuotes, selectedQuote,
    activeRide, driverPosition, online, requestRide, cancelActiveRide, changeActivePayment, payActiveByCard, finishRide,
  };

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
}

export function useRide(): RideValue {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error("useRide must be used inside RideProvider");
  return ctx;
}
