// CRI-87, ADR 0013: the IMDb rating from OMDb, linking to the title on
// IMDb. Nothing at all without a rating. Shared by Show detail and the Home hero.

import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
} from "react-native";

import type { TvMazeShow } from "@/api/tvmaze-types";
import { openExternalUrl } from "@/hooks/useGuardedRouter";
import { useImdbRating } from "@/hooks/useImdbRating";
import { imdbTitleUrl } from "@/logic/imdb-rating";
import { t } from "@/theme/tokens";

// The mark's fixed height: line height, padding and border. The Home hero
// reserves it on every slide.
const MARK_LINE_HEIGHT = 14;
export const IMDB_CHIP_HEIGHT = MARK_LINE_HEIGHT + 2 * 2 + 2 * 1;

export function ImdbRating({
  show,
  textStyle,
  variant = "mark",
}: {
  show: TvMazeShow;
  textStyle?: StyleProp<TextStyle>;
  // "mark": the IMDb mark, then the rating beside it (Show detail).
  // "chip": "IMDb 8.3" inside one chip, IMDB_CHIP_HEIGHT tall (the Home
  // hero, CRI-124).
  variant?: "mark" | "chip";
}) {
  const { data: rating, imdbId } = useImdbRating(show);
  if (!rating || !imdbId) {
    return null;
  }
  if (variant === "chip") {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`IMDb rating ${rating}`}
        accessibilityHint="Opens the show on IMDb"
        onPress={() => openExternalUrl(imdbTitleUrl(imdbId))}
        hitSlop={12}
        style={styles.chip}
        testID="imdb-rating"
      >
        <Text style={styles.chipMark}>IMDb</Text>
        <Text style={styles.chipRating}>{rating}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`IMDb rating ${rating}`}
      accessibilityHint="Opens the show on IMDb"
      onPress={() => openExternalUrl(imdbTitleUrl(imdbId))}
      hitSlop={8}
      style={styles.row}
      testID="imdb-rating"
    >
      <Text style={styles.mark}>IMDb</Text>
      <Text style={textStyle}>{rating}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // One outline around the mark and the rating, the same height as the
  // mark alone: line height, padding and border.
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: IMDB_CHIP_HEIGHT,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: t.inkSubtle,
    borderRadius: 8,
  },
  chipMark: {
    fontSize: 11,
    lineHeight: MARK_LINE_HEIGHT,
    fontWeight: "700",
    color: t.inkMuted,
  },
  chipRating: {
    fontSize: 12,
    lineHeight: MARK_LINE_HEIGHT,
    fontWeight: "600",
    color: t.ink,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
  },
  // The mark is text, not IMDb's logo, in the badge style.
  mark: {
    fontSize: 11,
    lineHeight: MARK_LINE_HEIGHT,
    fontWeight: "700",
    color: t.inkMuted,
    borderWidth: 1,
    borderColor: t.inkSubtle,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
});
