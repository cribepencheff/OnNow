// The round close button (X) that closes the Search sheet (PRD 5.4, 5.6,
// FR-007, CRI-77). Shared by the Search results and by Show detail opened
// inside the sheet (CRI-79), where it still closes all of Search.

import { Pressable, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";

interface CloseButtonProps {
  onPress: () => void;
  testID?: string;
}

const CLOSE_BUTTON_SIZE = 32;
const CLOSE_ICON_COLOR = "#666666";

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
        tintColor={CLOSE_ICON_COLOR}
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
    backgroundColor: "#F0F0F0",
  },
});
