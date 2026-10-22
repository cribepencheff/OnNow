// The show's IMDb rating on its poster (owner, 2026-10-22): a star and the
// number, no "IMDb", in the follow circle's material (a translucent dark
// fill and a light hairline edge), so it reads as the show's and pairs with
// the circle. Nothing without a rating. Search rows only: in Shows, every
// followed show would ask OMDb, whose free key is shared by every user
// (CRI-116). Screen readers hear "IMDb rating 8.2".

import { StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import type { TvMazeShow } from "@/api/tvmaze-types";
import { useImdbRating } from "@/hooks/useImdbRating";
import { t } from "@/theme/tokens";

const HEIGHT = 20;
const STAR_SIZE = 9;

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
      <SymbolView name="star.fill" size={STAR_SIZE} tintColor={t.ink} />
      <Text style={styles.rating}>{rating}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: HEIGHT,
    paddingHorizontal: 6,
    borderRadius: HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    backgroundColor: t.imageControlBackdrop,
  },
  rating: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "600",
    color: t.ink,
    fontVariant: ["tabular-nums"],
  },
});
