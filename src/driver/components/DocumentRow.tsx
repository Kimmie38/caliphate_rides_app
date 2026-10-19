import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { EXPIRY_WARNING_DAYS, type DocumentRequirement } from "../config/requirements";
import { expiryState, prettyDate } from "../lib/dates";
import { useTheme } from "../../theme/ThemeProvider";
import type { DriverDocument } from "../types";
import { Pill } from "./form";
import { Badge } from "../../components/visual";
import { tap, Txt } from "../../components/ui";

/** One document with its review status and expiry, tapping opens the upload / update screen. */
export function DocumentRow({ req, doc, required, actionLabel }: { req: DocumentRequirement; doc?: DriverDocument; required: boolean; actionLabel?: string }) {
  const { colors } = useTheme();
  const v = doc?.current;
  const exp = expiryState(v?.expiry, EXPIRY_WARNING_DAYS);
  const pill =
    !v ? (required ? { text: "Needed", tone: "grey" as const } : { text: "Optional", tone: "grey" as const })
    : v.status === "rejected" ? { text: "Needs a new photo", tone: "red" as const }
    : exp?.kind === "expired" ? { text: "Expired", tone: "red" as const }
    : v.status === "pending" ? { text: "Being checked", tone: "amber" as const }
    : exp?.kind === "soon" ? { text: `Expires in ${exp.days} day${exp.days === 1 ? "" : "s"}`, tone: "amber" as const }
    : v.status === "approved" ? { text: "Approved", tone: "green" as const }
    : { text: "Added", tone: "green" as const };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${req.title}. ${pill.text}`}
      onPress={() => { tap(); router.push({ pathname: "/driver/document/[kind]", params: { kind: req.kind } }); }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 14, backgroundColor: pressed ? colors.mist : "transparent" })}
    >
      <Badge icon={req.kind === "licence" ? "idcard" : req.kind === "selfie" ? "person" : req.kind === "insurance" ? "shield" : "document"}
        tone={pill.tone === "green" ? "green" : pill.tone === "amber" ? "market" : pill.tone === "red" ? "health" : "transport"} size={42} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Txt variant="bodyStrong">{req.title}</Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Pill text={pill.text} tone={pill.tone} />
          {v?.expiry ? <Txt variant="caption" color="muted">Expires {prettyDate(v.expiry)}</Txt> : null}
        </View>
      </View>
      <Txt variant="label" color="greenText">{actionLabel ?? (v ? "Update" : "Add")}</Txt>
    </Pressable>
  );
}
