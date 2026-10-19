import { useLocalSearchParams } from "expo-router";
import { goBack } from "../../../src/lib/nav";
import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DateField, Field, Pill, PhotoField } from "../../../src/driver/components/form";
import { Button, IconButton, Txt } from "../../../src/components/ui";
import { documentRequirement } from "../../../src/driver/config/requirements";
import { parseDmy, prettyDate, prettyDateTime, toDmy } from "../../../src/driver/lib/dates";
import { DEMO } from "../../../src/config/demo";
import { fillDocuments } from "../../../src/driver/lib/demoFill";
import { validateDocument, type Errors } from "../../../src/driver/lib/validate";
import { useApplication } from "../../../src/driver/store/application";
import { useTheme } from "../../../src/theme/ThemeProvider";
import type { DocumentKind, DocumentVersion } from "../../../src/driver/types";

/** Add a document during sign-up, or upload a new version later (e.g. a renewed licence). */
export default function DocumentScreen() {
  const { kind } = useLocalSearchParams<{ kind: DocumentKind }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { application, uploadDocument, update } = useApplication();
  const req = documentRequirement(kind);
  const doc = application?.documents[kind];
  const isUpdate = !!doc?.current && application?.status !== "draft";
  // A renewal starts empty; a draft edit starts from what was entered.
  const start = isUpdate ? undefined : doc?.current;
  const [files, setFiles] = useState<(string | undefined)[]>(start?.files ?? []);
  const [number, setNumber] = useState(start?.number ?? (isUpdate ? doc?.current?.number ?? "" : ""));
  const [expiry, setExpiry] = useState(toDmy(start?.expiry));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  if (!application || !req) return null;
  // Where "back" goes if this screen was opened directly: the sign-up documents step, or the Documents tab.
  const home = application.status === "draft" || application.status === "changes_requested" ? "/driver/onboarding/documents" : "/driver/documents";

  const save = async () => {
    // Sample mode, nothing added yet: use a sample version of this document.
    if (DEMO && !files.some(Boolean) && !doc?.current) {
      update((a) => {
        const all = fillDocuments(a);
        return all[kind] ? { ...a, documents: { ...a.documents, [kind]: all[kind] } } : a;
      });
      goBack(home);
      return;
    }
    const e = validateDocument({ files, photoCount: req.photos.length, number, needsNumber: req.needsNumber, expiryText: expiry, needsExpiry: req.needsExpiry });
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await uploadDocument(kind, { files: files as string[], number: req.needsNumber ? number.trim() : undefined, expiry: req.needsExpiry ? parseDmy(expiry)! : undefined });
      goBack(home);
    } catch (err: any) {
      setErrors({ save: err?.message ?? "Couldn't upload. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  const title = isUpdate ? `Update ${req.title.toLowerCase()}` : req.title;
  const versions: DocumentVersion[] = [doc?.current, ...(doc?.history ?? [])].filter(Boolean) as DocumentVersion[];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 24, gap: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconButton name="close" label="Close" onPress={() => goBack(home)} size={44} style={{ borderRadius: 14 }} />
        </View>
        <Txt variant="hero" style={{ fontSize: 28, lineHeight: 33 }}>{title}</Txt>
        <Txt color="muted">{req.hint}</Txt>
        {isUpdate && req.blocksDriving ? (
          <View style={{ backgroundColor: colors.mist, borderRadius: 14, padding: 14 }}>
            <Txt variant="caption" color="muted">Your new {req.title.toLowerCase()} goes to our team for review. You can keep driving until your current one expires. Your old one stays on your record.</Txt>
          </View>
        ) : null}
        {doc?.current?.status === "rejected" && doc.current.reviewNote ? (
          <View style={{ backgroundColor: colors.mist, borderRadius: 14, padding: 14, gap: 4 }}>
            <Txt variant="bodyStrong">What to fix</Txt>
            <Txt color="muted">{doc.current.reviewNote}</Txt>
          </View>
        ) : null}

        {req.photos.map((label, i) => (
          <PhotoField key={label} label={label} uri={files[i]} selfie={kind === "selfie"} onChange={(uri) => { const next = [...files]; next[i] = uri; setFiles(next); setErrors({}); }} />
        ))}
        {errors.files ? <Txt variant="caption" style={{ color: colors.danger }}>{errors.files}</Txt> : null}

        {req.needsNumber ? (
          <Field label={req.needsNumber} value={number} onChangeText={(t) => { setNumber(t.toUpperCase()); setErrors({}); }} autoCapitalize="characters" autoCorrect={false} error={errors.number} />
        ) : null}
        {req.needsExpiry ? (
          <DateField label="Expiry date" value={expiry} onChange={(t) => { setExpiry(t); setErrors({}); }} error={errors.expiry} hint="As printed on the document." />
        ) : null}

        {versions.length > 0 && application.status !== "draft" ? (
          <View style={{ gap: 10 }}>
            <Txt variant="heading">On your record</Txt>
            {versions.map((v, i) => (
              <View key={v.uploadedAt} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                {v.files[0] ? <Image source={{ uri: v.files[0] }} style={{ width: 52, height: 36, borderRadius: 6, backgroundColor: colors.mist }} /> : null}
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="caption">{i === 0 ? "Current" : "Earlier"} · uploaded {prettyDateTime(v.uploadedAt)}</Txt>
                  {v.expiry ? <Txt variant="caption" color="muted">Expires {prettyDate(v.expiry)}{v.number ? ` · ${v.number}` : ""}</Txt> : null}
                </View>
                <Pill text={v.status === "approved" ? "Approved" : v.status === "pending" ? "Being checked" : v.status === "rejected" ? "Not accepted" : "Missing"}
                  tone={v.status === "approved" ? "green" : v.status === "pending" ? "amber" : "red"} />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 14, borderTopWidth: 1, borderTopColor: colors.line, gap: 8 }}>
        {errors.save ? <Txt variant="caption" style={{ color: colors.danger }}>{errors.save}</Txt> : null}
        <Button title={isUpdate ? "Send for review" : "Save"} onPress={save} loading={busy} />
      </View>
    </KeyboardAvoidingView>
  );
}
