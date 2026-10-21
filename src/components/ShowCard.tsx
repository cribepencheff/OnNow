// A poster card for the poster rows on Home and in Search (FR-038, FR-039,
// FR-026), built from the app's existing components and design tokens. A
// tap opens Show detail (inside the sheet when shown in Search, PRD 5.6);
// the follow circle follows at once.

import { useCallback, useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";

import { IMAGE_BASE } from "@/api/tmdb-types";
import { useAccessibilityFlags } from "@/hooks/useAccessibilityFlags";
import { useFollowToggle } from "@/hooks/useFollowList";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import type { PosterItem } from "@/logic/top-picks";
import { POSTER_CARD_WIDTH } from "@/logic/poster-snap";
import { t, type } from "@/theme/tokens";
import { followSymbol } from "./followSymbols";
import { PosterDimOverlay } from "./PosterDim";

// About 150 wide: two full cards and a peek of the third (CRI-127).
export const POSTER_WIDTH = POSTER_CARD_WIDTH;
export const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const FOLLOW_CIRCLE_SIZE = 32;
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

// The follow circle on a poster (CRI-127), Apple TV style: a translucent
// dark fill, no blur, a light hairline edge, the same followed or not; a
// white plus, or a white check once followed. (Search results and Shows
// keep their own FollowCircle.)
function PosterFollowCircle({
  followed,
  onPress,
  testID,
}: {
  followed: boolean;
  onPress: () => void;
  testID: string;
}) {
  const handlePress = useCallback(() => {
    if (!followed) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [followed, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={followed ? "Followed" : "Follow"}
      accessibilityState={{ selected: followed }}
      onPress={handlePress}
      // A 44pt tap target around the 32pt circle.
      hitSlop={6}
      testID={testID}
    >
      <View style={styles.circle}>
        <SymbolView
          name={followSymbol(followed)}
          tintColor="#FFFFFF"
          size={15}
        />
      </View>
    </Pressable>
  );
}

// How long one pulse cycle (dim to bright to dim) takes, by default.
export const DEFAULT_PULSE_MS = 900;
// How dim the skeleton gets at the low point of its pulse, by default.
export const DEFAULT_PULSE_LOW = 0.4;
// How far apart each card's pulse starts from the next one's, a card's own
// position in the row (delayMs below) times this, by default: a wave
// crossing the row rather than every card pulsing in lockstep (the
// Facebook/Airbnb skeleton pattern, owner's request).
export const DEFAULT_SKELETON_STAGGER_MS = 120;

// A card's shape while its row loads for the first time (CRI-127): exactly
// a real card's size, the name line and caption line included, so nothing
// moves when the posters come in. Pulses while it waits, so a long wait
// (a cold cache, say right after the app wakes from the background) still
// reads as loading rather than stuck. The three pulseMs/pulseLow/delayMs
// overrides exist only so the dev Images screen can tune them live; every
// real call site (PosterRow) leaves them at their defaults.
export function SkeletonCard({
  withCaption,
  delayMs = 0,
  pulseMs = DEFAULT_PULSE_MS,
  pulseLow = DEFAULT_PULSE_LOW,
}: {
  withCaption: boolean;
  // This card's own position in the row, DEFAULT_SKELETON_STAGGER_MS apart
  // by default, so the row's cards pulse as a wave rather than together.
  delayMs?: number;
  pulseMs?: number;
  pulseLow?: number;
}) {
  const { reduceMotionEnabled } = useAccessibilityFlags();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduceMotionEnabled) {
      opacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: pulseLow,
          duration: pulseMs,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: pulseMs,
          useNativeDriver: true,
        }),
      ]),
    );
    // The delay runs once, up front; the loop it hands off to then repeats
    // forever with no further gap, so only each card's first cycle is
    // offset, not every cycle after it.
    const animation = Animated.sequence([Animated.delay(delayMs), pulse]);
    animation.start();
    return () => animation.stop();
  }, [reduceMotionEnabled, opacity, delayMs, pulseMs, pulseLow]);

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
  // One material, followed or not; only the icon changes.
  circle: {
    width: FOLLOW_CIRCLE_SIZE,
    height: FOLLOW_CIRCLE_SIZE,
    borderRadius: FOLLOW_CIRCLE_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    backgroundColor: t.imageControlBackdrop,
    alignItems: "center",
    justifyContent: "center",
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
