import { router } from "expo-router";
import { goBack } from "../../../src/lib/nav";
import React, { useEffect, useState } from "react";
import { ChoiceRow, DateField, Field, SelectField, StepScreen } from "../../../src/driver/components/form";
import { Button } from "../../../src/components/ui";
import { STATE_LGAS, STATES } from "../../../src/driver/config/requirements";
import { currentCity } from "../../../src/lib/area";
import { parseDmy, toDmy } from "../../../src/driver/lib/dates";
import { DEMO } from "../../../src/config/demo";
import { fillPersonal } from "../../../src/driver/lib/demoFill";
import { validatePersonal, type Errors } from "../../../src/driver/lib/validate";
import { useApplication } from "../../../src/driver/store/application";
import { useSession } from "../../../src/store/session";
import { t, useI18n } from "../../../src/i18n";

export default function Personal() {
  useI18n();
  const { application, update } = useApplication();
  const [dob, setDob] = useState(toDmy(application?.personal.dateOfBirth));
  const [errors, setErrors] = useState<Errors>({});
  const { user } = useSession();
  // Start from the name they gave when they first signed in, and the state they're in.
  useEffect(() => {
    if (!application) return;
    const patch: Partial<typeof application.personal> = {};
    if (!application.personal.fullName && user?.name) patch.fullName = user.name;
    if (!application.personal.state) patch.state = application.personal.lga && STATE_LGAS.Sokoto.includes(application.personal.lga) ? "Sokoto" : currentCity().state;
    if (Object.keys(patch).length) update((a) => ({ ...a, personal: { ...a.personal, ...patch } }));
  }, [application?.recordId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!application) return null;
  const p = application.personal;
  const set = (patch: Partial<typeof p>) => { update((a) => ({ ...a, personal: { ...a.personal, ...patch } })); setErrors({}); };

  const next = () => {
    if (DEMO) { update((a) => ({ ...a, personal: fillPersonal(a.personal, user?.name) })); router.push("/driver/onboarding/vehicle"); return; }
    const e = validatePersonal(p, dob);
    setErrors(e);
    if (Object.keys(e).length === 0) router.push("/driver/onboarding/vehicle");
  };

  return (
    <StepScreen step={2} title={t("About you")} intro="Use the details on your driver's licence and NIN slip. This goes on your official driver record." onBack={() => goBack("/driver/onboarding")}
      footer={<Button title={t("Continue")} onPress={next} />}>
      <Field label={t("Full name")} value={p.fullName} onChangeText={(t) => set({ fullName: t })} autoCapitalize="words" textContentType="name" autoComplete="name" error={errors.fullName} placeholder={t("As on your licence")} />
      <DateField label={t("Date of birth")} value={dob} onChange={(t) => { setDob(t); const iso = parseDmy(t); set({ dateOfBirth: iso ?? "" }); }} error={errors.dateOfBirth} />
      <ChoiceRow label={t("Gender")} value={p.gender} options={[{ value: "male", label: t("Male") }, { value: "female", label: t("Female") }]} onChange={(g) => set({ gender: g })} error={errors.gender} />
      <Field label={t("Home address")} value={p.address} onChangeText={(t) => set({ address: t })} multiline placeholder={t("House number, street and area")} error={errors.address} style={{ minHeight: 80, textAlignVertical: "top" }} />
      <SelectField label={t("State")} value={p.state} options={STATES} onChange={(state) => set({ state, lga: state === p.state ? p.lga : "" })} error={errors.state} />
      <SelectField label={t("Local government area")} value={p.lga} options={STATE_LGAS[p.state] ?? []} onChange={(lga) => set({ lga })} error={errors.lga}
        placeholder={p.state ? t("Choose") : t("Choose your state first")} />
      <Field label={t("NIN (National Identification Number)")} value={p.nin} onChangeText={(t) => set({ nin: t.replace(/\D/g, "").slice(0, 11) })} keyboardType="number-pad" maxLength={11}
        error={errors.nin} hint={t("11 digits, on your NIN slip. Dial *346# to get it.")} />
    </StepScreen>
  );
}
