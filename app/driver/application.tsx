import { router } from "expo-router";
import { goBack } from "../../src/lib/nav";
import React, { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pill } from "../../src/driver/components/form";
import { Logo } from "../../src/components/Logo";
import { Button, IconButton, tap, Txt } from "../../src/components/ui";
import { ENV } from "../../src/config/env";
import { documentsFor } from "../../src/driver/config/requirements";
import { prettyDate, prettyDateTime } from "../../src/driver/lib/dates";
import { formatNgPhone } from "../../src/lib/phone";
import { useApplication } from "../../src/driver/store/application";
import { useMode } from "../../src/store/mode";
import { useSession } from "../../src/store/session";
import { useTheme } from "../../src/theme/ThemeProvider";
import type { ApplicationStatus } from "../../src/driver/types";

const STATUS: Record<ApplicationStatus, { pill: string; tone: "green" | "amber" | "red" | "grey"; title: string; body: string }> = {
  draft: { pill: "Not sent", tone: "grey", title: "Finish your application", body: "" },
  submitted: { pill: "Under review", tone: "amber", title: "We're checking your documents", body: "This usually takes 1–2 working days. We'll text you when it's done. You don't need to do anything else." },
  changes_requested: { pill: "Changes needed", tone: "red", title: "Some details need fixing", body: "Our team checked your application and needs you to change something before we can approve it." },
  approved: { pill: "Approved", tone: "green", title: "Official driver record", body: "This is what Caliphate Rides holds about you. Keep your documents up to date to keep driving." },
  rejected: { pill: "Not approved", tone: "red", title: "We couldn't approve your application", body: "Call support to find out why and what you can do." },
  suspended: { pill: "Suspended", tone: "red", title: "Your account is on hold", body: "Update the documents marked below, or call support." },
};

/** Application status while under review, and the driver's official record once approved. */
export default function ApplicationScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { application: a, refresh, mockReview } = useApplication();
  const { user } = useSession();
  const { setMode } = useMode();
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  if (!a) return null;
  const s = STATUS[a.status];
  const isDriver = a.status === "approved" || a.status === "suspended";
  const docs = a.vehicleType ? documentsFor(a.vehicleType, a.vehicle.ownsVehicle).filter((d) => a.documents[d.kind]) : [];

  const review = async (d: "approve" | "changes") => { setBusy(d); await mockReview(d); setBusy(null); };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.green} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} />}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {isDriver ? <IconButton name="back" label="Back" onPress={() => goBack("/driver/account")} size={44} style={{ borderRadius: 14 }} /> : <Logo size={48} />}
        <View style={{ flex: 1 }} />
        <Pill text={s.pill} tone={s.tone} />
      </View>

      <View style={{ gap: 8 }}>
        <Txt variant="hero" style={{ fontSize: 28, lineHeight: 33 }}>{s.title}</Txt>
        <Txt color="muted">{s.body}</Txt>
      </View>

      {a.status === "changes_requested" ? (
        <View style={{ gap: 12 }}>
          {a.reviewNote ? (
            <View style={{ backgroundColor: colors.mist, borderRadius: 14, padding: 14 }}>
              <Txt variant="bodyStrong">{a.reviewNote}</Txt>
            </View>
          ) : null}
          <Button title="Fix and send again" onPress={() => router.push("/driver/onboarding/documents")} />
        </View>
      ) : null}

      {/* The official record */}
      <View style={{ borderWidth: 1.5, borderColor: colors.line, borderRadius: 18, padding: 16, gap: 10 }}>
        <Txt variant="label" color="muted">Record number</Txt>
        <Txt variant="title" tabular selectable>{a.recordId}</Txt>
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <Row k="Name" v={a.personal.fullName} />
        <Row k="Phone" v={user ? formatNgPhone(user.phone) : ""} />
        <Row k="LGA" v={a.personal.lga} />
        <Row k="Vehicle" v={`${a.vehicleType === "keke" ? "Keke" : "Car"} · ${[a.vehicle.colour, a.vehicle.make, a.vehicle.model].filter(Boolean).join(" ")}`} />
        <Row k="Plate" v={a.vehicle.plate} />
        <Row k="Guarantor" v={`${a.guarantor.fullName} (${a.guarantor.relationship.toLowerCase()})`} />
        <Row k="Payouts" v={`${a.bank.bankName} · ${a.bank.accountNumber}`} />
        <Row k="Submitted" v={a.submittedAt ? prettyDateTime(a.submittedAt) : "Not yet"} />
        {a.approvedAt ? <Row k="Approved" v={prettyDateTime(a.approvedAt)} /> : null}
        {a.declaration ? <Row k="Signed" v={`${a.declaration.signedName}, ${prettyDate(a.declaration.signedAt.slice(0, 10))}`} /> : null}
      </View>

      <View style={{ gap: 4 }}>
        <Txt variant="heading">Documents</Txt>
        {docs.map((d) => {
          const v = a.documents[d.kind]!.current!;
          const versions = 1 + (a.documents[d.kind]!.history.length);
          return (
            <Pressable key={d.kind} accessibilityRole="button" disabled={!isDriver && a.status !== "changes_requested"}
              onPress={() => { tap(); router.push({ pathname: "/driver/document/[kind]", params: { kind: d.kind } }); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="bodyStrong">{d.title}</Txt>
                <Txt variant="caption" color="muted">
                  {v.expiry ? `Expires ${prettyDate(v.expiry)} · ` : ""}{versions} version{versions > 1 ? "s" : ""} on record
                </Txt>
              </View>
              <Pill text={v.status === "approved" ? "Approved" : v.status === "pending" ? "Being checked" : "Not accepted"} tone={v.status === "approved" ? "green" : v.status === "pending" ? "amber" : "red"} />
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 10 }}>
        <Txt variant="heading">History</Txt>
        {a.timeline.map((t, i) => (
          <View key={`${t.at}-${i}`} style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ alignItems: "center", width: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i === 0 ? colors.green : colors.line, marginTop: 5 }} />
              {i < a.timeline.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: colors.line, marginTop: 2 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 12 }}>
              <Txt variant="bodyStrong">{t.event}</Txt>
              <Txt variant="caption" color="muted">{prettyDateTime(t.at)}{t.by ? ` · ${t.by}` : ""}</Txt>
            </View>
          </View>
        ))}
      </View>

      {ENV.useMock && a.status === "submitted" ? (
        <View style={{ gap: 10, backgroundColor: colors.mist, borderRadius: 18, padding: 16 }}>
          <Txt variant="heading">Sample mode</Txt>
          <Txt variant="caption" color="muted">In the real app, your team does this from the admin dashboard.</Txt>
          <Button title="Approve this driver" onPress={() => review("approve")} loading={busy === "approve"} />
          <Button title="Ask for a change" variant="outline" onPress={() => review("changes")} loading={busy === "changes"} />
        </View>
      ) : null}

      {!isDriver ? (
        <Pressable accessibilityRole="button" onPress={() => setMode("rider")} style={{ alignSelf: "center", padding: 8 }}>
          <Txt variant="label" color="greenText">Book a ride while you wait</Txt>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Txt variant="caption" color="muted" style={{ width: 90 }}>{k}</Txt>
      <Txt variant="caption" style={{ flex: 1 }} selectable>{v || "—"}</Txt>
    </View>
  );
}
