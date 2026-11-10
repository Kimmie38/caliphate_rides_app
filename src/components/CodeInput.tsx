import React, { useRef } from "react";
import { Pressable, TextInput, View } from "react-native";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";
import { fonts } from "../theme/tokens";
import { Txt } from "./ui";

/** Six boxes for a sign-in code. One hidden field takes the typing (and autofill); the boxes show it. */
export function CodeInput({ value, onChange, onComplete, length = 6, autoFocus = true, oneTimeCode = "sms" }: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
  oneTimeCode?: "sms" | "email";
}) {
  const { colors } = useTheme();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  return (
    <>
      <Pressable onPress={() => input.current?.focus()} accessibilityLabel={t("Verification code")} style={{ flexDirection: "row", gap: 8 }}>
        {Array.from({ length }).map((_, i) => {
          const active = i === Math.min(value.length, length - 1);
          return (
            <View key={i} style={{ flex: 1, height: 60, borderRadius: 14, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: active ? colors.green : "transparent" }}>
              <Txt style={{ fontFamily: fonts.display, fontSize: 24 }}>{value[i] ?? ""}</Txt>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => {
          const v = text.replace(/\D/g, "").slice(0, length);
          onChange(v);
          if (v.length === length) onComplete?.(v);
        }}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={oneTimeCode === "sms" ? "sms-otp" : "one-time-code"}
        maxLength={length}
        style={{ position: "absolute", opacity: 0, height: 1, width: 1 }}
      />
    </>
  );
}
