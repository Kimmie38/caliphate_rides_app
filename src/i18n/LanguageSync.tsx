import { useEffect } from "react";
import { ENV } from "../config/env";
import { updateProfile } from "../services/auth";
import { useSession } from "../store/session";
import { adoptServerLanguage, onLanguageChange, useI18n } from "./index";

/**
 * Keeps the language the same on the phone and the server:
 *  - changing it here saves it to the person's account (so it follows them to a new phone),
 *  - signing in on a new phone uses the language saved on their account.
 */
export function LanguageSync() {
  const { user, updateUser } = useSession();
  const { setLang } = useI18n();

  useEffect(() => {
    if (user?.language) adoptServerLanguage(user.language, setLang);
    // only when a different person signs in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => onLanguageChange((l) => {
    if (!user || user.language === l) return;
    if (ENV.useMock) { updateUser({ ...user, language: l }).catch(() => {}); return; }
    updateProfile({ language: l }, user).then(updateUser).catch(() => { /* offline: the phone still remembers */ });
  }), [user, updateUser]);

  return null;
}
