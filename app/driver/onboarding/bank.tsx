import { router } from "expo-router";
import { goBack } from "../../../src/lib/nav";
import React, { useState } from "react";
import { Field, SelectField, StepScreen } from "../../../src/driver/components/form";
import { Button } from "../../../src/components/ui";
import { ENV } from "../../../src/config/env";
import { BANKS } from "../../../src/driver/config/requirements";
import { DEMO } from "../../../src/config/demo";
import { fillBank } from "../../../src/driver/lib/demoFill";
import { validateBank, type Errors } from "../../../src/driver/lib/validate";
import { useApplication } from "../../../src/driver/store/application";
import { t, useI18n } from "../../../src/i18n";

export default function Bank() {
  useI18n();
  const { application, update } = useApplication();
  const [errors, setErrors] = useState<Errors>({});
  if (!application) return null;
  const b = application.bank;
  const set = (patch: Partial<typeof b>) => { update((a) => ({ ...a, bank: { ...a.bank, ...patch } })); setErrors({}); };

  const next = () => {
    if (DEMO) { update((a) => ({ ...a, bank: fillBank(a.bank, a.personal.fullName) })); router.push("/driver/onboarding/review"); return; }
    const e = validateBank(b);
    setErrors(e);
    if (Object.keys(e).length === 0) router.push("/driver/onboarding/review");
  };

  return (
    <StepScreen step={6} title={t("Where you get paid")} onBack={() => goBack("/driver/onboarding/guarantor")}
      intro="We pay your in-app earnings into this account. Riders who choose bank transfer also send their fare here."
      footer={<Button title={t("Continue")} onPress={next} />}>
      <SelectField label={t("Bank")} value={b.bankName} options={BANKS} onChange={(bankName) => set({ bankName })} error={errors.bankName} />
      <Field label={t("Account number")} value={b.accountNumber} onChangeText={(t) => set({ accountNumber: t.replace(/\D/g, "").slice(0, 10) })} keyboardType="number-pad" maxLength={10} error={errors.accountNumber} />
      <Field label={t("Account name")} value={b.accountName} onChangeText={(t) => set({ accountName: t })} autoCapitalize="words" error={errors.accountName}
        hint={ENV.useMock ? t("Exactly as your bank shows it.") : t("We check this name with your bank. It should match the name on your licence.")} />
    </StepScreen>
  );
}
