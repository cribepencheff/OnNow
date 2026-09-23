// TVmaze data attribution (ADR 0005, NFR-007, CC BY-SA), prepared in
// CRI-61. Rendered at the bottom of any list built from TVmaze data.

import { Linking, StyleSheet, Text } from "react-native";

import { TVMAZE_CREDIT } from "@/api/tvmaze-credit";

export function TvMazeCredit() {
  return (
    <Text
      style={styles.credit}
      accessibilityRole="link"
      onPress={() => Linking.openURL(TVMAZE_CREDIT.url)}
    >
      {TVMAZE_CREDIT.text}
    </Text>
  );
}

const styles = StyleSheet.create({
  credit: {
    textAlign: "center",
    color: "#999999",
    fontSize: 12,
    paddingVertical: 24,
  },
});
