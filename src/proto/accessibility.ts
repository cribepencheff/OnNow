// PROTOTYPE (proto/home-backdrop, not for merge): Reduce Motion and
// VoiceOver state, shared by the hero carousel and the "+" button. Both
// come from React Native's built-in AccessibilityInfo, no new dependency.

import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export interface AccessibilityFlags {
  reduceMotionEnabled: boolean;
  screenReaderEnabled: boolean;
}

export function useAccessibilityFlags(): AccessibilityFlags {
  const [flags, setFlags] = useState<AccessibilityFlags>({
    reduceMotionEnabled: false,
    screenReaderEnabled: false,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      AccessibilityInfo.isReduceMotionEnabled(),
      AccessibilityInfo.isScreenReaderEnabled(),
    ]).then(([reduceMotionEnabled, screenReaderEnabled]) => {
      if (!cancelled) {
        setFlags({ reduceMotionEnabled, screenReaderEnabled });
      }
    });

    const reduceMotionSub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (reduceMotionEnabled) =>
        setFlags((current) => ({ ...current, reduceMotionEnabled })),
    );
    const screenReaderSub = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (screenReaderEnabled) =>
        setFlags((current) => ({ ...current, screenReaderEnabled })),
    );

    return () => {
      cancelled = true;
      reduceMotionSub.remove();
      screenReaderSub.remove();
    };
  }, []);

  return flags;
}
