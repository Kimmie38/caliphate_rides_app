import { router } from "expo-router";
import { goBack } from "../../../src/lib/nav";
import React, { useState } from "react";
import { ScrollView } from "react-native";
import { Field, StepScreen } from "../../../src/driver/components/form";
import { Button, Chip } from "../../../src/components/ui";
import { DEMO } from "../../../src/config/demo";
import { fillVehicle } from "../../../src/driver/lib/demoFill";
import { normalizePlate, validateVehicle, type Errors } from "../../../src/driver/lib/validate";
import { useApplication } from "../../../src/driver/store/application";

const MAKES = { keke: ["Bajaj", "TVS", "Piaggio", "Lifan"], car: ["Toyota", "Honda", "Nissan", "Hyundai", "Kia"] } as const;

export default function VehicleDetails() {
  const { application, update } = useApplication();
  const [errors, setErrors] = useState<Errors>({});
  if (!application) return null;
  const v = application.vehicle;
  const type = application.vehicleType ?? "keke";
  const set = (patch: Partial<typeof v>) => { update((a) => ({ ...a, vehicle: { ...a.vehicle, ...patch } })); setErrors({}); };

  const next = () => {
    if (DEMO) {
      update((a) => { const filled = fillVehicle(a.vehicle, type); return { ...a, vehicle: { ...filled, plate: normalizePlate(filled.plate) } }; });
      router.push("/driver/onboarding/documents");
      return;
    }
    const e = validateVehicle(v);
    setErrors(e);
    if (Object.keys(e).length === 0) { set({ plate: normalizePlate(v.plate) }); router.push("/driver/onboarding/documents"); }
  };

  return (
    <StepScreen step={3} title={type === "keke" ? "Your keke" : "Your car"} intro="Riders use these details to find you at the pickup." onBack={() => goBack("/driver/onboarding/personal")}
      footer={<Button title="Continue" onPress={next} />}>
      <Field label="Make" value={v.make} onChangeText={(t) => set({ make: t })} autoCapitalize="words" error={errors.make} placeholder={type === "keke" ? "e.g. Bajaj" : "e.g. Toyota"} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginTop: -8 }}>
        {MAKES[type].map((m) => <Chip key={m} label={m} onPress={() => set({ make: m })} />)}
      </ScrollView>
      <Field label="Model" value={v.model} onChangeText={(t) => set({ model: t })} autoCapitalize="words" error={errors.model} placeholder={type === "keke" ? "e.g. RE" : "e.g. Corolla"} />
      <Field label="Year made" value={v.year} onChangeText={(t) => set({ year: t.replace(/\D/g, "").slice(0, 4) })} keyboardType="number-pad" maxLength={4} error={errors.year} placeholder="e.g. 2019" />
      <Field label="Colour" value={v.colour} onChangeText={(t) => set({ colour: t })} autoCapitalize="words" error={errors.colour} placeholder="e.g. Yellow" />
      <Field label="Plate number" value={v.plate} onChangeText={(t) => set({ plate: t.toUpperCase() })} onBlur={() => set({ plate: normalizePlate(v.plate) })}
        autoCapitalize="characters" autoCorrect={false} maxLength={11} error={errors.plate} placeholder="ABC 123 XY" hint="Exactly as on the plate. Riders check it before getting in." />
    </StepScreen>
  );
}
