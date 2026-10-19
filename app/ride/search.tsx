import { router, useLocalSearchParams } from "expo-router";
import { goBack } from "../../src/lib/nav";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../src/components/Icon";
import { PlaceRow } from "../../src/components/PlaceRow";
import { IconButton, tap, Txt } from "../../src/components/ui";
import { serviceCenter } from "../../src/lib/area";
import { haversineKm } from "../../src/lib/geo";
import { searchPlaces, resolvePlace } from "../../src/services/places";
import { useRide } from "../../src/store/ride";
import { useSavedPlaces, type SavedKey } from "../../src/store/saved";
import { useTheme } from "../../src/theme/ThemeProvider";
import { fonts, shadow } from "../../src/theme/tokens";
import type { Place } from "../../src/types";

type Field = "pickup" | "destination";

export default function Search() {
  const { saveAs } = useLocalSearchParams<{ saveAs?: SavedKey }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { pickup, setPickup, setDestination } = useRide();
  const { saved, save } = useSavedPlaces();
  const [field, setField] = useState<Field>("destination");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const near = pickup?.location ?? serviceCenter();

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => searchPlaces(query, near, ctrl.signal).then(setResults).catch(() => {}), query ? 250 : 0);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, near.latitude, near.longitude]);

  const choose = async (place: Place) => {
    setError(null);
    try {
      const p = await resolvePlace(place);
      if (saveAs) { save(saveAs, p); goBack("/"); return; }
      if (field === "pickup") {
        setPickup(p);
        setField("destination");
        setQuery("");
        inputRef.current?.focus();
        return;
      }
      setDestination(p);
      router.dismissTo("/ride/confirm"); // back to an open confirm screen, or replaces this one
    } catch (e: any) {
      setError(e?.message ?? "Couldn't use that place. Try another.");
    }
  };

  const title = saveAs ? `Set ${saveAs === "home" ? "Home" : "Work"}` : "Plan your ride";
  const savedRows = !saveAs && !query ? (["home", "work"] as const).filter((k) => saved[k]).map((k) => saved[k]!) : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconButton name="back" label="Back" onPress={() => goBack("/")} size={44} />
          <Txt variant="title" style={{ fontSize: 24 }}>{title}</Txt>
        </View>

        <View style={{ backgroundColor: colors.paper, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 4, borderWidth: isDark ? 1 : 0, borderColor: colors.line, ...shadow(1, isDark) }}>
          {!saveAs && (
            <>
              <FieldRow
                marker={<View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.green, borderWidth: 3, borderColor: colors.greenSoft }} />}
                active={field === "pickup"}
                placeholder="Pickup"
                value={field === "pickup" ? query : pickup?.name ?? ""}
                detail={field === "pickup" ? undefined : pickup?.subtitle}
                onFocus={() => { setField("pickup"); setQuery(""); }}
                onChangeText={setQuery}
              />
              <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 30 }} />
            </>
          )}
          <FieldRow
            inputRef={inputRef}
            autoFocus
            marker={<View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: colors.ink }} />}
            active={field === "destination"}
            placeholder={saveAs ? "Search for an address or place" : "Where to?"}
            value={field === "destination" ? query : ""}
            onFocus={() => { setField("destination"); setQuery(""); }}
            onChangeText={setQuery}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => { tap(); router.push({ pathname: "/ride/pin", params: { field: saveAs ? "destination" : field, saveAs: saveAs ?? "" } }); }}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, padding: 12, borderRadius: 20, backgroundColor: colors.greenSoft, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" }}>
            <Icon name="map" size={20} color={colors.greenText} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong" color="greenText">Choose on map</Txt>
            <Txt variant="caption" color="greenText" style={{ opacity: 0.8 }}>For a house or spot without an address</Txt>
          </View>
          <Icon name="forward" size={18} color={colors.greenText} />
        </Pressable>
        {error ? <Txt variant="caption" style={{ color: colors.danger }}>{error}</Txt> : null}
      </View>

      <FlatList
        style={{ flex: 1, marginTop: 6 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        data={[...savedRows, ...results]}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={<Txt variant="heading" style={{ paddingVertical: 8 }}>{query ? "Results" : "Popular places"}</Txt>}
        ListEmptyComponent={query ? <Txt color="muted" style={{ paddingVertical: 12 }}>No place called "{query}" yet. Try a market, hospital or school, or choose on the map.</Txt> : null}
        renderItem={({ item, index }) => {
          const count = savedRows.length + results.length;
          return (
            // Rows sit in one rounded card: first and last rows carry the corners.
            <View style={{
              backgroundColor: colors.paper, overflow: "hidden",
              borderTopLeftRadius: index === 0 ? 22 : 0, borderTopRightRadius: index === 0 ? 22 : 0,
              borderBottomLeftRadius: index === count - 1 ? 22 : 0, borderBottomRightRadius: index === count - 1 ? 22 : 0,
              borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.line,
            }}>
              <PlaceRow
                place={item}
                distance={item.googlePlaceId ? undefined : `${(haversineKm(near, item.location) * 1.25).toFixed(1)} km`}
                onPress={() => choose(item)}
              />
            </View>
          );
        }}
      />
    </View>
  );
}

function FieldRow(props: {
  marker: React.ReactNode; active: boolean; placeholder: string; value: string; detail?: string;
  onFocus: () => void; onChangeText: (t: string) => void; autoFocus?: boolean; inputRef?: React.RefObject<TextInput | null>;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 }}>
      <View style={{ width: 18, alignItems: "center" }}>{props.marker}</View>
      <View style={{ flex: 1 }}>
        <TextInput
          ref={props.inputRef}
          autoFocus={props.autoFocus}
          value={props.value}
          onFocus={props.onFocus}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          autoCorrect={false}
          style={{ fontFamily: props.active ? fonts.bodyBold : fonts.bodySemi, fontSize: 16, color: colors.ink, paddingVertical: 8 }}
        />
        {props.detail ? <Txt variant="caption" color="muted" numberOfLines={1} style={{ marginTop: -6, marginBottom: 6 }}>{props.detail}</Txt> : null}
      </View>
    </View>
  );
}
