// The round close button (X) that closes the Search sheet (PRD 5.4, 5.6,
// FR-007, CRI-77), next to the search field. Show detail inside the sheet
// has only a back arrow; a swipe down closes the sheet from there.

import { Pressable, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";

import { t } from "@/theme/tokens";

interface CloseButtonProps {
  onPress: () => void;
  testID?: string;
}

const CLOSE_BUTTON_SIZE = 32;

export function CloseButton({ onPress, testID }: CloseButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      onPress={onPress}
      hitSlop={8}
      style={styles.closeButton}
      testID={testID}
    >
      <SymbolView
        name={{ ios: "xmark", android: "close", web: "close" }}
        tintColor={t.inkMuted}
        size={14}
        weight="semibold"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    borderRadius: CLOSE_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    // A quiet round button (design system).
    backgroundColor: t.surfaceRaised,
  },
});
