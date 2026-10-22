// The show's IMDb rating on its poster (owner, 2026-10-22): the number
// alone, no "IMDb" and no star, on a darker fill than the follow circle's
// with its light hairline edge, so it reads as the show's and pairs with
// the circle. Nothing without a rating. Search rows only: in Shows, every
// followed show would ask OMDb, whose free key is shared by every user
// (CRI-116). Screen readers hear "IMDb rating 8.2".

import { StyleSheet, Text, View } from "react-native";

import type { TvMazeShow } from "@/api/tvmaze-types";
import { useImdbRating } from "@/hooks/useImdbRating";
import { t } from "@/theme/tokens";

const HEIGHT = 20;
// The page's bg at 80%, darker than the follow circle's 55% (owner).
export const POSTER_RATING_FILL = "rgba(11, 12, 15, 0.8)";

export function PosterRating({ show }: { show: TvMazeShow }) {
  const { data: rating } = useImdbRating(show);
  if (!rating) {
    return null;
  }
  return (
    <View
      style={styles.pill}
      accessible
      accessibilityLabel={`IMDb rating ${rating}`}
      testID="poster-rating"
    >
      <Text style={styles.rating}>{rating}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    justifyContent: "center",
    height: HEIGHT,
    paddingHorizontal: 6,
    borderRadius: HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    backgroundColor: POSTER_RATING_FILL,
  },
  rating: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "600",
    color: t.ink,
    fontVariant: ["tabular-nums"],
  },
});
