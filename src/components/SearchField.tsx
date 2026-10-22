// The search field's look (owner, 2026-10-22): one frame for Search's own
// field and for Shows' entry to it, so the two read as the same control.
// A pill on surface-raised, the magnifying glass, then the field's
// content: Search's text input, or Shows' placeholder, which opens Search.

import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView } from "expo-symbols";

import { t, type } from "@/theme/tokens";

export function SearchFieldFrame({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.frame, style]}>
      <SymbolView
        name={{ ios: "magnifyingglass", android: "search", web: "search" }}
        tintColor={t.inkMuted}
        size={16}
      />
      {children}
    </View>
  );
}

// The field's text: Search's input, or the placeholder in Shows.
export const searchFieldText = StyleSheet.create({
  input: {
    flex: 1,
    ...type.headline,
    fontWeight: "400",
    paddingVertical: 12,
    color: t.ink,
  },
  placeholder: {
    flex: 1,
    ...type.headline,
    fontWeight: "400",
    paddingVertical: 12,
    color: t.inkMuted,
  },
});

const styles = StyleSheet.create({
  frame: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space2,
    paddingHorizontal: t.space4,
    borderRadius: t.radiusPill,
    backgroundColor: t.surfaceRaised,
  },
});
