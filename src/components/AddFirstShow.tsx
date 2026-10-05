// The empty follow list on Home and Shows (FR-013, PRD 5.3): a short line
// and an accent button that opens Search (FR-007).

import { Pressable, StyleSheet, Text, View } from "react-native";

import { t, type } from "@/theme/tokens";

export function AddFirstShow({
  onPress,
  testID,
  buttonTestID,
}: {
  onPress: () => void;
  testID: string;
  buttonTestID: string;
}) {
  return (
    <View style={styles.emptyState} testID={testID}>
      <Text style={styles.prompt}>
        Follow your shows to see what comes out today.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add your first show"
        onPress={onPress}
        style={styles.button}
        testID={buttonTestID}
      >
        <Text style={styles.buttonLabel}>Add your first show</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: t.space4,
    paddingHorizontal: t.space10,
  },
  prompt: {
    ...type.body,
    color: t.inkMuted,
    textAlign: "center",
  },
  // The primary action of a plain screen: accent, on-accent text.
  button: {
    paddingHorizontal: t.space6,
    paddingVertical: 12,
    borderRadius: t.radiusPill,
    backgroundColor: t.accent,
  },
  buttonLabel: {
    ...type.body,
    fontWeight: "600",
    color: t.onAccent,
  },
});
