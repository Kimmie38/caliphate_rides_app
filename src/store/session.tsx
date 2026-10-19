import * as SecureStore from "expo-secure-store";
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
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const cached = await SecureStore.getItemAsync(USER_KEY);
        if (!token) return setStatus("signedOut");
        setAuthToken(token);
        let u: User | null = cached ? JSON.parse(cached) : null;
        if (!ENV.useMock) {
          try {
            u = await getMe();
          } catch (e) {
            if (e instanceof ApiError && e.status === 401) {
              await clear();
              return setStatus("signedOut");
            }
            // offline: keep the cached profile
          }
        }
        if (!u) return setStatus("signedOut");
        setUser(u);
        setStatus("signedIn");
      } catch {
        setStatus("signedOut");
      }
    })();
  }, []);

  const clear = async () => {
    setAuthToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
  };

  const value = useMemo<SessionValue>(
    () => ({
      status,
      user,
      signIn: async (token, u) => {
        setAuthToken(token);
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u));
        setUser(u);
        setStatus("signedIn");
      },
      updateUser: async (u) => {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u));
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
