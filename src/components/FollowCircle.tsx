// The follow control at the right edge of a Search result row (PRD 5.4,
// FR-002). Not followed: hollow circle with a "+" at lower opacity.
// Followed: filled with the accent color and a check. The follow haptic
// is shared by every follow control (followHaptic). The filled state is a
// status, not a competing action.

import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { accent } from "@/theme/color";
import { followHaptic } from "./followHaptic";
import { followSymbol } from "./followSymbols";

interface FollowCircleProps {
  followed: boolean;
  onPress: () => void;
  testID?: string;
}

const CIRCLE_SIZE = 32;

export function FollowCircle({ followed, onPress, testID }: FollowCircleProps) {
  const handlePress = useCallback(() => {
    followHaptic(!followed);
    onPress();
  }, [followed, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={followed ? "Followed" : "Follow"}
      accessibilityState={{ selected: followed }}
      onPress={handlePress}
      hitSlop={16}
      testID={testID}
    >
      <View
        style={[
          styles.circle,
          followed ? styles.circleFilled : styles.circleHollow,
        ]}
      >
        <SymbolView
          name={followSymbol(followed)}
          tintColor={followed ? "#FFFFFF" : accent}
          size={16}
          style={followed ? undefined : styles.plusIcon}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  circleHollow: {
    borderWidth: 1.5,
    borderColor: accent,
    backgroundColor: "transparent",
  },
  circleFilled: {
    backgroundColor: accent,
  },
  plusIcon: {
    opacity: 0.6,
  },
});
