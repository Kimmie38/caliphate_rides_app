import { router } from "expo-router";
import { goBack } from "../../../src/lib/nav";
import React, { useState } from "react";
import { Field, SelectField, StepScreen } from "../../../src/driver/components/form";
import { Button } from "../../../src/components/ui";
import { RELATIONSHIPS } from "../../../src/driver/config/requirements";
import { maskLocal } from "../../../src/lib/phone";
import { DEMO } from "../../../src/config/demo";
import { fillGuarantor } from "../../../src/driver/lib/demoFill";
import { validateGuarantor, type Errors } from "../../../src/driver/lib/validate";
import { useApplication } from "../../../src/driver/store/application";
import { useSession } from "../../../src/store/session";

export default function Guarantor() {
  const { application, update } = useApplication();
  const { user } = useSession();
  const [errors, setErrors] = useState<Errors>({});
  if (!application) return null;
  const g = application.guarantor;
  const set = (patch: Partial<typeof g>) => { update((a) => ({ ...a, guarantor: { ...a.guarantor, ...patch } })); setErrors({}); };

  const next = () => {
    if (DEMO) { update((a) => ({ ...a, guarantor: fillGuarantor(a.guarantor) })); router.push("/driver/onboarding/bank"); return; }
    const e = validateGuarantor(g, user?.phone ?? "");
    setErrors(e);
    if (Object.keys(e).length === 0) router.push("/driver/onboarding/bank");
  };

  return (
    <StepScreen step={5} title="Your guarantor" onBack={() => goBack("/driver/onboarding/documents")}
      intro="Someone who knows you well and can vouch for you, such as a parent, employer or community leader. We may call them to confirm."
      footer={<Button title="Continue" onPress={next} />}>
      <Field label="Guarantor's full name" value={g.fullName} onChangeText={(t) => set({ fullName: t })} autoCapitalize="words" error={errors.fullName} />
      <Field label="Guarantor's phone number" value={g.phone} onChangeText={(t) => set({ phone: maskLocal(t) })} keyboardType="phone-pad" maxLength={12} placeholder="803 214 5567" error={errors.phone} />
      <SelectField label="How do you know them?" value={g.relationship} options={RELATIONSHIPS} onChange={(r) => set({ relationship: r })} error={errors.relationship} />
      <Field label="Guarantor's home address" value={g.address} onChangeText={(t) => set({ address: t })} multiline error={errors.address} style={{ minHeight: 80, textAlignVertical: "top" }} />
    </StepScreen>
  );
}
