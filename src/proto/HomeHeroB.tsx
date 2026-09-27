// PROTOTYPE (proto/home-backdrop, not for merge): Home, direction B, per
// docs/design/design-system.md. Measurements are for a 390 × 844 screen and
// scale with the screen height here.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import * as Linking from "expo-linking";

import { useSwedishService } from "@/hooks/useSwedishService";
import { episodesLabel, upcomingDayLabel } from "@/logic/home";
import {
  addDays,
  localDateFromAirstamp,
  type LocalDate,
} from "@/logic/local-date";
import { serviceLink, type ServiceLink } from "@/logic/service-link";
import {
  availabilityText,
  openInLink,
  type SwedishProvider,
} from "@/logic/swedish-service";
import type {
  TvMazeEpisode,
  TvMazeShow,
  TvMazeShowWithEmbeds,
} from "@/api/tvmaze-types";
import { useAccessibilityFlags } from "./accessibility";
import { IMAGE_BASE } from "./images";
import { t, type } from "./tokens";
import { useShowImages } from "./useShowImages";

// FlatList is VirtualizedList-based: native-driven onScroll (below, for the
// backdrop parallax and slide crossfade) needs it wrapped in
// Animated.createAnimatedComponent. Cast back to FlatList's own type so
// generics, props and the ref keep working exactly as before.
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList,
) as unknown as typeof FlatList;

const REF_HEIGHT = 844;

// One constant, easy to change: how long each slide dwells before the
// carousel auto-advances to the next one.
const AUTO_ADVANCE_MS = 6000;

// PROTOTYPE: how far the backdrop trails the slide's own horizontal scroll
// (Apple TV+ style parallax), as a fraction of one page width. 0 pins the
// backdrop to the slide; 1 would move it a full page width, same as the
// content itself (no parallax at all).
export const HERO_PARALLAX_FACTOR = 0.75;

// PROTOTYPE: how visible each slide is at the mid-swipe blend point, a half
// page away from center, where the outgoing and incoming backdrops overlap.
// 1 would mean no fade at all.
export const HERO_CROSSFADE_FLOOR = 0.45;

const DOT_SIZE = 8;
const PILL_WIDTH = 24;
// Total gap between adjacent dots, split as marginHorizontal on each dot
// (DOT_SPACING / 2 per side) rather than the container's flex `gap`: see
// styles.dot.
const DOT_SPACING = 8;

// PROTOTYPE: the first or last rendered dot shrinks to this size (width and
// height, so it stays a smaller circle, not a squashed oval) when there are
// more slides beyond that edge (see dotWindowRange below): an honest "more
// this way" hint, purely by render position, not by which slide it is.
const EDGE_DOT_SIZE = 4;

// At most this many dots show at once; beyond that, the indicator shows a
// window around the active page instead of one dot per slide.
const DOT_WINDOW_SIZE = 8;
const DOT_WINDOW_HALF = Math.floor(DOT_WINDOW_SIZE / 2);

// The window of dot indices to render around the settled page, and whether
// slides exist beyond each end of it. Pure and settled-index only: the
// dots are a function of pageIndex alone, recomputed once per settle
// (see PageIndicator), never per scroll frame.
export function dotWindowRange(
  count: number,
  pageIndex: number,
): { start: number; end: number; hasMoreLeft: boolean; hasMoreRight: boolean } {
  if (count <= DOT_WINDOW_SIZE) {
    return { start: 0, end: count, hasMoreLeft: false, hasMoreRight: false };
  }
  const start = Math.max(
    0,
    Math.min(pageIndex - DOT_WINDOW_HALF, count - DOT_WINDOW_SIZE),
  );
  const end = start + DOT_WINDOW_SIZE;
  return { start, end, hasMoreLeft: start > 0, hasMoreRight: end < count };
}

export type DotKind = "normal" | "edge" | "active";

// What each rendered dot position looks like, for a given settled
// pageIndex: a pure function of dotWindowRange plus which slide is active,
// with no rendering or animation concerns of its own. The "active" check
// comes first, though it can never actually collide with "edge" in
// practice: dotWindowRange only ever flags a position as having more
// slides beyond it (hasMoreLeft/hasMoreRight) on the side where the
// window isn't pinned, which is exactly the side with enough margin from
// pageIndex for that position to never BE pageIndex.
export function dotKinds(
  count: number,
  pageIndex: number,
): { index: number; kind: DotKind }[] {
  const { start, end, hasMoreLeft, hasMoreRight } = dotWindowRange(
    count,
    pageIndex,
  );
  const kinds: { index: number; kind: DotKind }[] = [];
  for (let index = start; index < end; index++) {
    const kind: DotKind =
      index === pageIndex
        ? "active"
        : (index === start && hasMoreLeft) ||
            (index === end - 1 && hasMoreRight)
          ? "edge"
          : "normal";
    kinds.push({ index, kind });
  }
  return kinds;
}

// PROTOTYPE: how far ahead of release (onScrollEndDrag) a fast flick's
// offset is projected, when there's no native paging target to trust
// directly (see targetOffsetX below). Tuned for iOS's own velocity unit
// (points/ms, confirmed from RCTScrollViewComponentView.mm: onScrollEndDrag
// forwards UIKit's scrollViewWillEndDragging:withVelocity: value
// unmodified); a fast flick is commonly a few tenths of a point per ms, so
// 250ms projects that into a meaningful fraction of a page without
// overshooting a slow drag's small residual velocity.
const RELEASE_PROJECTION_MS = 250;

