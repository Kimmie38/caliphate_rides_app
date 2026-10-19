import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Which map engine draws our map.
 *
 * - "native": MapLibre's native engine. Fastest. Needs your own build of the app
 *   (npx expo run:android or an EAS build), because it isn't inside Expo Go.
 * - "web": the same map, style and markers, drawn by MapLibre GL in a web view.
 *   Works everywhere, including Expo Go.
 *
 * Expo Go always uses "web". Set EXPO_PUBLIC_MAP_ENGINE=web to force it in a build.
 */
type Mlrn = typeof import("@maplibre/maplibre-react-native");
// Metro provides require(); declared here so this file doesn't depend on Node's type definitions.
declare const require: (id: string) => unknown;

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const forceWeb = process.env.EXPO_PUBLIC_MAP_ENGINE === "web";

let mlrn: Mlrn | null = null;
if (!isExpoGo && !forceWeb) {
  try {
    mlrn = require("@maplibre/maplibre-react-native") as Mlrn;
  } catch {
    mlrn = null; // native module missing: fall back to the web engine
  }
}

/** The native MapLibre module, or null when the web engine is in use. */
export const MLRN = mlrn;
export const MAP_ENGINE: "native" | "web" = mlrn ? "native" : "web";
