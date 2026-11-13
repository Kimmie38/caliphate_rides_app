import React from "react";
import { useDriving } from "../../src/driver/store/driving";
import { DeleteAccountScreen } from "../../src/screens/DeleteAccountScreen";

export default function DriverDeleteAccountRoute() {
  const { goOffline } = useDriving();
  return <DeleteAccountScreen back="/driver/settings" beforeSignOut={goOffline} />;
}
