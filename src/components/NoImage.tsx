// What stands in for a show's image when there is none anywhere (CRI-100,
// owner 2026-10-22): a still, dark gradient, so it never reads as a
// skeleton, whose pulse means loading; and "No image" where there is room
// for it. It says the image is missing, never guesses at one. A show
// announced but not out yet often has none.

import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { t, type } from "@/theme/tokens";

const NO_IMAGE_GRADIENT = `linear-gradient(to bottom, ${t.surface} 0%, ${t.bg} 100%)`;

export function NoImage({
  label = true,
  labelTop,
  style,
}: {
  // "No image", or only the surface where the words do not fit (a list's
  // small poster, with the show's name beside it).
  label?: boolean;
  // Where the words sit from the top, when the middle is taken (the
  // hero's pill, title and button).
  labelTop?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[styles.surface, style]}
      testID="no-image"
      accessibilityLabel={label ? "No image" : undefined}
    >
      {label && (
        <Text
          style={[
            styles.label,
            labelTop !== undefined && {
              position: "absolute",
              top: labelTop,
              left: 0,
              right: 0,
            },
          ]}
        >
          No image
        </Text>
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
  label: {
    ...type.meta,
    color: t.inkSubtle,
    textAlign: "center",
  },
});
