import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../src/components/Icon";
import { KnotMark } from "../../src/components/Knot";
import { useTabBarHeight } from "../../src/components/TabBar";
import { Chip, Txt } from "../../src/components/ui";
import { Badge, Group, Hero } from "../../src/components/visual";
import { formatNaira } from "../../src/lib/pricing";
import { getWallet, startTopUp } from "../../src/services/rides";
import { useSession } from "../../src/store/session";
import { useTheme } from "../../src/theme/ThemeProvider";
import { fonts } from "../../src/theme/tokens";
import type { WalletTransaction } from "../../src/types";

const AMOUNTS = [1000, 2000, 5000, 10000];

export default function Wallet() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const { user } = useSession();
  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [amount, setAmount] = useState(2000);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const w = await getWallet(); setBalance(w.balance); setTxs(w.transactions); } catch { /* keep last */ }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const topUp = async () => {
    setBusy(true);
    try {
      const url = await startTopUp(amount);
      if (url) await Linking.openURL(url); // Paystack checkout; the backend credits the wallet on the webhook
      await load();
    } catch (e: any) {
      Alert.alert("Top up didn't start", e?.message ?? "Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: tabH + 24, gap: 16 }}>
      <Txt variant="page">Wallet</Txt>

      {/* Balance card */}
      <Hero glowing style={{ padding: 20, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Txt style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: fonts.bodyBold }}>Balance</Txt>
          <KnotMark size={26} color="#FFFFFF" strokeWidth={9} />
        </View>
        <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 46, letterSpacing: -1.2, color: "#FFFFFF" }} tabular>
          {balance === null ? "…" : `${formatNaira(balance)}.00`}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <Txt style={{ color: "#FFFFFF", opacity: 0.85, fontFamily: fonts.bodySemi, fontSize: 13 }}>{user?.name}</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel={`Add ${formatNaira(amount)}`} onPress={topUp} disabled={busy}
            style={({ pressed }) => ({ backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.85 : 1 })}>
            {busy ? <ActivityIndicator color="#00753F" /> : <Icon name="add" size={16} color="#00753F" />}
            <Txt style={{ fontFamily: fonts.display, fontSize: 14, color: "#00753F" }}>Add {formatNaira(amount)}</Txt>
          </Pressable>
        </View>
      </Hero>

      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {AMOUNTS.map((a) => <Chip key={a} label={formatNaira(a)} active={a === amount} onPress={() => setAmount(a)} />)}
      </View>
      <Txt variant="caption" color="muted">Pay by card, bank transfer or USSD through Paystack. Cash rides don't need a balance.</Txt>

      <Txt variant="heading" style={{ marginTop: 4 }}>Recent activity</Txt>
      {txs.length === 0 ? <Txt color="muted">Top-ups and wallet payments show up here.</Txt> : (
        <Group>
          {txs.map((t) => (
            <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 14 }}>
              <Badge icon={t.kind === "topup" ? "add" : "keke"} tone={t.kind === "topup" ? "green" : "market"} size={42} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="bodyStrong" numberOfLines={1}>{t.label}</Txt>
                <Txt variant="caption" color="muted">{new Date(t.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{t.method ? ` · ${t.method}` : ""}</Txt>
              </View>
              <Txt style={{ fontFamily: fonts.display, fontSize: 15 }} color={t.amount > 0 ? "greenText" : "ink"} tabular>{t.amount > 0 ? "+" : ""}{formatNaira(t.amount)}</Txt>
            </View>
          ))}
        </Group>
      )}
    </ScrollView>
  );
}
