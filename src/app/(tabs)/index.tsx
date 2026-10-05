// Home (PRD 5.1, FR-004, FR-005, FR-006, FR-007, FR-011, FR-012, FR-013,
// FR-037): which followed shows have a new episode today.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

import { HeroPager } from "@/components/Hero/HeroPager";
import { AddFirstShow } from "@/components/AddFirstShow";
import { AiringThisWeekRow } from "@/components/AiringThisWeekRow";
import { TopPicksRow } from "@/components/TopPicksRow";
import { useAccessibilityFlags } from "@/hooks/useAccessibilityFlags";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { useToday } from "@/hooks/useToday";
import { deriveHomeViewState } from "@/logic/home";
import {
  findHeroSlides,
  heroPagerKey,
  type HeroSlide,
} from "@/logic/hero-carousel";
import { updatedAgoLabel } from "@/logic/launch";
import { t as tokens, type } from "@/theme/tokens";

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export default function HomeScreen() {
  const router = useGuardedRouter();
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { reduceMotionEnabled } = useAccessibilityFlags();
  const todayDate = useToday();

  const {
    followedCount,
    isReady,
    isLoading,
    isError,
    dataUpdatedAt,
    followedShows,
    showsWithEpisodeToday,
    nextDayEpisodes,
    refetch,
  } = useFollowedEpisodes();

  // The spinner is for a pull only (CRI-95): a background refresh on launch
  // stays silent, so the hero never moves. Held for the whole refetch call.
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
      setNow(Date.now());
    }
  }, [refetch]);

  // CRI-95: hide the splash once there is something to show.
  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
    }
  }, [isReady]);

  // NFR-002: "Updated X ago" under the pull spinner, kept current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(tick);
  }, []);
  const updatedLabel = updatedAgoLabel(dataUpdatedAt, now);

  const state = deriveHomeViewState({
    followedCount,
    isLoading,
    isError,
    showsWithEpisodeToday,
    nextDayEpisodes,
  });

  // The hero's 7-day horizon (see HOME_HERO_HORIZON_DAYS in
  // logic/hero-carousel.ts). Falls back to the existing single nearest-day
  // pager (state.kind === "next-day") only when nothing followed has an
  // episode within the horizon at all.
  const heroSlides = useMemo(
    () => findHeroSlides(followedShows, deviceTimeZone(), todayDate),
    [followedShows, todayDate],
  );

  const followedShowList = useMemo(
    () => followedShows.map(({ show }) => show),
    [followedShows],
  );

  const openSearch = useCallback(() => router.push("/search"), [router]);

  // The outer ScrollView's raw vertical offset, native-driven, and how far
  // it's been pulled past its resting top (see pullDistance below) drive
  // HeroPager's stretchy backdrop on pull-to-refresh (Apple TV Store tab
  // style: the backdrop's top edge stays pinned and the image zooms into
  // the pulled gap, while the foreground moves down with the pull as
  // normal).
  const [scrollY] = useState(() => new Animated.Value(0));
  // The ScrollView's real resting offset: 0 whenever contentInset.top is 0
  // (contentInsetAdjustmentBehavior="never" keeps it that way here), but
  // measured rather than assumed, in case a safe-area or manual inset ever
  // changes that (rotation, Dynamic Type). null means "not yet captured".
  //
  // contentInset.top is not a fixed structural value on iOS: it grows
  // temporarily while RefreshControl is refreshing (to reserve room for
  // the spinner) and shrinks back as the refresh ends, and its resting
  // value itself can change when the layout does. An earlier version read
  // it live on every event, so refresh growth got mistaken for a new
  // resting point mid-refresh (a black gap opened above the hero). The fix
  // after that captured it once from the very first scroll event and froze
  // it forever, which traded that bug for two others: if that first event
  // ever landed on a non-resting reading (a pull immediately after launch,
  // before any settled scroll, or the refresh window), the wrong baseline
  // was locked in for the whole session; and a later layout change could
  // never re-establish it.
  //
  // So the baseline is neither live nor frozen, but robust:
  //   - It is only ever sampled from a settled position, never mid-pull
  //     (handlePullRestOffsetCapture skips any event whose offset is pulled
  //     above the top), so a pull can never define the resting point.
  //   - Of the settled samples it keeps the least-negative one
  //     (Math.max over -contentInset.top). Refresh only ever GROWS
  //     contentInset.top above its resting value, so the grown readings are
  //     always more negative and are discarded; the true (smallest) resting
  //     inset wins, with no need to thread RefreshControl's refreshing flag
  //     into this native-driven listener (which would rebuild it).
  //   - A real layout change (width/height/fontScale below) resets it to
  //     null so the new resting inset is captured from scratch, since that
  //     is the one case where the resting value legitimately changes and a
  //     max over old samples would keep a stale one.
  //
  // The listener stays a zero-dependency, permanently stable callback with
  // no ref involved: the "already have a good sample" logic lives in the
  // functional setState updater, reading React's own latest state directly
  // rather than a ref reached through Animated.event(...) during render
  // (which the react-hooks/refs lint rule flags).
  const [pullRestOffsetY, setPullRestOffsetY] = useState<number | null>(null);

  const handlePullRestOffsetCapture = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentInset, contentOffset } = event.nativeEvent;
      const candidate = -contentInset.top;
      // Skip samples taken mid-pull (offset pulled above the resting top):
      // read the baseline only from a settled position (at the top or
      // scrolled down into content), where contentInset.top is its true
      // resting value.
      if (contentOffset.y < candidate) {
        return;
      }
      setPullRestOffsetY((current) =>
        current === null ? candidate : Math.max(current, candidate),
      );
    },
    [],
  );

  // Re-establish the baseline when the layout changes (rotation, Dynamic
  // Type): the resting contentInset.top can move, and that is the one case
  // Math.max above must not smooth over, so drop the captured value and let
  // the next settled scroll event capture the new one. Done by adjusting
  // state during render off a remembered layout key, React's own sanctioned
  // pattern for resetting state on a change
  // (https://react.dev/learn/you-might-not-need-an-effect), rather than an
  // effect: no extra commit/paint, and no setState-in-effect.
  const layoutKey = `${width}x${height}x${fontScale}`;
  const [baselineLayoutKey, setBaselineLayoutKey] = useState(layoutKey);
  if (baselineLayoutKey !== layoutKey) {
    setBaselineLayoutKey(layoutKey);
    setPullRestOffsetY(null);
  }

  const handleOuterScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: handlePullRestOffsetCapture,
      }),
    [scrollY, handlePullRestOffsetCapture],
  );

  // How far the ScrollView has been pulled past its resting top, in
  // points, clamped to never go below 0 (scrolling up into the page has no
  // effect on it). pullRestOffsetY ?? 0: before the first settled scroll
  // event captures the real baseline, scrollY itself is still at its own
  // initial value (nothing has moved yet), so what this falls back to in
  // the meantime doesn't matter in practice; 0 is also already the correct
  // answer for this app regardless (see above). Rebuilt whenever the
  // baseline settles to a new value, which in the steady state (resting
  // inset 0, captured on the first settled event) happens exactly once;
  // only a converging first sample or a layout change rebuilds it again,
  // each time reprimed by the next scroll event.
  const pullDistance = useMemo(() => {
    const restOffsetY = pullRestOffsetY ?? 0;
    return scrollY.interpolate({
      inputRange: [restOffsetY - 1, restOffsetY],
      outputRange: [1, 0],
      extrapolateLeft: "extend",
      extrapolateRight: "clamp",
    });
  }, [scrollY, pullRestOffsetY]);

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
        onScroll={handleOuterScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            testID="home-refresh-control"
            refreshing={refreshing}
            onRefresh={handleRefresh}
            // Kept purely as the gesture and threshold engine: it still
            // owns the pull, the release-to-trigger feel and onRefresh, but
            // its own indicator is hidden (tintColor transparent on iOS,
            // colors empty-ish on Android) because it sits BELOW the pinned
            // hero backdrop (a native ScrollView subview we can't restack).
            // PullToRefreshIndicator below draws the visible spinner on top
            // of the backdrop instead, driven by the same pull.
            tintColor="transparent"
            colors={["transparent"]}
          />
        }
      >
        {/* CRI-95: until cached shows or the first fetch are in, a quiet
            placeholder, never a flash of the empty or error state. */}
        {!isReady ? (
          <Text style={styles.quietLine}>Loading your shows…</Text>
        ) : (
          <>
            {heroSlides.length > 0 && (
              <HeroPager
                // A new set of slides starts a fresh pager (heroPagerKey).
                key={heroPagerKey(heroSlides)}
                slides={heroSlides}
                todayDate={todayDate}
                pullDistance={pullDistance}
              />
            )}

            {/* Nothing followed has an episode within the horizon: fall back
              to the single nearest upcoming day, same as before the 7-day
              horizon. */}
            {heroSlides.length === 0 && state.kind === "next-day" && (
              <HeroPager
                key={heroPagerKey(state.shows)}
                slides={state.shows.map((show): HeroSlide => ({
                  ...show,
                  localDate: state.localDate,
                  endDate: state.localDate,
                }))}
                todayDate={todayDate}
                pullDistance={pullDistance}
              />
            )}

            {state.kind === "empty-follow-list" && (
              <AddFirstShow
                onPress={openSearch}
                testID="home-empty-state"
                buttonTestID="home-add-show"
              />
            )}

            {state.kind === "no-upcoming" && (
              <Text style={styles.quietLine}>Nothing upcoming.</Text>
            )}

            {state.kind === "error" && (
              <Text style={styles.quietLine}>
                Couldn&apos;t load your shows. Pull to refresh.
              </Text>
            )}

            {state.kind === "loading" && (
              <Text style={styles.quietLine}>Loading your shows…</Text>
            )}

            {/* FR-038, ADR 0016: hidden with an empty follow list. */}
            {followedCount > 0 && (
              <TopPicksRow followedShows={followedShowList} />
            )}
            {/* FR-039: always shown, also with an empty follow list. */}
            <AiringThisWeekRow />
            <View style={styles.tabBarClearance} />
          </>
        )}
      </Animated.ScrollView>

      <PullToRefreshIndicator
        pullDistance={pullDistance}
        refreshing={refreshing}
        updatedLabel={updatedLabel}
        reduceMotionEnabled={reduceMotionEnabled}
        topInset={insets.top}
      />
    </View>
  );
}

