import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Txt } from "../src/components/ui";
import { DEMO, DEMO_RIDER } from "../src/config/demo";
import { updateProfile } from "../src/services/auth";
import { useSession } from "../src/store/session";
import { useTheme } from "../src/theme/ThemeProvider";
import { fonts } from "../src/theme/tokens";

export default function Name() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useSession();
  const [name, setName] = useState(user?.name ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = DEMO || name.trim().length >= 2; // sample mode: an empty name uses the sample one

  const save = async () => {
    if (!user || !valid) return;
    setLoading(true);
    try {
      // Saving the name opens the app: the guards in app/_layout.tsx switch screens automatically.
      await updateUser(await updateProfile({ name: name.trim() || DEMO_RIDER.name }, user));
    } catch (e: any) {
      setError(e?.message ?? "Couldn't save your name. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <Txt variant="hero">What should drivers call you?</Txt>
        <Txt color="muted">Your driver sees your first name when they accept your ride.</Txt>
        <TextInput
          value={name}
          onChangeText={(t) => { setName(t); setError(null); }}
          onSubmitEditing={save}
          placeholder="Full name"
          placeholderTextColor={colors.muted}
          autoFocus
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          style={{ height: 60, borderRadius: 16, borderWidth: 2, borderColor: colors.green, paddingHorizontal: 16, fontFamily: fonts.displaySemi, fontSize: 18, color: colors.ink, marginTop: 8 }}
        />
        {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
        <View style={{ flex: 1 }} />
        <Button title="Continue" onPress={save} loading={loading} disabled={!valid} />
      </View>
    </KeyboardAvoidingView>
  );
}
