// A small text pill to tap: the card follow circle's material, neutral and
// solid, no blur. "Search more" at the end of Top picks on Home (CRI-131)
// and "More" in Show detail's About panel (CRI-143). Small, so it fits on
// a title's line; a hit area of at least 44.

import { Pressable, StyleSheet, Text } from "react-native";

import { t, type } from "@/theme/tokens";

export const PILL_BUTTON_HEIGHT = 22;
const HIT_SLOP = (44 - PILL_BUTTON_HEIGHT) / 2;

export function PillButton({
  label,
  onPress,
  disabled,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      style={styles.pill}
      testID={testID}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: PILL_BUTTON_HEIGHT,
    maxWidth: "100%",
    paddingHorizontal: 10,
    borderRadius: PILL_BUTTON_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    backgroundColor: t.surfaceRaised,
    justifyContent: "center",
  },
  // The label size, regular weight and no letter spacing: lighter than a
  // title, and centred in the pill.
  label: {
    fontSize: type.label.fontSize,
    lineHeight: type.label.lineHeight,
    fontWeight: "400",
    color: t.ink,
  },
});
