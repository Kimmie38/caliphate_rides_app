import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { DEMO } from "../config/demo";
import { useSession } from "./session";

/** One app, two ways to use it: riding (booking trips) or driving (taking trips). */
export type Mode = "rider" | "driver";

type Value = { mode: Mode | null; ready: boolean; setMode: (m: Mode) => void };

const KEY = "cr.mode";
const Ctx = createContext<Value | null>(null);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [mode, setModeState] = useState<Mode | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Sample mode: always open on the Ride / Drive choice, so both sides are easy to try.
    if (DEMO) { setReady(true); return; }
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v === "rider" || v === "driver") setModeState(v); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // A new person signing in on this phone chooses for themselves.
  useEffect(() => {
    if (status === "signedOut") {
      setModeState(null);
      AsyncStorage.removeItem(KEY).catch(() => {});
    }
  }, [status]);

  const setMode = (m: Mode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  };

  return <Ctx.Provider value={{ mode, ready, setMode }}>{children}</Ctx.Provider>;
}

export function useMode(): Value {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMode must be used inside ModeProvider");
  return ctx;
}
