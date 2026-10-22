// A poster card for the poster rows on Home and in Search (FR-038, FR-039,
// FR-026), built from the app's existing components and design tokens. A
// tap opens Show detail (inside the sheet when shown in Search, PRD 5.6);
// the follow circle follows at once.

import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";

import { IMAGE_BASE } from "@/api/tmdb-types";
import { useAccessibilityFlags } from "@/hooks/useAccessibilityFlags";
import { useFollowToggle } from "@/hooks/useFollowList";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import type { PosterItem } from "@/logic/top-picks";
import { POSTER_CARD_WIDTH } from "@/logic/poster-snap";
import { t, type } from "@/theme/tokens";
import { PosterFollowCircle } from "./PosterFollowCircle";
import { PosterDimOverlay } from "./PosterDim";

// About 150 wide: two full cards and a peek of the third (CRI-127).
export const POSTER_WIDTH = POSTER_CARD_WIDTH;
export const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
// How long a poster takes to fade in once loaded.
const POSTER_FADE_IN_MS = 300;

// Where a tap opens Show detail: on top of the tabs, or inside the Search
// sheet with a back arrow to it (PRD 5.6).
export type DetailPathname = "/show/[id]" | "/search/show/[id]";

// A card's height: the poster, the name on one line, and the caption line
// ("Today") when the row has one. Each row has one fixed height, so nothing
// moves while its cards load (CRI-127).
export function cardHeight(withCaption: boolean): number {
  return (
    POSTER_HEIGHT +
    t.space2 +
    type.meta.lineHeight +
    (withCaption ? type.label.lineHeight : 0)
  );
}

