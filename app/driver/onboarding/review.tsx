import { router } from "expo-router";
import { goBack } from "../../../src/lib/nav";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Field, StepScreen } from "../../../src/driver/components/form";
import { Icon } from "../../../src/components/Icon";
import { Button, tap, Txt } from "../../../src/components/ui";
import { documentsFor } from "../../../src/driver/config/requirements";
import { prettyDate } from "../../../src/driver/lib/dates";
import { formatNgPhone, normalizeNgPhone } from "../../../src/lib/phone";
import { DEMO } from "../../../src/config/demo";
import { fillAll } from "../../../src/driver/lib/demoFill";
import { missingSections } from "../../../src/driver/lib/validate";
import { useApplication } from "../../../src/driver/store/application";
import { useSession } from "../../../src/store/session";
import { useTheme } from "../../../src/theme/ThemeProvider";

export default function Review() {
  const { colors } = useTheme();
  const { application, submit, update } = useApplication();
  const { user } = useSession();
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sample mode: fill in anything still empty, so the record looks complete and Submit works.
  useEffect(() => { if (DEMO) update((a) => fillAll(a, user?.name)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!application) return null;
  const a = application;
  const missing = missingSections(a);
  const signedOk = signature.trim().toLowerCase() === a.personal.fullName.trim().toLowerCase() && signature.trim().length > 0;
  const docs = a.vehicleType ? documentsFor(a.vehicleType, a.vehicle.ownsVehicle).filter((d) => a.documents[d.kind]?.current) : [];

  const send = async () => {
    setBusy(true);
    setError(null);
    try { await submit(signature.trim() || a.personal.fullName); } // the app moves to the application status screen by itself
    catch (e: any) { setError(e?.message ?? "Couldn't submit. Check your connection and try again."); }
    finally { setBusy(false); }
  };

  const guarantorPhone = normalizeNgPhone(a.guarantor.phone);

  return (
    <StepScreen step={7} title="Check and sign" onBack={() => goBack("/driver/onboarding/bank")}
      intro="This becomes your official driver record with Caliphate Rides. Check everything is correct."
      footer={
        <>
          {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
          <Button title={a.status === "changes_requested" ? "Send changes for review" : "Submit application"} onPress={send} loading={busy} disabled={!DEMO && (missing.length > 0 || !agreed || !signedOk)} />
        </>
      }>
      {missing.length ? (
        <View style={{ backgroundColor: colors.mist, borderRadius: 14, padding: 14, gap: 6 }}>
          <Txt variant="bodyStrong">Still to do</Txt>
          {missing.map((m) => <Txt key={m} color="muted">• {m}</Txt>)}
        </View>
      ) : null}

      <Section title="Vehicle" onEdit={() => router.push("/driver/onboarding")}>
        <Row k="Type" v={a.vehicleType === "keke" ? "Keke" : a.vehicleType === "car" ? "Car" : "Not chosen"} />
        <Row k="Owner" v={a.vehicle.ownsVehicle ? "You" : "Someone else (letter attached)"} />
      </Section>
      <Section title="About you" onEdit={() => router.push("/driver/onboarding/personal")}>
        <Row k="Name" v={a.personal.fullName} />
        <Row k="Phone" v={user ? formatNgPhone(user.phone) : ""} />
        <Row k="Date of birth" v={prettyDate(a.personal.dateOfBirth)} />
        <Row k="LGA" v={a.personal.lga} />
        <Row k="NIN" v={a.personal.nin ? `••••••${a.personal.nin.slice(-5)}` : ""} />
      </Section>
      <Section title="Vehicle details" onEdit={() => router.push("/driver/onboarding/vehicle")}>
        <Row k="Vehicle" v={[a.vehicle.colour, a.vehicle.make, a.vehicle.model, a.vehicle.year && `(${a.vehicle.year})`].filter(Boolean).join(" ")} />
        <Row k="Plate" v={a.vehicle.plate} />
      </Section>
      <Section title="Documents" onEdit={() => router.push("/driver/onboarding/documents")}>
        {docs.map((d) => <Row key={d.kind} k={d.title} v={a.documents[d.kind]?.current?.expiry ? `Expires ${prettyDate(a.documents[d.kind]!.current!.expiry)}` : "Added"} />)}
      </Section>
      <Section title="Guarantor" onEdit={() => router.push("/driver/onboarding/guarantor")}>
        <Row k="Name" v={a.guarantor.fullName} />
        <Row k="Phone" v={guarantorPhone ? formatNgPhone(guarantorPhone) : a.guarantor.phone} />
        <Row k="Relationship" v={a.guarantor.relationship} />
      </Section>
      <Section title="Bank account" onEdit={() => router.push("/driver/onboarding/bank")}>
        <Row k="Bank" v={a.bank.bankName} />
        <Row k="Account" v={`${a.bank.accountNumber} · ${a.bank.accountName}`} />
      </Section>

      <View style={{ gap: 12, backgroundColor: colors.mist, borderRadius: 18, padding: 16 }}>
        <Txt variant="heading">Declaration</Txt>
        <Txt color="muted">
          I confirm that the information and documents I've given are true and belong to me. I understand that Caliphate Rides keeps them as my official driver record, checks them with the issuing bodies, and may contact my guarantor. I will keep my licence and vehicle papers valid and update them before they expire.
        </Txt>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => { tap(); setAgreed(!agreed); }} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: agreed ? colors.green : colors.line, backgroundColor: agreed ? colors.green : "transparent", alignItems: "center", justifyContent: "center" }}>
            {agreed ? <Icon name="check" size={18} color={colors.greenInk} /> : null}
          </View>
          <Txt variant="bodyStrong" style={{ flex: 1 }}>I agree</Txt>
        </Pressable>
        <Field label="Type your full name to sign" value={signature} onChangeText={setSignature} autoCapitalize="words" placeholder={a.personal.fullName || "Full name"}
          error={signature && !signedOk ? "Type your name exactly as above." : undefined} />
      </View>
    </StepScreen>
  );
}

function Section({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderWidth: 1.5, borderColor: colors.line, borderRadius: 16, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Txt variant="heading" style={{ flex: 1 }}>{title}</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${title}`} onPress={() => { tap(); onEdit(); }} hitSlop={8}>
          <Txt variant="label" color="greenText">Edit</Txt>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Txt variant="caption" color="muted" style={{ width: 110 }}>{k}</Txt>
      <Txt variant="caption" style={{ flex: 1 }}>{v || "—"}</Txt>
    </View>
  );
}
