import { router, type Href } from "expo-router";

/**
 * Go back to the previous screen, or open `fallback` when there isn't one
 * (e.g. the screen was opened directly). Avoids "The action 'GO_BACK' was not handled".
 */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
