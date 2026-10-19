import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Icon } from "../../src/components/Icon";
import { Card } from "../../src/components/visual";
import { glow } from "../../src/theme/tokens";
import { Missing } from "../../src/components/Missing";
import { PaymentPicker } from "../../src/components/PaymentPicker";
import { Button, tap, Txt } from "../../src/components/ui";
import { isInApp, paymentOption, type PaymentMethod } from "../../src/lib/payments";
import { formatNaira } from "../../src/lib/pricing";
import { getWallet, rateRide } from "../../src/services/rides";
import { useRide } from "../../src/store/ride";
import { useTheme } from "../../src/theme/ThemeProvider";
import { fonts } from "../../src/theme/tokens";

export default function Complete() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeRide: ride, finishRide, changeActivePayment, payActiveByCard } = useRide();
  const [stars, setStars] = useState(0);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [paying, setPaying] = useState(false);
  const [wallet, setWallet] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { getWallet().then((w) => setWallet(w.balance)).catch(() => {}); }, [ride?.paymentStatus]);

  if (!ride) return <Missing />;
  const first = ride.driver?.name.split(" ")[0] ?? "your driver";
  const method = ride.paymentMethod;
  const paid = ride.paymentStatus === "paid";

  const done = async () => {
    setSaving(true);
    try { if (stars) await rateRide(ride.id, stars); } catch { /* rating is optional; don't block the rider */ }
    finishRide();
    router.replace("/(tabs)");
  };

  const change = async (m: PaymentMethod) => {
    setError(null);
    try { await changeActivePayment(m); setChanging(false); }
    catch (e: any) { setError(e?.message ?? "Couldn't change the payment method."); }
  };

  const payCard = async () => {
    setPaying(true);
    setError(null);
    try { await payActiveByCard(); }
    catch (e: any) { setError(e?.message ?? "Card payment didn't go through. Try again or pay another way."); }
    finally { setPaying(false); }
  };

  const copyAccount = async () => {
    if (!ride.driver?.bank) return;
    await Clipboard.setStringAsync(ride.driver.bank.accountNumber);
    tap();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const paidLine =
    method === "wallet" ? "Paid from your wallet"
    : method === "card" ? "Paid by card"
    : method === "cash" ? `${first} confirmed your cash payment`
    : `${first} confirmed your transfer`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingTop: insets.top + 32, paddingHorizontal: 24, paddingBottom: insets.bottom + 24, gap: 20, flexGrow: 1 }}>
      <View style={{ alignItems: "center", gap: 8 }}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={{ width: 76, height: 76, borderRadius: 38, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 8, borderColor: colors.greenSoft, ...glow(isDark) }}>
          <LinearGradient colors={[colors.heroA, colors.heroB]} style={StyleSheet.absoluteFill} />
          <Icon name="checkmark" size={34} color="#FFFFFF" />
        </Animated.View>
        <Txt variant="label" color="muted" align="center" style={{ marginTop: 6 }}>You've arrived at {ride.destination.name}</Txt>
        <Txt variant="total" tabular>{formatNaira(ride.fare)}</Txt>
        <Txt variant="caption" color="muted" tabular>
          {ride.distanceKm.toFixed(1)} km × {formatNaira(ride.ratePerKm)} per km · {ride.rideType === "keke" ? "Keke" : "Car"}
        </Txt>
      </View>

      {/* Payment: in the app, or directly to the driver */}
      <Card style={{ gap: 12 }}>
        {paid ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon name="check" size={22} color={colors.green} />
            <Txt variant="bodyStrong" style={{ flex: 1 }}>{paidLine}</Txt>
          </View>
        ) : changing ? (
          <>
            <Txt variant="heading">How do you want to pay?</Txt>
            <PaymentPicker value={method} walletBalance={wallet} fare={ride.fare} onChange={change} />
            <Button title="Keep current method" variant="quiet" onPress={() => setChanging(false)} />
          </>
        ) : (
          <>
            {method === "cash" && (
              <>
                <Txt variant="heading">Pay {formatNaira(ride.fare)} in cash to {first}</Txt>
                <Waiting text={`Waiting for ${first} to confirm the cash`} />
              </>
            )}

            {method === "transfer" && (
              <>
                <Txt variant="heading">Transfer {formatNaira(ride.fare)} to {first}</Txt>
                {ride.driver?.bank ? (
                  <View style={{ backgroundColor: colors.mist, borderRadius: 16, padding: 14, gap: 4, borderWidth: 1, borderColor: colors.line }}>
                    <Txt variant="caption" color="muted">{ride.driver.bank.bankName}</Txt>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Txt style={{ fontFamily: fonts.display, fontSize: 24, letterSpacing: 1, flex: 1 }} tabular selectable>{ride.driver.bank.accountNumber}</Txt>
                      <Pressable accessibilityRole="button" accessibilityLabel="Copy account number" onPress={copyAccount} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Icon name={copied ? "check" : "copy"} size={18} color={colors.greenText} />
                        <Txt variant="label" color="greenText">{copied ? "Copied" : "Copy"}</Txt>
                      </Pressable>
                    </View>
                    <Txt variant="bodyStrong">{ride.driver.bank.accountName}</Txt>
                  </View>
                ) : (
                  <Txt color="muted">Ask {first} for their account details.</Txt>
                )}
                <Waiting text={`Waiting for ${first} to confirm the transfer`} />
              </>
            )}

            {method === "card" && (
              <>
                <Txt variant="heading">Pay {formatNaira(ride.fare)} by card</Txt>
                <Txt variant="caption" color="muted">Paystack opens to take the payment securely.</Txt>
                <Button title={`Pay ${formatNaira(ride.fare)}`} icon="card" onPress={payCard} loading={paying} />
              </>
            )}

            {method === "wallet" && <Waiting text="Taking payment from your wallet" />}

            <Pressable accessibilityRole="button" onPress={() => { tap(); setChanging(true); }} hitSlop={6}>
              <Txt variant="label" color="greenText">
                {isInApp(method) ? "Pay the driver directly instead" : "Pay another way"}
              </Txt>
            </Pressable>
          </>
        )}
        {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
      </Card>

      <Card style={{ gap: 12, alignItems: "center" }}>
        <Txt variant="heading" align="center">How was your ride with {first}?</Txt>
        <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="adjustable" accessibilityLabel={`Rating: ${stars} of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`} hitSlop={4} onPress={() => { tap(); setStars(n); }} style={{ padding: 4 }}>
              <Icon name="star" size={40} color={n <= stars ? colors.sun : colors.line} />
            </Pressable>
          ))}
        </View>
      </Card>

      <View style={{ flex: 1 }} />
      {!paid && !isInApp(method) ? (
        <Txt variant="caption" color="muted" align="center">You can leave this screen. {first} confirms the payment from the driver app.</Txt>
      ) : null}
      <Button title={stars ? "Submit and finish" : "Done"} onPress={done} loading={saving} disabled={!paid && method === "card"} />
      <Txt variant="caption" color="muted" align="center">{paymentOption(method).label} · {isInApp(method) ? "paid in the app" : "paid to the driver"}</Txt>
    </ScrollView>
  );
}

function Waiting({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <ActivityIndicator color={colors.green} />
      <Txt variant="caption" color="muted" style={{ flex: 1 }}>{text}</Txt>
    </View>
  );
}
