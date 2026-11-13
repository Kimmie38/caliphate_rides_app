import React from "react";
import { PinScreen } from "../src/screens/PinScreen";

// Shown after the first sign-in (and after "Forgot PIN") until the account has a PIN.
export default function CreatePinRoute() {
  return <PinScreen mode="create" />;
}
