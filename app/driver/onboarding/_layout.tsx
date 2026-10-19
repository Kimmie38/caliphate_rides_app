import { Stack } from "expo-router";
import { useTheme } from "../../../src/theme/ThemeProvider";

// Sign-up steps. Each step saves as you go, so drivers can stop and come back later.
export default function OnboardingLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="personal" />
      <Stack.Screen name="vehicle" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="guarantor" />
      <Stack.Screen name="bank" />
      <Stack.Screen name="review" />
    </Stack>
  );
}
