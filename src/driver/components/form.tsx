import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { maskDmy } from "../lib/dates";
import { useTheme } from "../../theme/ThemeProvider";
import { fonts } from "../../theme/tokens";
import { Icon } from "../../components/Icon";
import { Button, IconButton, tap, Txt } from "../../components/ui";

// ---------- Text field ----------
type FieldProps = TextInputProps & { label: string; error?: string; hint?: string };

export function Field({ label, error, hint, style, ...input }: FieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      <TextInput
        placeholderTextColor={colors.muted}
        {...input}
        accessibilityLabel={label}
        onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
        style={[{
          minHeight: 52, borderRadius: 14, borderWidth: 2, paddingHorizontal: 14, paddingVertical: 12,
          borderColor: error ? colors.danger : focused ? colors.green : colors.line,
          fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink, backgroundColor: colors.paper,
        }, style]}
      />
      {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : hint ? <Txt variant="caption" color="muted">{hint}</Txt> : null}
    </View>
  );
}

/** DD/MM/YYYY with slashes added as you type. */
export function DateField({ label, value, onChange, error, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string }) {
  return (
    <Field label={label} value={value} onChangeText={(t) => onChange(maskDmy(t))} placeholder="DD/MM/YYYY" keyboardType="number-pad" maxLength={10} error={error} hint={hint} />
  );
}

// ---------- Pick from a list ----------
export function SelectField({ label, value, options, onChange, error, placeholder = "Choose" }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; error?: string; placeholder?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        onPress={() => { tap(); setOpen(true); }}
        style={{ minHeight: 52, borderRadius: 14, borderWidth: 2, borderColor: error ? colors.danger : colors.line, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" }}
      >
        <Txt variant="bodyStrong" color={value ? "ink" : "muted"} style={{ flex: 1 }}>{value || placeholder}</Txt>
        <Icon name="forward" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 8 }}>
            <Txt variant="title" style={{ flex: 1 }}>{label}</Txt>
            <IconButton name="close" label="Close" onPress={() => setOpen(false)} />
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => o}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: item === value }}
                onPress={() => { tap(); onChange(item); setOpen(false); }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.line, opacity: pressed ? 0.7 : 1 })}
              >
                <Txt variant="bodyStrong" style={{ flex: 1 }}>{item}</Txt>
                {item === value ? <Icon name="check" size={22} color={colors.green} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

/** Two or three big choices side by side (e.g. Male / Female). */
export function ChoiceRow<T extends string>({ label, value, options, onChange, error }: {
  label: string; value: T | ""; options: { value: T; label: string }[]; onChange: (v: T) => void; error?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 10 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => { tap(); onChange(o.value); }}
              style={{ flex: 1, minHeight: 52, borderRadius: 14, borderWidth: 2, borderColor: on ? colors.green : error ? colors.danger : colors.line, backgroundColor: on ? colors.greenSoft : "transparent", alignItems: "center", justifyContent: "center" }}>
              <Txt variant="bodyStrong" color={on ? "greenText" : "ink"}>{o.label}</Txt>
            </Pressable>
          );
        })}
      </View>
      {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
    </View>
  );
}

// ---------- Photos of documents ----------
export async function pickPhoto(source: "camera" | "library", selfie = false): Promise<string | null> {
  try {
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera is off", "Allow camera access in your phone's settings, or choose a photo from your gallery.");
        return null;
      }
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6, cameraType: selfie ? ImagePicker.CameraType.front : ImagePicker.CameraType.back });
      return r.canceled ? null : r.assets[0]?.uri ?? null;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    return r.canceled ? null : r.assets[0]?.uri ?? null;
  } catch {
    Alert.alert("Couldn't open the camera", "Try again, or choose a photo from your gallery.");
    return null;
  }
}

export function PhotoField({ label, uri, onChange, selfie }: { label: string; uri?: string; onChange: (uri: string) => void; selfie?: boolean }) {
  const { colors } = useTheme();
  const take = async (source: "camera" | "library") => {
    const u = await pickPhoto(source, selfie);
    if (u) onChange(u);
  };
  return (
    <View style={{ gap: 8 }}>
      <Txt variant="label">{label}</Txt>
      {uri ? (
        <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 2, borderColor: colors.green }}>
          <Image source={{ uri }} style={{ width: "100%", aspectRatio: selfie ? 1 : 1.6, backgroundColor: colors.mist }} resizeMode="cover" accessibilityLabel={`${label} photo`} />
          <Pressable accessibilityRole="button" onPress={() => take("camera")} style={{ position: "absolute", right: 10, bottom: 10, backgroundColor: colors.paper, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Txt variant="label">Retake</Txt>
          </Pressable>
        </View>
      ) : (
        <View style={{ borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: colors.line, padding: 16, gap: 10, alignItems: "center" }}>
          <Icon name="camera" size={28} color={colors.muted} />
          <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
            <Button title="Take photo" icon="camera" onPress={() => take("camera")} style={{ flex: 1, height: 48 }} />
            <Button title="Gallery" variant="outline" onPress={() => take("library")} style={{ flex: 1, height: 48 }} />
          </View>
        </View>
      )}
    </View>
  );
}

// ---------- Onboarding step layout ----------
export const STEPS = ["Vehicle", "About you", "Vehicle details", "Documents", "Guarantor", "Bank account", "Review"] as const;

export function StepScreen({ step, title, intro, children, footer, onBack }: {
  step: number; title: string; intro?: string; children: React.ReactNode; footer: React.ReactNode; onBack?: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 24, gap: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {onBack ? <IconButton name="back" label="Back" onPress={onBack} size={44} /> : null}
          <Txt variant="label" color="muted" style={{ flex: 1 }}>Step {step} of {STEPS.length} · {STEPS[step - 1]}</Txt>
        </View>
        <View style={{ flexDirection: "row", gap: 4 }} accessibilityLabel={`Step ${step} of ${STEPS.length}`}>
          {STEPS.map((_, i) => <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < step ? colors.green : colors.line }} />)}
        </View>
        <View style={{ gap: 6 }}>
          <Txt variant="hero" style={{ fontSize: 28, lineHeight: 33 }}>{title}</Txt>
          {intro ? <Txt color="muted">{intro}</Txt> : null}
        </View>
        {children}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 14, backgroundColor: colors.paper, gap: 8, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: "#0C1D15", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 10 }}>
        {footer}
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------- Status pill ----------
export function Pill({ text, tone }: { text: string; tone: "green" | "amber" | "red" | "grey" }) {
  const { colors } = useTheme();
  const map = {
    green: { bg: colors.greenSoft, fg: colors.greenText },
    amber: { bg: colors.amberSoft, fg: colors.amberText },
    red: { bg: colors.dangerSoft, fg: colors.danger },
    grey: { bg: colors.mist, fg: colors.muted },
  }[tone];
  return (
    <View style={{ backgroundColor: map.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" }}>
      <Txt variant="label" style={{ color: map.fg, fontSize: 12 }}>{text}</Txt>
    </View>
  );
}
