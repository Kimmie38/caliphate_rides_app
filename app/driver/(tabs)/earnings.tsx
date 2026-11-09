import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Modal, Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../../src/components/Icon";
import { useTabBarHeight } from "../../../src/components/TabBar";
import { Button, Chip, Segmented, Txt } from "../../../src/components/ui";
import { Badge, Card, Group, Hero, Tag } from "../../../src/components/visual";
import { isInApp, paymentOption } from "../../../src/lib/payments";
import { formatNaira } from "../../../src/lib/pricing";
import { getDriverWallet, getEarnings, payOwed, recheckBank, withdraw } from "../../../src/driver/services/trips";
import { useOnAppActive } from "../../../src/hooks/useOnAppActive";
import { useApplication } from "../../../src/driver/store/application";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { fonts } from "../../../src/theme/tokens";
import type { DriverWallet, EarningsTrip, LedgerEntry } from "../../../src/driver/types";
import { formatDayMonth, t, useI18n } from "../../../src/i18n";

type Period = "today" | "week";

function since(period: Period) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

const earned = (t: EarningsTrip) => t.driverEarning ?? t.fare;
const day = (iso: string) => formatDayMonth(new Date(iso));
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const LEDGER_ICON: Record<LedgerEntry["kind"], { icon: "card" | "keke" | "transfer" | "refresh" | "check" | "alert"; tone: "green" | "market" | "school" | "gov" }> = {
  fare: { icon: "card", tone: "green" },
  commission: { icon: "keke", tone: "market" },
  withdrawal: { icon: "transfer", tone: "school" },
  withdrawal_returned: { icon: "refresh", tone: "green" },
  payment: { icon: "check", tone: "green" },
  adjustment: { icon: "alert", tone: "gov" },
};

