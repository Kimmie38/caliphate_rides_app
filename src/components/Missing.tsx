import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Button, Txt } from "./ui";

/**
 * Shown by a ride screen while its data hasn't arrived.
 * Screens don't redirect when data is missing: state set just before navigating can land a
 * frame after the screen first renders, and an instant redirect would bounce the rider home.
 * Only if the data is still missing after a moment (e.g. the app was reopened) does this offer a way back.
 */
export function Missing({ message = "This ride has ended.", home = "/(tabs)" }: { message?: string; home?: string }) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: "center", padding: 24, gap: 14 }}>
      {show ? (
        <>
          <Txt variant="title">{message}</Txt>
          <Button title="Back to home" onPress={() => router.replace(home)} />
        </>
      ) : null}
    </View>
  );
}
