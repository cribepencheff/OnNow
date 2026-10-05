// A poster card for the poster rows on Home and in Search (FR-038, FR-039,
// FR-026), built from the app's existing components and design tokens. A
// tap opens Show detail (inside the sheet when shown in Search, PRD 5.6);
// the Search follow circle follows at once.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { IMAGE_BASE } from "@/api/tmdb-types";
import { useFollowToggle } from "@/hooks/useFollowList";
import type { PosterItem } from "@/logic/top-picks";
import { t, type } from "@/theme/tokens";
import { FollowCircle } from "./FollowCircle";

const POSTER_WIDTH = 112;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
// A card at its tallest: poster, two name lines and the caption line. A
// row reserves this while it loads, so nothing moves when it appears.
// Where a tap opens Show detail: on top of the tabs, or inside the Search
// sheet with a back arrow to it (PRD 5.6).
export type DetailPathname = "/show/[id]" | "/search/show/[id]";

export const CARD_HEIGHT =
  POSTER_HEIGHT + t.space2 + 2 * type.meta.lineHeight + type.label.lineHeight;

export function ShowCard({
  card,
  caption,
  testID,
  detailPathname = "/show/[id]",
}: {
  card: PosterItem;
  // A short line under the name, for example the next episode's day.
  caption?: string | null;
  testID: string;
  detailPathname?: DetailPathname;
}) {
  const router = useRouter();
  const { followed, toggle } = useFollowToggle(card.tvmazeId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption ? `${card.name}, ${caption}` : card.name}
      accessibilityHint="Opens the show"
      onPress={() =>
        router.push({ pathname: detailPathname, params: { id: card.tvmazeId } })
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
            onPress={toggle}
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
    height: POSTER_HEIGHT,
    borderRadius: t.radiusSm,
    backgroundColor: t.surface,
  },
  // On the image-control backdrop, so it reads on light posters too.
  follow: {
    position: "absolute",
    top: t.space2,
    right: t.space2,
    borderRadius: t.radiusPill,
    padding: 2,
    backgroundColor: t.imageControlBackdrop,
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
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
