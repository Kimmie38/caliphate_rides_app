import { ENV } from "./env";

/**
 * Sample mode (EXPO_PUBLIC_USE_MOCK=true): forms never block, so you can tap through every screen
 * to check the design. Anything left empty is filled with the sample details below.
 * With a real backend (USE_MOCK=false) every field is checked as normal.
 */
export const DEMO = ENV.useMock;

export const DEMO_RIDER = {
  phone: "+2348031234567",
  code: "123456",
  name: "Aisha Abubakar",
};
