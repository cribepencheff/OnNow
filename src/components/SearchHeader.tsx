// Search's top (owner, 2026-10-23, Apple TV as the reference). At rest:
// the screen's title, as My shows' and Calendar's, over the search field.
// Typing: the title folds away and the field rises into its place, while
// a round close button, on the field's fill, slides in beside the field, which narrows for it;
// closing plays it back. The move is one value from 0 (at rest) to 1
// (typing), eased over about the keyboard's own time, so field, title and
// button move together with the keyboard. With Reduce Motion it jumps.

import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import Reanimated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { HEADER_BAR_HEIGHT } from "@/logic/header";
import { t } from "@/theme/tokens";
import { SEARCH_FIELD_HEIGHT, SearchFieldFrame } from "./SearchField";
import { SCREEN_TITLE_TEXT } from "./screenTitleHeader";

// At rest: the title's bar, as My shows' header, then 16 to the field, as
// in My shows. Typing: the field 8 under the status bar.
export const SEARCH_TITLE_SPACE = HEADER_BAR_HEIGHT + 16;
export const SEARCH_TYPING_SPACE = 8;
// As tall as the field (owner, 2026-10-23).
export const SEARCH_CLOSE_SIZE = SEARCH_FIELD_HEIGHT;
const CLOSE_GAP = 8;
// About the iOS keyboard's own rise.
const MOVE_MS = 300;

export function SearchHeader({
  typing,
  onClose,
  children,
}: {
  typing: boolean;
  onClose: () => void;
  // The field's content: the text input and its clear button.
  children: ReactNode;
}) {
  const progress = useSharedValue(typing ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(typing ? 1 : 0, {
      duration: MOVE_MS,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [typing, progress]);

  const spaceStyle = useAnimatedStyle(() => ({
    height:
      SEARCH_TITLE_SPACE +
      (SEARCH_TYPING_SPACE - SEARCH_TITLE_SPACE) * progress.value,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    // Gone in the first half of the move, so it never meets the field.
    opacity: Math.max(0, 1 - progress.value * 2),
  }));
  const closeStyle = useAnimatedStyle(() => ({
    width: (SEARCH_CLOSE_SIZE + CLOSE_GAP) * progress.value,
    opacity: progress.value,
  }));

  return (
    <View testID="search-header">
      <Reanimated.View style={[styles.space, spaceStyle]}>
        {/* Kept while typing, so it can fade, but hidden from screen
            readers. */}
        <Reanimated.View
          style={[styles.titleBar, titleStyle]}
          accessibilityElementsHidden={typing}
          importantForAccessibility={typing ? "no-hide-descendants" : "auto"}
        >
          <Text
            accessibilityRole="header"
            style={SCREEN_TITLE_TEXT}
            testID="search-title"
          >
            Search
          </Text>
        </Reanimated.View>
      </Reanimated.View>
      <View style={styles.row}>
        <SearchFieldFrame style={styles.field}>{children}</SearchFieldFrame>
        <Reanimated.View
          style={[styles.closeSlot, closeStyle]}
          pointerEvents={typing ? "auto" : "none"}
          accessibilityElementsHidden={!typing}
          importantForAccessibility={typing ? "auto" : "no-hide-descendants"}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close search"
            onPress={onClose}
            hitSlop={4}
            testID="search-close"
          >
            <View style={styles.close} testID="search-close-circle">
              <SymbolView
                name={{ ios: "xmark", android: "close", web: "close" }}
                tintColor={t.ink}
                size={18}
                weight="semibold"
              />
            </View>
          </Pressable>
        </Reanimated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  space: {
    overflow: "hidden",
  },
  // At Home's logo's side inset, as My shows' and Calendar's titles.
  titleBar: {
    height: HEADER_BAR_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: t.headerInset,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: t.contentInset,
    marginBottom: t.space2 + 4,
  },
  field: {
    flex: 1,
  },
  // The button sits at its slot's right edge, so the slot's growth
  // slides it in from the right as the field narrows.
  closeSlot: {
    alignItems: "flex-end",
    overflow: "hidden",
  },
  close: {
    width: SEARCH_CLOSE_SIZE,
    height: SEARCH_CLOSE_SIZE,
    borderRadius: SEARCH_CLOSE_SIZE / 2,
    // The field's own fill (owner, 2026-10-23).
    backgroundColor: t.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
});
