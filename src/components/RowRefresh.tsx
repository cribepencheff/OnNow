// The control under a poster row (FR-038, FR-039, CRI-123): "Refresh"
// while shows are left, "Start over" at the end of the row's pool. Always
// a button, always there, in a slot of one fixed height. Busy while the
// next batch loads.

import { Pressable, StyleSheet, Text } from "react-native";
import { SymbolView } from "expo-symbols";

import type { BatchControl } from "@/logic/poster-batches";
import { t, type } from "@/theme/tokens";

// The slot's height in every state, so the page never moves.
export const ROW_CONTROL_HEIGHT = 36;

export function RowRefresh({
  control,
  onPress,
  isRefreshing,
  refreshHint,
  testID,
}: {
  control: BatchControl;
  onPress: () => void;
  isRefreshing: boolean;
  // What Refresh brings, for screen readers ("Shows the next top picks").
  refreshHint: string;
  testID: string;
}) {
  const startOver = control === "startOver";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={startOver ? "Start over" : "Refresh"}
      accessibilityHint={startOver ? "Shows the first ones again" : refreshHint}
      accessibilityState={{ busy: isRefreshing }}
      disabled={isRefreshing}
      onPress={onPress}
      hitSlop={8}
      style={styles.control}
      testID={testID}
    >
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
      <Text style={styles.label}>{startOver ? "Start over" : "Refresh"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
