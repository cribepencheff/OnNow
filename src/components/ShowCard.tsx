// A poster card for Home's rows (FR-038, FR-039), built from the app's
// existing components and design tokens. A tap opens Show detail; the
// Search follow circle follows at once.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { IMAGE_BASE } from "@/api/tmdb-types";
import { useFollowList } from "@/hooks/useFollowList";
import type { TopPick } from "@/logic/top-picks";
import { t, type } from "@/theme/tokens";
import { FollowCircle } from "./FollowCircle";

const POSTER_WIDTH = 112;

export function ShowCard({
  card,
  caption,
  testID,
}: {
  card: TopPick;
  // A short line under the name, for example the next episode's day.
  caption?: string | null;
  testID: string;
}) {
  const router = useRouter();
  const { isFollowed, follow, unfollow } = useFollowList();
  const followed = isFollowed(card.tvmazeId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption ? `${card.name}, ${caption}` : card.name}
      accessibilityHint="Opens the show"
      onPress={() =>
        router.push({ pathname: "/show/[id]", params: { id: card.tvmazeId } })
      }
      style={styles.card}
      testID={testID}
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
            testID={`${testID}-follow-${card.tvmazeId}`}
          />
        </View>
      </View>
      <View>
        <Text style={styles.name} numberOfLines={2}>
          {card.name}
        </Text>
        {caption && <Text style={styles.caption}>{caption}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  caption: {
    ...type.label,
    color: t.ink,
  },
});
