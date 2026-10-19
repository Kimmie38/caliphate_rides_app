import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, useColorScheme } from "react-native";
import { dark, light, type Palette } from "./tokens";

export type ThemeMode = "system" | "light" | "dark";

type ThemeValue = {
  colors: Palette;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

// v2: earlier versions could save Light or Dark by accident; everyone now starts on "Match phone".
const STORAGE_KEY = "cr.theme-mode.v2";
const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The phone's light/dark setting. Read two ways because useColorScheme can lag on some Android setups.
  const hookScheme = useColorScheme();
  const [listenerScheme, setListenerScheme] = useState(Appearance.getColorScheme());
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setListenerScheme(colorScheme));
    return () => sub.remove();
  }, []);
  const system = hookScheme ?? listenerScheme;
  const [mode, setModeState] = useState<ThemeMode>("system"); // default: match the phone

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "system") setModeState(v);
      })
      .catch(() => {});
  }, []);

  const isDark = mode === "dark" || (mode === "system" && system === "dark");
  const colors = isDark ? dark : light;

  useEffect(() => {
    // Keeps the area behind screens (e.g. during transitions) the right colour.
    SystemUI.setBackgroundColorAsync(colors.paper).catch(() => {});
  }, [colors.paper]);

  const value = useMemo<ThemeValue>(
    () => ({
      colors,
      isDark,
      mode,
      setMode: (m) => {
        setModeState(m);
        AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
      },
    }),
    [colors, isDark, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
