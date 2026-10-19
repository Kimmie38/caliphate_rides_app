import { Stack } from "expo-router";
import { useTheme } from "../../src/theme/ThemeProvider";

// Sign-in screens. Access is controlled in app/_layout.tsx.
export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
