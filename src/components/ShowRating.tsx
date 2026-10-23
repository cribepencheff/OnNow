// Show detail's rating (ADR 0018): TVmaze's users' average, already in the
// show's data, so it costs no request; the same number as on a Search
// row's poster, so the two never disagree. The "TVmaze" mark says whose it
// is, and it links to the show on TVmaze. Nothing without a rating.

import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
} from "react-native";

import type { TvMazeShow } from "@/api/tvmaze-types";
import { openExternalUrl } from "@/hooks/useGuardedRouter";
import { tvmazeRating } from "@/logic/show-rating";
import { t } from "@/theme/tokens";

// The mark's line height.
const MARK_LINE_HEIGHT = 14;

export function ShowRating({
  show,
  textStyle,
}: {
  show: TvMazeShow;
  textStyle?: StyleProp<TextStyle>;
}) {
  const rating = tvmazeRating(show);
  if (!rating) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`TVmaze rating ${rating}`}
      accessibilityHint="Opens the show on TVmaze"
      onPress={() => openExternalUrl(show.url)}
      hitSlop={8}
      style={styles.row}
      testID="show-rating"
    >
      <Text style={styles.mark}>TVmaze</Text>
      <Text style={textStyle}>{rating}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
  },
  // The mark is text, in the badge style.
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
