// "Top picks for you" under the Home hero (FR-038, ADR 0016). A card
// followed from the row stays, marked, until Refresh shows the next picks.

import { Pressable, StyleSheet, Text } from "react-native";
import { SymbolView } from "expo-symbols";

import type { TvMazeShow } from "@/api/tvmaze-types";
import { useTopPicks } from "@/hooks/useTopPicks";
import { t, type } from "@/theme/tokens";
import { HomeRow } from "./HomeRow";
import { ShowCard } from "./ShowCard";

export function TopPicksRow({
  followedShows,
}: {
  followedShows: TvMazeShow[];
}) {
  const { cards, isLoading, refresh, isRefreshing } =
    useTopPicks(followedShows);

  return (
    <HomeRow
      title="Top picks for you"
      isLoading={isLoading}
      hasCards={cards.length > 0}
      testID="top-picks-row"
      footer={
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
            name={{
              ios: "arrow.clockwise",
              android: "refresh",
              web: "refresh",
            }}
            tintColor={t.inkMuted}
            size={14}
          />
          <Text style={styles.refreshLabel}>Refresh</Text>
        </Pressable>
      }
    >
      {cards.map((card) => (
        <ShowCard key={card.tmdbId} card={card} testID="top-pick" />
      ))}
    </HomeRow>
  );
}

const styles = StyleSheet.create({
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
