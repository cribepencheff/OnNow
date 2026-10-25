// Show detail's rating (ADR 0018): TVmaze's users' average, already in the
// show's data, so it costs no request; the same number as on a Search
// row's poster, so the two never disagree. The "TVmaze" in its chip says whose
// it is, and it links to the show on TVmaze. Nothing without a rating.

import { Pressable, StyleSheet, Text } from "react-native";

import type { TvMazeShow } from "@/api/tvmaze-types";
import { openExternalUrl } from "@/hooks/useGuardedRouter";
import { tvmazeRating } from "@/logic/show-rating";
import { EPISODE_LINE_HEIGHT } from "@/logic/hero-layout";
import { t, type } from "@/theme/tokens";

export function ShowRating({ show }: { show: TvMazeShow }) {
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
      style={styles.chip}
      testID="show-rating"
    >
      <Text style={[styles.label, styles.source]}>TVmaze</Text>
      <Text style={[styles.label, styles.value]}>{rating}</Text>
    </Pressable>
  );
}

// The hero's Premiere / Finale chip (EpisodeMarkChip), in the meta line
// (owner, CRI-143): a hairline outline, no fill, the line's height. The
// source muted, the number in white.
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
  },
  label: {
    ...type.meta,
    fontSize: 12,
    lineHeight: 14,
  },
  source: {
    fontWeight: "500",
    color: t.inkMuted,
  },
  value: {
    fontWeight: "600",
    color: t.ink,
  },
});