export function ShowCard({
  card,
  caption,
  testID,
  detailPathname = "/show/[id]",
}: {
  card: PosterItem;
  // A short line under the name, for example the next episode's day.
  caption?: string | null;
  testID: string;
  detailPathname?: DetailPathname;
}) {
  const router = useGuardedRouter();
  const { followed, toggle } = useFollowToggle(card.tvmazeId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption ? `${card.name}, ${caption}` : card.name}
      accessibilityHint="Opens the show"
      onPress={() =>
        router.push({ pathname: detailPathname, params: { id: card.tvmazeId } })
      }
      style={styles.card}
      testID={testID}
    >
      <View>
        <Image
          source={`${IMAGE_BASE}/w500${card.posterPath}`}
          style={styles.poster}
          contentFit="cover"
          // Fades in once loaded, also after the skeleton (CRI-127).
          transition={POSTER_FADE_IN_MS}
          accessibilityIgnoresInvertColors
        />
        {/* Home dims its posters at rest (CRI-124); under the edge and
            the circle. */}
        <PosterDimOverlay />
        <View style={styles.edge} pointerEvents="none" />
        <View style={styles.follow}>
          <PosterFollowCircle
            followed={followed}
            onPress={toggle}
            testID={`${testID}-follow-${card.tvmazeId}`}
          />
        </View>
      </View>
      <View>
        <Text style={styles.name} numberOfLines={1}>
          {card.name}
        </Text>
        {/* Its own line, so a long name never pushes it out. */}
        {caption != null && (
          <Text style={styles.caption} numberOfLines={1}>
            {caption}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// How long one pulse cycle (dim to bright to dim) takes, by default.
export const DEFAULT_PULSE_MS = 750;
// How dim the skeleton gets at the low point of its pulse, by default.
export const DEFAULT_PULSE_LOW = 0.25;
// How far apart each card's pulse starts from the next one's, a card's own
// position in the row (delayMs below) times this, by default: a wave
// crossing the row rather than every card pulsing in lockstep (the
// Facebook/Airbnb skeleton pattern, owner's request).
export const DEFAULT_SKELETON_STAGGER_MS = 250;

// One shared, continuously looping clock for every SkeletonCard in a row
// (0 to cycleMs, linear, reset to 0 each iteration), rather than each card
// running its own independent Animated.loop: owner caught cards drifting
// out of sync with each other after sitting a while. Two separate native
// loops started a fixed delay apart can't be trusted to stay that far
// apart forever, since Animated.loop's per-iteration reset isn't a single
// uninterrupted native animation but a sequence of individually started
// ones, each a (small, variable) JS/bridge round trip away from the last;
// over many iterations those round trips land at slightly different
// moments for each card's own loop and the gap between them drifts. A
// single shared clock has only one such loop to begin with, and every
// card reads its own phase-shifted position off that one value every
// frame, so there is nothing for two cards to drift apart FROM.
function useSkeletonPulseClock(cycleMs: number, enabled: boolean) {
  const [clock] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const loop = Animated.loop(
      Animated.timing(clock, {
        toValue: cycleMs,
        duration: cycleMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [clock, cycleMs, enabled]);
  return clock;
}

// One row's shared pulse clock: pulseMs/pulseLow are the row's own (every
// real call site leaves them at the defaults; only the dev Images screen
// overrides them), read once here rather than per card, so every
// SkeletonCard in the row shares the exact same clock instance.
export function useSkeletonRowPulse(
  pulseMs: number = DEFAULT_PULSE_MS,
): Animated.Value {
  const { reduceMotionEnabled } = useAccessibilityFlags();
  return useSkeletonPulseClock(pulseMs * 2, !reduceMotionEnabled);
}

// A card's shape while its row loads for the first time (CRI-127): exactly
// a real card's size, the name line and caption line included, so nothing
// moves when the posters come in. Pulses while it waits, so a long wait
// (a cold cache, say right after the app wakes from the background) still
// reads as loading rather than stuck. `clock` is the row's own shared
// useSkeletonRowPulse value; delayMs is this card's own position in it
// (DEFAULT_SKELETON_STAGGER_MS apart, by default), so the row's cards
// pulse as a wave rather than together. pulseLow only exists so the dev
// Images screen can tune it live; every real call site leaves it default.
export function SkeletonCard({
  withCaption,
  clock,
  delayMs = 0,
  pulseMs = DEFAULT_PULSE_MS,
  pulseLow = DEFAULT_PULSE_LOW,
}: {
  withCaption: boolean;
  clock: Animated.Value;
  delayMs?: number;
  pulseMs?: number;
  pulseLow?: number;
}) {
  const { reduceMotionEnabled } = useAccessibilityFlags();
  const cycleMs = pulseMs * 2;
  const opacity = useMemo(() => {
    if (reduceMotionEnabled) {
      return 1;
    }
    const phase = Animated.modulo(Animated.add(clock, delayMs), cycleMs);
    return phase.interpolate({
      inputRange: [0, pulseMs, cycleMs],
      outputRange: [1, pulseLow, 1],
    });
  }, [reduceMotionEnabled, clock, delayMs, pulseMs, cycleMs, pulseLow]);

  return (
    <Animated.View style={[styles.card, { opacity }]} testID="skeleton-card">
      <View style={[styles.poster, styles.skeletonPoster]} />
      <View>
        <View style={styles.nameLine}>
          <View style={[styles.bar, styles.nameBar]} />
        </View>
        {withCaption && (
          <View style={styles.captionLine}>
            <View style={[styles.bar, styles.captionBar]} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: POSTER_WIDTH,
    gap: t.space2,
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: t.radiusSm,
    backgroundColor: t.surface,
  },
  // The card's light hairline edge (Apple TV style), over the image.
  edge: {
    ...StyleSheet.absoluteFill,
    borderRadius: t.radiusSm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
  },
  follow: {
    position: "absolute",
    top: t.space2,
    right: t.space2,
  },
  name: {
    ...type.meta,
    color: t.inkMuted,
  },
  caption: {
    ...type.label,
    color: t.ink,
  },
  skeletonPoster: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
  },
  nameLine: {
    height: type.meta.lineHeight,
    justifyContent: "center",
  },
  captionLine: {
    height: type.label.lineHeight,
    justifyContent: "center",
  },
  bar: {
    borderRadius: t.radiusPill,
    backgroundColor: t.surfaceRaised,
  },
  nameBar: {
    width: "70%",
    height: 10,
  },
  captionBar: {
    width: "35%",
    height: 8,
  },
});
