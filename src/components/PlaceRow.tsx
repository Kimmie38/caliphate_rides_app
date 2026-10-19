import React from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { Place } from "../types";
import { tap, Txt } from "./ui";
import { PlaceBadge } from "./visual";

/** A place in a list: colour-coded badge, name, area, distance. Use inside <Group>. */
export function PlaceRow({ place, distance, onPress }: { place: Place; distance?: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${place.name}${place.subtitle ? ", " + place.subtitle : ""}`}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: pressed ? colors.mist : "transparent" })}
    >
      <PlaceBadge category={place.category} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="bodyStrong" numberOfLines={1}>{place.name}</Txt>
        {place.subtitle ? <Txt variant="caption" color="muted" numberOfLines={1}>{place.subtitle}</Txt> : null}
      </View>
      {distance ? (
        <View style={{ backgroundColor: colors.mist, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.line }}>
          <Txt variant="label" tabular style={{ fontSize: 12 }}>{distance}</Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Pickup → destination with the green dot, a dotted connector and the dark square used on the map pins. */
export function RouteSummary({ from, to, fromDetail, toDetail }: { from: string; to: string; fromDetail?: string; toDetail?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.mist, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.line }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ width: 16, alignItems: "center", paddingTop: 5 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green, borderWidth: 3, borderColor: colors.greenSoft }} />
          <View style={{ flex: 1, minHeight: 18, width: 2, marginVertical: 3, borderLeftWidth: 2, borderStyle: "dashed", borderColor: colors.line }} />
          <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: colors.ink }} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 14 }}>
          <View>
            <Txt variant="bodyStrong" numberOfLines={1}>{from}</Txt>
            {fromDetail ? <Txt variant="caption" color="muted" numberOfLines={1}>{fromDetail}</Txt> : null}
          </View>
          <View>
            <Txt variant="bodyStrong" numberOfLines={1}>{to}</Txt>
            {toDetail ? <Txt variant="caption" color="muted" numberOfLines={1}>{toDetail}</Txt> : null}
          </View>
        </View>
      </View>
    </View>
  );
}
