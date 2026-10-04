// "Recommended for you" under the Home hero (FR-038, ADR 0016): poster
// cards built from the app's tokens and the Search follow circle. A tap
// opens Show detail; the circle follows at once, no confirmation.

import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { IMAGE_BASE } from "@/api/tmdb-types";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { useFollowList } from "@/hooks/useFollowList";
import {
  useRecommendations,
  type RecommendedShow,
} from "@/hooks/useRecommendations";
import { t, type } from "@/theme/tokens";
import { FollowCircle } from "./FollowCircle";

const POSTER_WIDTH = 112;
// Clears the translucent tab bar (83) under the row.
const TAB_BAR_CLEARANCE = 83;

export function RecommendedRow({
  followedShows,
}: {
  followedShows: TvMazeShow[];
}) {
  // Followed from the row this session: kept in it, shown as followed.
  const [kept, setKept] = useState<ReadonlySet<number>>(() => new Set());
  const shows = useRecommendations(followedShows, kept);
  const keep = useCallback(
    (tmdbId: number) => setKept((current) => new Set(current).add(tmdbId)),
    [],
  );

  if (shows.length === 0) {
    return null;
  }
  return (
    <View style={styles.section} testID="recommended-row">
      <Text style={styles.heading} accessibilityRole="header">
        Recommended for you
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cards}
      >
        {shows.map((show) => (
          <RecommendedCard key={show.tmdbId} show={show} onFollow={keep} />
        ))}
      </ScrollView>
    </View>
  );
}

function RecommendedCard({
  show,
  onFollow,
}: {
  show: RecommendedShow;
  onFollow: (tmdbId: number) => void;
}) {
  const router = useRouter();
  const { isFollowed, follow, unfollow } = useFollowList();
  const followed = isFollowed(show.tvmazeId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={show.name}
      accessibilityHint="Opens the show"
      onPress={() =>
        router.push({ pathname: "/show/[id]", params: { id: show.tvmazeId } })
      }
      style={styles.card}
      testID="recommended-card"
    >
      <View>
        <Image
          source={`${IMAGE_BASE}/w342${show.posterPath}`}
          style={styles.poster}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.follow}>
          <FollowCircle
            followed={followed}
            onPress={() => {
              if (followed) {
                unfollow(show.tvmazeId);
              } else {
                onFollow(show.tmdbId);
                follow(show.tvmazeId);
              }
            }}
            testID={`recommended-follow-${show.tvmazeId}`}
          />
        </View>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {show.name}
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
});