export default function Earnings() {
  useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const { application } = useApplication();
  const [trips, setTrips] = useState<EarningsTrip[] | null>(null);
  const [wallet, setWallet] = useState<DriverWallet | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const bankName = application?.bank.bankName || t("your bank");
  const load = useCallback(async () => {
    const [t, w] = await Promise.allSettled([getEarnings(), getDriverWallet(application?.bank.bankName, application?.bank.accountNumber)]);
    if (t.status === "fulfilled") setTrips(t.value);
    if (w.status === "fulfilled") setWallet(w.value);
  }, [application?.bank.bankName, application?.bank.accountNumber]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useOnAppActive(load);

  const list = (trips ?? []).filter((t) => new Date(t.completedAt) >= since(period));
  const total = list.reduce((s, t) => s + earned(t), 0);
  const commission = list.reduce((s, t) => s + (t.commission ?? 0), 0);
  const inApp = list.filter((t) => isInApp(t.paymentMethod)).reduce((s, t) => s + t.fare, 0);
  const direct = list.filter((t) => !isInApp(t.paymentMethod)).reduce((s, t) => s + t.fare, 0);

  // This week's earnings per day, Monday first, for the chart.
  const weekStart = since("week");
  const days = Array.from({ length: 7 }, (_, i) => {
    const from = new Date(weekStart); from.setDate(from.getDate() + i);
    const to = new Date(from); to.setDate(to.getDate() + 1);
    const amount = (trips ?? []).filter((t) => { const d = new Date(t.completedAt); return d >= from && d < to; }).reduce((sum, t) => sum + earned(t), 0);
    return { label: [t("Mon"), t("Tue"), t("Wed"), t("Thu"), t("Fri"), t("Sat"), t("Sun")][i], amount, today: from.toDateString() === new Date().toDateString() };
  });
  const peak = Math.max(1, ...days.map((d) => d.amount));

  const pay = async () => {
    setPaying(true);
    try {
      const url = await payOwed();
      if (url) await Linking.openURL(url); // payment checkout; the balance updates when the payment provider confirms
      await load();
    } catch (e: any) {
      Alert.alert(t("Payment didn't start"), e?.message ?? t("Try again in a moment."));
    } finally {
      setPaying(false);
    }
  };

  const activity = wallet?.ledger ?? [];
  const onTheWay = (wallet?.withdrawals ?? []).filter((w) => w.status === "processing");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: tabH + 24, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.green} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Txt variant="page">{t("Earnings")}</Txt>

      {/* Balance: what can be withdrawn, or what's owed */}
      {wallet ? <BalanceCard wallet={wallet} paying={paying} onWithdraw={() => setWithdrawOpen(true)} onPay={pay} /> : null}

      {wallet && wallet.balance >= 0 && !wallet.bank.canWithdraw && wallet.bank.problem ? (
        <View style={{ backgroundColor: colors.amberSoft, borderRadius: 16, padding: 14, gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Icon name="alert" size={20} color={colors.amberText} />
            <Txt style={{ flex: 1, color: colors.amberText }}>{wallet.bank.problem}</Txt>
          </View>
          <Button title={t("Check my account again")} variant="quiet" onPress={async () => {
            try { await recheckBank(); await load(); } catch (e: any) { Alert.alert(t("Couldn't check the account"), e?.message ?? t("Try again later.")); }
          }} />
        </View>
      ) : null}

      {onTheWay.map((w) => (
        <View key={w.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.greenSoft, borderRadius: 16, padding: 14 }}>
          <Badge icon="transfer" tone="green" size={40} />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong">{t("{0} on its way", formatNaira(w.amount))}</Txt>
            <Txt variant="caption" color="muted">{t("To {0} ••{1} · usually a few minutes", w.bankName, w.accountEnding)}</Txt>
          </View>
        </View>
      ))}

      <Segmented<Period> value={period} onChange={setPeriod} options={[{ value: "today", label: t("Today") }, { value: "week", label: t("This week") }]} />

      <Card style={{ gap: 2, padding: 18 }}>
        <Txt variant="label" color="muted">{period === "today" ? t("You earned today") : t("You earned this week")} · {list.length === 1 ? t("1 trip") : t("{0} trips", list.length)}</Txt>
        <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 46, letterSpacing: -1.2 }} tabular>{formatNaira(total)}</Txt>
        {commission > 0 ? <Txt variant="caption" color="muted" tabular>{t("After {0} commission on {1} in fares", formatNaira(commission), formatNaira(inApp + direct))}</Txt> : null}
        {/* Week chart */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, height: 140, marginTop: 10 }} accessibilityLabel={t("This week: {0}", days.map((d) => `${d.label} ${formatNaira(d.amount)}`).join(", "))}>
          {days.map((d) => (
            <View key={d.label} style={{ flex: 1, height: "100%", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
              <View style={{ width: "100%", height: `${Math.max(5, (d.amount / peak) * 82)}%`, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, overflow: "hidden", backgroundColor: d.today ? undefined : colors.greenSoft }}>
                {d.today ? <LinearGradient colors={[colors.mint, colors.green]} style={{ flex: 1 }} /> : null}
              </View>
              <Txt variant="label" style={{ fontSize: 11, color: d.today ? colors.greenText : colors.muted }}>{d.label}</Txt>
            </View>
          ))}
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Split icon="phoneapp" tone="green" title={t("Paid in the app")} amount={inApp} note={t("Added to your balance")} />
        <Split icon="cash" tone="market" title={t("Collected directly")} amount={direct} note={t("Commission comes off your balance")} />
      </View>

      <Txt variant="heading" style={{ marginTop: 4 }}>{t("Trips")}</Txt>
      {trips === null ? <Txt color="muted">{t("Loading…")}</Txt> : list.length === 0 ? (
        <Txt color="muted">{period === "today" ? t("No trips today yet. Go online from the Drive tab to get requests.") : t("No trips this week yet. Go online from the Drive tab to get requests.")}</Txt>
      ) : (
        <Group>
          {list.map((trip) => (
            <View key={trip.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 14 }}>
              <Badge icon={paymentOption(trip.paymentMethod).icon} tone={isInApp(trip.paymentMethod) ? "green" : "market"} size={42} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="bodyStrong" numberOfLines={1}>{trip.destinationName}</Txt>
                <Txt variant="caption" color="muted" numberOfLines={1}>{t("{0} · {1} km · {2} · fare {3}", time(trip.completedAt), trip.distanceKm.toFixed(1), paymentOption(trip.paymentMethod).label, formatNaira(trip.fare))}</Txt>
              </View>
              <Txt style={{ fontFamily: fonts.display, fontSize: 15 }} tabular>{formatNaira(earned(trip))}</Txt>
            </View>
          ))}
        </Group>
      )}

      {activity.length ? (
        <>
          <Txt variant="heading" style={{ marginTop: 4 }}>{t("Balance activity")}</Txt>
          <Group>
            {(showAllActivity ? activity : activity.slice(0, 8)).map((e) => (
              <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
                <Badge icon={LEDGER_ICON[e.kind].icon} tone={LEDGER_ICON[e.kind].tone} size={38} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="bodyStrong" numberOfLines={2} style={{ fontSize: 14 }}>{e.label}</Txt>
                  <Txt variant="caption" color="muted">{day(e.at)} · {time(e.at)}{e.balanceAfter !== undefined ? t(" · balance {0}", formatNaira(e.balanceAfter)) : ""}</Txt>
                </View>
                <Txt style={{ fontFamily: fonts.display, fontSize: 15 }} color={e.amount > 0 ? "greenText" : "ink"} tabular>{e.amount > 0 ? "+" : ""}{formatNaira(e.amount)}</Txt>
              </View>
            ))}
          </Group>
          {activity.length > 8 ? (
            <Button title={showAllActivity ? t("Show less") : t("Show all {0}", activity.length)} variant="quiet" onPress={() => setShowAllActivity((v) => !v)} />
          ) : null}
        </>
      ) : null}

      {wallet ? (
        <Txt variant="caption" color="muted">{t("Caliphate Rides keeps {0}% of each fare. Card and wallet fares are added to your balance; for cash and transfer trips you keep the money and the commission comes off your balance. If you owe more than {1}, pay it here to keep getting trips.", wallet.settings.commissionPercent, formatNaira(wallet.settings.owedLimit))}</Txt>
      ) : null}

      {wallet ? (
        <WithdrawSheet open={withdrawOpen} wallet={wallet} bankName={wallet.bank.bankName || bankName}
          onClose={() => setWithdrawOpen(false)}
          onDone={async () => { setWithdrawOpen(false); await load(); }} />
      ) : null}
    </ScrollView>
  );
}

