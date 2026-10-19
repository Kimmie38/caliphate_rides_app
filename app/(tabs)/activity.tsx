import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VehicleArt } from "../../src/components/visual";
import { useTabBarHeight } from "../../src/components/TabBar";
import { Button, Txt } from "../../src/components/ui";
import { paymentOption } from "../../src/lib/payments";
import { formatKm, formatNaira } from "../../src/lib/pricing";
import { getHistory } from "../../src/services/rides";
import { useTheme } from "../../src/theme/ThemeProvider";
import type { TripSummary } from "../../src/types";

const when = (iso: string) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
};

export default function Activity() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const [trips, setTrips] = useState<TripSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setTrips(await getHistory()); setError(null); }
    catch (e: any) { setError(e?.message ?? "Couldn't load your trips."); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: tabH + 24 }}
      data={trips ?? []}
      keyExtractor={(t) => t.id}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.green} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListHeaderComponent={<Txt variant="page" style={{ marginBottom: 14 }}>Your trips</Txt>}
      ListEmptyComponent={
        trips === null ? <Txt color="muted">Loading your trips…</Txt> : error ? <Txt style={{ color: colors.danger }}>{error}</Txt> : (
          <View style={{ gap: 14, paddingTop: 20 }}>
            <Txt color="muted">No trips yet. Your rides show up here after your first trip.</Txt>
            <Button title="Book a ride" variant="quiet" onPress={() => router.navigate("/(tabs)")} />
          </View>
        )
      }
      renderItem={({ item, index }) => (
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 14, backgroundColor: colors.paper,
          borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.line,
          borderTopLeftRadius: index === 0 ? 22 : 0, borderTopRightRadius: index === 0 ? 22 : 0,
          borderBottomLeftRadius: index === (trips?.length ?? 0) - 1 ? 22 : 0, borderBottomRightRadius: index === (trips?.length ?? 0) - 1 ? 22 : 0,
        }}>
          <View style={{ width: 56, height: 44, borderRadius: 14, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }}>
            <VehicleArt type={item.rideType} width={48} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="bodyStrong" numberOfLines={1}>{item.destinationName}</Txt>
            <Txt variant="caption" color="muted" numberOfLines={1}>{when(item.completedAt)} · {item.rideType === "keke" ? "Keke" : "Car"} · {formatKm(item.distanceKm)}</Txt>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Txt variant="bodyStrong" tabular>{formatNaira(item.fare)}</Txt>
            <Txt variant="caption" color="muted">{paymentOption(item.paymentMethod).label}</Txt>
          </View>
        </View>
      )}
    />
  );
}
