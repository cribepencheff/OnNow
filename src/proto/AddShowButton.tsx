// PROTOTYPE (proto/home-backdrop, not for merge): a two-tap "+" for Home,
// direction B. First tap expands the quiet round "+" into a pill
// "+ Add show"; a second tap within a few seconds opens Search. No second
// tap, and it collapses back on its own. A long press still opens the
// hidden image review screen (development builds only). VoiceOver skips
// the two-tap pattern: one activation opens Search directly.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAccessibilityFlags } from "./accessibility";
import { t } from "./tokens";

// One constant, easy to change: how long the expanded pill waits for a
// second tap before it collapses back to the round "+".
const CONFIRM_WINDOW_MS = 3000;

const COLLAPSED_WIDTH = 44;
const EXPANDED_WIDTH = 150;
const HEIGHT = 44;

export function AddShowButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reduceMotionEnabled, screenReaderEnabled } = useAccessibilityFlags();

  const [expanded, setExpanded] = useState(false);
  // useState, not useRef(new Animated.Value()).current: reading a ref's
  // .current during render is unsafe under the React Compiler, and a
  // lazy useState initializer avoids it while still creating the value
  // once.
  const [widthAnim] = useState(() => new Animated.Value(COLLAPSED_WIDTH));
  const [labelOpacity] = useState(() => new Animated.Value(0));
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  }, []);

  const collapse = useCallback(() => {
    clearCollapseTimer();
    setExpanded(false);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: COLLAPSED_WIDTH,
        duration: reduceMotionEnabled ? 0 : 200,
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: 0,
        duration: reduceMotionEnabled ? 0 : 120,
        useNativeDriver: false,
      }),
    ]).start();
  }, [widthAnim, labelOpacity, reduceMotionEnabled, clearCollapseTimer]);

  const expand = useCallback(() => {
    setExpanded(true);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: EXPANDED_WIDTH,
        duration: reduceMotionEnabled ? 0 : 220,
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: 1,
        duration: reduceMotionEnabled ? 0 : 160,
        useNativeDriver: false,
      }),
    ]).start();
    clearCollapseTimer();
    collapseTimer.current = setTimeout(collapse, CONFIRM_WINDOW_MS);
  }, [
    widthAnim,
    labelOpacity,
    reduceMotionEnabled,
    clearCollapseTimer,
    collapse,
  ]);

  useEffect(() => clearCollapseTimer, [clearCollapseTimer]);

  const openSearch = useCallback(() => {
    clearCollapseTimer();
    setExpanded(false);
    widthAnim.setValue(COLLAPSED_WIDTH);
    labelOpacity.setValue(0);
    router.push("/search");
  }, [router, widthAnim, labelOpacity, clearCollapseTimer]);

  const handlePress = useCallback(() => {
    if (screenReaderEnabled) {
      // "One activation opens Search directly": the two-tap confirm step
      // is a mouse/touch affordance VoiceOver users do not need.
      openSearch();
      return;
    }
    if (expanded) {
      openSearch();
    } else {
      expand();
    }
  }, [screenReaderEnabled, expanded, openSearch, expand]);

  return (
    <Animated.View
      style={[
        styles.pill,
        { top: insets.top + 8, width: widthAnim, height: HEIGHT },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add show"
        accessibilityHint={
          screenReaderEnabled ? undefined : "Double tap again to open Search"
        }
        onPress={handlePress}
        onLongPress={__DEV__ ? () => router.push("/dev/images") : undefined}
        testID="home-add-show"
        style={styles.pressable}
      >
        <SymbolView
          name={{ ios: "plus", android: "add", web: "add" }}
          tintColor="#FFFFFF"
          size={20}
        />
        <Animated.Text
          style={[styles.label, { opacity: labelOpacity }]}
          numberOfLines={1}
        >
          Add show
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    right: 16,
    borderRadius: t.radiusPill,
    backgroundColor: "rgba(11,12,15,0.55)",
    overflow: "hidden",
  },
  pressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
