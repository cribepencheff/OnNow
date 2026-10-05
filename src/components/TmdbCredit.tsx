// TMDB and JustWatch attribution (spike 0002, NFR-007, CRI-82), shown next
// to the TVmaze credit wherever the Swedish streaming service is used.
// TMDB's terms also ask for its logo; that comes with the Design phase.

import { StyleSheet, Text, View } from "react-native";
import { t } from "@/theme/tokens";

import { JUSTWATCH_CREDIT, TMDB_CREDIT } from "@/api/tmdb-credit";
import { openExternalUrl } from "@/hooks/useGuardedRouter";

export function TmdbCredit() {
  return (
    <View style={styles.container}>
      <Text
        style={styles.credit}
        accessibilityRole="link"
        onPress={() => openExternalUrl(JUSTWATCH_CREDIT.url)}
      >
        {JUSTWATCH_CREDIT.text}
      </Text>
      <Text
        style={styles.credit}
        accessibilityRole="link"
        onPress={() => openExternalUrl(TMDB_CREDIT.url)}
      >
        {TMDB_CREDIT.notice}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  credit: {
    textAlign: "center",
    color: t.inkSubtle,
    fontSize: 12,
  },
});
