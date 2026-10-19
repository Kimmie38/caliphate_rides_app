import { router } from "expo-router";
import { goBack } from "../../src/lib/nav";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../src/components/Icon";
import { Missing } from "../../src/components/Missing";
import { PaymentPicker } from "../../src/components/PaymentPicker";
import { Badge, Tag, VehicleArt } from "../../src/components/visual";
import { DropPin, PickupPin, RouteLine } from "../../src/components/map/markers";
import { frame, RideMap, type RideMapHandle } from "../../src/components/map/RideMap";
import { Sheet } from "../../src/components/Sheet";
import { Button, IconButton, MapButton, tap, Txt } from "../../src/components/ui";
import { haversineKm } from "../../src/lib/geo";
import { isInApp, paymentOption } from "../../src/lib/payments";
import { formatNaira, type RideTypeId } from "../../src/lib/pricing";
import { getWallet } from "../../src/services/rides";
import { useRide } from "../../src/store/ride";
import { useTheme } from "../../src/theme/ThemeProvider";
import { type as typeScale } from "../../src/theme/tokens";
import type { Quote } from "../../src/types";

const AWAY: Record<RideTypeId, number> = { keke: 2, car: 5 }; // sample "minutes away"; the backend sends real values

/** Height the sheet can be pulled down to (title and the first ride option), to see more of the route. */
const PEEK = 250;

export default function Confirm() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ride = useRide();
  const { pickup, destination, quotes, quotesStatus, quotesError, loadQuotes, rideType, setRideType, payment, setPayment, selectedQuote, pricing } = ride;
  const map = useRef<RideMapHandle>(null);
  const [sheetH, setSheetH] = useState(420);
  const [wallet, setWallet] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const tooClose = pickup && destination ? haversineKm(pickup.location, destination.location) < 0.15 : false;

  useEffect(() => { if (!tooClose) loadQuotes(); }, [pickup?.id, destination?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { getWallet().then((w) => setWallet(w.balance)).catch(() => {}); }, []);

  const route = quotes[0]?.route ?? [];
  useEffect(() => {
    if (!pickup || !destination) return;
    const pts = route.length ? route : [pickup.location, destination.location];
    frame(map.current, pts, { top: insets.top + 80, bottom: sheetH + 24 });
  }, [route.length, sheetH, pickup?.id, destination?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pickup || !destination) return <Missing message="Choose where you're going first." />;

  const confirm = async () => {
    if (!selectedQuote) return;
    if (payment === "wallet" && wallet !== null && selectedQuote.fare > wallet) {
      setError("Your wallet balance is too low for this trip. Choose another way to pay, or add money in Wallet.");
      setPayOpen(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await ride.requestRide();
      router.replace("/ride/track");
    } catch (e: any) {
      setError(e?.message ?? "Couldn't request the ride. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const typeName = (id: RideTypeId) => pricing.rideTypes.find((t) => t.id === id)?.name ?? id;
  const q = selectedQuote;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <RideMap ref={map} center={pickup.location}>
        <RouteLine path={route} />
        <PickupPin coordinate={pickup.location} />
        <DropPin coordinate={destination.location} />
      </RideMap>
      <MapButton name="back" label="Back" onPress={() => goBack("/")} style={{ left: 16, top: insets.top + 12 }} />

      <Sheet onHeight={setSheetH} scroll peek={PEEK}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="title">Choose a ride</Txt>
            <Txt variant="caption" color="muted" numberOfLines={1} style={{ fontFamily: typeScale.bodyStrong.fontFamily }}>
              To {destination.name}{q ? ` · ${q.distanceKm.toFixed(1)} km` : ""}
            </Txt>
          </View>
          {q ? <Tag text={`≈ ${q.durationMin} min`} tone="green" icon="time" /> : null}
          <IconButton name="close" label="Change destination" size={40} onPress={() => router.push("/ride/search")} />
        </View>

        {tooClose ? (
          <Txt style={{ color: colors.danger }}>Your pickup and destination are the same place. Choose a different destination.</Txt>
        ) : quotesStatus === "loading" || quotesStatus === "idle" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 24 }}>
            <ActivityIndicator color={colors.green} />
            <Txt color="muted">Working out your fare…</Txt>
          </View>
        ) : quotesStatus === "error" ? (
          <View style={{ gap: 10 }}>
            <Txt style={{ color: colors.danger }}>{quotesError}</Txt>
            <Button title="Try again" variant="quiet" onPress={loadQuotes} />
          </View>
        ) : (
          <>
            <View style={{ gap: 10 }}>
              {quotes.map((quote) => (
                <RideOption key={quote.rideType} quote={quote} name={typeName(quote.rideType)}
                  seats={pricing.rideTypes.find((t) => t.id === quote.rideType)?.seats ?? 4}
                  selected={quote.rideType === rideType} onPress={() => setRideType(quote.rideType)} />
              ))}
            </View>

            {q ? (
              <Txt variant="caption" color="muted" tabular style={{ fontFamily: typeScale.bodyStrong.fontFamily }}>
                {q.distanceKm.toFixed(1)} km × {formatNaira(q.ratePerKm)} per km = {formatNaira(q.fare)}
              </Txt>
            ) : null}

            {payOpen ? (
              <PaymentPicker value={payment} walletBalance={wallet} fare={q?.fare} onChange={(m) => { setPayment(m); setPayOpen(false); setError(null); }} />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Payment: ${paymentOption(payment).label}. Change payment method.`}
                onPress={() => { tap(); setPayOpen(true); }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.mist, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 12, opacity: pressed ? 0.8 : 1 })}
              >
                <Badge icon={paymentOption(payment).icon} tone={isInApp(payment) ? "green" : "market"} size={40} />
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">{paymentOption(payment).label} · {isInApp(payment) ? "in the app" : "to the driver"}</Txt>
                  <Txt variant="caption" color="muted">
                    {payment === "wallet" ? `Balance ${wallet === null ? "…" : formatNaira(wallet)}` : paymentOption(payment).detail}
                  </Txt>
                </View>
                <Txt variant="label" color="greenText">Change</Txt>
              </Pressable>
            )}

            {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
            <Button title={q ? `Confirm ${typeName(q.rideType)} · ${formatNaira(q.fare)}` : "Choose a ride"} onPress={confirm} loading={submitting} disabled={!q} />
          </>
        )}
      </Sheet>
    </View>
  );
}

function RideOption({ quote, name, seats, selected, onPress }: { quote: Quote; name: string; seats: number; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}, ${seats} seats, ${formatNaira(quote.fare)}`}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 22, borderWidth: 2,
        borderColor: selected ? colors.green : colors.line, backgroundColor: selected ? colors.greenSoft : colors.paper, transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <VehicleArt type={quote.rideType} width={84} />
      <View style={{ flex: 1 }}>
        <Txt variant="price" style={{ fontSize: 17 }}>{name}</Txt>
        <Txt variant="caption" color="muted" style={{ fontFamily: typeScale.bodyStrong.fontFamily }}>{seats} seats · {AWAY[quote.rideType]} min away</Txt>
      </View>
      <Txt variant="price" tabular>{formatNaira(quote.fare)}</Txt>
      {selected ? (
        <View style={{ position: "absolute", top: -8, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.green, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.paper }}>
          <Icon name="check" size={14} color={colors.greenInk} />
        </View>
      ) : null}
    </Pressable>
  );
}
