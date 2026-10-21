// The hero's Premiere / Finale chip after the episode line (owner, in the
// IMDb chip's old place): a hairline outline, brighter than the date
// pill's, and no fill (it sits on the dark fade, where a fill would hardly
// show), a coloured dot, and the word
// in white, like the episode code beside it. The word says it; the dot
// only marks it, so the chip reads the same without telling the colours
// apart (heroEpisodeMark, logic/hero-carousel.ts).

import { StyleSheet, Text, View } from "react-native";

import type { HeroEpisodeMark } from "@/logic/hero-carousel";
import { EPISODE_LINE_HEIGHT } from "@/logic/hero-layout";
import { t, type } from "@/theme/tokens";

const LABELS: Record<HeroEpisodeMark, string> = {
  premiere: "Premiere",
  finale: "Finale",
};

const DOT_SIZE = 6;

export function EpisodeMarkChip({
  mark,
  // Only the dev Images screen overrides it, to compare candidates.
  finaleColor = t.episodeFinale,
}: {
  mark: HeroEpisodeMark;
  finaleColor?: string;
}) {
  return (
    <View
      style={styles.chip}
      accessible
      accessibilityLabel={LABELS[mark]}
      testID="hero-episode-mark"
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: mark === "premiere" ? t.accent : finaleColor },
        ]}
      />
      <Text style={styles.label}>{LABELS[mark]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // No taller than the episode line, so nothing below it shifts between
  // slides with and without a chip.
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
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  // Smaller than the episode text, as fits a chip; Medium, since regular
  // reads thin that small.
  label: {
    ...type.meta,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "500",
    color: t.ink,
  },
});
