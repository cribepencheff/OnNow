// "Top picks for you" under the Home hero (FR-038, ADR 0016): poster cards
// built from the app's existing components and design tokens. A tap opens
// Show detail; the circle follows at once and the card stays, marked as
// followed, until Refresh shows the next picks.

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

import { IMAGE_BASE } from "@/api/tmdb-types";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { useFollowList } from "@/hooks/useFollowList";
import { useTopPicks } from "@/hooks/useTopPicks";
import type { TopPick } from "@/logic/top-picks";
import { t, type } from "@/theme/tokens";
import { FollowCircle } from "./FollowCircle";

const POSTER_WIDTH = 112;
// Clears the translucent tab bar (83) under the row.
const TAB_BAR_CLEARANCE = 83;

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
          <TopPickCard key={card.tmdbId} card={card} />
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

function TopPickCard({ card }: { card: TopPick }) {
  const router = useRouter();
  const { isFollowed, follow, unfollow } = useFollowList();
  const followed = isFollowed(card.tvmazeId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={card.name}
      accessibilityHint="Opens the show"
      onPress={() =>
        router.push({ pathname: "/show/[id]", params: { id: card.tvmazeId } })
      }
      style={styles.card}
      testID="top-pick-card"
    >
      <View>
        <Image
          source={`${IMAGE_BASE}/w342${card.posterPath}`}
          style={styles.poster}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.follow}>
          <FollowCircle
            followed={followed}
            onPress={() =>
              followed ? unfollow(card.tvmazeId) : follow(card.tvmazeId)
            }
            testID={`top-pick-follow-${card.tvmazeId}`}
          />
        </View>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {card.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: t.space6,
    paddingBottom: TAB_BAR_CLEARANCE + t.space4,
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
  card: {
    width: POSTER_WIDTH,
    gap: t.space2,
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_WIDTH * 1.5,
    borderRadius: t.radiusSm,
    backgroundColor: t.surface,
  },
  follow: {
    position: "absolute",
    top: t.space2,
    right: t.space2,
  },
  name: {
    ...type.meta,
    color: t.inkMuted,
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