// The page a paging horizontal scroll will settle on, computed at release
// (HeroPager's onScrollEndDrag) rather than waiting for the full
// deceleration tail (onMomentumScrollEnd): pageIndex, and everything that
// follows it (dots, pill, countdown, contentMountRange), can then commit
// while the swipe is still visually mid-flight, in sync with ContentLayer's
// own native scrollX-driven crossfade, which is already most of the way
// faded in by release. Pure and exported for its own unit tests. Never
// returns more than one page away from startPage: paging can't skip pages,
// so neither can the page committed for it.
//
// targetOffsetX is UIKit's own already-computed landing offset
// (NativeScrollEvent.targetContentOffset.x; iOS only, RN's own types say
// so) and is trusted directly when present, since it already reflects
// UIKit's paging snap for a pagingEnabled scroll view, not an estimate.
// Without it (Android has no equivalent), this falls back to projecting
// the release offset forward by velocityX: what makes a fast flick that
// never crosses the halfway mark still page forward, the way the real
// paging scroll would once it decelerates, without waiting for that.
export function pagingReleaseTarget(
  offsetX: number,
  pageWidth: number,
  pageCount: number,
  startPage: number,
  velocityX: number,
  targetOffsetX: number | null,
): number {
  if (pageWidth <= 0 || pageCount <= 0) {
    return Math.min(Math.max(startPage, 0), Math.max(pageCount - 1, 0));
  }

  const clampToNeighbor = (page: number) =>
    Math.min(
      Math.max(page, Math.max(0, startPage - 1)),
      Math.min(pageCount - 1, startPage + 1),
    );

  if (targetOffsetX !== null) {
    return clampToNeighbor(Math.round(targetOffsetX / pageWidth));
  }

  const projected = offsetX + velocityX * RELEASE_PROJECTION_MS;
  return clampToNeighbor(Math.round(projected / pageWidth));
}

// The top-anchored-zoom transform for HeroPage's own backdrop on
// pull-to-refresh overscroll (Apple TV Store tab style: the backdrop's top
// edge stays screen-pinned while its height grows by exactly pullDistance).
// Pure and unit tested, since the derivation is easy to get subtly wrong: a
// transform's scale is anchored at an element's OWN CENTER, not its top, so
// scaling a backdropHeight-tall element by `scale` moves its top up by
// (scale - 1) * backdropHeight / 2 and its bottom down by the same amount.
//
// This assumes its own container is ALREADY held at a fixed screen
// position, not moving with the pull: that's HeroPager's job (a separate
// -pullDistance translateY on the pager itself, not this function's
// concern), because the pager is a horizontal FlatList, a native
// UIScrollView on iOS that clips to its own frame regardless of any
// `overflow` style on a child — so nothing can be drawn "above" it to
// simulate a pin the way this function's first version tried to. With the
// container itself fixed, all this function needs to do is cancel the
// scale's own top-rise: translateY = +pullDistance / 2. What's left, the
// bottom edge, ends up pullDistance below its resting position, the same
// shift the (separately positioned, unpinned) scrim/content overlays get
// for free from the outer ScrollView's own overscroll, so the two stay
// aligned exactly as they do at rest. HeroPage applies this same pair of
// values via Animated.multiply/add/divide on pullDistance (an Animated
// node, so this exact arithmetic can't run on it directly); this function
// is the worked-out formula those calls mirror.
export function pullStretchTransform(
  pullDistance: number,
  backdropHeight: number,
): { translateY: number; scale: number } {
  return {
    translateY: pullDistance / 2,
    scale: 1 + pullDistance / backdropHeight,
  };
}

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// PROTOTYPE: the network contradicted the "Open in" button when the two
// disagreed (Paramount+ in the meta line, "Open in SkyShowtime" below it).
// The episode itself, not the network, goes here instead; the network stays
// on Shows and Search, where there is no button to contradict.
// Exported for the dev images screen, to review every followed show's
// availability state side by side (Home only ever shows the current one).
export function homeHeroMetaLine(episodes: TvMazeEpisode[]): string {
  const code = episodesLabel(episodes);
  const title = episodes.length === 1 ? episodes[0]?.name : null;
  return title ? `${code} · ${title}` : code;
}

// PROTOTYPE: what goes where the "Open in" button would be, in one of four
// states, so Home never claims a show is unavailable when it simply has no
// answer (lookup running or failed) and never shows a stale, contradicting
// network name next to a quiet, honest note.
export type HeroAvailability =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "button"; link: ServiceLink }
  | { kind: "text"; label: string };