// The visible pull-to-refresh spinner, drawn ON TOP of the hero backdrop
// (the native RefreshControl's own indicator is hidden, see the
// RefreshControl above for why). Pinned just below the safe-area top and
// staying put while the content moves (the
// Twitter/X pattern), rather than riding the gap the pull opens: the gap is
// covered by the pinned, zooming backdrop here, so a gap-centred spinner
// would sit behind it.
const PULL_INDICATOR_REVEAL = 56;

function PullToRefreshIndicator({
  pullDistance,
  refreshing,
  updatedLabel,
  reduceMotionEnabled,
  topInset,
}: {
  pullDistance: Animated.AnimatedInterpolation<number>;
  refreshing: boolean;
  updatedLabel: string | null;
  reduceMotionEnabled: boolean;
  topInset: number;
}) {
  // Visibility is a single continuous state: shown while pulling OR while
  // refreshing, with no dip in between. Two contributions, combined so
  // whichever is higher wins (their clamped sum):
  //  - pullOpacity fades in with the pull (native, from pullDistance).
  //  - refreshHold is held at 1 for the whole time `refreshing` is true and
  //    fades to 0 when it goes false. It is what bridges the moment at
  //    release when the pull has sprung back toward rest but the refresh is
  //    still running, which is exactly where a pull-only opacity dipped to 0
  //    and made the one indicator read as two (fade out, then back in).
  // Fade-out therefore only happens once refreshing is false (refreshHold
  // eases down) AND the pull is back at rest (pullOpacity already 0).
  const pullOpacity = useMemo(
    () =>
      pullDistance.interpolate({
        inputRange: [0, PULL_INDICATOR_REVEAL],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [pullDistance],
  );
  const [refreshHold] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (refreshing) {
      // Snap to visible (no fade-in): the pull has already faded it in, this
      // just takes over holding it there without a seam.
      refreshHold.setValue(1);
      return;
    }
    const fadeOut = Animated.timing(refreshHold, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    });
    fadeOut.start();
    return () => fadeOut.stop();
  }, [refreshing, refreshHold]);

  // Built once (useMemo): Animated.add + .interpolate build native graph
  // nodes, and rebuilding them each render would leave them stale (same
  // class of bug as the backdrop's pullTransform in HeroPage.tsx). Both
  // inputs are native-driven, so the sum and its clamp stay native too.
  const opacity = useMemo(
    () =>
      Animated.add(pullOpacity, refreshHold).interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [pullOpacity, refreshHold],
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pullIndicator, { top: topInset + 4, opacity }]}
    >
      <View style={styles.pullIndicatorScrim}>
        {/* animating only while actually refreshing (a pull that doesn't
            trigger stays a static circle fading in and out), and never
            under Reduce Motion (a static indicator there, per the brief);
            hidesWhenStopped off so the static states still show. */}
        <ActivityIndicator
          animating={refreshing && !reduceMotionEnabled}
          hidesWhenStopped={false}
          color="#FFFFFF"
          size="small"
        />
      </View>
      {/* NFR-002: discreet, only while the pull indicator shows. */}
      {updatedLabel && (
        <View style={styles.pullUpdated}>
          <Text style={styles.pullUpdatedText} testID="home-updated">
            {updatedLabel}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  quietLine: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    color: tokens.inkMuted,
    fontSize: 15,
    paddingHorizontal: 32,
  },
  // The rows clear the translucent tab bar (83) at the end of the page.
  tabBarClearance: {
    height: 83 + tokens.space4,
  },
  pullIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  // The "Updated X ago" pill, on the same scrim as the spinner circle.
  pullUpdated: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: tokens.imageControlBackdrop,
  },
  pullUpdatedText: {
    ...type.label,
    color: "#FFFFFF",
  },
  // A small circle on the image-control backdrop behind the white spinner,
  // with a soft shadow, so it stays legible over a bright backdrop image.
  pullIndicatorScrim: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.imageControlBackdrop,
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
