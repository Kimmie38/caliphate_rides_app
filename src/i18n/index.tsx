import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { HA } from "./ha";

/**
 * English and Hausa.
 *
 * Text is written in English in the code and wrapped in t(): t("Book a ride"), or with values,
 * t("Pay {0} to {1}", amount, name). Hausa comes from src/i18n/ha.ts, keyed by the English text;
 * anything not translated yet shows in English. The choice is saved on the phone (and on the
 * server for signed-in people), so it stays after the app is closed.
 *
 * Screens call useI18n() so they redraw when the language changes; plain functions can call t().
 */
export type Lang = "en" | "ha";
export const LANGS: { value: Lang; label: string; native: string }[] = [
  { value: "en", label: "English", native: "English" },
  { value: "ha", label: "Hausa", native: "Hausa" },
];

const KEY = "cr.lang";
let current: Lang = "en";

const fill = (s: string, args: (string | number)[]) => (args.length ? s.replace(/\{(\d+)\}/g, (m, i) => (args[+i] !== undefined ? String(args[+i]) : m)) : s);

/** Translates English text into the chosen language. Unknown text comes back unchanged. */
export function t(english: string, ...args: (string | number)[]): string {
  if (current === "ha") {
    const ha = HA[english];
    if (ha) return fill(ha, args);
  }
  return fill(english, args);
}

/** The chosen language right now (for code that isn't a component). */
export const currentLang = (): Lang => current;

/** Locale for dates and times. Phones don't all have Hausa dates, so Hausa uses ours (see formatDate). */
const HA_MONTHS = ["Jan", "Fab", "Mar", "Afi", "Mayu", "Yun", "Yul", "Agu", "Sat", "Okt", "Nuw", "Dis"];
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "8 Nov" (English) or "8 Nuw" (Hausa). */
export function formatDayMonth(d: Date) {
  return `${d.getDate()} ${(current === "ha" ? HA_MONTHS : EN_MONTHS)[d.getMonth()]}`;
}
/** "14:05" */
export function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Value = { lang: Lang; ready: boolean; setLang: (l: Lang) => void; t: typeof t };
const Ctx = createContext<Value | null>(null);

/** Listeners outside React (for example saving the choice to the server). */
const listeners = new Set<(l: Lang) => void>();
export function onLanguageChange(fn: (l: Lang) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v === "en" || v === "ha") { current = v; setLangState(v); } })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<Value>(() => ({
    lang,
    ready,
    t,
    setLang: (l) => {
      if (l === current) return;
      current = l;
      setLangState(l);
      AsyncStorage.setItem(KEY, l).catch(() => {});
      listeners.forEach((fn) => fn(l));
    },
  }), [lang, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The language, a way to change it, and t(). Calling it makes the component redraw on a change. */
export function useI18n(): Value {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}

/** Applies a language saved on the server (a person signing in on a new phone), unless one was chosen here. */
export async function adoptServerLanguage(l: unknown, setLang: (l: Lang) => void) {
  if (l !== "en" && l !== "ha") return;
  const saved = await AsyncStorage.getItem(KEY).catch(() => null);
  if (!saved) setLang(l);
}
