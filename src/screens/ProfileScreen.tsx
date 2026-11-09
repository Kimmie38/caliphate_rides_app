import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Icon } from "../components/Icon";
import { Avatar, Button, IconButton, Plate, SettingRow, Txt } from "../components/ui";
import { Card, Group, Hero, Tag, VehicleArt } from "../components/visual";
import { BRAND } from "../config/brand";
import { Field } from "../driver/components/form";
import { useApplication } from "../driver/store/application";
import { formatDayMonth, t, useI18n } from "../i18n";
import { goBack } from "../lib/nav";
import { formatNgPhone } from "../lib/phone";
import { useKeyboardScroll } from "../lib/useKeyboardScroll";
import { updateProfile } from "../services/auth";
import { useSession } from "../store/session";
import { useTheme } from "../theme/ThemeProvider";
import { fonts } from "../theme/tokens";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const memberSince = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${formatDayMonth(d)} ${d.getFullYear()}`;
};

/** Green header with the person's initials, name and phone. */
function ProfileHero({ name, phone, children }: { name: string; phone: string; children?: React.ReactNode }) {
  return (
    <Hero glowing style={{ padding: 20, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar name={name} size={64} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Txt style={{ fontFamily: fonts.display, fontSize: 22, color: "#FFFFFF" }} numberOfLines={1}>{name || t("Your name")}</Txt>
          <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: "#FFFFFF", opacity: 0.85 }}>{phone}</Txt>
        </View>
      </View>
      {children ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View> : null}
    </Hero>
  );
}

function HeroChip({ icon, text }: { icon: React.ComponentProps<typeof Icon>["name"]; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 }}>
      <Icon name={icon} size={14} color="#FFFFFF" />
      <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: "#FFFFFF" }}>{text}</Txt>
    </View>
  );
}

/** A read-only line with a lock: things that can only change through support. */
function LockedRow({ label, value, note }: { label: string; value: string; note?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      <View style={{ minHeight: 52, borderRadius: 14, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.mist, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Txt variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{value}</Txt>
        <Icon name="lock" size={16} color={colors.muted} />
      </View>
      {note ? <Txt variant="caption" color="muted">{note}</Txt> : null}
    </View>
  );
}

function Header({ back }: { back: "/(tabs)/account" | "/driver/account" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <IconButton name="back" label={t("Back")} onPress={() => goBack(back)} size={44} style={{ borderRadius: 14 }} />
      <Txt variant="page" style={{ flex: 1 }}>{t("Profile")}</Txt>
    </View>
  );
}

/** Saves name and email; shows a "Saved" line for a moment. */
function useProfileForm(editName: boolean) {
  const { user, updateUser } = useSession();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const changed = (editName && name.trim() !== (user?.name ?? "")) || email.trim().toLowerCase() !== (user?.email ?? "");

  const save = async () => {
    if (!user) return;
    const e: typeof errors = {};
    if (editName && name.trim().length < 2) e.name = t("Enter your name.");
    if (email.trim() && !EMAIL.test(email.trim())) e.email = t("Check the email address, or leave it empty.");
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const next = await updateProfile({ ...(editName ? { name: name.trim() } : {}), email: email.trim().toLowerCase() }, user);
      await updateUser(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setErrors({ form: err?.message ?? t("Couldn't save. Check your connection and try again.") });
    } finally {
      setSaving(false);
    }
  };
  return { user, name, setName, email, setEmail, errors, setErrors, saving, saved, changed, save };
}

function SaveBar({ form }: { form: ReturnType<typeof useProfileForm> }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {form.errors.form ? <Txt variant="caption" style={{ color: colors.danger }}>{form.errors.form}</Txt> : null}
      {form.saved ? (
        <Animated.View entering={FadeIn} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icon name="check" size={18} color={colors.greenText} />
          <Txt variant="label" color="greenText">{t("Saved")}</Txt>
        </Animated.View>
      ) : null}
      <Button title={t("Save changes")} onPress={form.save} loading={form.saving} disabled={!form.changed} />
    </View>
  );
}

/** Rider profile: name and email can be changed here; the phone number is how they sign in. */
export function RiderProfile() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  useI18n();
  const form = useProfileForm(true);
  const u = form.user;

  const keyboardScroll = useKeyboardScroll();

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView {...keyboardScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 18 }}>
        <Header back="/(tabs)/account" />
        <Animated.View entering={FadeInDown.duration(350)}>
          <ProfileHero name={form.name || u?.name || ""} phone={u ? formatNgPhone(u.phone) : ""}>
            {u?.rating ? <HeroChip icon="star" text={t("{0} rider rating", u.rating.toFixed(1))} /> : null}
            {memberSince(u?.memberSince) ? <HeroChip icon="calendar" text={t("Member since {0}", memberSince(u?.memberSince))} /> : null}
          </ProfileHero>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(350).delay(60)}>
          <Card style={{ gap: 16 }}>
            <Txt variant="heading">{t("Your details")}</Txt>
            <Field label={t("Full name")} value={form.name} onChangeText={(v) => { form.setName(v); form.setErrors({}); }}
              autoCapitalize="words" autoComplete="name" textContentType="name" error={form.errors.name} hint={t("Drivers see your first name.")} />
            <Field label={t("Email (optional)")} value={form.email} onChangeText={(v) => { form.setEmail(v); form.setErrors({}); }}
              autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="name@example.com"
              error={form.errors.email} hint={t("For receipts and account messages.")} />
            <LockedRow label={t("Phone number")} value={u ? formatNgPhone(u.phone) : ""} note={t("You sign in with this number. To change it, call support.")} />
          </Card>
        </Animated.View>

        <SaveBar form={form} />

        <Group>
          <SettingRow icon="settings" tone="school" title={t("Settings")} detail={t("Language and appearance")} onPress={() => router.push("/settings")} />
        </Group>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Driver profile: the official record decides the name, vehicle and bank; email can be changed here. */
export function DriverProfile() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  useI18n();
  const form = useProfileForm(false);
  const { application: a } = useApplication();
  const u = form.user;
  const name = a?.personal.fullName || u?.name || "";
  const vehicle = a ? [a.vehicle.colour, a.vehicle.make, a.vehicle.model].filter(Boolean).join(" ") : "";
  const since = memberSince(a?.approvedAt);
  const support = t("To change this, call driver support on {0}.", BRAND.supportPhone);

  const keyboardScroll = useKeyboardScroll();

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView {...keyboardScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 18 }}>
        <Header back="/driver/account" />
        <Animated.View entering={FadeInDown.duration(350)}>
          <ProfileHero name={name} phone={u ? formatNgPhone(u.phone) : ""}>
            <HeroChip icon={a?.status === "suspended" ? "alert" : "check"} text={a?.status === "suspended" ? t("On hold") : t("Approved driver")} />
            {since ? <HeroChip icon="calendar" text={t("Driving since {0}", since)} /> : null}
          </ProfileHero>
        </Animated.View>

        {a?.vehicleType ? (
          <Animated.View entering={FadeInDown.duration(350).delay(40)}>
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: 96, height: 68, borderRadius: 18, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }}>
                <VehicleArt type={a.vehicleType} width={86} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <Txt variant="caption" color="muted">{a.vehicleType === "keke" ? t("Your keke") : t("Your car")}</Txt>
                <Txt style={{ fontFamily: fonts.display, fontSize: 15 }} numberOfLines={1}>{vehicle}{a.vehicle.year ? ` · ${a.vehicle.year}` : ""}</Txt>
                <View style={{ alignSelf: "flex-start" }}><Plate text={a.vehicle.plate} /></View>
              </View>
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(350).delay(80)}>
          <Card style={{ gap: 16 }}>
            <Txt variant="heading">{t("Your details")}</Txt>
            <LockedRow label={t("Full name")} value={name} note={t("Your name comes from your licence. {0}", support)} />
            <Field label={t("Email (optional)")} value={form.email} onChangeText={(v) => { form.setEmail(v); form.setErrors({}); }}
              autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="name@example.com"
              error={form.errors.email} hint={t("For payout receipts and account messages.")} />
            <LockedRow label={t("Phone number")} value={u ? formatNgPhone(u.phone) : ""} note={t("You sign in with this number.")} />
          </Card>
        </Animated.View>

        <SaveBar form={form} />

        {a ? (
          <Animated.View entering={FadeInDown.duration(350).delay(120)} style={{ gap: 10 }}>
            <Txt variant="heading">{t("On your driver record")}</Txt>
            <Group>
              <SettingRow icon="ribbon" tone="green" title={t("Record number")} detail={a.recordId} onPress={() => router.push("/driver/application")} />
              <SettingRow icon="wallet" tone="gov" title={t("Payout account")} detail={`${a.bank.bankName} · ••${a.bank.accountNumber.slice(-4)}`}
                onPress={() => Linking.openURL(`tel:${BRAND.supportPhone.replace(/\s/g, "")}`)} />
              <SettingRow icon="pin" tone="market" title={t("Local government area")} detail={a.personal.lga || "–"} />
              <SettingRow icon="people" tone="health" title={t("Guarantor")} detail={a.guarantor.fullName || "–"} />
              <SettingRow icon="document" tone="school" title={t("Documents and licence")} detail={t("Update your licence and vehicle papers")} onPress={() => router.navigate("/driver/documents")} />
            </Group>
            <Txt variant="caption" color="muted">{t("Your vehicle, bank and guarantor are checked by our team. {0}", support)}</Txt>
          </Animated.View>
        ) : null}

        <Group>
          <SettingRow icon="settings" tone="school" title={t("Settings")} detail={t("Language and appearance")} onPress={() => router.push("/driver/settings")} />
        </Group>
        {a?.status === "suspended" ? <Tag text={t("Your account is on hold")} tone="red" icon="alert" /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
