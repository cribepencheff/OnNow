// "Top picks for you" under the Home hero (FR-038, ADR 0016). A card
// followed from the row stays, marked, until Refresh shows the next picks.

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import type { TvMazeShow } from "@/api/tvmaze-types";
import { useTopPicks } from "@/hooks/useTopPicks";
import { t, type } from "@/theme/tokens";
import { ShowCard } from "./ShowCard";

export function TopPicksRow({
  followedShows,
}: {
  followedShows: TvMazeShow[];
}) {
  const { cards, refresh, isRefreshing } = useTopPicks(followedShows);

  if (cards.length === 0) {
    return null;
  }
  return (
    <View style={styles.section} testID="top-picks-row">
      <Text style={styles.heading} accessibilityRole="header">
        Top picks for you
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cards}
      >
        {cards.map((card) => (
          <ShowCard key={card.tmdbId} card={card} testID="top-pick" />
        ))}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh"
        accessibilityHint="Shows the next top picks"
        accessibilityState={{ busy: isRefreshing }}
        disabled={isRefreshing}
        onPress={refresh}
        hitSlop={8}
        style={styles.refresh}
        testID="top-picks-refresh"
      >
        <SymbolView
          name={{ ios: "arrow.clockwise", android: "refresh", web: "refresh" }}
          tintColor={t.inkMuted}
          size={14}
        />
        <Text style={styles.refreshLabel}>Refresh</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: t.space6,
    gap: t.space2,
  },
  heading: {
    ...type.headline,
    color: t.ink,
    paddingHorizontal: t.space4,
  },
  cards: {
    paddingHorizontal: t.space4,
    gap: t.space2,
  },
  // Quiet, like the meta line: a small control, not a primary action.
  refresh: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: t.space2,
    marginHorizontal: t.space4,
    paddingVertical: t.space2,
  },
  refreshLabel: {
    ...type.meta,
    color: t.inkMuted,
  },
});
