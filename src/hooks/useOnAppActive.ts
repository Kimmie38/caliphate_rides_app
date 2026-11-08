import { useEffect, useRef } from "react";
import { AppState } from "react-native";

/**
 * Runs `fn` when the person comes back to the app (e.g. from the payment page in the
 * browser), so balances and payment statuses refresh without pulling down.
 */
export function useOnAppActive(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let last = AppState.currentState;
    const sub = AppState.addEventListener("change", (next) => {
      if (last !== "active" && next === "active") ref.current();
      last = next;
    });
    return () => sub.remove();
  }, []);
}
