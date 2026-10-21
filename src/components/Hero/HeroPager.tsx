// The Home hero carousel: a bidirectional-looping, auto-advancing,
// horizontally paging FlatList of HeroSlides, with a backdrop
// parallax/crossfade per page (HeroPage) and a fixed text/logo/meta/
// Open-in overlay (ContentLayer), both siblings of the paging list rather
// than part of each slide. The vertical layout comes from heroLayout
// (logic/hero-layout.ts, through useHeroLayout).

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  Animated,
  FlatList,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useIsFocused } from "expo-router";

import { useAccessibilityFlags } from "@/hooks/useAccessibilityFlags";
import {
  contentMountFrames,
  flickReleaseTarget,
  heroPagerKey,
  isLoopWrapSlot,
  logicalToPhysical,
  loopSlideData,
  pagingReleaseTarget,
  physicalToLogical,
  type HeroSlide,
} from "@/logic/hero-carousel";
import { topScrimGradient } from "@/logic/hero-layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProgressiveBlur } from "../ProgressiveBlur";
import { ContentLayer, HeroPage, useHeroLayout } from "./HeroPage";
import { PageIndicator } from "./PageIndicator";

// FlatList is VirtualizedList-based: native-driven onScroll (below, for the
// backdrop parallax and slide crossfade) needs it wrapped in
// Animated.createAnimatedComponent. Cast back to FlatList's own type so
// generics, props and the ref keep working exactly as before.
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList,
) as unknown as typeof FlatList;

// One constant, easy to change: how long each slide dwells before the
// carousel auto-advances to the next one.
const AUTO_ADVANCE_MS = 6000;

// The fade into bg from the pill's top to the hero's end, with the blur:
// light down to the seam (about halfway), so the soft image keeps its own
// tone around the title, then into solid bg towards the dots. Eased, so it
// has no visible edge.
const FADE_GRADIENT =
  "linear-gradient(to bottom, rgba(11,12,15,0) 0%, rgba(11,12,15,0.1) 25%, rgba(11,12,15,0.22) 47%, rgba(11,12,15,0.48) 65%, rgba(11,12,15,0.8) 82%, rgba(11,12,15,1) 95%)";
// How strong the blur over the mirror zone gets: the image reads as
// almost one colour there.
const MIRROR_BLUR_INTENSITY = 80;

// Whether the app is in the foreground. Auto-advance pauses in the
// background (CRI-124).
function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState !== "background");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) =>
      setActive(status === "active"),
    );
    return () => subscription.remove();
  }, []);
  return active;
}

