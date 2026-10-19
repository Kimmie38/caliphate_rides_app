import { Stack } from "expo-router";
import { goBack } from "../../src/lib/nav";
import React from "react";
import { ApplicationProvider, useApplication } from "../../src/driver/store/application";
import { DrivingProvider } from "../../src/driver/store/driving";
import { useBackToHome, useHardwareBack } from "../../src/hooks/useBackToHome";
import { useMode } from "../../src/store/mode";
import { useTheme } from "../../src/theme/ThemeProvider";

// Driver mode. The driver's record and driving state only load here, so riders never pay for them.
export default function DriverLayout() {
  return (
    <ApplicationProvider>
      <DrivingProvider>
        <DriverStack />
      </DrivingProvider>
    </ApplicationProvider>
  );
}

/** Where the driver is: sign-up, under review, fixing something, or approved to drive. */
function useStage() {
  const { application, loading } = useApplication();
  if (loading || !application) return "loading";
  switch (application.status) {
    case "draft": return "onboarding";
    case "changes_requested": return "fixing";
    case "submitted":
    case "rejected": return "review";
    default: return "active"; // approved or suspended
  }
}

const DRIVER_TABS = ["/driver/earnings", "/driver/documents", "/driver/account"];

function DriverStack() {
  const { colors } = useTheme();
  const stage = useStage();
  const { setMode: setAppMode } = useMode();
  // Approved drivers: the phone's back button always returns to the Drive tab.
  useBackToHome({ home: "/driver", tabs: DRIVER_TABS, enabled: stage === "active" });
  // Not yet approved (signing up, fixing something, or waiting for review): back returns to the rider's
  // Home. Sign-up progress is saved, so "Drive with Caliphate Rides" picks up where they left off.
  // A document upload screen just closes, back to the step that opened it.
  useHardwareBack(stage === "onboarding" || stage === "fixing" || stage === "review", (path) => {
    if (path.startsWith("/driver/document")) goBack(stage === "review" ? "/driver/application" : "/driver/onboarding/documents");
    else setAppMode("rider");
    return true;
  });
  // Screens open up as the driver moves through sign-up → review → driving.
  // When the stage changes, Expo Router moves to the first open screen by itself.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper }, animation: "slide_from_right" }}>
      <Stack.Protected guard={stage === "active"}>
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="trip" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={stage === "review" || stage === "fixing" || stage === "active"}>
        <Stack.Screen name="application" options={{ animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={stage === "onboarding" || stage === "fixing"}>
        <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={stage === "onboarding" || stage === "fixing" || stage === "active"}>
        <Stack.Screen name="document/[kind]" options={{ animation: "slide_from_bottom" }} />
      </Stack.Protected>
      <Stack.Protected guard={stage === "loading"}>
        <Stack.Screen name="loading" options={{ animation: "none" }} />
      </Stack.Protected>
    </Stack>
  );
}
