// Marks a service that needs an extra paid subscription, such as an add-on
// channel inside Prime Video, Apple TV or Roku (CRI-90, ADR 0004). A
// generic bag symbol from our icon set, never a store's own mark.

import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View, type TextStyle } from "react-native";

const BAG = {
  ios: "bag",
  android: "shopping_bag",
  web: "shopping_bag",
} as const;

// The line under an add-on's "Open in" button; the button itself has no bag
// (CRI-101). Screen readers get it from the button's label.
export function PaidSubscriptionMarker({
  channel,
  color,
  textStyle,
}: {
  // The subscription the user pays for ("hayu").
  channel: string;
  color: string;
  textStyle?: TextStyle;
}) {
  return (
    <View style={styles.row} testID="paid-subscription-marker">
      <SymbolView
        name={BAG}
        tintColor={color}
        size={13}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={textStyle}>{`Requires ${channel} subscription`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
