// OMDb attribution (CRI-87, ADR 0013, NFR-007), in the same quiet style as
// the TMDB and JustWatch credits.

import { Linking, StyleSheet, Text } from "react-native";
import { t } from "@/theme/tokens";

import { OMDB_CREDIT } from "@/api/omdb-credit";

export function OmdbCredit() {
  return (
    <Text
      style={styles.credit}
      accessibilityRole="link"
      onPress={() => Linking.openURL(OMDB_CREDIT.url)}
    >
      {OMDB_CREDIT.text}
    </Text>
  );
}

const styles = StyleSheet.create({
  credit: {
    textAlign: "center",
    color: t.inkSubtle,
    fontSize: 12,
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
});
