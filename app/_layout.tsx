import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from "@expo-google-fonts/manrope";
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AnimatedSplash } from "../src/components/AnimatedSplash";
import { useBackToHome } from "../src/hooks/useBackToHome";
import { ModeProvider, useMode } from "../src/store/mode";
import { RideProvider } from "../src/store/ride";
import { SavedPlacesProvider } from "../src/store/saved";
import { SessionProvider, useSession } from "../src/store/session";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

SplashScreen.preventAutoHideAsync().catch(() => {});

const RIDER_TABS = ["/activity", "/wallet", "/account"];

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SessionProvider>
            <ModeProvider>
              <SavedPlacesProvider>
                <RideProvider>
                  <Root fontsLoaded={fontsLoaded} />
                </RideProvider>
              </SavedPlacesProvider>
            </ModeProvider>
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Root({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { colors, isDark } = useTheme();
  const { status, user } = useSession();
  const { mode, ready: modeReady } = useMode();
  const [splashDone, setSplashDone] = useState(false);
  const ready = fontsLoaded && status !== "loading" && modeReady;
  const signedIn = status === "signedIn";
  const hasName = !!user?.name;
  const set = signedIn && hasName; // signed in and named: ready to choose, ride or drive

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Riders: the phone's back button always returns to Home. (Drivers: see app/driver/_layout.tsx.)
  useBackToHome({ home: "/", tabs: RIDER_TABS, enabled: ready && set && mode === "rider" });

  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar style={!splashDone || isDark ? "light" : "dark"} />
      {/* Which screens are open depends on sign-in state and mode (riding or driving). When either
          changes (signing in, saving your name, choosing or switching mode, logging out), Expo Router
          moves to the right screen by itself, so screens never navigate manually after those actions.
          Driver screens live in app/driver, which has its own rules for sign-up and review. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper }, animation: "slide_from_right" }}>
        <Stack.Protected guard={set && mode === "rider"}>
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen name="ride/search" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="ride/pin" />
          <Stack.Screen name="ride/confirm" />
          <Stack.Screen name="ride/track" options={{ gestureEnabled: false, animation: "fade" }} />
          <Stack.Screen name="ride/complete" options={{ gestureEnabled: false, animation: "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={set && mode === "driver"}>
          <Stack.Screen name="driver" options={{ animation: "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={set && !mode}>
          <Stack.Screen name="start" options={{ animation: "fade", gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !hasName}>
          <Stack.Screen name="name" options={{ animation: "fade", gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        </Stack.Protected>
      </Stack>
      {!splashDone && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
    </View>
  );
}
