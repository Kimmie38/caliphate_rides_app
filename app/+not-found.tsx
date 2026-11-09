import { Redirect } from "expo-router";
import React from "react";
import { useSession } from "../src/store/session";

// Expo Router 58 can open a signed-out person at the sign-in group itself ("/(auth)"), which has no
// screen of its own. Anything that doesn't match a screen goes to Welcome, or Home when signed in.
export default function NotFound() {
  const { status } = useSession();
  return <Redirect href={status === "signedIn" ? "/" : "/welcome"} />;
}
