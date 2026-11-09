import { router } from "expo-router";
import { goBack } from "../../../src/lib/nav";
import React from "react";
import { DocumentRow } from "../../../src/driver/components/DocumentRow";
import { StepScreen } from "../../../src/driver/components/form";
import { Group } from "../../../src/components/visual";
import { Button, Txt } from "../../../src/components/ui";
import { documentsFor } from "../../../src/driver/config/requirements";
import { DEMO } from "../../../src/config/demo";
import { fillDocuments } from "../../../src/driver/lib/demoFill";
import { useApplication } from "../../../src/driver/store/application";
import { t, useI18n } from "../../../src/i18n";

export default function Documents() {
  useI18n();
  const { application, update } = useApplication();
  if (!application?.vehicleType) return null;
  const docs = documentsFor(application.vehicleType, application.vehicle.ownsVehicle);
  const required = docs.filter((d) => d.required(application.vehicleType!, application.vehicle.ownsVehicle));
  const done = required.filter((d) => application.documents[d.kind]?.current).length;

  return (
    <StepScreen step={4} title={t("Documents and photos")} onBack={() => goBack("/driver/onboarding/vehicle")}
      intro="Take clear photos in good light with all four corners showing. We keep every document on your official record and check it with the issuing body."
      footer={
        <>
          <Txt variant="caption" color="muted" align="center">{t("{0} of {1} required documents added", done, required.length)}</Txt>
          <Button title={t("Continue")} disabled={!DEMO && done < required.length} onPress={() => {
            if (DEMO) update((a) => ({ ...a, documents: fillDocuments(a) })); // sample photos for anything not added
            router.push("/driver/onboarding/guarantor");
          }} />
        </>
      }>
      <Group>
        {docs.map((d) => (
          <DocumentRow key={d.kind} req={d} doc={application.documents[d.kind]} required={d.required(application.vehicleType!, application.vehicle.ownsVehicle)} />
        ))}
      </Group>
    </StepScreen>
  );
}
