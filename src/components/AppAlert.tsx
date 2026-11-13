import React, { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";
import { fonts } from "../theme/tokens";
import { Icon, type IconName } from "./Icon";
import { Button, tap, Txt } from "./ui";

/**
 * The app's own pop-up: a sheet that slides up from the bottom with an icon, a title, a message
 * and full-width buttons in the app's colours. Used everywhere instead of the phone's plain
 * system pop-up. Same shape as React Native's Alert.alert, so it's a drop-in:
 *
 *   appAlert(t("Log out?"), t("You'll need your PIN…"), [{ text: t("Cancel"), style: "cancel" }, { text: t("Log out"), style: "destructive", onPress }], { icon: "logout" })
 */
export type AlertButton = { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void };
export type AlertOptions = { icon?: IconName; tone?: "green" | "danger" | "amber" };
type AlertRequest = { title: string; message?: string; buttons: AlertButton[]; options: AlertOptions };

let show: ((r: AlertRequest) => void) | null = null;
const waiting: AlertRequest[] = [];

export function appAlert(title: string, message?: string, buttons?: AlertButton[], options: AlertOptions = {}) {
  const request = { title, message, buttons: buttons?.length ? buttons : [{ text: t("OK") }], options };
  if (show) show(request);
  else waiting.push(request); // the host isn't on screen yet (the first moments after start-up)
}

/** Put once near the top of the app (app/_layout.tsx). Shows one pop-up at a time, in order. */
export function AlertHost() {
  const [queue, setQueue] = useState<AlertRequest[]>([]);
  useEffect(() => {
    show = (r) => setQueue((q) => [...q, r]);
    if (waiting.length) setQueue((q) => [...q, ...waiting.splice(0)]);
    return () => { show = null; };
  }, []);
  const current = queue[0];
  const close = () => setQueue((q) => q.slice(1));
  return current ? <Sheet key={`${current.title}-${queue.length}`} request={current} onClose={close} /> : null;
}

function Sheet({ request, onClose }: { request: AlertRequest; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { title, message, buttons, options } = request;
  const destructive = buttons.some((b) => b.style === "destructive");
  const tone = options.tone ?? (destructive ? "danger" : "green");
  const icon: IconName = options.icon ?? (destructive ? "alert" : "info");
  const bg = tone === "danger" ? colors.dangerSoft : tone === "amber" ? colors.amberSoft : colors.greenSoft;
  const fg = tone === "danger" ? colors.danger : tone === "amber" ? colors.ink : colors.greenText;

  // Main action on top, "Cancel" underneath, like most phone sheets.
  const cancel = buttons.find((b) => b.style === "cancel");
  const actions = buttons.filter((b) => b !== cancel);
  const press = (b?: AlertButton) => { tap(); onClose(); b?.onPress?.(); };

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => press(cancel ?? (buttons.length === 1 ? buttons[0] : undefined))}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={{ flex: 1, backgroundColor: "rgba(8,20,14,0.55)", justifyContent: "flex-end" }}>
        {/* Tapping outside counts as Cancel (only when there is one, so nobody skips an OK by accident). */}
        <Pressable style={{ flex: 1 }} onPress={cancel ? () => press(cancel) : undefined} accessibilityLabel={cancel ? cancel.text : undefined} />
        <Animated.View
          entering={SlideInDown.springify().damping(18).stiffness(180)}
          exiting={SlideOutDown.duration(180)}
          accessibilityViewIsModal
          style={{ backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 18, gap: 16 }}
        >
          <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
          <View style={{ alignItems: "center", gap: 12, paddingTop: 4 }}>
            <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
              <Icon name={icon} size={28} color={fg} />
            </View>
            <Txt accessibilityRole="header" align="center" style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>{title}</Txt>
            {message ? <Txt color="muted" align="center" style={{ lineHeight: 22 }}>{message}</Txt> : null}
          </View>
          <View style={{ gap: 10, marginTop: 4 }}>
            {actions.map((b, i) => (
              <Button key={`${b.text}-${i}`} title={b.text} onPress={() => press(b)}
                variant={b.style === "destructive" ? "danger" : i === 0 ? "primary" : "soft"} />
            ))}
            {cancel ? <Button title={cancel.text} variant="quiet" onPress={() => press(cancel)} /> : null}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
