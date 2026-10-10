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
import { t, type } from "@/theme/tokens";

// The chip's height: the episode line's own line height, so it never
// stands taller than the line it sits on (Home hero). Its label is the
// episode text's size, on a slightly tighter line, so it fits inside the
// outline with almost no padding.
export const IMDB_CHIP_HEIGHT = type.meta.lineHeight;
const CHIP_TEXT_LINE_HEIGHT = IMDB_CHIP_HEIGHT - 2;
// The IMDb mark's line height in Show detail (the "mark" variant).
const MARK_LINE_HEIGHT = 14;

export function ImdbRating({
  show,
  textStyle,
  variant = "mark",
}: {
  show: TvMazeShow;
  textStyle?: StyleProp<TextStyle>;
  // "mark": the IMDb mark, then the rating beside it (Show detail).
  // "chip": "IMDb 8.3" inside one chip, IMDB_CHIP_HEIGHT tall (the Home
  // hero, CRI-124): a quiet complement to the episode line, not a focal
  // point.
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
  // One outline around the mark and the rating, no taller than the
  // episode line. The date pill's edge (image-control-edge, a hairline).
  chip: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 4,
    height: IMDB_CHIP_HEIGHT,
    paddingHorizontal: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    borderRadius: 8,
  },
  // The episode line's colour and size, so the two read as one line;
  // Medium, so the chip still reads as its own thing.
  chipMark: {
    ...type.meta,
    fontWeight: "500",
    lineHeight: CHIP_TEXT_LINE_HEIGHT,
    color: t.inkMuted,
  },
  // Tabular figures, so the chip keeps its width from slide to slide.
  chipRating: {
    ...type.meta,
    fontWeight: "500",
    lineHeight: CHIP_TEXT_LINE_HEIGHT,
    color: t.inkMuted,
    fontVariant: ["tabular-nums"],
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