// PROTOTYPE: the "Open in" slot itself, one component for all four states,
// exported so the dev images screen can render the same look for forced,
// synthetic states that are hard or unsafe to reproduce live (a failed
// lookup, an unmapped service with no test-set show left to show it).
export function OpenInSlot({
  availability,
  onLayout,
}: {
  availability: HeroAvailability;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View style={styles.openInSlot} onLayout={onLayout}>
      {availability.kind === "loading" && (
        <View style={styles.buttonPlaceholder} />
      )}
      {availability.kind === "text" && (
        <Text style={styles.availabilityNote} numberOfLines={1}>
          {availability.label}
        </Text>
      )}
      {availability.kind === "button" && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open in ${availability.link.service}`}
          onPress={() => Linking.openURL(availability.link.url)}
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>
            Open in {availability.link.service}
          </Text>
        </Pressable>
      )}
      {/* kind === "none": nothing to show, height still reserved above. */}
    </View>
  );
}

export function heroAvailability(
  providers: SwedishProvider[] | null | undefined,
  isLoading: boolean,
  isError: boolean,
  officialSite: string | null,
): HeroAvailability {
  if (isLoading || providers === undefined) {
    return { kind: "loading" };
  }
  if (isError) {
    return { kind: "none" };
  }
  if (providers === null) {
    // No TMDB key (CRI-82 fallback): the TVmaze-based link, or nothing.
    const direct = serviceLink(officialSite);
    return direct ? { kind: "button", link: direct } : { kind: "none" };
  }
  const link = openInLink(providers, officialSite);
  if (link) {
    return { kind: "button", link };
  }
  return { kind: "text", label: availabilityText(providers) };
}

// PROTOTYPE: how far ahead the hero pager looks, in the same airstamp +
// device time zone terms as "today" (today through today + this many days
// minus one, inclusive). One place to change while tuning during PoC week.
export const HOME_HERO_HORIZON_DAYS = 7;

// One hero slide per episode within the horizon, never a same-show/same-day
// range (unlike the Home card's meta line): a show with two episodes on one
// day within the horizon gets two slides, not one grouped slide.
// `episodes` is non-empty by construction (findHeroSlides below always
// pushes one, and the existing single-day fallback in index.tsx keeps its
// own prior grouping); shaped as an array, not a tuple, so it stays
// interchangeable with ShowEpisodesToday for that fallback.
export interface HeroSlide {
  show: TvMazeShow;
  episodes: TvMazeEpisode[];
  localDate: LocalDate;
}

// Every followed show's episode airing from today through
// HOME_HERO_HORIZON_DAYS - 1 days out, one slide each, in chronological
// order. Airstamp + device time zone decide "today" and the horizon
// boundary (episodes-today.ts, local-date.ts), not airdate: a show with an
// episode today still starts the pager on today, not tomorrow.
export function findHeroSlides(
  followedShows: { show: TvMazeShow; episodes: TvMazeEpisode[] }[],
  timeZone: string,
  todayDate: LocalDate,
): HeroSlide[] {
  const horizonEnd = addDays(todayDate, HOME_HERO_HORIZON_DAYS - 1);
  const slides: HeroSlide[] = [];

  for (const { show, episodes } of followedShows) {
    for (const episode of episodes) {
      const localDate = localDateFromAirstamp(episode.airstamp, timeZone);
      if (localDate >= todayDate && localDate <= horizonEnd) {
        slides.push({ show, episodes: [episode], localDate });
      }
    }
  }

  // Chronological order (todayDate first, when present) is also what makes
  // the pager open on today's episode, or otherwise the nearest upcoming
  // one: whichever sorts first, at index 0.
  return slides.sort((a, b) => {
    if (a.localDate !== b.localDate) {
      return a.localDate < b.localDate ? -1 : 1;
    }
    return a.episodes[0].airstamp.localeCompare(b.episodes[0].airstamp);
  });
}

// "TODAY", "TOMORROW", or the weekday/date further out (same formatting as
// Home's next-day badge, logic/home.ts), always upper case to match.
export function heroDayLabel(
  localDate: LocalDate,
  todayDate: LocalDate,
): string {
  return localDate === todayDate
    ? "TODAY"
    : upcomingDayLabel(localDate, todayDate);
}

export function HeroPager({
  slides,
  badgeFor,
  todayDate,
  pullDistance,
}: {
  slides: HeroSlide[];
  badgeFor: (pageIndex: number) => string;
  todayDate: string;
  // PROTOTYPE (proto/home-backdrop): how far the enclosing ScrollView has
  // been pulled past its resting top, in points, clamped to 0 outside
  // overscroll (see index.tsx). Native-driven; passed straight through to
  // each HeroPage for the pull-to-refresh backdrop stretch, which is the
  // only thing it affects here (horizontal paging, parallax, crossfade and
  // the dot indicator don't reference it at all).
  pullDistance: Animated.AnimatedInterpolation<number>;
}) {
  const { width, height } = useWindowDimensions();
  const scale = height / REF_HEIGHT;
  const { reduceMotionEnabled, screenReaderEnabled } = useAccessibilityFlags();
  const pageCount = slides.length;

  const [pageIndex, setPageIndex] = useState(0);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [indicatorAnchorY, setIndicatorAnchorY] = useState<number | null>(null);
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

  // The page pageIndexRef held when the current drag began, read at
  // onScrollBeginDrag: handleScrollEndDrag clamps that drag's own release
  // target to at most one page away from this, not from whatever page was
  // current before some earlier drag. A second swipe started mid-momentum
  // (interrupting the first one's deceleration) gets its own start page
  // this way, since pageIndexRef is already updated to the first swipe's
  // committed target by the time the interrupting drag begins.
  const dragStartPageRef = useRef(pageIndex);

  // Raw horizontal scroll offset, native driver: drives the backdrop
  // parallax and slide crossfade per page, and (via the listener below)
  // the dot indicator's position, all in real time with the swipe.
  const [scrollX] = useState(() => new Animated.Value(0));
  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
      }),
    [scrollX],
  );

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
  // pullStretchTransform computes (see above), not a second cancellation
  // for this same container shift.
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

  // Which slides mount a ContentLayer (logo/title/meta/Open-in), below:
  // the settled page plus one neighbour on each side, so whichever page a
  // single swipe lands on already has its layer mounted (with its own
  // native crossfade already live, see ContentLayer) before it's ever
  // reached, rather than needing a JS round trip to swap data in once it
  // is. Under Reduce Motion there's no crossfade to pre-mount for: content
  // swaps the instant pageIndex does, so only the current page is
  // rendered. (This replaces an earlier design with a single shared
  // ContentLayer whose slide data and opacity were both driven by a
  // JS-tracked "nearest page" index: that index update crossed the bridge
  // a beat behind the backdrop's own native crossfade, which is why the
  // content used to visibly lag a slide change instead of changing with
  // it.)
  const contentMountRange = reduceMotionEnabled
    ? [pageIndex]
    : Array.from(
        new Set(
          [pageIndex - 1, pageIndex, pageIndex + 1].filter(
            (index) => index >= 0 && index < pageCount,
          ),
        ),
      );

  const canAutoAdvance =
    pageCount > 1 && !reduceMotionEnabled && !screenReaderEnabled;

  const markLoaded = useCallback((index: number) => {
    setLoadedPages((current) => {
      if (current.has(index)) return current;
      const next = new Set(current);
      next.add(index);
      return next;
    });
  }, []);

  const goToPage = useCallback(
    (index: number) => {
      setPageIndex(index);
      listRef.current?.scrollToIndex({
        index,
        animated: !reduceMotionEnabled,
      });
    },
    [reduceMotionEnabled],
  );

  // Which page progressAnim's current run belongs to, so this effect can
  // tell "a new page settled" (reset to 0) apart from "touching changed on
  // the same page" (pause/resume in place) despite both re-running this
  // same effect. The active dot's own pill body is a fixed PILL_WIDTH the
  // whole time it's active (Dot, below); only progressAnim's value (how
  // much of the pill's fill is showing) should ever move, and only for
  // these two reasons.
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

    if (!canAutoAdvance || touching || !loadedPages.has(pageIndex)) {
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
        goToPage((pageIndexRef.current + 1) % pageCount);
      }
    });

    return () => animation.stop();
  }, [
    pageIndex,
    touching,
    canAutoAdvance,
    loadedPages,
    pageCount,
    goToPage,
    progressAnim,
  ]);

  // Commits pageIndex (and touching) at the moment the finger releases,
  // rather than at onMomentumScrollEnd: see pagingReleaseTarget above for
  // why. Both setState calls happen in this one handler so React batches
  // them into a single render; splitting them (as the previous
  // onScrollBeginDrag/onScrollEndDrag pair did, each only touching
  // `touching`) let the auto-advance effect briefly see touching=false on
  // the OLD page and resume its countdown there before pageIndex caught up.
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
      const target = pagingReleaseTarget(
        contentOffset.x,
        layoutMeasurement.width,
        pageCount,
        dragStartPageRef.current,
        velocity?.x ?? 0,
        targetContentOffset?.x ?? null,
      );
      setPageIndex(target);
      setTouching(false);
    },
    [pageCount],
  );

  // Safety net: corrects pageIndex if the scroll actually settles somewhere
  // other than what handleScrollEndDrag already committed (the release
  // estimate was wrong, or Reduce Motion/goToPage's non-animated jump
  // landed here with no drag at all). Setting the same index it already
  // holds is a no-op: React bails out of a state update when the value is
  // unchanged, so the auto-advance effect (keyed on pageIndex) simply
  // doesn't re-run and progressAnim's fill is untouched.
  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      if (layoutMeasurement.width === 0) {
        return;
      }
      const settled = Math.min(
        Math.max(Math.round(contentOffset.x / layoutMeasurement.width), 0),
        pageCount - 1,
      );
      setPageIndex(settled);
    },
    [pageCount],
  );

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{ flex: 1, transform: [{ translateY: pagerPinTranslateY }] }}
      >
        <AnimatedFlatList
          ref={listRef}
          testID="home-pager"
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => `${item.show.id}-${item.episodes[0].id}`}
          onScrollBeginDrag={() => {
            dragStartPageRef.current = pageIndexRef.current;
            setTouching(true);
          }}
          onScrollEndDrag={handleScrollEndDrag}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item, index }) => (
            <HeroPage
              item={item}
              index={index}
              width={width}
              todayDate={todayDate}
              scrollX={scrollX}
              reduceMotionEnabled={reduceMotionEnabled}
              pullDistance={pullDistance}
              onBackdropLoad={() => markLoaded(index)}
            />
          )}
        />
      </Animated.View>

      {/* Fixed overlay, a sibling of the paging FlatList like PageIndicator
          below: horizontally uniform and always opaque, so it reads as one
          continuous scrim rather than sliding or seaming with the swipe.
          Fade from 280 to 580: transparent bg, 75% bg at the middle, solid
          bg. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          width,
          top: 280 * scale,
          height: 301 * scale,
          experimental_backgroundImage:
            "linear-gradient(to bottom, rgba(11,12,15,0) 0%, rgba(11,12,15,0.75) 50%, rgba(11,12,15,1) 100%)",
        }}
      />

      {contentMountRange.map((index) => (
        <ContentLayer
          key={index}
          index={index}
          slide={slides[index]}
          badge={badgeFor(index)}
          todayDate={todayDate}
          scrollX={scrollX}
          width={width}
          reduceMotionEnabled={reduceMotionEnabled}
          interactive={index === pageIndex}
          onIndicatorAnchor={setIndicatorAnchorY}
        />
      ))}

      {pageCount > 1 && indicatorAnchorY !== null && (
        <PageIndicator
          count={pageCount}
          progressAnim={progressAnim}
          reduceMotionEnabled={reduceMotionEnabled}
          screenReaderEnabled={screenReaderEnabled}
          currentPage={pageIndex}
          top={indicatorAnchorY}
          width={width}
          // VoiceOver: auto-advance is off (canAutoAdvance already
          // excludes it), so swiping the indicator up or down is how a
          // VoiceOver user moves between slides instead.
          onAdjust={(delta) =>
            goToPage((pageIndex + delta + pageCount) % pageCount)
          }
        />
      )}
    </View>
  );
}

// Apple TV style: a fixed overlay, a sibling of the paging FlatList rather
// than part of each slide, so it stays in place horizontally while slides
// move. Its vertical anchor follows the current slide's button, measured
// by that slide (heroes have no fixed height, the button's own content
// decides it).
//
// The dots are a pure function of the settled pageIndex only: no scrollX,
// no listeners, no continuous motion. Nothing in the row moves during a
// swipe; every change (which dot is active, whether the window's edges
// are pinned, whether the window itself has slid) happens together, once,
// exactly when pageIndex commits (HeroPager's handleScrollEndDrag, at
// release, via pagingReleaseTarget; onMomentumScrollEnd only corrects it
// after that if the real settle differs), via the same short
// DOT_TRANSITION_MS animation on every affected dot.
function PageIndicator({
  count,
  progressAnim,
  reduceMotionEnabled,
  screenReaderEnabled,
  currentPage,
  top,
  width,
  onAdjust,
}: {
  count: number;
  progressAnim: Animated.Value;
  reduceMotionEnabled: boolean;
  screenReaderEnabled: boolean;
  currentPage: number;
  top: number;
  width: number;
  onAdjust: (delta: 1 | -1) => void;
}) {
  // Reduce Motion and VoiceOver both turn off the pill: plain, evenly
  // sized dots that only mark which page is current, no progress.
  const plain = reduceMotionEnabled || screenReaderEnabled;

  return (
    <View
      style={[styles.indicator, { top, width }]}
      // Not tappable by touch (owner decision: swipe and auto-advance are
      // enough), but VoiceOver targets it through the accessibility tree
      // regardless of pointerEvents, so "adjustable" below still works.
      pointerEvents="none"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Show ${currentPage + 1} of ${count}`}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "increment") {
          onAdjust(1);
        } else if (event.nativeEvent.actionName === "decrement") {
          onAdjust(-1);
        }
      }}
    >
      {plain
        ? Array.from({ length: count }, (_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentPage && styles.dotActivePlain,
              ]}
            />
          ))
        : dotKinds(count, currentPage).map(({ index, kind }) => (
            <Dot
              key={index}
              small={kind === "edge"}
              active={kind === "active"}
              progressAnim={progressAnim}
            />
          ))}
    </View>
  );
}

