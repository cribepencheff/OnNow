// Show detail's rating (ADR 0019): TMDB's users' average, from the find
// answer the app already has; the same number as on a Search row's poster,
// so the two never disagree. "TMDB" in its chip says whose it is, and it
// links to the show on TMDB. Nothing without a rating.

import { Pressable, StyleSheet, Text } from "react-native";

import type { TvMazeShow } from "@/api/tvmaze-types";
import { openExternalUrl } from "@/hooks/useGuardedRouter";
import { useTmdbRating } from "@/hooks/useTmdbRating";
import { EPISODE_LINE_HEIGHT } from "@/logic/hero-layout";
import { t, type } from "@/theme/tokens";

export function ShowRating({ show }: { show: TvMazeShow }) {
  const { data: rating } = useTmdbRating(show);
  if (!rating) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`TMDB rating ${rating.value}`}
      accessibilityHint="Opens the show on TMDB"
      onPress={() => openExternalUrl(rating.url)}
      hitSlop={8}
      style={styles.chip}
      testID="show-rating"
    >
      <Text style={styles.label}>TMDB</Text>
      <Text style={styles.label}>{rating.value}</Text>
    </Pressable>
  );
}

// The hero's Premiere / Finale chip (EpisodeMarkChip), in the meta line
// (owner, CRI-143): a hairline outline, no fill, the line's height. The
// source and the number alike, muted (owner).
const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: EPISODE_LINE_HEIGHT,
    paddingHorizontal: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.episodeMarkEdge,
    borderRadius: 8,
    // Never cut: the meta line before it gives way instead.
    flexShrink: 0,
  },
  // Tighter than the system font's own spacing at 12, which reads loose in
  // a chip, and regular, as "Streaming on" under the button (owner).
  label: {
    ...type.meta,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "400",
    letterSpacing: -0.2,
    color: t.inkMuted,
  },
});
