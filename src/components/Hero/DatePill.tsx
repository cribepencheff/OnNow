// The date pill above the hero's logo (CRI-124), Apple TV style: a dark,
// translucent fill over a background blur, edged with a light hairline, so
// it reads on bright and busy images. Sentence case ("Today · Fri 9 Oct").

import { StyleSheet, Text, View } from "react-native";

import { PILL_HEIGHT } from "@/logic/hero-layout";
import { t, type } from "@/theme/tokens";
import { ImageControlMaterial } from "../ImageControlMaterial";

export function DatePill({ label }: { label: string }) {
  return (
    <View style={styles.pill} testID="hero-date-pill">
      <ImageControlMaterial />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: PILL_HEIGHT,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: t.radiusPill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    // Clips the blur to the pill's shape.
    overflow: "hidden",
  },
  label: {
    ...type.meta,
    fontWeight: "600",
    color: t.ink,
  },
});
