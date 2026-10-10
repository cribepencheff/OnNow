// Brings a poster row in and out with an animated height (CRI-125): from
// nothing to the row's full height when it gets content, and back when it
// has none, so the page grows and shrinks smoothly instead of jumping. The
// row's height is known in advance (posterRowHeight), every part of it has
// a fixed size. Under Reduce Motion it appears and goes at once.

import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing } from "react-native";

import { useAccessibilityFlags } from "@/hooks/useAccessibilityFlags";

const PRESENCE_MS = 300;

export function RowPresence({
  shown,
  height,
  testID,
  children,
}: {
  shown: boolean;
  // The row's full height.
  height: number;
  testID: string;
  children: ReactNode;
}) {
  const { reduceMotionEnabled } = useAccessibilityFlags();
  // Shown from the first render without an animation (cached content).
  const [animatedHeight] = useState(
    () => new Animated.Value(shown ? height : 0),
  );
  // The row stays rendered while it closes, then goes.
  const [rendered, setRendered] = useState(shown);
  if (shown && !rendered) {
    setRendered(true);
  }

  useEffect(() => {
    const to = shown ? height : 0;
    if (reduceMotionEnabled) {
      animatedHeight.setValue(to);
      return;
    }
    const change = Animated.timing(animatedHeight, {
      toValue: to,
      duration: PRESENCE_MS,
      easing: Easing.out(Easing.cubic),
      // Height is layout, which the native driver cannot animate.
      useNativeDriver: false,
    });
    change.start(({ finished }) => {
      if (finished && !shown) {
        setRendered(false);
      }
    });
    return () => change.stop();
  }, [shown, height, reduceMotionEnabled, animatedHeight]);

  return (
    <Animated.View
      style={{ height: animatedHeight, overflow: "hidden" }}
      testID={testID}
    >
      {/* Under Reduce Motion nothing closes, so it follows `shown`. */}
      {(reduceMotionEnabled ? shown : rendered) ? children : null}
    </Animated.View>
  );
}
