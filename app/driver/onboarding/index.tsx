import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { ChoiceRow, StepScreen } from "../../../src/driver/components/form";
import { VehicleArt } from "../../../src/components/visual";
import { Button, tap, Txt } from "../../../src/components/ui";
import { useApplication } from "../../../src/driver/store/application";
import { useMode } from "../../../src/store/mode";
import { DEMO } from "../../../src/config/demo";
import { useTheme } from "../../../src/theme/ThemeProvider";
import type { VehicleType } from "../../../src/driver/types";

const OPTIONS: { id: VehicleType; title: string; detail: string }[] = [
  { id: "keke", title: "Keke", detail: "Tricycle · up to 3 riders" },
  { id: "car", title: "Car", detail: "Saloon car · up to 4 riders" },
];

export default function ChooseVehicle() {
  const { colors } = useTheme();
  const { application, update } = useApplication();
  const { setMode } = useMode();
  if (!application) return null;
  const v = application.vehicleType;

  return (
    <StepScreen
      step={1}
      title="What will you drive?"
      intro="Caliphate Rides takes keke and cars in Sokoto. You'll need the papers for the vehicle you choose."
      footer={<Button title="Continue" disabled={!v && !DEMO} onPress={() => {
        if (!v) update((a) => ({ ...a, vehicleType: "keke" })); // sample mode: keke if none chosen
        router.push("/driver/onboarding/personal");
      }} />}
    >
      {application.status === "changes_requested" && application.reviewNote ? (
        <View style={{ backgroundColor: colors.mist, borderRadius: 14, padding: 14, gap: 4, borderLeftWidth: 0 }}>
          <Txt variant="bodyStrong">Our team asked for a change</Txt>
          <Txt color="muted">{application.reviewNote}</Txt>
        </View>
      ) : null}

      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 12 }}>
        {OPTIONS.map((o) => {
          const on = v === o.id;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${o.title}. ${o.detail}`}
              onPress={() => { tap(); update((a) => ({ ...a, vehicleType: o.id })); }}
              style={{ flex: 1, borderRadius: 24, borderWidth: 2, borderColor: on ? colors.green : colors.line, backgroundColor: on ? colors.greenSoft : colors.paper, padding: 14, gap: 8 }}
            >
              <View style={{ height: 86, borderRadius: 16, backgroundColor: on ? colors.paper : colors.greenSoft, alignItems: "center", justifyContent: "center" }}>
                <VehicleArt type={o.id} width={120} />
              </View>
              <Txt variant="title">{o.title}</Txt>
              <Txt variant="caption" color="muted">{o.detail}</Txt>
            </Pressable>
          );
        })}
      </View>

      <ChoiceRow
        label="Do you own this vehicle?"
        value={application.vehicle.ownsVehicle ? "yes" : "no"}
        options={[{ value: "yes", label: "Yes, it's mine" }, { value: "no", label: "No, I drive for the owner" }]}
        onChange={(x) => update((a) => ({ ...a, vehicle: { ...a.vehicle, ownsVehicle: x === "yes" } }))}
      />
      {!application.vehicle.ownsVehicle ? (
        <Txt variant="caption" color="muted">You'll upload a signed letter from the owner allowing you to drive it for Caliphate Rides.</Txt>
      ) : null}

      <View style={{ gap: 4, paddingTop: 6 }}>
        <Txt variant="caption" color="muted">Your record number: {application.recordId || "issued when you submit"}</Txt>
        <Pressable accessibilityRole="button" onPress={() => setMode("rider")} hitSlop={8}><Txt variant="label" color="greenText">Just want to ride? Switch to riding</Txt></Pressable>
      </View>
    </StepScreen>
  );
}
