// The header over a screen's top (CRI-124), Apple TV style: a bar under
// the status bar with a left slot (the app logo now, a back button later)
// and a right slot (later actions, such as a profile picture). Used on
// Home only for now.
//
// Given the screen's scroll offset, it behaves as on Apple TV's Home: at
// rest it sits over the hero; scrolling up, it leaves with the content,
// its slots fading and blurring, and it is gone once scrolled past; on a
// pull to refresh it stays put while the content is pulled down
// (logic/header.ts).

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  HEADER_BAR_HEIGHT,
  headerBlurIntensity,
  headerScrollProgress,
} from "@/logic/header";
import { t } from "@/theme/tokens";
import { ProgressiveBlur } from "./ProgressiveBlur";

// The blur band at the top edge: gentle, so the status bar reads.
const EDGE_BLUR_INTENSITY = 24;

export function Header({
  left,
  right,
  edgeBlur = false,
  scrollOffset,
}: {
  left?: ReactNode;
  right?: ReactNode;
  // A progressive blur band at the top edge, full to half the top
  // safe-area inset and clear by its end (sized by the inset, so it fits a
  // notch, the Dynamic Island and the SE). Part of the header: it leaves
  // and fades with the slots (CRI-124).
  edgeBlur?: boolean;
  // How far the screen is scrolled from its resting top, negative during
  // a pull. Without it the header stays put.
  scrollOffset?: Animated.Value | Animated.AnimatedInterpolation<number>;
}) {
  const insets = useSafeAreaInsets();
  const height = insets.top + HEADER_BAR_HEIGHT;

  // Native: moves up with the content, never down with a pull, and the
  // slots fade out a little before the header is gone.
  const motion = useMemo(
    () =>
      scrollOffset
        ? {
            translateY: scrollOffset.interpolate({
              inputRange: [0, height],
              outputRange: [0, -height],
              extrapolate: "clamp",
            }),
            opacity: scrollOffset.interpolate({
              inputRange: [0, height * 0.7],
              outputRange: [1, 0],
              extrapolate: "clamp",
            }),
          }
        : { translateY: 0, opacity: 1 },
    [scrollOffset, height],
  );

  // The blur's strength is a prop, not a style, so it follows the scroll
  // from here; it only changes while the header is on its way out.
  const [blur, setBlur] = useState(0);
  useEffect(() => {
    if (!scrollOffset) {
      return;
    }
    const id = scrollOffset.addListener(({ value }) =>
      setBlur(headerBlurIntensity(headerScrollProgress(value, height))),
    );
    return () => scrollOffset.removeListener(id);
  }, [scrollOffset, height]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.header,
        { height, transform: [{ translateY: motion.translateY }] },
      ]}
      testID="header"
    >
      {edgeBlur && (
        <ProgressiveBlur
          intensity={EDGE_BLUR_INTENSITY}
          fullAt={0.5}
          strongAt="top"
          fade={motion.opacity}
          style={[styles.edge, { height: insets.top }]}
          testID="header-edge-blur"
        />
      )}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.bar, { top: insets.top, opacity: motion.opacity }]}
      >
        <View style={styles.slot}>{left}</View>
        <View style={styles.slot}>{right}</View>
      </Animated.View>
      {/* Over the slots, so they go soft as the header leaves. Never under
          a view whose opacity changes: iOS draws a blur under a
          translucent ancestor wrongly. */}
      {blur > 0 && (
        <BlurView
          intensity={blur}
          tint="dark"
          pointerEvents="none"
          testID="header-blur"
          style={StyleSheet.absoluteFill}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  edge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: HEADER_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // The screen margin, in line with the hero's content and the rows.
    paddingHorizontal: t.space4,
  },
  slot: {
    flexDirection: "row",
    alignItems: "center",
  },
});
