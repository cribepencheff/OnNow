// The control under a poster row (FR-038, FR-039, CRI-123, CRI-127):
// "Refresh" while shows are left, "Start over" at the end of the row's
// pool, nothing when the pool holds no more shows than the row shows. In a
// slot of one fixed height, so the page never moves. While a refresh runs
// its icon gives way to a spinner (symmetrical, so it turns in place, which
// the arrow does not), shown for at least one turn even when the next
// batch is already prepared; further taps are ignored meanwhile.

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";

import type { BatchControl } from "@/logic/poster-batches";
import { t, type } from "@/theme/tokens";

// The slot's height in every state, so the page never moves.
export const ROW_CONTROL_HEIGHT = 36;
// The shortest time the spinner shows: about one turn.
const MIN_SPIN_MS = 700;
// The icon's box: the spinner's size, so the label never moves.
const ICON_BOX = 20;

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
  // From the tap until onPress is done (the row's data checked for age),
  // before the next batch itself is loading (isRefreshing).
  const [pending, setPending] = useState(false);
  // The spinner's shortest showing has not passed yet.
  const [minSpinning, setMinSpinning] = useState(false);
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (minTimer.current) {
        clearTimeout(minTimer.current);
      }
    },
    [],
  );
  const spinning = pending || isRefreshing || minSpinning;

  if (control === null) {
    return <View style={styles.slot} testID={`${testID}-hidden`} />;
  }

  const startOver = control === "startOver";

  async function handlePress() {
    if (spinning) {
      return;
    }
    setPending(true);
    setMinSpinning(true);
    minTimer.current = setTimeout(() => setMinSpinning(false), MIN_SPIN_MS);
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
        accessibilityState={{ busy: spinning }}
        onPress={handlePress}
        hitSlop={8}
        style={styles.control}
        testID={testID}
      >
        <View style={styles.icon}>
          {spinning ? (
            <ActivityIndicator
              size="small"
              color={t.inkMuted}
              testID={`${testID}-spinner`}
            />
          ) : (
            <SymbolView
              name={
                startOver
                  ? {
                      ios: "arrow.counterclockwise",
                      android: "restart_alt",
                      web: "restart_alt",
                    }
                  : {
                      ios: "arrow.clockwise",
                      android: "refresh",
                      web: "refresh",
                    }
              }
              tintColor={t.inkMuted}
              size={14}
            />
          )}
        </View>
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
  icon: {
    width: ICON_BOX,
    height: ICON_BOX,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...type.meta,
    color: t.inkMuted,
  },
});
