// The control under a poster row (FR-038, FR-039, CRI-123, CRI-127):
// "Refresh" while shows are left, "Start over" at the end of the row's
// pool, nothing when the pool holds no more shows than the row shows. In a
// slot of one fixed height, so the page never moves. While a refresh runs
// its icon turns, at least one full turn even when the next batch is
// already prepared, and further taps are ignored.

import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";

import { useAccessibilityFlags } from "@/hooks/useAccessibilityFlags";
import type { BatchControl } from "@/logic/poster-batches";
import { t, type } from "@/theme/tokens";

// The slot's height in every state, so the page never moves.
export const ROW_CONTROL_HEIGHT = 36;
// One full turn of the icon.
const TURN_MS = 700;

export function RowRefresh({
  control,
  onPress,
  isRefreshing,
  refreshHint,
  testID,
}: {
  // null: hidden, the slot kept.
  control: BatchControl | null;
  onPress: () => Promise<void>;
  isRefreshing: boolean;
  // What Refresh brings, for screen readers ("Shows the next top picks").
  refreshHint: string;
  testID: string;
}) {
  const { reduceMotionEnabled } = useAccessibilityFlags();
  // From the tap until onPress is done (the row's data checked for age),
  // before the next batch itself is loading (isRefreshing).
  const [pending, setPending] = useState(false);
  // The icon is mid-turn; it finishes the turn it is on.
  const [turning, setTurning] = useState(false);
  const busy = pending || isRefreshing;
  // Read when a turn ends, to decide whether to turn again.
  const busyRef = useRef(busy);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const [rotation] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!turning) {
      return;
    }
    let stopped = false;
    let turn: Animated.CompositeAnimation | null = null;
    function turnOnce() {
      rotation.setValue(0);
      turn = Animated.timing(rotation, {
        toValue: 1,
        duration: TURN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      turn.start(({ finished }) => {
        if (stopped) {
          return;
        }
        if (finished && busyRef.current) {
          turnOnce();
        } else {
          rotation.setValue(0);
          setTurning(false);
        }
      });
    }
    turnOnce();
    return () => {
      stopped = true;
      turn?.stop();
    };
  }, [turning, rotation]);

  if (control === null) {
    return <View style={styles.slot} testID={`${testID}-hidden`} />;
  }

  const startOver = control === "startOver";
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    // Start over turns back, the way its arrow points.
    outputRange: ["0deg", startOver ? "-360deg" : "360deg"],
  });

  async function handlePress() {
    if (busy || turning) {
      return;
    }
    setPending(true);
    if (!reduceMotionEnabled) {
      setTurning(true);
    }
    try {
      await onPress();
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.slot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={startOver ? "Start over" : "Refresh"}
        accessibilityHint={
          startOver ? "Shows the first ones again" : refreshHint
        }
        accessibilityState={{ busy: busy || turning }}
        onPress={handlePress}
        hitSlop={8}
        style={styles.control}
        testID={testID}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <SymbolView
            name={
              startOver
                ? {
                    ios: "arrow.counterclockwise",
                    android: "restart_alt",
                    web: "restart_alt",
                  }
                : { ios: "arrow.clockwise", android: "refresh", web: "refresh" }
            }
            tintColor={t.inkMuted}
            size={14}
          />
        </Animated.View>
        <Text style={styles.label}>{startOver ? "Start over" : "Refresh"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: ROW_CONTROL_HEIGHT,
  },
  // Quiet, like the meta line: a small control, not a primary action.
  control: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: t.space2,
    height: ROW_CONTROL_HEIGHT,
    marginHorizontal: t.space4,
  },
  label: {
    ...type.meta,
    color: t.inkMuted,
  },
});
