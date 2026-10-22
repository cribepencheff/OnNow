// What stands in for a show's image when there is none anywhere (CRI-100,
// owner 2026-10-22): a still, dark gradient, so it never reads as a
// skeleton, whose pulse means loading. Never a guess at a picture. On a
// small poster (a list's, beside the show's name) it also has the "no
// image" symbol; a large one (the hero) has the slide's own title and
// button over it, which say enough. A show announced but not out yet
// often has no image.

import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { t } from "@/theme/tokens";

const NO_IMAGE_GRADIENT = `linear-gradient(to bottom, ${t.surface} 0%, ${t.bg} 100%)`;
const ICON_SIZE = 22;
const ICON_OPACITY = 0.5;
const PHOTO_SLASH = "photo.slash" as ComponentProps<typeof SymbolView>["name"];

export function NoImage({
  icon = false,
  style,
}: {
  icon?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[styles.surface, icon && styles.edge, style]}
      testID="no-image"
      accessibilityLabel={icon ? "No image" : undefined}
    >
      {icon && (
        <SymbolView
          // photo.slash is iOS 27's (SF Symbols 8), newer than expo-symbols'
          // own list of names, hence the cast; earlier systems draw photo.
          name={PHOTO_SLASH}
          fallback={
            <SymbolView
              name="photo"
              size={ICON_SIZE}
              tintColor={t.inkSubtle}
              style={styles.icon}
              testID="no-image-icon"
            />
          }
          size={ICON_SIZE}
          tintColor={t.inkSubtle}
          style={styles.icon}
          testID="no-image-icon"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    experimental_backgroundImage: NO_IMAGE_GRADIENT,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  // A small poster's hairline edge, as on the poster cards and the
  // skeleton cards (owner).
  edge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
  },
  // Dimmed under ink-subtle (owner): it marks the place, quieter than the
  // row's text.
  icon: {
    opacity: ICON_OPACITY,
  },
});
