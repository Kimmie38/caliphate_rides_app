import React from "react";
import { SettingsScreen } from "../../src/screens/SettingsScreen";

export default function DriverSettingsRoute() {
  return <SettingsScreen who="driver" back="/driver/account" />;
}
