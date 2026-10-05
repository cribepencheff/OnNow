// The quiet "Refresh" control under a poster row (FR-038, FR-039,
// CRI-123): the next page of the row. Busy while that page loads.

import { Pressable, StyleSheet, Text } from "react-native";
import { SymbolView } from "expo-symbols";

import { t, type } from "@/theme/tokens";

export function RowRefresh({
  onPress,
  isRefreshing,
  accessibilityHint,
  testID,
}: {
  onPress: () => void;
  isRefreshing: boolean;
  accessibilityHint: string;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Refresh"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: isRefreshing }}
      disabled={isRefreshing}
      onPress={onPress}
      hitSlop={8}
      style={styles.refresh}
      testID={testID}
    >
      <SymbolView
        name={{
          ios: "arrow.clockwise",
          android: "refresh",
          web: "refresh",
        }}
        tintColor={t.inkMuted}
        size={14}
      />
      <Text style={styles.refreshLabel}>Refresh</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Quiet, like the meta line: a small control, not a primary action.
  refresh: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: t.space2,
    marginHorizontal: t.space4,
    paddingVertical: t.space2,
  },
  refreshLabel: {
    ...type.meta,
    color: t.inkMuted,
  },
});