// How long a dot's own reserved width/height take to transition between
// their possible sizes (DOT_SIZE, EDGE_DOT_SIZE, PILL_WIDTH) at settle:
// the row is plain flex (see styles.indicator/dot), so animating a dot's
// own size directly reflows its neighbours, which is exactly the "all in
// the same quick transition" effect this is for. Unrelated to
// AUTO_ADVANCE_MS, which the active pill's own inner fill (below) sweeps
// against instead.
const DOT_TRANSITION_MS = 150;

// One dot in the row, and its own reserved width/height, in the row's
// plain flex layout: DOT_SIZE normally; EDGE_DOT_SIZE (both width and
// height together, so it stays circular) at the window's edge when
// `small` — the first rendered dot when hasMoreLeft, the last when
// hasMoreRight, purely by render position (see dotKinds), never by which
// slide it represents; PILL_WIDTH wide (height unchanged, still DOT_SIZE)
// when `active`. Width and height animate separately, not as one shared
// value: the active pill only ever widens (height stays DOT_SIZE, so its
// borderRadius, DOT_SIZE / 2, is always correct for a proper pill, not an
// oversized circle mid-transition), while an edge dot's width and height
// move together to stay circular.
//
// A single component handling all three states, not separate components
// switched between: `active`/`small` toggling on the SAME mounted
// instance (same key: the slide index) is what lets its size transition
// smoothly, rather than a remount snapping straight to the new size when
// this slot stops or starts being the active one.
//
// The pill body itself (this view's own background, styles.dot's same
// translucent grey as any other dot) is at full PILL_WIDTH immediately
// once active — reserved via the same DOT_TRANSITION_MS transition as any
// other size change here, so it reflows together with the rest of the row
// at settle, and never itself grows or shrinks with progress. Only the
// inner white fill (below, active only) does that: left-aligned, width =
// DOT_SIZE + progressAnim * (PILL_WIDTH - DOT_SIZE), so it starts as a
// full DOT_SIZE circle sitting at the pill's left end (matching the plain
// dot it just grew from) and stretches to fill the whole pill by progress
// 1, the same way Apple's own page indicator does, rather than growing
// from a 0-width sliver clipped by the pill's rounded corner.
function Dot({
  small,
  active,
  progressAnim,
}: {
  small: boolean;
  active: boolean;
  progressAnim: Animated.Value;
}) {
  const targetWidth = active ? PILL_WIDTH : small ? EDGE_DOT_SIZE : DOT_SIZE;
  const targetHeight = small ? EDGE_DOT_SIZE : DOT_SIZE;
  const [widthAnim] = useState(() => new Animated.Value(targetWidth));
  const [heightAnim] = useState(() => new Animated.Value(targetHeight));
  useEffect(() => {
    const widthChange = Animated.timing(widthAnim, {
      toValue: targetWidth,
      duration: DOT_TRANSITION_MS,
      useNativeDriver: false,
    });
    const heightChange = Animated.timing(heightAnim, {
      toValue: targetHeight,
      duration: DOT_TRANSITION_MS,
      useNativeDriver: false,
    });
    widthChange.start();
    heightChange.start();
    return () => {
      widthChange.stop();
      heightChange.stop();
    };
  }, [targetWidth, targetHeight, widthAnim, heightAnim]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: widthAnim,
          height: heightAnim,
          borderRadius: Animated.divide(heightAnim, 2),
        },
      ]}
    >
      {active && (
        <Animated.View
          style={[
            styles.pillFill,
            {
              width: Animated.add(
                DOT_SIZE,
                Animated.multiply(progressAnim, PILL_WIDTH - DOT_SIZE),
              ),
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

// Backdrop only: the scrim and the text/logo/meta/Open-in block are fixed
// overlays now (ScrimLayer, ContentLayer, both siblings of the FlatList in
// HeroPager), not part of each slide, so only the backdrop's parallax,
// crossfade and pull-to-refresh stretch need to ride the pager.
function HeroPage({
  item,
  index,
  width,
  todayDate,
  scrollX,
  reduceMotionEnabled,
  pullDistance,
  onBackdropLoad,
}: {
  item: HeroSlide;
  index: number;
  width: number;
  todayDate: string;
  scrollX: Animated.Value;
  reduceMotionEnabled: boolean;
  pullDistance: Animated.AnimatedInterpolation<number>;
  onBackdropLoad: () => void;
}) {
  const { height } = useWindowDimensions();
  const scale = height / REF_HEIGHT;
  const show = item.show as TvMazeShowWithEmbeds;
  const { data: images } = useShowImages(show, deviceTimeZone(), todayDate);
  const backdropPath = images?.backdrop?.filePath;
  const backdropHeight = 580 * scale;

  // Overscanned wider than the screen and centered, so the parallax shift
  // below never reveals the page background at either edge. Only needed
  // for that parallax travel: under Reduce Motion translateX is always 0
  // (below), so there's nothing for an overscan margin to cover, and
  // skipping it here is what lets the outer View's overflow stay
  // "visible" unconditionally (see below) without ever bleeding a
  // neighbouring page's backdrop into view.
  const backdropWidth = reduceMotionEnabled
    ? width
    : width * (1 + 2 * HERO_PARALLAX_FACTOR);
  const backdropLeft = -((backdropWidth - width) / 2);

  const translateX = reduceMotionEnabled
    ? 0
    : scrollX.interpolate({
        inputRange: [(index - 1) * width, index * width, (index + 1) * width],
        outputRange: [
          -width * HERO_PARALLAX_FACTOR,
          0,
          width * HERO_PARALLAX_FACTOR,
        ],
        extrapolate: "clamp",
      });

  // Crossfade: full opacity at center, down to the floor by half a page
  // away in either direction (where the outgoing and incoming backdrops
  // overlap and blend), reaching 0 a full page away so a settled neighbour
  // is fully invisible and its overscanned backdrop can't ghost in.
  const backdropOpacity = reduceMotionEnabled
    ? 1
    : scrollX.interpolate({
        inputRange: [
          (index - 1) * width,
          (index - 0.5) * width,
          index * width,
          (index + 0.5) * width,
          (index + 1) * width,
        ],
        outputRange: [0, HERO_CROSSFADE_FLOOR, 1, HERO_CROSSFADE_FLOOR, 0],
        extrapolate: "clamp",
      });

  // Pull-to-refresh stretch (Apple TV Store tab style): applies
  // pullStretchTransform's translateY/scale formula (see above for the
  // derivation) to a wrapper around the whole backdrop, below; the pager
  // itself is pinned separately (HeroPager's pagerPinTranslateY), so this
  // only owns the top-anchored zoom, not a container-shift cancellation.
  // It never has any visible effect unless pullDistance is nonzero
  // (index.tsx's interpolation clamps it to 0 outside overscroll), so
  // nothing changes at rest or scrolling into the page either way.
  //
  // Off under Reduce Motion: every mounted HeroPage has backdropOpacity
  // forced to 1 there (see above), not faded by position the way normal
  // motion self-protects, and backdropWidth is trimmed to exactly `width`
  // (no horizontal overscan margin, since there's no parallax there to
  // cover either) — so a `scale` > 1 would grow a neighbouring slide's own
  // full-opacity backdrop past its own item bounds and spill it into view
  // at the screen edges during a hard pull. With the pager itself still
  // pinned regardless (HeroPager's own gate matches this one, so the two
  // stay in sync: no separate zoom AND no separate pin, together), the
  // backdrop still just moves down with the pull like the rest of the
  // (already unpinned) content, the same as before this feature existed.
  //
  // Built once via useMemo, not inline: Animated.multiply/add/divide build
  // a NEW native-graph node every call, and this component re-renders far
  // more often than pullDistance itself actually changes (any of
  // HeroPager's other state: pageIndex, loadedPages, touching, ...). A
  // freshly built node needs a native update to "prime" it to its input's
  // current live value; rebuilt on every one of those unrelated re-renders,
  // it keeps getting torn down before that ever happens, so it reads as
  // permanently stuck near its construction-time default instead of
  // tracking the live pull, which is exactly the same stale-native-node
  // class this file already hit once before with a recreated
  // scrollX-derived interpolation (see contentMountRange's comment).
  const pullTransform = useMemo(
    () =>
      reduceMotionEnabled
        ? { translateY: 0, scale: 1 }
        : {
            translateY: Animated.multiply(pullDistance, 0.5),
            scale: Animated.add(
              1,
              Animated.divide(pullDistance, backdropHeight),
            ),
          },
    [reduceMotionEnabled, pullDistance, backdropHeight],
  );

  return (
    // overflow "visible" always, not conditional on Reduce Motion: needed
    // for the horizontal parallax overscan to bleed past this View's own
    // width under normal motion (pre-existing, unrelated to the pull); with
    // no overscan margin left under Reduce Motion (backdropWidth above),
    // there's simply nothing left to clip there either way. The pull's own
    // zoom (below) never renders outside this View's bounds: the pager
    // itself is what's pinned (HeroPager's pagerPinTranslateY), so this
    // View's own top never moves relative to it, at rest or mid-pull.
    <View style={{ width, height, overflow: "visible" }}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}
      >
        {backdropPath && (
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: backdropHeight,
              transform: [
                { translateY: pullTransform.translateY },
                { scale: pullTransform.scale },
              ],
            }}
          >
            <Animated.View
              style={{
                position: "absolute",
                top: 0,
                left: backdropLeft,
                width: backdropWidth,
                height: backdropHeight,
                transform: [{ translateX }],
              }}
            >
              <Image
                source={`${IMAGE_BASE}/w1280${backdropPath}`}
                style={{ width: backdropWidth, height: backdropHeight }}
                contentFit="cover"
                contentPosition="center"
                accessibilityIgnoresInvertColors
                onLoad={onBackdropLoad}
              />
            </Animated.View>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

// Fixed overlay, a sibling of the paging FlatList in HeroPager (like the
// scrim and PageIndicator): shows one slide's text/logo/meta/Open-in
// block, does not move with the swipe. One instance is mounted per slide
// in HeroPager's contentMountRange (the settled page plus one neighbour on
// each side), each keyed by its own fixed `index`, each computing its own
// native crossfade from `scrollX` centered on that index — the same
// pattern HeroPage's backdrop already uses, and deliberately not a single
// shared layer whose data and opacity followed a JS-tracked "current"
// index: recreating that index-centered interpolation every time the
// current page changed was what left content visibly lagging a slide
// change (see HeroPager's contentMountRange comment). Because `index`
// never changes for a mounted instance, its opacity node is built once
// and never needs recreating.
function ContentLayer({
  index,
  slide,
  badge,
  todayDate,
  scrollX,
  width,
  reduceMotionEnabled,
  interactive,
  onIndicatorAnchor,
}: {
  index: number;
  slide: HeroSlide;
  badge: string;
  todayDate: string;
  scrollX: Animated.Value;
  width: number;
  reduceMotionEnabled: boolean;
  // Only the settled page's layer should take touches for its Open-in
  // button; the pre-mounted neighbours sit at the same screen position
  // (all layers are absoluteFill) and would otherwise be able to
  // intercept taps meant for the layer stacked beneath them.
  interactive: boolean;
  onIndicatorAnchor: (y: number) => void;
}) {
  const { height } = useWindowDimensions();
  const scale = height / REF_HEIGHT;
  const contentTop = 452 * scale;
  const show = slide.show as TvMazeShowWithEmbeds;
  // Shares its query key (show id + todayDate) with HeroPage's own call
  // for the same slide, so this never double-fetches: TanStack Query
  // serves both subscribers from the one cached result.
  const { data: images } = useShowImages(show, deviceTimeZone(), todayDate);
  const {
    data: providers,
    isLoading: providersLoading,
    isError: providersError,
  } = useSwedishService(show, true);
  const availability = heroAvailability(
    providers,
    providersLoading,
    providersError,
    show.officialSite,
  );
  const logo = images?.logo;

  const handleButtonLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height: buttonHeight } = event.nativeEvent.layout;
      // Page dots sit 16 below the button (design system, "Home, direction
      // B"); the button's own y is relative to `content`, which is itself
      // offset from the slide's top by contentTop.
      onIndicatorAnchor(contentTop + y + buttonHeight + 16);
    },
    [contentTop, onIndicatorAnchor],
  );

  // Full opacity centered on this layer's own fixed index, down to 0 by
  // half a page away in either direction: identical shape to HeroPage's
  // backdropOpacity. Under Reduce Motion there's exactly one mounted
  // layer (HeroPager's contentMountRange), so it's simply always shown.
  const opacity = useMemo(
    () =>
      reduceMotionEnabled
        ? 1
        : scrollX.interpolate({
            inputRange: [
              (index - 0.5) * width,
              index * width,
              (index + 0.5) * width,
            ],
            outputRange: [0, 1, 0],
            extrapolate: "clamp",
          }),
    [reduceMotionEnabled, scrollX, index, width],
  );

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity }]}
      pointerEvents={interactive ? "box-none" : "none"}
    >
      <View style={[styles.content, { top: contentTop }]}>
        <Text style={styles.badge}>{badge}</Text>
        {logo ? (
          <Image
            source={`${IMAGE_BASE}/w500${logo.file_path}`}
            style={styles.logo}
            contentFit="contain"
            contentPosition="left"
            tintColor={t.ink}
            accessibilityLabel={show.name}
          />
        ) : (
          <View style={styles.titleBand}>
            <Text style={styles.displayTitle} numberOfLines={2}>
              {show.name}
            </Text>
          </View>
        )}
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={styles.metaDayLabel}>
            {heroDayLabel(slide.localDate, todayDate)}
          </Text>
          {" · "}
          {homeHeroMetaLine(slide.episodes)}
        </Text>
        <OpenInSlot availability={availability} onLayout={handleButtonLayout} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    position: "absolute",
    left: 24,
    right: 24,
    gap: 8,
  },
  badge: {
    ...type.label,
    color: t.inkMuted,
    textTransform: "uppercase",
  },
  logo: {
    width: 240,
    height: 88,
  },
  // Same 88px height as the logo box, so a plain-title slide takes exactly
  // as much vertical space as a logo slide and nothing below it shifts.
  titleBand: {
    height: 88,
    justifyContent: "center",
  },
  displayTitle: {
    ...type.display,
    // PROTOTYPE: bigger than type.display's own 34/38 for the no-logo
    // fallback only, which otherwise reads too small in the 88px title
    // band; a tuning value. lineHeight × numberOfLines={2} (below) is
    // exactly 88, so a two-line title still fits the fixed title band.
    fontSize: 40,
    lineHeight: 44,
    color: t.ink,
  },
  meta: {
    ...type.meta,
    color: t.inkMuted,
  },
  // The day label ("TODAY", "TOMORROW", weekday/date) stands out from the
  // rest of the meta line, which stays muted.
  metaDayLabel: {
    ...type.meta,
    color: t.ink,
  },
  // Fixed height across all four HeroAvailability states (button, loading
  // placeholder, text note, or nothing for "none"), so the reserved space
  // is constant and nothing below the Open-in slot shifts per slide.
  openInSlot: {
    marginTop: 8, // 8 gap + 8 = 16 down from the meta line
    height: 52,
  },
  button: {
    height: 52,
    borderRadius: t.radiusPill,
    backgroundColor: t.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    color: t.bg,
    fontSize: 16,
    fontWeight: "600",
  },
  // Lookup running: the button's own shape, quiet, no text or spinner.
  buttonPlaceholder: {
    height: 52,
    borderRadius: t.radiusPill,
    backgroundColor: t.surfaceRaised,
  },
  // TMDB gives an answer with no button to show for it (an unmapped
  // service, or none at all): a quiet note, the same tone as the meta
  // line, not a disabled button (there is no action to take). Top-aligned
  // within the fixed openInSlot height, not vertically centered.
  availabilityNote: {
    ...type.meta,
    color: t.inkMuted,
  },
  indicator: {
    position: "absolute",
    left: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginHorizontal: DOT_SPACING / 2,
    // Apple TV style: every dot (inactive, edge, or the active pill's own
    // body) is this same translucent white track; only the active pill's
    // inner fill (pillFill below) is solid white. Clips that fill to this
    // shape's own rounded corners.
    backgroundColor: "rgba(255,255,255,0.4)",
    overflow: "hidden",
  },
  dotActivePlain: {
    // Reduce Motion / VoiceOver: no pill, no fill, just solid white to
    // mark the current page.
    backgroundColor: "#FFFFFF",
  },
  // The active pill's progress fill: left-aligned and full height inside
  // the pill (Dot, when active, on top of styles.dot's own translucent
  // background), width = DOT_SIZE + progressAnim * (PILL_WIDTH -
  // DOT_SIZE), so it starts a full DOT_SIZE circle and stretches to the
  // whole pill. Its own borderRadius (DOT_SIZE / 2, same as a plain dot)
  // is what keeps it a rounded capsule at every width in between: the
  // parent's own rounded corners (styles.dot) only round the pill's own
  // two ends, so without this the fill's near (right) edge, wherever its
  // animated width currently cuts off short of PILL_WIDTH, would be a
  // flat, unrounded edge instead.
  pillFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "#FFFFFF",
  },
});
