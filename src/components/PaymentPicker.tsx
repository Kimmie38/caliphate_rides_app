import React from "react";
import { Pressable, View } from "react-native";
import { formatNaira } from "../lib/pricing";
import { PAYMENT_OPTIONS, type PaymentMethod } from "../lib/payments";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "./Icon";
import { tap, Txt } from "./ui";

type Props = {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  walletBalance: number | null;
  fare?: number;
};

/** Payment choices in two groups: in the app, or directly to the driver. */
export function PaymentPicker({ value, onChange, walletBalance, fare }: Props) {
  const groups = [
    { title: "Pay in the app", options: PAYMENT_OPTIONS.filter((o) => o.inApp) },
    { title: "Pay the driver directly", options: PAYMENT_OPTIONS.filter((o) => !o.inApp) },
  ];
  return (
    <View accessibilityRole="radiogroup" style={{ gap: 12 }}>
      {groups.map((g) => (
        <View key={g.title} style={{ gap: 6 }}>
          <Txt variant="label" color="muted">{g.title}</Txt>
          {g.options.map((o) => {
            const short = o.id === "wallet" && walletBalance !== null && fare !== undefined && walletBalance < fare;
            const detail = o.id === "wallet" && walletBalance !== null
              ? `Balance ${formatNaira(walletBalance)}${short ? " · not enough for this trip" : ""}`
              : o.detail;
            return (
              <Option key={o.id} icon={o.icon} label={o.label} detail={detail} selected={value === o.id} dimmed={short} onPress={() => onChange(o.id)} />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Option({ icon, label, detail, selected, dimmed, onPress }: {
  icon: "wallet" | "card" | "cash" | "transfer"; label: string; detail: string; selected: boolean; dimmed?: boolean; onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}. ${detail}`}
      onPress={() => { tap(); onPress(); }}
      style={{
        flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14,
        borderWidth: 2, borderColor: selected ? colors.green : colors.line, backgroundColor: selected ? colors.greenSoft : "transparent",
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <Icon name={icon} color={selected ? colors.greenText : colors.ink} />
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong">{label}</Txt>
        <Txt variant="caption" color="muted">{detail}</Txt>
      </View>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selected ? colors.green : colors.line, alignItems: "center", justifyContent: "center" }}>
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green }} /> : null}
      </View>
    </Pressable>
  );
}
