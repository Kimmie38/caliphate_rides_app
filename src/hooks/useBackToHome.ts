import { router, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";

/**
 * Take over the Android back button while `enabled`. `onBack` gets the current path and returns
 * true once it has handled the press.
 *
 * The listener is re-added just after every navigation (setTimeout 0) so that it is the newest one.
 * Android calls the newest listener first, so this runs before React Navigation's own listener,
 * which would otherwise step back one screen at a time.
 */
export function useHardwareBack(enabled: boolean, onBack: (path: string) => boolean) {
  const path = usePathname();
  const handler = useRef(onBack);
  handler.current = onBack;

  useEffect(() => {
    if (Platform.OS !== "android" || !enabled) return;
    let sub: { remove: () => void } | undefined;
    const timer = setTimeout(() => {
      sub = BackHandler.addEventListener("hardwareBackPress", () => handler.current(path));
    }, 0);
    return () => { clearTimeout(timer); sub?.remove(); };
  }, [path, enabled]);
}

type Options = {
  /** The home screen's path, e.g. "/" for riders or "/driver" for drivers. */
  home: string;
  /** The other tabs on the home tab bar. Going home from these switches tab instead of closing screens. */
  tabs: string[];
  /** Only active once the person is signed in and in this mode. */
  enabled: boolean;
};

/** Android back button: from any screen, go straight back to home. On home itself, close the app. */
export function useBackToHome({ home, tabs, enabled }: Options) {
  useHardwareBack(enabled, (path) => {
    if (path === home) BackHandler.exitApp();
    else if (tabs.includes(path)) router.navigate(home as any); // another tab: switch to the home tab
    else router.dismissTo(home as any); // a screen on top of the tabs: close everything above home
    return true;
  });
}
