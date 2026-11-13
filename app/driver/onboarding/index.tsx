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
import { t, useI18n } from "../../../src/i18n";

const OPTIONS: { id: VehicleType; title: string; detail: string }[] = [
  { id: "keke", title: "Keke", detail: "Tricycle · up to 3 riders" },
  { id: "car", title: "Car", detail: "Saloon car · up to 4 riders" },
];

export default function ChooseVehicle() {
  useI18n();
  const { colors } = useTheme();
  const { application, update } = useApplication();
  const { setMode } = useMode();
  if (!application) return null;
  const v = application.vehicleType;

  return (
    <StepScreen
      step={1}
      title={t("What will you drive?")}
      intro="Caliphate Rides takes keke and cars in Sokoto, Kano, Kaduna, Abuja and Jos. You'll need the papers for the vehicle you choose."
      footer={<Button title={t("Continue")} disabled={!v && !DEMO} onPress={() => {
        if (!v) update((a) => ({ ...a, vehicleType: "keke" })); // sample mode: keke if none chosen
        router.push("/driver/onboarding/personal");
      }} />}
    >
      {application.status === "changes_requested" && application.reviewNote ? (
        <View style={{ backgroundColor: colors.mist, borderRadius: 14, padding: 14, gap: 4, borderLeftWidth: 0 }}>
          <Txt variant="bodyStrong">{t("Our team asked for a change")}</Txt>
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
              accessibilityLabel={`${t(o.title)}. ${t(o.detail)}`}
              onPress={() => { tap(); update((a) => ({ ...a, vehicleType: o.id })); }}
              style={{ flex: 1, borderRadius: 24, borderWidth: 2, borderColor: on ? colors.green : colors.line, backgroundColor: on ? colors.greenSoft : colors.paper, padding: 14, gap: 8 }}
            >
              <View style={{ height: 86, borderRadius: 16, backgroundColor: on ? colors.paper : colors.greenSoft, alignItems: "center", justifyContent: "center" }}>
                <VehicleArt type={o.id} width={120} />
              </View>
              <Txt variant="title">{t(o.title)}</Txt>
              <Txt variant="caption" color="muted">{t(o.detail)}</Txt>
            </Pressable>
          );
        })}
      </View>

      <ChoiceRow
        label={t("Do you own this vehicle?")}
        value={application.vehicle.ownsVehicle ? "yes" : "no"}
        options={[{ value: "yes", label: t("Yes, it's mine") }, { value: "no", label: t("No, I drive for the owner") }]}
        onChange={(x) => update((a) => ({ ...a, vehicle: { ...a.vehicle, ownsVehicle: x === "yes" } }))}
      />
      {!application.vehicle.ownsVehicle ? (
        <View style={{ backgroundColor: colors.mist, borderRadius: 14, padding: 14, gap: 4 }}>
          <Txt variant="bodyStrong">{t("You'll need the owner's details")}</Txt>
          <Txt variant="caption" color="muted">
            {t("The owner's name, phone number and address, a letter signed by the owner allowing you to drive the vehicle for Caliphate Rides, and a photo of the owner's government ID. This protects you and the owner if the vehicle is ever stolen or misused.")}
          </Txt>
        </View>
      ) : null}

      <View style={{ gap: 4, paddingTop: 6 }}>
        <Txt variant="caption" color="muted">{t("Your record number: {0}", application.recordId || "issued when you submit")}</Txt>
        <Pressable accessibilityRole="button" onPress={() => setMode("rider")} hitSlop={8}><Txt variant="label" color="greenText">{t("Just want to ride? Switch to riding")}</Txt></Pressable>
      </View>
    </StepScreen>
  );
}
