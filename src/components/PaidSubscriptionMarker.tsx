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

export function PaidSubscriptionMarker({
  channel,
  iconOnly = false,
  color,
  textStyle,
}: {
  // The subscription the user pays for ("hayu").
  channel: string;
  // Inside a button: the bag alone, the button's label says the rest.
  iconOnly?: boolean;
  color: string;
  textStyle?: TextStyle;
}) {
  const icon = (
    <SymbolView
      name={BAG}
      tintColor={color}
      size={iconOnly ? 16 : 13}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
  if (iconOnly) {
    return icon;
  }
  return (
    <View style={styles.row} testID="paid-subscription-marker">
      {icon}
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
