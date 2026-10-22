import { useCallback, useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { useAccessibilityFlags } from "@/hooks/useAccessibilityFlags";
import { t } from "@/theme/tokens";
import { followHaptic } from "./followHaptic";
import { FOLLOW_CHECK_SYMBOL, FOLLOW_PLUS_SYMBOL } from "./followSymbols";

const FOLLOW_CIRCLE_SIZE = 32;
// How much darker a followed circle's fill is (owner, 2026-10-22): the
// page's bg over the material at this opacity, fading in with the check.
export const FOLLOWED_SHADE = 0.35;
// The icon's share of the circle (15 in 32).
const ICON_SHARE = 15 / 32;

// The follow circle (CRI-127), Apple TV style: a translucent dark fill, no
// blur, a light hairline edge, the same followed or not; a white plus, or
// a white check once followed, morphing between the two (crossfade +
// scale) rather than swapping instantly. On every poster card, on Home and
// in Search's rows alike, and on Search's typed results (owner,
// 2026-10-22: exactly the same control). Show detail's Follow button does
// not morph, but shares the same haptic (followHaptic). expo-symbols has no native SF
// Symbol "replace" transition exposed (checked before building this), so
// this fakes the morph with two overlaid SymbolViews instead, the same
// crossfade technique PosterRow's own skeleton-to-cards transition uses.
export function PosterFollowCircle({
  followed,
  onPress,
  testID,
  size = FOLLOW_CIRCLE_SIZE,
}: {
  followed: boolean;
  onPress: () => void;
  testID: string;
  // A little smaller on a Search row's poster (owner, 2026-10-22).
  size?: number;
}) {
  const iconSize = Math.round(size * ICON_SHARE);
  const { reduceMotionEnabled } = useAccessibilityFlags();
  // 0 = plus shown, 1 = check shown; everything below is derived from
  // this one value, so the two icons can never fall out of sync with
  // each other mid-morph.
  const [progress] = useState(() => new Animated.Value(followed ? 1 : 0));
  // Starts the spring toward `toFollowed`'s value. Called twice for one
  // tap: eagerly from handlePress's own event handler (below), so the
  // morph begins on the very same tick as the tap rather than waiting on
  // a render round trip (setState -> re-render -> commit -> this effect),
  // a round trip that can land a frame or more later than the other
  // direction's when the tap also triggers heavier re-render work
  // elsewhere (owner noticed this specifically toward plus, unfollow,
  // which is also where Home's row-settling logic has more to do); and
  // reactively here, as the source of truth for whenever `followed`
  // changes from anything other than this component's own tap. Calling
  // .start() a second time toward a toValue a running spring is already
  // headed to is harmless, so the two triggers never fight each other.
  const morphTo = useCallback(
    (toFollowed: boolean) => {
      if (reduceMotionEnabled) {
        progress.setValue(toFollowed ? 1 : 0);
        return;
      }
      Animated.spring(progress, {
        toValue: toFollowed ? 1 : 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 260,
        mass: 0.6,
      }).start();
    },
    [reduceMotionEnabled, progress],
  );
  useEffect(() => {
    morphTo(followed);
  }, [followed, morphTo]);
  const plusOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const plusScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.5],
  });
  const checkOpacity = progress;
  const checkScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const handlePress = useCallback(() => {
    const next = !followed;
    followHaptic(next);
    morphTo(next);
    onPress();
  }, [followed, onPress, morphTo]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={followed ? "Followed" : "Follow"}
      accessibilityState={{ selected: followed }}
      onPress={handlePress}
      // A 44pt tap target around the 32pt circle.
      hitSlop={6}
      testID={testID}
    >
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
        testID={`${testID}-circle`}
      >
        <Animated.View
          style={[
            styles.followedShade,
            {
              borderRadius: size / 2,
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, FOLLOWED_SHADE],
              }),
            },
          ]}
          testID={`${testID}-followed-shade`}
        />
        <Animated.View
          style={[
            styles.circleIcon,
            { opacity: plusOpacity, transform: [{ scale: plusScale }] },
          ]}
        >
          <SymbolView
            name={FOLLOW_PLUS_SYMBOL}
            tintColor="#FFFFFF"
            size={iconSize}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.circleIcon,
            { opacity: checkOpacity, transform: [{ scale: checkScale }] },
          ]}
        >
          <SymbolView
            name={FOLLOW_CHECK_SYMBOL}
            tintColor="#FFFFFF"
            size={iconSize}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  followedShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.bg,
  },
  // One material, followed or not; a followed one a little darker
  // (followedShade).
  circle: {
    width: FOLLOW_CIRCLE_SIZE,
    height: FOLLOW_CIRCLE_SIZE,
    borderRadius: FOLLOW_CIRCLE_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    backgroundColor: t.imageControlBackdrop,
    alignItems: "center",
    justifyContent: "center",
  },
  // Both follow-circle icons stack here, absolutely, so their crossfade
  // overlaps instead of the incoming one pushing the outgoing one aside.
  circleIcon: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
