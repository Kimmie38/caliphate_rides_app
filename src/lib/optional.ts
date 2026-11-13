/**
 * Loads a native package only if this build of the app contains it. A build made before the package
 * was added (for example an old development build) gets null instead of crashing on start-up, and
 * the feature quietly does less. Release builds always contain them.
 */
export function optional<T>(load: () => T): T | null {
  try {
    return load();
  } catch (e: any) {
    if (__DEV__) console.warn("[native] not in this build:", e?.message ?? e);
    return null;
  }
}
