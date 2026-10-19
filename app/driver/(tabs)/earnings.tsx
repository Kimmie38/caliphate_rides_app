import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Segmented, Txt } from "../../../src/components/ui";
import { LinearGradient } from "expo-linear-gradient";
import { Badge, Card, Group } from "../../../src/components/visual";
import { useTabBarHeight } from "../../../src/components/TabBar";
import { isInApp, paymentOption } from "../../../src/lib/payments";
import { formatNaira } from "../../../src/lib/pricing";
import { getEarnings } from "../../../src/driver/services/trips";
import { useApplication } from "../../../src/driver/store/application";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { fonts } from "../../../src/theme/tokens";
import type { EarningsTrip } from "../../../src/driver/types";

type Period = "today" | "week";

function since(period: Period) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

export default function Earnings() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const { application } = useApplication();
  const [trips, setTrips] = useState<EarningsTrip[] | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => { try { setTrips(await getEarnings()); } catch { /* keep last */ } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const list = (trips ?? []).filter((t) => new Date(t.completedAt) >= since(period));
  const total = list.reduce((s, t) => s + t.fare, 0);
  const inApp = list.filter((t) => isInApp(t.paymentMethod)).reduce((s, t) => s + t.fare, 0);
  const direct = total - inApp;

  // This week's earnings per day, Monday first, for the chart.
  const weekStart = since("week");
  const days = Array.from({ length: 7 }, (_, i) => {
    const from = new Date(weekStart); from.setDate(from.getDate() + i);
    const to = new Date(from); to.setDate(to.getDate() + 1);
    const amount = (trips ?? []).filter((t) => { const d = new Date(t.completedAt); return d >= from && d < to; }).reduce((sum, t) => sum + t.fare, 0);
    return { label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], amount, today: from.toDateString() === new Date().toDateString() };
  });
  const peak = Math.max(1, ...days.map((d) => d.amount));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: tabH + 24, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.green} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Txt variant="page">Earnings</Txt>
      <Segmented<Period> value={period} onChange={setPeriod} options={[{ value: "today", label: "Today" }, { value: "week", label: "This week" }]} />

      <Card style={{ gap: 2, padding: 18 }}>
        <Txt variant="label" color="muted">{period === "today" ? "Today" : "This week"} · {list.length} trip{list.length === 1 ? "" : "s"}</Txt>
        <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 46, letterSpacing: -1.2 }} tabular>{formatNaira(total)}</Txt>
        {/* Week chart */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, height: 140, marginTop: 10 }} accessibilityLabel={`This week: ${days.map((d) => `${d.label} ${formatNaira(d.amount)}`).join(", ")}`}>
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
        <Split icon="phoneapp" tone="green" title="Paid in the app" amount={inApp} note={application?.bank.bankName ? `Paid out to ${application.bank.bankName}` : "Paid out to your bank"} />
        <Split icon="cash" tone="market" title="Collected directly" amount={direct} note="Cash and transfers" />
      </View>

      <Txt variant="heading" style={{ marginTop: 4 }}>Trips</Txt>
      {trips === null ? <Txt color="muted">Loading…</Txt> : list.length === 0 ? (
        <Txt color="muted">No trips {period === "today" ? "today" : "this week"} yet. Go online from the Drive tab to get requests.</Txt>
      ) : (
        <Group>
          {list.map((t) => (
            <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 14 }}>
              <Badge icon={paymentOption(t.paymentMethod).icon} tone={isInApp(t.paymentMethod) ? "green" : "market"} size={42} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="bodyStrong" numberOfLines={1}>{t.destinationName}</Txt>
                <Txt variant="caption" color="muted" numberOfLines={1}>
                  {new Date(t.completedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · {t.distanceKm.toFixed(1)} km · {paymentOption(t.paymentMethod).label}
                </Txt>
              </View>
              <Txt style={{ fontFamily: fonts.display, fontSize: 15 }} tabular>{formatNaira(t.fare)}</Txt>
            </View>
          ))}
        </Group>
      )}
    </ScrollView>
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
