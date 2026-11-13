import { Stack } from "expo-router";
import { useTheme } from "../../src/theme/ThemeProvider";

// Sign-in screens. Access is controlled in app/_layout.tsx.
export const unstable_settings = { initialRouteName: "welcome" };

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="pin" />
    </Stack>
  );
}
