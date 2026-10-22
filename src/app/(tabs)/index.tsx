// Home (PRD 5.1, FR-004, FR-005, FR-006, FR-007, FR-011, FR-012, FR-013,
// FR-037): which followed shows have a new episode today.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
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
import { useFocusEffect, useNavigation, useScrollToTop } from "expo-router";
import {
  useAnimatedRef,
  useDerivedValue,
  useScrollOffset,
} from "react-native-reanimated";

import { HeroPager } from "@/components/Hero/HeroPager";
import { AddFirstShow } from "@/components/AddFirstShow";
import { AiringThisWeekRow } from "@/components/AiringThisWeekRow";
import { AppLogo } from "@/components/AppLogo";
import { Header } from "@/components/Header";
import { PosterDimContext } from "@/components/PosterDim";
import { TopPicksRow } from "@/components/TopPicksRow";
import { useAccessibilityFlags } from "@/hooks/useAccessibilityFlags";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useAfterLaunchRefresh } from "@/hooks/useAfterLaunchRefresh";
import { useSettledValue } from "@/hooks/useSettledValue";
import { useOpenSearch } from "@/hooks/useOpenSearch";
import {
  SettledFollowedContext,
  useSettledFollowed,
} from "@/hooks/useSettledFollowed";
import { SettledDayContext, useSettledDay } from "@/hooks/useSettledDay";
import { useTabReturn } from "@/hooks/useTabReturn";
import { useToday } from "@/hooks/useToday";
import { deriveHomeViewState } from "@/logic/home";
import {
  findHeroSlides,
  heroPagerKey,
  type HeroSlide,
} from "@/logic/hero-carousel";
import { HEADER_BAR_HEIGHT } from "@/logic/header";
import {
  TAB_BAR_HEIGHT,
  heroLayout,
  posterDimAt,
  posterDimEndScroll,
} from "@/logic/hero-layout";
import { t as tokens } from "@/theme/tokens";

// How far Home must be scrolled down to count as away from its top
// (maintainVisibleContentPosition below).
const SCROLLED_DOWN_MIN = 8;

// The app logo's height in the header.
const APP_LOGO_HEIGHT = 20;

// The hero's restart veil (restartHero): how quickly it fades, how long
// a wait before its spinner shows, and the longest it ever stays.
const VEIL_FADE_MS = 200;
const VEIL_SPINNER_DELAY_MS = 400;
const VEIL_MAX_MS = 4000;

// About how long a screen transition takes (a push or pop over Home, or
// a tab switch): the hero settles this long after Home loses or regains
// focus, so its rebuild runs once that animation is over, not during it.
const SCREEN_TRANSITION_MS = 400;

// Only from none to some: heroSlides is a new array on every render, and
// an empty one replacing an empty one would render again without end.
function heroGetsItsFirstSlides(
  settled: HeroSlide[],
  next: HeroSlide[],
): boolean {
  return settled.length === 0 && next.length > 0;
}

