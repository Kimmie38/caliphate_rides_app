import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { Place } from "../types";

export type SavedKey = "home" | "work";
type Saved = Partial<Record<SavedKey, Place>>;
type SavedValue = { saved: Saved; save: (key: SavedKey, place: Place) => void; remove: (key: SavedKey) => void };

const KEY = "cr.saved-places";
const SavedContext = createContext<SavedValue | null>(null);

/** Home and Work, kept on the phone. (Move to the backend later to sync across devices.) */
export function SavedPlacesProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<Saved>({});

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => v && setSaved(JSON.parse(v))).catch(() => {});
  }, []);

  const persist = (next: Saved) => {
    setSaved(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  return (
    <SavedContext.Provider
      value={{
        saved,
        save: (key, place) => persist({ ...saved, [key]: { ...place, id: `saved-${key}`, category: "saved", subtitle: place.name } }),
        remove: (key) => { const next = { ...saved }; delete next[key]; persist(next); },
      }}
    >
      {children}
    </SavedContext.Provider>
  );
}

export function useSavedPlaces(): SavedValue {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSavedPlaces must be used inside SavedPlacesProvider");
  return ctx;
}
