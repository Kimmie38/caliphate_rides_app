import React, { useRef } from "react";
import { Pressable, TextInput, View } from "react-native";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";
import { fonts } from "../theme/tokens";
import { Txt } from "./ui";

/**
 * Boxes for a sign-in code or PIN. One hidden field takes the typing (and code autofill); the boxes
 * show it. secret: shows dots instead of digits and turns autofill off (for the PIN).
 */
export function CodeInput({ value, onChange, onComplete, length = 6, autoFocus = true, oneTimeCode = "sms", secret = false, label }: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
  oneTimeCode?: "sms";
  secret?: boolean;
  label?: string;
}) {
  const { colors } = useTheme();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  return (
    <>
      <Pressable onPress={() => input.current?.focus()} accessibilityLabel={label ?? t("Verification code")} style={{ flexDirection: "row", gap: secret ? 14 : 8, justifyContent: "center" }}>
        {Array.from({ length }).map((_, i) => {
          const active = i === Math.min(value.length, length - 1);
          return (
            <View key={i} style={{ ...(secret ? { width: 60 } : { flex: 1 }), height: 60, borderRadius: 14, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: active ? colors.green : "transparent" }}>
              {secret
                ? value[i] ? <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.ink }} /> : null
                : <Txt style={{ fontFamily: fonts.display, fontSize: 24 }}>{value[i] ?? ""}</Txt>}
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
        textContentType={secret ? "none" : "oneTimeCode"}
        autoComplete={secret ? "off" : "sms-otp"}
        secureTextEntry={secret}
        importantForAutofill={secret ? "no" : "auto"}
        maxLength={length}
        style={{ position: "absolute", opacity: 0, height: 1, width: 1 }}
      />
    </>
  );
}
