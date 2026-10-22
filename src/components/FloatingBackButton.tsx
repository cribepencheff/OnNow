// Show detail's back button (CRI-129, owner 2026-10-22; Apple TV and
// Instagram as references): a round glass button floating over the
// backdrop, at the top left in the header's bar, in the material of the
// hero's date pill (a background blur, image-control-backdrop, the
// image-control-edge hairline). It stays put while the page scrolls, so
// back is always at hand; the edge swipe back works as ever.

import { Pressable, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { HEADER_BAR_HEIGHT } from "@/logic/header";
import { t } from "@/theme/tokens";
import { ImageControlMaterial } from "./ImageControlMaterial";

const SIZE = 44;

export function FloatingBackButton() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={() => router.back()}
      hitSlop={8}
      style={[
        styles.place,
        { top: insets.top + (HEADER_BAR_HEIGHT - SIZE) / 2 },
      ]}
    >
      <View style={styles.circle} testID="floating-back">
        <ImageControlMaterial />
        <SymbolView
          name={{
            ios: "chevron.left",
            android: "arrow_back",
            web: "arrow_back",
          }}
          tintColor={t.ink}
          size={20}
          weight="semibold"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  place: {
    position: "absolute",
    left: t.headerInset,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
