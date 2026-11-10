import * as Clipboard from "expo-clipboard";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { t } from "../i18n";
import { formatNgPhone } from "../lib/phone";
import type { WhatsAppStart } from "../services/auth";
import { useTheme } from "../theme/ThemeProvider";
import { fonts } from "../theme/tokens";
import { Icon } from "./Icon";
import { Button, tap, Txt } from "./ui";

const WA_GREEN = "#25D366";
const POLL_MS = 2500;

/**
 * "Confirm with WhatsApp": shows a short code, opens WhatsApp with it typed in, and keeps checking
 * until the message arrives at our number. Used to sign in, and to add a phone number to an account.
 */
export function WhatsAppConfirm<R extends { status: string }>({ start, check, onConfirmed }: {
  start: () => Promise<WhatsAppStart>;
  check: (s: WhatsAppStart) => Promise<R>;
  onConfirmed: (r: Exclude<R, { status: "pending" }>) => Promise<void> | void;
}) {
  const { colors } = useTheme();
  const [session, setSession] = useState<WhatsAppStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);
  const done = useRef(false);

  const begin = useCallback(async () => {
    setError(null); setExpired(false); setOpened(false); setSession(null);
    try { setSession(await start()); } catch (e: any) { setError(e?.message ?? t("Couldn't start. Check your connection and try again.")); }
  }, [start]);

  useEffect(() => { begin(); }, [begin]);

  const poll = useCallback(async () => {
    if (!session || busy.current || done.current || expired) return;
    busy.current = true;
    try {
      const r = await check(session);
      if (r.status !== "pending") {
        done.current = true;
        await onConfirmed(r as Exclude<R, { status: "pending" }>);
      }
    } catch (e: any) {
      if (e?.code === "whatsapp_expired") setExpired(true);
      else if (e?.status && e.status !== 0) { done.current = true; setError(e.message); }
      // network blips: keep trying
    } finally {
      busy.current = false;
    }
  }, [session, check, onConfirmed, expired]);

  // Check every few seconds, and straight away when the person comes back from WhatsApp.
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(poll, POLL_MS);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") poll(); });
    const expiry = setTimeout(() => setExpired(true), session.expiresIn * 1000);
    return () => { clearInterval(timer); sub.remove(); clearTimeout(expiry); };
  }, [session, poll]);

  const open = async () => {
    if (!session) return;
    tap();
    setOpened(true);
    try { await Linking.openURL(session.link); }
    catch { setError(t("Couldn't open WhatsApp. Send the code below to our number from WhatsApp.")); }
  };

  const copy = async () => {
    if (!session) return;
    await Clipboard.setStringAsync(session.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (error && !session) {
    return (
      <View style={{ gap: 12 }}>
        <Txt style={{ color: colors.danger }}>{error}</Txt>
        <Button title={t("Try again")} variant="soft" onPress={begin} />
      </View>
    );
  }
  if (!session) return <ActivityIndicator color={colors.green} style={{ marginTop: 24 }} />;

  const number = formatNgPhone(`+${session.number}`) || `+${session.number}`;
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={{ gap: 16 }}>
      {/* The code */}
      <View style={{ borderRadius: 22, backgroundColor: colors.greenSoft, padding: 18, gap: 10, alignItems: "center" }}>
        <Txt variant="caption" color="muted">{t("Your code")}</Txt>
        <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 32, letterSpacing: 4, color: colors.ink }} selectable accessibilityLabel={session.code.split("").join(" ")}>
          {session.code.slice(0, 4)} {session.code.slice(4)}
        </Txt>
        <Pressable onPress={copy} accessibilityRole="button" hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name={copied ? "check" : "copy"} size={16} color={colors.greenText} />
          <Txt variant="label" color="greenText">{copied ? t("Copied") : t("Copy")}</Txt>
        </Pressable>
      </View>

      <Steps items={[t("Tap Open WhatsApp. The message is already typed."), t("Press Send."), t("Come back here. We'll continue by ourselves.")]} />

      {expired ? (
        <View style={{ gap: 10 }}>
          <Txt style={{ color: colors.danger }}>{t("This code has expired.")}</Txt>
          <Button title={t("Get a new code")} onPress={begin} />
        </View>
      ) : (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Open WhatsApp")} onPress={open}
            style={({ pressed }) => ({ height: 58, borderRadius: 18, backgroundColor: WA_GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: pressed ? 0.85 : 1 })}>
            <Icon name="whatsapp" size={24} color="#FFFFFF" />
            <Txt style={{ fontFamily: fonts.display, fontSize: 17, color: "#FFFFFF" }}>{t("Open WhatsApp")}</Txt>
          </Pressable>
          {opened ? (
            <Animated.View entering={FadeIn} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <ActivityIndicator color={colors.green} />
              <Txt color="muted">{t("Waiting for your message…")}</Txt>
            </Animated.View>
          ) : null}
        </>
      )}

      {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
      <Txt variant="caption" color="muted" align="center">
        {t("WhatsApp on another phone? Send {0} to {1}.", session.code, number)}
      </Txt>
    </Animated.View>
  );
}

function Steps({ items }: { items: string[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      {items.map((s, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" }}>
            <Txt style={{ fontFamily: fonts.display, fontSize: 13, color: colors.greenInk }}>{i + 1}</Txt>
          </View>
          <Txt style={{ flex: 1, paddingTop: 2 }}>{s}</Txt>
        </View>
      ))}
    </View>
  );
}