function BalanceCard({ wallet, paying, onWithdraw, onPay }: { wallet: DriverWallet; paying: boolean; onWithdraw: () => void; onPay: () => void }) {
  const { colors } = useTheme();
  if (wallet.balance < 0) {
    return (
      <Card style={{ padding: 18, gap: 8, borderWidth: 2, borderColor: wallet.blocked ? colors.danger : colors.amberSoft }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Txt variant="label" color="muted">{t("Commission you owe")}</Txt>
          {wallet.blocked ? <Tag text={t("Can't go online")} tone="red" icon="alert" /> : <Tag text={t("Limit {0}", formatNaira(wallet.settings.owedLimit))} tone="amber" />}
        </View>
        <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 36, lineHeight: 42, letterSpacing: -1 }} tabular>{formatNaira(wallet.owed)}</Txt>
        <Txt variant="caption" color="muted">
          {wallet.blocked
            ? t("You owe more than the limit, so you won't get trips until you pay.")
            : t("From cash and transfer trips. It's taken from your next card and wallet fares, or you can pay it now.")}
        </Txt>
        <Button title={t("Pay {0}", formatNaira(wallet.owed))} icon="card" onPress={onPay} loading={paying} />
      </Card>
    );
  }
  const can = wallet.bank.canWithdraw && wallet.balance >= wallet.settings.minWithdrawal;
  return (
    <Hero glowing style={{ padding: 20, gap: 4 }}>
      <Txt style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: fonts.bodyBold }}>{t("Available to withdraw")}</Txt>
      <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 46, letterSpacing: -1.2, color: "#FFFFFF" }} tabular>{formatNaira(wallet.balance)}</Txt>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 10 }}>
        <Txt style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: fonts.bodySemi, fontSize: 13, flex: 1 }} numberOfLines={2}>
          {wallet.bank.bankName ? t("To {0} ••{1}", wallet.bank.bankName, wallet.bank.accountEnding) : t("Add your bank in your driver record")}
          {wallet.balance < wallet.settings.minWithdrawal ? "\n" + t("Withdraw from {0}", formatNaira(wallet.settings.minWithdrawal)) : ""}
        </Txt>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Withdraw")} onPress={onWithdraw} disabled={!can}
          style={({ pressed }) => ({ backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6, opacity: !can ? 0.55 : pressed ? 0.85 : 1 })}>
          <Icon name="transfer" size={16} color="#00753F" />
          <Txt style={{ fontFamily: fonts.display, fontSize: 14, color: "#00753F" }}>{t("Withdraw")}</Txt>
        </Pressable>
      </View>
    </Hero>
  );
}

