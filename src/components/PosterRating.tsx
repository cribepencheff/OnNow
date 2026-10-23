// The show's rating on its poster (owner, 2026-10-22): TVmaze's (ADR 0018),
// in the search result already, so it costs no request; the same number as
// Show detail's. The number alone, on a darker fill than the follow
// circle's with its light hairline edge, so it reads as the show's and
// pairs with the circle. Nothing without a rating. Screen readers hear
// "TVmaze rating 8.0".

import { StyleSheet, Text, View } from "react-native";

import type { TvMazeShow } from "@/api/tvmaze-types";
import { tvmazeRating } from "@/logic/show-rating";
import { t } from "@/theme/tokens";

const HEIGHT = 20;
// The page's bg at 80%, darker than the follow circle's 55% (owner).
export const POSTER_RATING_FILL = "rgba(11, 12, 15, 0.8)";

export function PosterRating({ show }: { show: TvMazeShow }) {
  const rating = tvmazeRating(show);
  if (!rating) {
    return null;
  }
  return (
    <View
      style={styles.pill}
      accessible
      accessibilityLabel={`TVmaze rating ${rating}`}
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
