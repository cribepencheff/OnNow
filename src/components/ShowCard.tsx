// A poster card for the poster rows on Home and in Search (FR-038, FR-039,
// FR-026), built from the app's existing components and design tokens. A
// tap opens Show detail (inside the sheet when shown in Search, PRD 5.6);
// the follow circle follows at once.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
import { FOLLOW_CHECK_SYMBOL, FOLLOW_PLUS_SYMBOL } from "./followSymbols";
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
// white plus, or a white check once followed, morphing between the two
// (crossfade + scale) rather than swapping instantly: a prototype, Home's
// poster rows only for now, not yet the other follow circles (Search,
// Shows, Show detail's own FollowCircle). expo-symbols has no native SF
// Symbol "replace" transition exposed (checked before building this), so
// this fakes the morph with two overlaid SymbolViews instead, the same
// crossfade technique PosterRow's own skeleton-to-cards transition uses.
function PosterFollowCircle({
  followed,
  onPress,
  testID,
}: {
  followed: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { reduceMotionEnabled } = useAccessibilityFlags();
  // 0 = plus shown, 1 = check shown; everything below is derived from
  // this one value, so the two icons can never fall out of sync with
  // each other mid-morph.
  const [progress] = useState(() => new Animated.Value(followed ? 1 : 0));
  // Starts the spring toward `toFollowed`'s value. Called twice for one
  // tap: eagerly from handlePress's own event handler (below), so the
  // morph begins on the very same tick as the tap rather than waiting on
  // a render round trip (setState -> re-render -> commit -> this effect),
  // a round trip that can land a frame or more later than the other
  // direction's when the tap also triggers heavier re-render work
  // elsewhere (owner noticed this specifically toward plus, unfollow,
  // which is also where Home's row-settling logic has more to do); and
  // reactively here, as the source of truth for whenever `followed`
  // changes from anything other than this component's own tap. Calling
  // .start() a second time toward a toValue a running spring is already
  // headed to is harmless, so the two triggers never fight each other.
  const morphTo = useCallback(
    (toFollowed: boolean) => {
      if (reduceMotionEnabled) {
        progress.setValue(toFollowed ? 1 : 0);
        return;
      }
      Animated.spring(progress, {
        toValue: toFollowed ? 1 : 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 260,
        mass: 0.6,
      }).start();
    },
    [reduceMotionEnabled, progress],
  );
  // A short busy window after each tap (owner's request): a bright arc
  // runs around the circle's own edge, the circle takes no taps (so a
  // second tap cannot undo the first mid-way), and only once it ends
  // does the icon change. Home holds the hero's rebuild until the icon
  // has settled too (HERO_REBUILD_DELAY_MS in index.tsx), so none of
  // this shares the UI thread with it. 0 = no arc, 1 = arc.
  const [busy, setBusy] = useState(false);
  // The same, read at once by the tap and by the effect below: `busy`
  // itself only changes on the next render.
  const busyRef = useRef(false);
  const followedRef = useRef(followed);
  useEffect(() => {
    followedRef.current = followed;
  }, [followed]);
  // The icon follows `followed`, except during the busy window: the tap
  // flips `followed` at once (following is optimistic), and the icon
  // waits for the arc instead; the timer below morphs it at the end.
  useEffect(() => {
    if (!busyRef.current) {
      morphTo(followed);
    }
  }, [followed, morphTo]);
  const [busyAnim] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));
  const busyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateFrame = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (busyTimer.current) {
        clearTimeout(busyTimer.current);
      }
      if (stateFrame.current !== null) {
        cancelAnimationFrame(stateFrame.current);
      }
    },
    [],
  );
  // Started and stopped from the tap and the timer themselves, not from
  // an effect on `busy`: an effect waits for a render, and on this tap
  // that render is the one Home is busy with.
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => () => spinLoop.current?.stop(), []);
  const setBusyRing = useCallback(
    (toBusy: boolean) => {
      if (reduceMotionEnabled) {
        // No ring under Reduce Motion: the circle only takes no taps
        // until the window ends.
        busyAnim.setValue(0);
        return;
      }
      if (toBusy) {
        spin.setValue(0);
        spinLoop.current = Animated.loop(
          Animated.timing(spin, {
            toValue: 1,
            duration: SPINNER_TURN_MS,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        );
        spinLoop.current.start();
      }
      Animated.timing(busyAnim, {
        toValue: toBusy ? 1 : 0,
        duration: BUSY_FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !toBusy) {
          spinLoop.current?.stop();
          spinLoop.current = null;
        }
      });
    },
    [reduceMotionEnabled, busyAnim, spin],
  );

  const { plusOpacity, plusScale, checkScale, spinRotate } = useMemo(
    () => ({
      plusOpacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
      plusScale: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.5],
      }),
      checkScale: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1],
      }),
      spinRotate: spin.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      }),
    }),
    [progress, spin],
  );
  const checkOpacity = progress;

  const handlePress = useCallback(() => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    // A confirming tap on follow; a lighter one on unfollow, so removing
    // a show reads as equally instant as adding one (both are optimistic
    // either way, useFollowList).
    if (!followed) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
    }
    setBusyRing(true);
    // The arc first, everything else a frame later: native animation
    // commands go to the UI thread only after the JavaScript work of the
    // same tick, and state changes here (this circle's, and the follow
    // itself, which redraws Home's rows) would render first and hold the
    // arc's start back, the delay the owner saw before it appeared.
    stateFrame.current = requestAnimationFrame(() => {
      stateFrame.current = null;
      setBusy(true);
      onPress();
    });
    busyTimer.current = setTimeout(() => {
      busyTimer.current = null;
      busyRef.current = false;
      setBusy(false);
      setBusyRing(false);
      // Whatever the follow list says now: the new state, or the old one
      // again if the write failed meanwhile.
      morphTo(followedRef.current);
    }, FOLLOW_BUSY_MS);
  }, [followed, onPress, morphTo, setBusyRing]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={followed ? "Followed" : "Follow"}
      accessibilityState={{ selected: followed, busy, disabled: busy }}
      onPress={handlePress}
      disabled={busy}
      // A 44pt tap target around the 32pt circle.
      hitSlop={6}
      testID={testID}
    >
      <View>
        <View style={styles.circle}>
          <Animated.View
            style={[
              styles.circleIcon,
              { opacity: plusOpacity, transform: [{ scale: plusScale }] },
            ]}
          >
            <SymbolView
              name={FOLLOW_PLUS_SYMBOL}
              tintColor="#FFFFFF"
              size={15}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.circleIcon,
              { opacity: checkOpacity, transform: [{ scale: checkScale }] },
            ]}
          >
            <SymbolView
              name={FOLLOW_CHECK_SYMBOL}
              tintColor="#FFFFFF"
              size={15}
            />
          </Animated.View>
        </View>
        {/* Over the circle, not inside it, so the arc lies on the
            circle's own edge rather than inside its border. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.busyRing,
            { opacity: busyAnim, transform: [{ rotate: spinRotate }] },
          ]}
          testID={`${testID}-busy`}
        />
      </View>
    </Pressable>
  );
}

// How long the follow circle stays busy (the arc, no taps) after a tap.
export const FOLLOW_BUSY_MS = 600;
// How quickly the arc fades in and out around that window.
const BUSY_FADE_MS = 120;
// About how long the icon's spring takes to settle once it starts, at
// the end of the busy window.
const ICON_MORPH_MS = 400;
// When a tap's whole animation is over (the arc, then the new icon):
// Home waits this long before rebuilding the hero.
export const FOLLOW_SETTLED_MS = FOLLOW_BUSY_MS + ICON_MORPH_MS;
// One full turn of the arc around the circle.
const SPINNER_TURN_MS = 700;
// The arc's stroke, a little heavier than the circle's hairline edge.
const BUSY_RING_WIDTH = 2;

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
  // Both follow-circle icons stack here, absolutely, so their crossfade
  // overlaps instead of the incoming one pushing the outgoing one aside.
  circleIcon: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  // The busy arc: one bright quarter of a ring exactly the circle's size,
  // on top of it, turning around its edge; the rest of the ring is
  // clear, so the circle's own hairline edge still shows.
  busyRing: {
    position: "absolute",
    top: 0,
    left: 0,
    width: FOLLOW_CIRCLE_SIZE,
    height: FOLLOW_CIRCLE_SIZE,
    borderRadius: FOLLOW_CIRCLE_SIZE / 2,
    borderWidth: BUSY_RING_WIDTH,
    borderColor: "transparent",
    borderTopColor: "#FFFFFF",
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
