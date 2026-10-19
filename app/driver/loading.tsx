import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Button, Txt } from "../../src/components/ui";
import { useApplication } from "../../src/driver/store/application";
import { useTheme } from "../../src/theme/ThemeProvider";

/** Shown briefly while the driver's record loads after sign-in. */
export default function Loading() {
  const { colors } = useTheme();
  const { error, refresh } = useApplication();
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
      {error ? (
        <>
          <Txt variant="title" align="center">{error}</Txt>
          <Button title="Try again" onPress={refresh} style={{ alignSelf: "stretch" }} />
        </>
      ) : (
        <ActivityIndicator size="large" color={colors.green} />
      )}
    </View>
  );
}
