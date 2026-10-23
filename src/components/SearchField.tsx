// The search field's look (owner, 2026-10-22): one frame for Search's own
// field and for Shows' entry to it, so the two read as the same control.
// A pill on surface-raised, 44 high (Search's close button's size), the
// tab bar's magnifier, then the field's content: Search's text input, or
// Shows' placeholder, which opens Search (owner, 2026-10-23).

import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { t } from "@/theme/tokens";
import { MagnifierIcon } from "./TabBar/TabIcons";

export const SEARCH_FIELD_HEIGHT = 44;
// Smaller than headline, as iOS's own search field (owner, 2026-10-23).
export const SEARCH_FIELD_TEXT_SIZE = 17;
const ICON_SIZE = 18;

export function SearchFieldFrame({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.frame, style]} testID="search-field">
      <MagnifierIcon
        size={ICON_SIZE}
        color={t.inkMuted}
        testID="search-field-icon"
      />
      {children}
    </View>
  );
}

// The field's text: Search's input, or the placeholder in Shows. No line
// height: a one-line TextInput on iOS sets its text lower with one than a
// Text does, so the two would sit apart; both centre on the font's own.
export const searchFieldText = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: SEARCH_FIELD_TEXT_SIZE,
    fontWeight: "400",
    paddingVertical: 0,
    color: t.ink,
  },
  placeholder: {
    flex: 1,
    fontSize: SEARCH_FIELD_TEXT_SIZE,
    fontWeight: "400",
    paddingVertical: 0,
    color: t.inkMuted,
  },
});

const styles = StyleSheet.create({
  frame: {
    height: SEARCH_FIELD_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: t.space2,
    paddingHorizontal: t.space4,
    borderRadius: t.radiusPill,
    backgroundColor: t.surfaceRaised,
  },
});
