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
import { t } from "../../i18n";

/** One document with its review status and expiry, tapping opens the upload / update screen. */
export function DocumentRow({ req, doc, required, actionLabel }: { req: DocumentRequirement; doc?: DriverDocument; required: boolean; actionLabel?: string }) {
  const { colors } = useTheme();
  const v = doc?.current;
  const exp = expiryState(v?.expiry, EXPIRY_WARNING_DAYS);
  const pill =
    !v ? (required ? { text: t("Needed"), tone: "grey" as const } : { text: t("Optional"), tone: "grey" as const })
    : v.status === "rejected" ? { text: t("Needs a new photo"), tone: "red" as const }
    : exp?.kind === "expired" ? { text: t("Expired"), tone: "red" as const }
    : v.status === "pending" ? { text: t("Being checked"), tone: "amber" as const }
    : exp?.kind === "soon" ? { text: t("Expires in {0} day{1}", exp.days, exp.days === 1 ? "" : "s"), tone: "amber" as const }
    : v.status === "approved" ? { text: t("Approved"), tone: "green" as const }
    : { text: t("Added"), tone: "green" as const };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(req.title)}. ${pill.text}`}
      onPress={() => { tap(); router.push({ pathname: "/driver/document/[kind]", params: { kind: req.kind } }); }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 14, backgroundColor: pressed ? colors.mist : "transparent" })}
    >
      <Badge icon={req.kind === "licence" || req.kind === "owner_id" ? "idcard" : req.kind === "selfie" ? "person" : req.kind === "insurance" ? "shield" : req.kind === "proof_of_address" ? "home" : "document"}
        tone={pill.tone === "green" ? "green" : pill.tone === "amber" ? "market" : pill.tone === "red" ? "health" : "transport"} size={42} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Txt variant="bodyStrong">{t(req.title)}</Txt>
        {v?.variant ? <Txt variant="caption" color="muted">{t(v.variant)}</Txt> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Pill text={pill.text} tone={pill.tone} />
          {v?.expiry ? <Txt variant="caption" color="muted">{t("Expires {0}", prettyDate(v.expiry))}</Txt> : null}
        </View>
      </View>
      <Txt variant="label" color="greenText">{actionLabel ?? (v ? t("Update") : t("Add"))}</Txt>
    </Pressable>
  );
}
