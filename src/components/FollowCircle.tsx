// The follow control at the right edge of a Search result row (PRD 5.4,
// FR-002). Not followed: hollow circle with a "+" at lower opacity.
// Followed: filled with the accent color and a check, with light haptic
// feedback. A status, not a competing action: "Done" stays the one primary
// action in the view.

import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";

import { accent } from "@/theme/color";

interface FollowCircleProps {
  followed: boolean;
  onPress: () => void;
}

const CIRCLE_SIZE = 32;

export function FollowCircle({ followed, onPress }: FollowCircleProps) {
  const handlePress = useCallback(() => {
    if (!followed) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [followed, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={followed ? "Followed" : "Follow"}
      accessibilityState={{ selected: followed }}
      onPress={handlePress}
      hitSlop={8}
    >
      <View
        style={[
          styles.circle,
          followed ? styles.circleFilled : styles.circleHollow,
        ]}
      >
        <SymbolView
          name={{
            ios: followed ? "checkmark" : "plus",
            android: followed ? "check" : "add",
            web: followed ? "check" : "add",
          }}
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
