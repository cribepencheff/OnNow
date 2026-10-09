// The search button in the header's right slot on Home (CRI-124): a round
// control in the date pill's material, with a white search icon. Opens the
// Search sheet (FR-007).

import { Pressable, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";

import { t } from "@/theme/tokens";
import { ImageControlMaterial } from "./ImageControlMaterial";

const SIZE = 36;

export function SearchButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search"
      accessibilityHint="Opens Search"
      onPress={onPress}
      // A 44pt tap target around the 36pt circle.
      hitSlop={4}
      style={styles.button}
      testID="home-search"
    >
      <ImageControlMaterial />
      <SymbolView
        name={{ ios: "magnifyingglass", android: "search", web: "search" }}
        tintColor="#FFFFFF"
        size={17}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    // Clips the blur to the circle.
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
