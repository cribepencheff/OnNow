// CRI-87, ADR 0013: the IMDb rating from OMDb, linking to the title on
// IMDb. Nothing at all without a rating. In Show detail, and by a Search
// row's title, where it reads as the show's and helps decide what to
// follow (owner, 2026-10-22); not a link there, so a tap on the row still
// opens Show detail. Not on the Home hero: by the episode line it read as
// the episode's rating. Not in Shows: OMDb's free key is shared by every
// user (CRI-116).

import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";

import type { TvMazeShow } from "@/api/tvmaze-types";
import { openExternalUrl } from "@/hooks/useGuardedRouter";
import { useImdbRating } from "@/hooks/useImdbRating";
import { imdbTitleUrl } from "@/logic/imdb-rating";
import { t, type } from "@/theme/tokens";

// The IMDb mark's line height.
const MARK_LINE_HEIGHT = 14;
// The chip (a Search row's, as the hero's once was): "IMDb 8.2" in one
// hairline pill, a text line high.
const CHIP_FONT_SIZE = 12;
const CHIP_TEXT_LINE_HEIGHT = 14;

export function ImdbRating({
  show,
  textStyle,
  linked = true,
  variant = "mark",
}: {
  show: TvMazeShow;
  textStyle?: StyleProp<TextStyle>;
  // A link to the title on IMDb (Show detail), or only the rating (a
  // Search row, which is itself a button).
  linked?: boolean;
  // The mark beside the rating (Show detail), or both in one hairline
  // pill (a Search row's status line, as the hero's chip once was).
  variant?: "mark" | "chip";
}) {
  const { data: rating, imdbId } = useImdbRating(show);
  if (!rating || !imdbId) {
    return null;
  }
  if (variant === "chip") {
    return (
      <View
        style={styles.chip}
        accessibilityLabel={`IMDb rating ${rating}`}
        testID="imdb-rating"
      >
        <Text style={styles.chipText}>IMDb</Text>
        <Text style={[styles.chipText, styles.chipRating]}>{rating}</Text>
      </View>
    );
  }
  if (!linked) {
    return (
      <View
        style={styles.row}
        accessibilityLabel={`IMDb rating ${rating}`}
        testID="imdb-rating"
      >
        <Text style={styles.mark}>IMDb</Text>
        <Text style={textStyle}>{rating}</Text>
      </View>
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
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: type.meta.lineHeight,
    paddingHorizontal: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    borderRadius: 8,
  },
  chipText: {
    fontSize: CHIP_FONT_SIZE,
    lineHeight: CHIP_TEXT_LINE_HEIGHT,
    fontWeight: "500",
    color: t.inkMuted,
  },
  chipRating: {
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