export function HeroPager({
  slides,
  todayDate,
  pullDistance,
  heroVisible,
}: {
  slides: HeroSlide[];
  todayDate: string;
  // How far the enclosing ScrollView has been pulled past its resting top,
  // in points, clamped to 0 outside overscroll (see index.tsx).
  // Native-driven; passed straight through to each HeroPage for the
  // pull-to-refresh backdrop stretch, which is the only thing it affects
  // here (horizontal paging, parallax, crossfade and the dot indicator
  // don't reference it at all).
  pullDistance: Animated.AnimatedInterpolation<number>;
  // Whether the hero itself is still on screen, not scrolled past (see
  // index.tsx's heroOffscreen). Auto-advance pauses off screen, same as it
  // already does under a finger or in the background: its own
  // scrollToIndex races the outer scroll off screen and can settle on the
  // wrong physical slot once it's back in view.
  heroVisible: boolean;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topScrim = useMemo(() => topScrimGradient(insets.top), [insets.top]);
  const {
    heroHeight,
    imageHeight,
    blurTop,
    fadeTop,
    topGradientHeight,
    dotsTop,
  } = useHeroLayout();
  // The blur is full by the seam, so the mirror's symmetry does not read.
  const blurFullAt = (imageHeight - blurTop) / (heroHeight - blurTop);
  const { reduceMotionEnabled, screenReaderEnabled } = useAccessibilityFlags();
  // Auto-advance pauses, on the same slide, while Home is not the focused
  // tab or the app is in the background, as it does under a finger
  // (CRI-124).
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const pageCount = slides.length;

  // The FlatList's own data, padded for the loop (loopSlideData above);
  // pageCount stays the LOGICAL slide count throughout this component,
  // physicalPageCount the padded count (pageCount + 2 for pageCount > 1,
  // otherwise the same as pageCount).
  const physicalSlides = useMemo(() => loopSlideData(slides), [slides]);
  const physicalPageCount = physicalSlides.length;

  const [pageIndex, setPageIndex] = useState(0);
  // By show id, not logical index: a slide's logical index can change
  // when the slides array does (a follow or unfollow elsewhere, no
  // longer a full pager remount, see the reposition effect below), and a
  // Set keyed by index would then read another show's old "loaded" entry
  // for whichever show now sits there, or lose a still-loaded show's own
  // entry because it moved.
  const [loadedShowIds, setLoadedShowIds] = useState<Set<number>>(new Set());
  const [touching, setTouching] = useState(false);

  const listRef = useRef<FlatList<HeroSlide>>(null);
  // useState, not useRef(new Animated.Value()).current: reading a ref's
  // .current during render is unsafe under the React Compiler.
  const [progressAnim] = useState(() => new Animated.Value(0));
  // Read by the auto-advance effect's completion callback instead of
  // closing over pageIndex directly, so a callback that somehow fires
  // after pageIndex has moved on (rather than being cancelled by the
  // effect's own cleanup) still advances from the real current page, not
  // a stale one.
  const pageIndexRef = useRef(pageIndex);
  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);

  // The settled slide's own show id, updated at the same moment as
  // pageIndex everywhere it's set (goToPage, handleScrollEndDrag,
  // handleScrollEnd), not reactively off pageIndex itself: the reposition
  // effect below (a slides change, not a swipe) needs this slide's
  // identity from BEFORE the slides array updates, to find where it
  // landed in the new one, and a ref reacting to the new pageIndex/slides
  // together could run after that array already changed.
  const currentShowIdRef = useRef<number | null>(slides[0]?.show.id ?? null);

  // Where the FlatList's own physical scroll position actually is (or is
  // headed to), as opposed to pageIndex above, which is always the
  // LOGICAL page: mirrors physicalToLogical(this, pageCount) === pageIndex
  // whenever the physical position is a slide's own real slot, but can
  // briefly point at one of the two duplicate wrap slots (loopSlideData)
  // between a swipe release and handleScrollEnd's silent snap back off of
  // it. Kept as an explicit ref rather than derived from pageIndex via
  // logicalToPhysical, since a duplicate slot has no logical index of its
  // own to derive it from.
  const physicalIndexRef = useRef(logicalToPhysical(pageIndex, pageCount));

  // The physical position physicalIndexRef held when the current drag
  // began, read at onScrollBeginDrag: handleScrollEndDrag clamps that
  // drag's own release target to at most one physical page away from
  // this, not from whatever page was current before some earlier drag. A
  // second swipe started mid-momentum (interrupting the first one's
  // deceleration) gets its own start page this way, since
  // physicalIndexRef is already updated to the first swipe's committed
  // target by the time the interrupting drag begins.
  const dragStartPageRef = useRef(logicalToPhysical(pageIndex, pageCount));

  // Raw horizontal scroll offset, native driver: drives the backdrop
  // parallax and slide crossfade per page, and (via the listener below)
  // the dot indicator's position, all in real time with the swipe.
  //
  // Seeded to the loop's own opening physical offset (logical slide 0 lives
  // at physical slot 1 once loopSlideData pads a duplicate last slide in
  // front, logicalToPhysical), NOT 0. Every backdrop's opacity/parallax and
  // every ContentLayer's crossfade is a function of scrollX, so a scrollX of
  // 0 on the very first frame reads as physical slot 0 (the duplicate of the
  // LAST slide): its backdrop interpolates to full opacity and
  // logicalCrossfadePosition lands on count - 1, painting the last slide
  // over slide 0 until the first real scroll event moves scrollX off 0.
  // Seeding it to match initialContentOffset below keeps the Animated
  // display layer aligned with the native scroll position from frame one,
  // cold launch included. Frozen at mount like initialContentOffset (width
  // and pageCount are read once); scroll events drive it thereafter.
  const [scrollX] = useState(
    () => new Animated.Value(width * logicalToPhysical(0, pageCount)),
  );
  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
      }),
    [scrollX],
  );

  // The loop's opening native scroll position, frozen at mount. Paired with
  // initialScrollIndex on the list below: VirtualizedList applies a
  // contentOffset natively at ScrollView creation, before the first paint,
  // and when one is present deliberately SKIPS its own post-layout
  // scrollToIndex round trip (_maybeScrollToInitialScrollIndex guards on
  // contentOffset == null). That round trip is exactly what flashed on a
  // cold launch: initialScrollIndex alone only scrolls to slot 1 from inside
  // onLayout, once the content has measured, a frame or more after the list
  // first paints at offset 0 (the duplicate last slide). Frozen, not
  // tracking width: this is only the INITIAL offset, and re-applying it on a
  // later width change (rotation) would yank an already-scrolled pager back
  // to slide 0.
  const [initialContentOffset] = useState(() => ({
    x: width * logicalToPhysical(0, pageCount),
    y: 0,
  }));

  // Pull-to-refresh: pins the pager itself (the FlatList below, wrapped in
  // an Animated.View since AnimatedFlatList's own style prop is cast back
  // to plain FlatList typing and won't accept an animated transform) at a
  // fixed screen position during overscroll, countering the outer
  // ScrollView's own pullDistance downward shift. This has to happen at
  // the pager level, not by drawing HeroPage's backdrop "above" its own
  // slide: the pager is a horizontal FlatList, a native UIScrollView on
  // iOS, which clips to its own frame regardless of any `overflow` style
  // on a child, so nothing can render outside it. With the pager itself
  // pinned, each HeroPage's own backdrop only needs the top-anchored zoom
  // pullStretchTransform computes (hero-carousel.ts), not a second
  // cancellation for this same container shift.
  //
  // Off (translateY stays 0) under Reduce Motion: the scrim/content
  // overlays are siblings of the pager, not pinned, and still move down
  // with the pull as ever (unaffected either way); pinning ONLY the
  // pager while leaving those unpinned would separate the backdrop from
  // them instead of matching the pre-feature look Reduce Motion should
  // keep (see HeroPage's own reduceMotionEnabled gate on pullTransform).
  const pagerPinTranslateY = useMemo(
    () => (reduceMotionEnabled ? 0 : Animated.multiply(pullDistance, -1)),
    [reduceMotionEnabled, pullDistance],
  );

  // Clamped to the current slides array: pageIndex itself can briefly
  // point past its end for one render when the slides array shrinks (the
  // currently shown show leaving the horizon), the reposition effect
  // below being the fix for it, but that effect runs after this render,
  // not before it. Everything below that indexes into `slides` with
  // pageIndex uses this instead, so that one render stays safe (reads as
  // the nearest still-valid slide) rather than crashing on
  // slides[pageIndex] being undefined.
  const safePageIndex = pageCount > 0 ? Math.min(pageIndex, pageCount - 1) : 0;

  // Which LOGICAL slides mount a ContentLayer (logo/title/meta/Open-in),
  // below (contentMountFrames, hero-carousel.ts): the settled page plus one
  // neighbour on each side, so whichever page a single swipe lands on already
  // has its layer mounted (with its own native crossfade already live, see
  // ContentLayer) before it's ever reached, rather than needing a JS round
  // trip to swap data in once it is. Under Reduce Motion there's no
  // crossfade to pre-mount for: content swaps the instant pageIndex does,
  // so only the current page is rendered. (This replaces an earlier
  // design with a single shared ContentLayer whose slide data and opacity
  // were both driven by a JS-tracked "nearest page" index: that index
  // update crossed the bridge a beat behind the backdrop's own native
  // crossfade, which is why the content used to visibly lag a slide
  // change instead of changing with it.)
  const contentFrames = reduceMotionEnabled
    ? [safePageIndex]
    : contentMountFrames(pageCount, safePageIndex);

  // The shared basis for every mounted ContentLayer's own crossfade
  // (logicalCrossfadePosition on each one, below): a slide's continuous
  // LOGICAL position, 0..pageCount, periodic in scrollX. Built once here
  // (not per ContentLayer instance) since every instance's formula is
  // identical except for which logical index it peaks at; hoisting it
  // means that per-index peak is the only thing distinguishing them.
  //
  // Physical scrollX / width is a slide's own real physical slot (see
  // logicalToPhysical) one page further along than its logical index, so
  // subtracting 1 undoes that offset; wrapping the result into [0, count)
  // (Animated.modulo, which unlike JS's own % always returns a
  // non-negative result) is what makes a wrap-adjacent neighbour's
  // duplicate slot (loopSlideData) and its real slot both land on the
  // SAME logical position. That's the whole point: a mounted
  // ContentLayer's crossfade never needs to know or care which physical
  // slot backs it, or be rebuilt when the silent snap moves scrollX from
  // one to the other, since both already read as the same position here.
  const logicalCrossfadePosition = useMemo(
    () =>
      Animated.modulo(
        Animated.subtract(Animated.divide(scrollX, width), 1),
        pageCount,
      ),
    [scrollX, width, pageCount],
  );

  const canAutoAdvance =
    pageCount > 1 &&
    !reduceMotionEnabled &&
    !screenReaderEnabled &&
    heroVisible;

  // Passed directly as every HeroPage instance's onBackdropLoad (no
  // per-cell wrapper needed now that it takes a show id, not a physical
  // index: HeroPage already has its own slide's show id to hand back,
  // nothing left here to convert). HeroPage is memo-wrapped specifically
  // so that HeroPager's frequent, largely unrelated re-renders (touching,
  // loadedShowIds, pageIndex) don't cascade into re-rendering every
  // mounted pager cell (and, inside each, re-running
  // useShowImages/useStreamingService) each time, but that only works if
  // every prop it receives is actually stable across those re-renders; a
  // fresh closure here on every render would defeat it by itself,
  // regardless of what HeroPage does internally, which is why this is
  // still its own stable useCallback rather than an inline setState call.
  const markLoaded = useCallback((showId: number) => {
    setLoadedShowIds((current) => {
      if (current.has(showId)) return current;
      const next = new Set(current);
      next.add(showId);
      return next;
    });
  }, []);

  // Also memoized for the same reason as markLoaded above: a fresh
  // renderItem function on every HeroPager render is a well-known
  // FlatList/VirtualizedList performance pitfall (RN's own "large list
  // slow to update" warning specifically calls this out), independent of
  // whatever HeroPage itself does.
  const renderItem = useCallback(
    ({ item, index }: { item: HeroSlide; index: number }) => (
      <HeroPage
        item={item}
        index={index}
        width={width}
        todayDate={todayDate}
        scrollX={scrollX}
        reduceMotionEnabled={reduceMotionEnabled}
        pullDistance={pullDistance}
        onBackdropLoad={markLoaded}
      />
    ),
    [width, todayDate, scrollX, reduceMotionEnabled, pullDistance, markLoaded],
  );

  // direction is which way `index` was reached (+1 forward, -1 back),
  // always known at both call sites (auto-advance is always forward;
  // VoiceOver's onAdjust already has it as its own delta): it decides the
  // physical scroll target on a wrap. Animated (auto-advance; Reduce
  // Motion is never on there, since canAutoAdvance excludes it): scrolls
  // to physicalIndexRef.current + direction, the physically adjacent
  // slot, so wrapping from the last page to the first animates FORWARD
  // onto the duplicate first slide right next to it, not backward across
  // the whole physical list to the real one; handleScrollEnd's own
  // wrap-slot check silently corrects it onto the real slot once that
  // animation settles, same as a manual swipe landing there would.
  // Non-animated (Reduce Motion, VoiceOver only): jumps straight to the
  // real slot (logicalToPhysical), skipping the duplicate entirely, since
  // there's no animation for it to matter to and no later scroll-end event
  // to rely on for a snap back (a non-animated scrollToIndex doesn't
  // reliably fire one).
  const goToPage = useCallback(
    (index: number, direction: 1 | -1) => {
      setPageIndex(index);
      currentShowIdRef.current = slides[index]?.show.id ?? null;
      const physicalTarget = reduceMotionEnabled
        ? logicalToPhysical(index, pageCount)
        : physicalIndexRef.current + direction;
      physicalIndexRef.current = physicalTarget;
      listRef.current?.scrollToIndex({
        index: physicalTarget,
        animated: !reduceMotionEnabled,
      });
    },
    [reduceMotionEnabled, pageCount, slides],
  );

  // Which page progressAnim's current run belongs to, so this effect can
  // tell "a new page settled" (reset to 0) apart from "touching changed on
  // the same page" (pause/resume in place) despite both re-running this
  // same effect. The active dot's own pill body is a fixed PILL_WIDTH the
  // whole time it's active (Dot, in PageIndicator.tsx); only progressAnim's
  // value (how much of the pill's fill is showing) should ever move, and
  // only for these two reasons.
  const progressPageRef = useRef<number | null>(null);
  // The fill amount progressAnim held when touching last paused it, so
  // releasing resumes from there instead of restarting from 0 or jumping.
  const pausedProgressRef = useRef<number | null>(null);

  // The dwell countdown for the current slide: a single timer, so at most
  // one is ever live. Effect cleanup (returned below) stops any in-flight
  // timer BEFORE the next run starts a new one or decides not to: a
  // manual swipe (touching -> true) freezes the countdown in place rather
  // than cancelling or resetting it, and letting go (touching -> false)
  // resumes it for whatever time is left, never a queued or overlapping
  // timer. `finished` is only true when the timer ran to completion on
  // its own; `.stop()` (from cleanup, or from React unmounting/re-running
  // this effect) reports finished: false, so a stopped/paused timer can
  // never itself call goToPage.
  useEffect(() => {
    let startValue = 0;
    if (progressPageRef.current !== pageIndex) {
      // A genuinely new page: start its fill from empty, regardless of
      // whatever the previous page's fill last held.
      progressPageRef.current = pageIndex;
      pausedProgressRef.current = null;
      progressAnim.setValue(0);
    } else if (pausedProgressRef.current !== null) {
      // Resuming the same page's countdown after a pause: pick up the
      // fill amount right where it was frozen, not from 0.
      startValue = pausedProgressRef.current;
      pausedProgressRef.current = null;
    }

    const paused = touching || !isFocused || !appActive;
    const currentShowId = slides[pageIndex]?.show.id;
    if (
      !canAutoAdvance ||
      paused ||
      currentShowId === undefined ||
      !loadedShowIds.has(currentShowId)
    ) {
      // Reads the current value (already frozen by the cleanup below, if
      // there was a running animation to freeze) rather than assuming
      // `startValue`, so repeated pauses without an intervening resume
      // still capture the true current fill each time.
      progressAnim.stopAnimation((value) => {
        pausedProgressRef.current = value;
      });
      return;
    }

    const remaining = AUTO_ADVANCE_MS * (1 - startValue);
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: Math.max(remaining, 0),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) {
        goToPage((pageIndexRef.current + 1) % pageCount, 1);
      }
    });

    return () => animation.stop();
  }, [
    pageIndex,
    touching,
    isFocused,
    appActive,
    canAutoAdvance,
    loadedShowIds,
    slides,
    pageCount,
    goToPage,
    progressAnim,
  ]);

  // Commits pageIndex (and touching) at the moment the finger releases,
  // rather than at onMomentumScrollEnd: see pagingReleaseTarget
  // (hero-carousel.ts) for why. Both setState calls happen in this one
  // handler so React batches them into a single render; splitting them
  // (as the previous onScrollBeginDrag/onScrollEndDrag pair did, each only
  // touching `touching`) let the auto-advance effect briefly see
  // touching=false on the OLD page and resume its countdown there before
  // pageIndex caught up.
  //
  // pagingReleaseTarget itself needs no loop-awareness at all: called with
  // the PHYSICAL page count and start (padded by loopSlideData, per
  // physicalIndexRef), page N - 1's "next" physical neighbour already IS
  // the duplicate first slide, and page 0's "previous" already IS the
  // duplicate last slide, so a release past either edge naturally lands
  // on the correct wrap target with no special-casing here. The result is
  // still only ever converted to a LOGICAL pageIndex (physicalToLogical)
  // before being committed; if it landed on a duplicate slot,
  // handleScrollEnd is what silently corrects the physical position once
  // the scroll genuinely settles there, not this handler (see its own
  // comment for why not here).
  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const {
        contentOffset,
        layoutMeasurement,
        velocity,
        targetContentOffset,
      } = event.nativeEvent;
      if (layoutMeasurement.width === 0) {
        setTouching(false);
        return;
      }
      // A short, fast flick changes slide even where UIKit's own paging
      // would spring back (CRI-124): then the native target is replaced
      // with the flick's, and the list scrolls there itself.
      const flick = flickReleaseTarget(
        contentOffset.x,
        layoutMeasurement.width,
        physicalPageCount,
        dragStartPageRef.current,
        velocity?.x ?? 0,
      );
      const target =
        flick ??
        pagingReleaseTarget(
          contentOffset.x,
          layoutMeasurement.width,
          physicalPageCount,
          dragStartPageRef.current,
          velocity?.x ?? 0,
          targetContentOffset?.x ?? null,
        );
      const nativeTarget =
        targetContentOffset &&
        Math.round(targetContentOffset.x / layoutMeasurement.width);
      if (flick !== null && flick !== nativeTarget) {
        listRef.current?.scrollToOffset({
          offset: flick * layoutMeasurement.width,
          animated: true,
        });
      }
      physicalIndexRef.current = target;
      const settledLogical = physicalToLogical(target, pageCount);
      setPageIndex(settledLogical);
      currentShowIdRef.current = slides[settledLogical]?.show.id ?? null;
      setTouching(false);
    },
    [pageCount, physicalPageCount, slides],
  );

  // Safety net: corrects pageIndex if the scroll actually settles somewhere
  // other than what handleScrollEndDrag already committed (the release
  // estimate was wrong, or Reduce Motion/goToPage's non-animated jump
  // landed here with no drag at all). Setting the same index it already
  // holds is a no-op: React bails out of a state update when the value is
  // unchanged, so the auto-advance effect (keyed on pageIndex) simply
  // doesn't re-run and progressAnim's fill is untouched.
  //
  // Also where a landing on one of loopSlideData's two duplicate slots
  // gets silently corrected, not handleScrollEndDrag: forcing the physical
  // scroll position elsewhere while the native scroll is still actively
  // decelerating toward it (as it still is right at release) risks a
  // visible hitch; waiting for the native scroll to genuinely be at rest
  // here (onMomentumScrollEnd) avoids fighting that in-flight animation.
  // The reposition itself (scrollToIndex, animated: false) is what stays
  // invisible: the duplicate slot and the real slot it's replaced by show
  // the exact same frame at the exact same settled position, and pageIndex
  // itself was already committed to its correct (wrapped) LOGICAL value
  // back at release, so this never triggers a second, redundant page
  // change of its own.
  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      if (layoutMeasurement.width === 0) {
        return;
      }
      const settled = Math.min(
        Math.max(Math.round(contentOffset.x / layoutMeasurement.width), 0),
        physicalPageCount - 1,
      );
      const settledLogical = physicalToLogical(settled, pageCount);
      setPageIndex(settledLogical);
      currentShowIdRef.current = slides[settledLogical]?.show.id ?? null;

      if (isLoopWrapSlot(settled, pageCount)) {
        const realSlot = logicalToPhysical(settledLogical, pageCount);
        physicalIndexRef.current = realSlot;
        listRef.current?.scrollToIndex({ index: realSlot, animated: false });
      } else {
        physicalIndexRef.current = settled;
      }
    },
    [pageCount, physicalPageCount, slides],
  );

  // Keeps the pager showing the same slide across a slides change (a
  // follow or unfollow elsewhere adding or removing a show), rather than
  // Home remounting a fresh pager from slide 0 every time (CRI-114's
  // original fix for a different bug: a SHRUNK slide count could leave
  // pageIndex pointing past the last slide and crash). Remounting also
  // meant every mounted HeroPage lost its loaded image and its
  // Open-in button's streaming lookup had to run again from scratch, a
  // real (not merely animated) loading flash on whichever show landed on
  // slide 1 of the new pager (owner's diagnosis, tracing back to Home's
  // "Airing this week" row, the one row that can make this happen: it
  // excludes shows already in the hero, so following a card there always
  // changes the hero's own slide set on the same tap).
  //
  // slidesKey (heroPagerKey, the shows' ids in order) stands in for the
  // slides array's own identity, the same string Home used to key a full
  // remount on; comparing it here, instead of comparing `slides` itself,
  // means a re-render that creates a new array with the SAME shows
  // (findHeroSlides runs fresh each time Home renders) is correctly seen
  // as no change at all, not a reposition to run every render.
  //
  // Skipped on mount (prevSlidesKeyRef's initial value already matches
  // the first render's slidesKey, so the first comparison is always
  // equal): running this on mount would fight the cold-launch seeding
  // above (scrollX, initialContentOffset) with a redundant scrollToIndex,
  // risking exactly the flash that seeding exists to prevent.
  //
  // useLayoutEffect, not useEffect: a shrunk slides array can leave
  // pageIndex pointing past its own end for exactly the render that
  // triggers this (safePageIndex above keeps that one render safe, not
  // accurate), and this is what corrects pageIndex itself to a real
  // target; running before paint means that merely-safe render is never
  // actually shown, only the corrected one.
  const slidesKey = useMemo(() => heroPagerKey(slides), [slides]);
  const prevSlidesKeyRef = useRef(slidesKey);
  useLayoutEffect(() => {
    if (slidesKey === prevSlidesKeyRef.current) {
      return;
    }
    prevSlidesKeyRef.current = slidesKey;
    if (pageCount === 0) {
      // Home unmounts the pager entirely in this case (heroSlides.length
      // > 0 gates it); nothing left to reposition.
      return;
    }
    // The settled slide's own show, wherever it ended up in the new
    // array; if it left altogether (the show itself was unfollowed),
    // clamped to the nearest still-valid logical index instead, the same
    // "don't point past the end" guarantee CRI-114's remount gave by
    // starting over at 0, kept here without starting over.
    const matchIndex = slides.findIndex(
      (slide) => slide.show.id === currentShowIdRef.current,
    );
    const newIndex =
      matchIndex >= 0
        ? matchIndex
        : Math.min(pageIndexRef.current, pageCount - 1);
    const physicalTarget = logicalToPhysical(newIndex, pageCount);
    currentShowIdRef.current = slides[newIndex]?.show.id ?? null;
    physicalIndexRef.current = physicalTarget;
    dragStartPageRef.current = physicalTarget;
    setPageIndex(newIndex);
    // Not animated: the same silent-correction trick handleScrollEnd's
    // own wrap repositioning already relies on (see its comment) stays
    // imperceptible here for the same reason, the settled frame looking
    // the same before and after, as long as the jump happens between
    // scroll gestures rather than fighting one still in flight, which a
    // slides change (not a touch) never does.
    listRef.current?.scrollToIndex({ index: physicalTarget, animated: false });
  }, [slidesKey, slides, pageCount]);

  return (
    <View style={{ height: heroHeight }}>
      <Animated.View
        style={{ flex: 1, transform: [{ translateY: pagerPinTranslateY }] }}
      >
        <AnimatedFlatList
          ref={listRef}
          testID="home-pager"
          data={physicalSlides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          // Every physical slide, including both of loopSlideData's wrap
          // duplicates, stays mounted for the pager's whole life (cheap:
          // physicalPageCount is a handful of followed shows, never a long
          // list). VirtualizedList otherwise windows cells by distance from
          // where it last saw the scroll settle, and handleScrollEnd's own
          // wrap correction below moves the native scroll position with an
          // imperative, non-animated scrollToIndex, not a user scroll
          // gesture; VirtualizedList's windowing doesn't reliably treat
          // that the same way, and can judge the cell now on screen to be
          // outside its window and unmount it for a frame right as the
          // correction lands, a black flash exactly on the wrap (the
          // owner's own diagnosis). Keeping every cell permanently mounted
          // removes the window entirely, so there is nothing for that jump
          // to desync.
          initialNumToRender={physicalPageCount}
          windowSize={physicalPageCount}
          disableVirtualization
          // physical index suffix: loopSlideData's two duplicate slots
          // hold the exact same item (same show id/episode id) as their
          // real slot, which would otherwise collide.
          keyExtractor={(item, index) =>
            `${item.show.id}-${item.episodes[0].id}-${index}`
          }
          // Uniform, full-width pages: makes scrollToIndex (goToPage,
          // handleScrollEnd's silent wrap correction) resolve synchronously
          // to the exact offset instead of an estimate awaiting
          // measurement, which matters most for that silent correction
          // staying imperceptible.
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          // Opens on logical slide 0, i.e. physical index 1 once the loop
          // pads a duplicate last slide in front of it (logicalToPhysical
          // above); physicalIndexRef's own initial value already assumes
          // this. initialScrollIndex still seeds VirtualizedList's initial
          // render window; contentOffset (frozen, above) is what actually
          // positions the native scroll before the first paint, so the list
          // never flashes physical slot 0 on a cold launch (see both
          // comments above for the full mechanism).
          initialScrollIndex={logicalToPhysical(0, pageCount)}
          contentOffset={initialContentOffset}
          onScrollBeginDrag={() => {
            dragStartPageRef.current = physicalIndexRef.current;
            setTouching(true);
          }}
          onScrollEndDrag={handleScrollEndDrag}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={renderItem}
        />
        {/* Pinned with the backdrop, so it stays at the image's top during
            a pull. */}
        {/* Dark behind the status bar and the logo row, so the clock,
            the icons and the logo read on bright images; over each slide's
            image-toned top blur (HeroPage), and fading out below the logo
            row (topScrimGradient). */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height: topGradientHeight,
            experimental_backgroundImage: topScrim,
          }}
          testID="hero-top-scrim"
        />
      </Animated.View>

      {/* Over the hero's lower part, once for all slides rather than per
          slide, and not part of the pinned pager: on a pull the backdrop
          stretches down from its pinned top, so its seam moves down with
          the pull, as these do. First the progressive blur, which starts
          at the pill's top on the image itself and is full by the seam, so
          the mirror's symmetry does not read; then the fade into bg. Both horizontally uniform, so nothing slides or
          seams with a swipe. One point past the end covers a rounding
          seam. */}
      <ProgressiveBlur
        intensity={MIRROR_BLUR_INTENSITY}
        fullAt={blurFullAt}
        style={{
          position: "absolute",
          left: 0,
          width,
          top: blurTop,
          height: heroHeight - blurTop,
        }}
        testID="hero-mirror-blur"
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          width,
          top: fadeTop,
          height: heroHeight - fadeTop + 1,
          experimental_backgroundImage: FADE_GRADIENT,
        }}
      />

      {contentFrames.map((logicalIndex) => (
        <ContentLayer
          key={logicalIndex}
          index={logicalIndex}
          slide={slides[logicalIndex]}
          todayDate={todayDate}
          logicalCrossfadePosition={logicalCrossfadePosition}
          pageCount={pageCount}
          reduceMotionEnabled={reduceMotionEnabled}
          interactive={logicalIndex === safePageIndex}
        />
      ))}

      {pageCount > 1 && (
        <PageIndicator
          count={pageCount}
          progressAnim={progressAnim}
          reduceMotionEnabled={reduceMotionEnabled}
          screenReaderEnabled={screenReaderEnabled}
          currentPage={safePageIndex}
          top={dotsTop}
          width={width}
          // VoiceOver: auto-advance is off (canAutoAdvance already
          // excludes it), so swiping the indicator up or down is how a
          // VoiceOver user moves between slides instead.
          onAdjust={(delta) =>
            goToPage((safePageIndex + delta + pageCount) % pageCount, delta)
          }
        />
      )}
    </View>
  );
}