function WithdrawSheet({ open, wallet, bankName, onClose, onDone }: { open: boolean; wallet: DriverWallet; bankName: string; onClose: () => void; onDone: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = Number(text.replace(/\D/g, "")) || 0;
  const min = wallet.settings.minWithdrawal;
  const problem = amount === 0 ? null : amount < min ? t("You can withdraw {0} or more.", formatNaira(min)) : amount > wallet.balance ? t("Your balance is {0}.", formatNaira(wallet.balance)) : null;
  const quick = [min, Math.floor(wallet.balance / 2 / 100) * 100, wallet.balance].filter((v, i, a) => v >= min && v <= wallet.balance && a.indexOf(v) === i);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await withdraw(amount, bankName);
      setText("");
      onDone();
      Alert.alert(t("Withdrawal on its way"), t("{0} is being sent to {1} ••{2}. It usually arrives in a few minutes.", formatNaira(amount), bankName, wallet.bank.accountEnding));
    } catch (e: any) {
      setError(e?.message ?? t("That didn't work. Try again in a moment."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t("Close")} />
        <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 20, gap: 14 }}>
          <Txt variant="title">{t("Withdraw to your bank")}</Txt>
          <Txt color="muted">
            {bankName} ••{wallet.bank.accountEnding}{wallet.bank.verifiedName ? ` · ${wallet.bank.verifiedName}` : ""}
          </Txt>
          <View style={{ flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 2, borderColor: problem ? colors.danger : colors.green, paddingHorizontal: 16 }}>
            <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 28 }}>₦</Txt>
            <TextInput
              value={text ? Number(text.replace(/\D/g, "")).toLocaleString("en-NG") : ""}
              onChangeText={(t) => setText(t.replace(/\D/g, "").slice(0, 7))}
              keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} accessibilityLabel={t("Amount to withdraw")}
              style={{ flex: 1, fontFamily: fonts.displayHeavy, fontSize: 28, color: colors.ink, paddingVertical: 12, paddingHorizontal: 6 }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {quick.map((v) => <Chip key={v} label={v === wallet.balance ? t("All {0}", formatNaira(v)) : formatNaira(v)} active={amount === v} onPress={() => setText(String(v))} />)}
          </View>
          {problem || error ? <Txt variant="caption" style={{ color: colors.danger }}>{problem ?? error}</Txt> : (
            <Txt variant="caption" color="muted">{t("Available {0}. No fee: Caliphate Rides pays the transfer charge.", formatNaira(wallet.balance))}</Txt>
          )}
          <Button title={amount ? t("Withdraw {0}", formatNaira(amount)) : t("Withdraw")} onPress={submit} loading={busy} disabled={!amount || !!problem} />
          <Button title={t("Cancel")} variant="quiet" onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Split({ title, amount, note, icon, tone }: { title: string; amount: number; note: string; icon: "phoneapp" | "cash"; tone: "green" | "market" }) {
  return (
    <Card style={{ flex: 1, gap: 4, padding: 14 }}>
      <Badge icon={icon} tone={tone} size={36} />
      <Txt variant="caption" color="muted" style={{ fontFamily: fonts.bodyBold, marginTop: 8 }}>{title}</Txt>
      <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 20 }} tabular>{formatNaira(amount)}</Txt>
      <Txt variant="caption" color="muted">{note}</Txt>
    </Card>
  );
}
