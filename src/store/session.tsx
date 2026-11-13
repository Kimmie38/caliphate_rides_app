import { secureStore } from "../lib/secureStore";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ENV } from "../config/env";
import { getMe } from "../services/auth";
import { ApiError, setAuthToken } from "../services/http";
import type { User } from "../types";

type Status = "loading" | "signedOut" | "signedIn";
type SessionValue = {
  status: Status;
  user: User | null;
  signIn: (token: string, user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

const TOKEN_KEY = "cr.token";
const USER_KEY = "cr.user";
const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await secureStore.get(TOKEN_KEY);
        const cached = await secureStore.get(USER_KEY);
        if (!token) return setStatus("signedOut");
        setAuthToken(token);
        let u: User | null = null;
        try { u = cached ? (JSON.parse(cached) as User) : null; } catch { u = null; }

        // Saved profile: open the app straight away and refresh it in the background,
        // so a slow connection never leaves people looking at the splash screen.
        if (u) {
          setUser(u);
          setStatus("signedIn");
          if (!ENV.useMock) {
            getMe({ timeoutMs: 15_000 })
              .then(async (fresh) => { setUser(fresh); await secureStore.set(USER_KEY, JSON.stringify(fresh)).catch(() => {}); })
              .catch(async (e) => {
                if (e instanceof ApiError && e.status === 401) { await clear(); setUser(null); setStatus("signedOut"); }
                // offline or slow: keep the saved profile
              });
          }
          return;
        }
        // Signed in but no saved profile (rare): fetch it, but don't wait long.
        if (ENV.useMock) return setStatus("signedOut");
        try {
          const fresh = await getMe({ timeoutMs: 8_000 });
          await secureStore.set(USER_KEY, JSON.stringify(fresh)).catch(() => {});
          setUser(fresh);
          setStatus("signedIn");
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) await clear();
          setStatus("signedOut");
        }
      } catch {
        setStatus("signedOut");
      }
    })();
  }, []);

  const clear = async () => {
    setAuthToken(null);
    await secureStore.remove(TOKEN_KEY).catch(() => {});
    await secureStore.remove(USER_KEY).catch(() => {});
  };

  const value = useMemo<SessionValue>(
    () => ({
      status,
      user,
      signIn: async (token, u) => {
        setAuthToken(token);
        await secureStore.set(TOKEN_KEY, token);
        await secureStore.set(USER_KEY, JSON.stringify(u));
        setUser(u);
        setStatus("signedIn");
      },
      updateUser: async (u) => {
        await secureStore.set(USER_KEY, JSON.stringify(u));
        setUser(u);
      },
      signOut: async () => {
        await clear();
        setUser(null);
        setStatus("signedOut");
      },
    }),
    [status, user]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