// The two members of Home's tab-screen navigation used for a tap on its
// own tab: expo-router exports the tab navigator's types only from its
// internal build folder, not from a public entry.
interface TabScreenNavigation {
  addListener(event: "tabPress", listener: () => void): () => void;
  isFocused(): boolean;
}

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export default function HomeScreen() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { reduceMotionEnabled } = useAccessibilityFlags();
  const todayDate = useToday();

  const {
    followedCount,
    isReady,
    isLoading,
    isError,
    followedShows,
    showsWithEpisodeToday,
    nextDayEpisodes,
    refetch,
    isRefetching,
  } = useFollowedEpisodes();

  // The spinner is for a pull only (CRI-95): a background refresh on launch
  // stays silent, so the hero never moves. Held for the whole refetch call.
  const [refreshing, setRefreshing] = useState(false);

  // The hero's 7-day horizon (see HOME_HERO_HORIZON_DAYS in
  // logic/hero-carousel.ts). Falls back to the existing single nearest-day
  // pager (state.kind === "next-day") only when nothing followed has an
  // episode within the horizon at all.
  const heroSlides = useMemo(
    () => findHeroSlides(followedShows, deviceTimeZone(), todayDate),
    [followedShows, todayDate],
  );
  // What the hero pager itself renders (its key and its slides): settled,
  // not live. A different set of slides remounts the whole pager
  // (heroPagerKey, below), and creating its native views (images, blurs,
  // masks) stalls the UI thread for a moment (measured with the
  // performance monitor: only the UI frame rate drops, and not at all
  // with the hero kept as it is). So the hero never changes while the
  // user is on Home: a follow or unfollow there (from "Airing this
  // week", say) shows up in the hero on a pull, or once Home is left or
  // returned to (owner's decision), the same way the rows keep a followed
  // card until then (CRI-131).
  //
  // At once on a new day (the core promise: today's episodes), and when
  // the hero had no slides yet (nothing on screen to keep: the first show
  // followed). top.heroPager below (whether the hero shows at all) reads
  // heroSlides itself, so a hero whose shows were all unfollowed goes.
  const { value: heroPagerSlides, settle: settleHero } = useSettledValue(
    heroSlides,
    todayDate,
    heroGetsItsFirstSlides,
  );
  // Also once the background refresh the app opened with (or came back to
  // the foreground with) is done: Home opens on a saved copy up to 21 days
  // old (ADR 0017), and the hero would otherwise keep its old slides until
  // a pull.
  useAfterLaunchRefresh(isRefetching, settleHero);
  // A tap on the app logo, or on Home's tab while on Home: the latest
  // slides, and the hero back at its first slide (owner: no swiping all
  // the way back by hand). The hero fades to the page's background first
  // (the restart veil), then settles (a changed set of slides remounts
  // the pager, which opens on the first slide anyway; an unchanged one
  // jumps back there, restartKey), and fades back in once the first slide
  // is shown with its backdrop loaded. Behind the veil neither the jump
  // nor a rebuild's UI-thread hitch is seen; the spinner is native and
  // keeps turning through that hitch (owner: no scroll back across every
  // slide). The spinner only shows once the wait has gone on a while, so
  // a quick restart is a dip, not a flash of a spinner.
  const [heroRestart, setHeroRestart] = useState(0);
  const restartCount = useRef(0);
  const awaitedRestart = useRef<number | null>(null);
  const veilTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [veilOpacity] = useState(() => new Animated.Value(0));
  const [veilShown, setVeilShown] = useState(false);
  const [veilSpinner, setVeilSpinner] = useState(false);
  const revealHero = useCallback(() => {
    awaitedRestart.current = null;
    veilTimers.current.forEach(clearTimeout);
    veilTimers.current = [];
    setVeilSpinner(false);
    Animated.timing(veilOpacity, {
      toValue: 0,
      duration: VEIL_FADE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setVeilShown(false);
      }
    });
  }, [veilOpacity]);
  const restartHero = useCallback(() => {
    if (awaitedRestart.current !== null) {
      return;
    }
    restartCount.current += 1;
    const key = restartCount.current;
    awaitedRestart.current = key;
    setVeilShown(true);
    veilTimers.current = [
      setTimeout(() => setVeilSpinner(true), VEIL_SPINNER_DELAY_MS),
      // Never left dark: a backdrop that neither loads nor fails in time.
      setTimeout(revealHero, VEIL_MAX_MS),
    ];
    Animated.timing(veilOpacity, {
      toValue: 1,
      duration: VEIL_FADE_MS,
      useNativeDriver: true,
    }).start(() => {
      settleHero();
      setHeroRestart(key);
    });
  }, [settleHero, veilOpacity, revealHero]);
  const handleFirstSlideShown = useCallback(
    (restartKey: number) => {
      if (
        awaitedRestart.current !== null &&
        restartKey >= awaitedRestart.current
      ) {
        revealHero();
      }
    },
    [revealHero],
  );
  useEffect(
    () => () => {
      veilTimers.current.forEach(clearTimeout);
    },
    [],
  );

  // On leaving Home (a push over it, or another tab), so the rebuild runs
  // while Home is out of sight, and on coming back, for changes made
  // elsewhere; each a transition later, so it never runs during one.
  const navigation = useNavigation();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const settleLater = () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(settleHero, SCREEN_TRANSITION_MS);
    };
    const offBlur = navigation.addListener("blur", settleLater);
    const offFocus = navigation.addListener("focus", settleLater);
    // Home's tab tapped while on Home (also scrolls back to the hero,
    // useScrollToTop below); from another tab, the focus above settles.
    const tabs = navigation as unknown as TabScreenNavigation;
    const offTabPress = tabs.addListener("tabPress", () => {
      if (tabs.isFocused()) {
        restartHero();
      }
    });
    return () => {
      offBlur();
      offFocus();
      offTabPress();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [navigation, settleHero, restartHero]);

  // The day Top picks is ordered by: a new day takes effect when Home
  // regains focus or on a pull, never while the user is on the row
  // (CRI-131).
  const { day: settledDay, settle: settleDay } = useSettledDay();
  useFocusEffect(settleDay);

  const handleRefresh = useCallback(async () => {
    settleDay();
    // At the pull, and again with what the refetch brought: the spinner
    // already says work is going on.
    settleHero();
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      settleHero();
      setRefreshing(false);
    }
  }, [refetch, settleDay, settleHero]);

  // CRI-95: hide the splash once there is something to show.
  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
    }
  }, [isReady]);

  const state = deriveHomeViewState({
    followedCount,
    isLoading,
    isError,
    showsWithEpisodeToday,
    nextDayEpisodes,
  });

  const followedShowList = useMemo(
    () => followedShows.map(({ show }) => show),
    [followedShows],
  );

  const openSearch = useOpenSearch();

  // Shows followed from the rows stay in them, marked, while the user
  // stays on Home, so a follow can be undone; they go when Home's tab is
  // selected again after another tab (CRI-131).
  const { hidden: settledFollowed, settle } = useSettledFollowed();
  useTabReturn(settle);

  // What sits at the top of the page, above the rows: one of these.
  const top = {
    heroPager: heroSlides.length > 0,
    nextDayPager: heroSlides.length === 0 && state.kind === "next-day",
    addFirstShow: state.kind === "empty-follow-list",
    noUpcoming: state.kind === "no-upcoming",
    error: state.kind === "error",
    loading: state.kind === "loading",
  };
  // "Airing this week"'s place among the page's children: after the top
  // block and "Top picks for you" (always mounted).
  const airingIndex = Object.values(top).filter(Boolean).length + 1;

  // The header (logo) is shown over the hero only, for now (CRI-124).
  const showsHero =
    isReady && (heroSlides.length > 0 || state.kind === "next-day");

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
  const [scrolledDown, setScrolledDown] = useState(false);

  // The hero's own height, to tell whether it is still on screen: the hero
  // pager keeps auto-advancing and silently paging itself (goToPage) while
  // scrolled out of view, same as it always has, but that scrollToIndex
  // races the outer vertical scroll on a real device and can settle on the
  // wrong physical slot (a black frame on the wrap, or a slide's text over
  // another slide's backdrop once scrolled back up) instead of just
  // failing loudly. Pausing it the same way touching/focus/background
  // already do (HeroPager's own auto-advance effect) avoids the race
  // instead of chasing its visible symptoms.
  const heroHeight = useMemo(
    () => heroLayout(height, insets.top).heroHeight,
    [height, insets.top],
  );
  const [heroOffscreen, setHeroOffscreen] = useState(false);

  const handlePullRestOffsetCapture = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentInset, contentOffset } = event.nativeEvent;
      const candidate = -contentInset.top;
      // Scrolled down into the page, not at its top (or pulled): only then
      // does a row opening above keep what is on screen in place.
      setScrolledDown(contentOffset.y > candidate + SCROLLED_DOWN_MIN);
      setHeroOffscreen(contentOffset.y > candidate + heroHeight);
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
    [heroHeight],
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

  // The posters in the rows are dimmed at rest and lighten as Home
  // scrolls, gone once the first row's heading reaches the middle of the
  // screen (CRI-124, an experiment). Reanimated reads the scroll offset
  // on the UI thread.
  const reanimatedScrollRef = useAnimatedRef();
  // iOS convention (CRI-131): tapping Home while on Home scrolls back to
  // the hero; the rows keep their own positions.
  useScrollToTop(reanimatedScrollRef as never);
  const reanimatedScrollOffset = useScrollOffset(reanimatedScrollRef);
  const dimEndScroll = posterDimEndScroll(heroHeight, height);
  const posterDim = useDerivedValue(() =>
    posterDimAt(reanimatedScrollOffset.value, dimEndScroll),
  );

  // How far the page is scrolled from its resting top, negative during a
  // pull: the header leaves with the content and stays put on a pull.
  const scrollOffset = useMemo(
    () => Animated.subtract(scrollY, pullRestOffsetY ?? 0),
    [scrollY, pullRestOffsetY],
  );

  // The status bar scrim shows once the header has left with the scroll.
  const statusBarScrimOpacity = useMemo(
    () =>
      scrollOffset.interpolate({
        inputRange: [0, insets.top + HEADER_BAR_HEIGHT],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [scrollOffset, insets.top],
  );

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <PosterDimContext.Provider value={posterDim}>
        <Animated.ScrollView
          ref={reanimatedScrollRef as never}
          testID="home-scroll"
          // When "Top picks for you" opens above "Airing this week" (a
          // follow from an Airing card, say), what is on screen stays in
          // place while scrolled down: the page keeps "Airing this week"
          // where it is (CRI-125). At the top of the page the hero stays
          // put instead, and the row opens below it.
          maintainVisibleContentPosition={
            scrolledDown ? { minIndexForVisible: airingIndex } : undefined
          }
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
              {top.heroPager && (
                <HeroPager
                  // A new set of slides starts a fresh pager (heroPagerKey),
                  // only once settled (heroPagerSlides).
                  key={heroPagerKey(heroPagerSlides)}
                  slides={heroPagerSlides}
                  todayDate={todayDate}
                  pullDistance={pullDistance}
                  heroVisible={!heroOffscreen}
                  restartKey={heroRestart}
                  onFirstSlideShown={handleFirstSlideShown}
                />
              )}

              {/* Nothing followed has an episode within the horizon: fall back
              to the single nearest upcoming day, same as before the 7-day
              horizon. */}
              {/* The same condition as top.nextDayPager, written out so
                  TypeScript knows state has its shows here. */}
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
                  heroVisible={!heroOffscreen}
                  restartKey={heroRestart}
                  onFirstSlideShown={handleFirstSlideShown}
                />
              )}

              {top.addFirstShow && (
                <AddFirstShow
                  onPress={openSearch}
                  testID="home-empty-state"
                  buttonTestID="home-add-show"
                />
              )}

              {top.noUpcoming && (
                <Text style={styles.quietLine}>Nothing upcoming.</Text>
              )}

              {top.error && (
                <Text style={styles.quietLine}>
                  Couldn&apos;t load your shows. Pull to refresh.
                </Text>
              )}

              {top.loading && (
                <Text style={styles.quietLine}>Loading your shows…</Text>
              )}

              <SettledDayContext.Provider value={settledDay}>
                <SettledFollowedContext.Provider value={settledFollowed}>
                  {/* FR-038, ADR 0016, CRI-125: always mounted; it opens
                    when it has picks and is hidden otherwise
                    (TopPicksRow). */}
                  <TopPicksRow
                    followedShows={followedShowList}
                    onSearchMore={openSearch}
                  />
                  {/* FR-039: always shown, also with an empty follow list. */}
                  <AiringThisWeekRow />
                </SettledFollowedContext.Provider>
              </SettledDayContext.Provider>
              <View style={styles.tabBarClearance} />
              {/* The hero's restart veil, over the hero only (the header
                  and its logo stay above it). Last among the page's
                  children, so it does not change "Airing this week"'s
                  place among them (airingIndex). */}
              <Animated.View
                pointerEvents={veilShown ? "auto" : "none"}
                style={[
                  styles.restartVeil,
                  { height: heroHeight, opacity: veilOpacity },
                ]}
                testID="hero-restart-veil"
              >
                {veilSpinner && (
                  <ActivityIndicator
                    size="large"
                    color={tokens.inkMuted}
                    testID="hero-restart-spinner"
                  />
                )}
              </Animated.View>
            </>
          )}
        </Animated.ScrollView>
      </PosterDimContext.Provider>

      {showsHero && (
        <Header
          left={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="On Now"
              accessibilityHint="Back to the first show, with any new ones"
              onPress={restartHero}
              // A 44pt tap target around the 20pt logo.
              hitSlop={12}
              testID="app-logo-button"
            >
              <AppLogo height={APP_LOGO_HEIGHT} color={tokens.ink} />
            </Pressable>
          }
          scrollOffset={scrollOffset}
        />
      )}

      {/* Under the status bar once the header has left: a light dark
          gradient, no blur, so the clock and icons read over bright
          posters while nothing is smeared (CRI-124). It fades in as the
          header leaves. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.statusBarScrim,
          { height: insets.top, opacity: statusBarScrimOpacity },
        ]}
        testID="home-status-bar-scrim"
      />

      <PullToRefreshIndicator
        pullDistance={pullDistance}
        refreshing={refreshing}
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
  reduceMotionEnabled,
  topInset,
}: {
  pullDistance: Animated.AnimatedInterpolation<number>;
  refreshing: boolean;
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
  restartVeil: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.bg,
  },
  // The rows clear the translucent tab bar at the end of the page.
  tabBarClearance: {
    height: TAB_BAR_HEIGHT + tokens.space4,
  },
  statusBarScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    experimental_backgroundImage:
      "linear-gradient(to bottom, rgba(11,12,15,0.55) 0%, rgba(11,12,15,0) 100%)",
  },
  pullIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
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
