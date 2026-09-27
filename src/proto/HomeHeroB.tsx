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
}: {
  slides: HeroSlide[];
  badgeFor: (pageIndex: number) => string;
  todayDate: string;
}) {
  const { width, height } = useWindowDimensions();
  const scale = height / REF_HEIGHT;
  const { reduceMotionEnabled, screenReaderEnabled } = useAccessibilityFlags();
  const pageCount = slides.length;

  const [pageIndex, setPageIndex] = useState(0);
  // Which slide's content the fixed ContentLayer shows, below. Tracks the
  // page nearest the live scroll position (not pageIndex, which only
  // updates once momentum settles) so the crossfade and the data swap it
  // gates both line up with the swipe itself.
  const [contentIndex, setContentIndex] = useState(0);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [indicatorAnchorY, setIndicatorAnchorY] = useState<number | null>(null);
  const [touching, setTouching] = useState(false);

  const listRef = useRef<FlatList<HeroSlide>>(null);
  // useState, not useRef(new Animated.Value()).current: reading a ref's
  // .current during render is unsafe under the React Compiler.
  // Continuous page position (2.3 mid-swipe between pages 2 and 3, not just
  // the settled integer pageIndex), so AnimatedDot's width interpolation,
  // below, glides with the swipe instead of jumping only once momentum
  // settles. A plain, JS-driven Value kept in sync via the scrollX listener
  // below, not scrollX.interpolate() directly: scrollX is native-driven
  // (handleScroll, below), and AnimatedDot combines this with progressAnim
  // (JS-driven, useNativeDriver: false) via Animated.multiply — chaining
  // that multiply straight off a native-driven node crashes ("Attempting
  // to run JS driven animation on animated node that has been moved to
  // native"). Unused under Reduce Motion/VoiceOver: PageIndicator renders
  // plain, non-animated dots there instead of AnimatedDot.
  const [pageIndexAnim] = useState(() => new Animated.Value(0));
  const [progressAnim] = useState(() => new Animated.Value(0));
  const pausedProgressRef = useRef<number | null>(null);

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

  useEffect(() => {
    const id = scrollX.addListener(({ value }) => {
      pageIndexAnim.setValue(value / width);
    });
    return () => scrollX.removeListener(id);
  }, [scrollX, width, pageIndexAnim]);

  // contentIndex follows the live scroll position: it flips to the next
  // page exactly at the halfway point between the two, which is also where
  // the opacity curve below reaches 0 for both the outgoing and incoming
  // slide, so the data swap lands while nothing is visible. Not used under
  // Reduce Motion (effectiveContentIndex below uses pageIndex instead), so
  // the listener is skipped there.
  useEffect(() => {
    if (reduceMotionEnabled) {
      return;
    }
    const id = scrollX.addListener(({ value }) => {
      const nearest = Math.min(
        Math.max(Math.round(value / width), 0),
        pageCount - 1,
      );
      setContentIndex((current) => (current === nearest ? current : nearest));
    });
    return () => scrollX.removeListener(id);
  }, [reduceMotionEnabled, scrollX, width, pageCount]);

  // Under Reduce Motion the ContentLayer never fades (fixed opacity 1
  // below), so its content should just swap the instant pageIndex does,
  // instead of trailing the scroll-driven contentIndex above.
  const effectiveContentIndex = reduceMotionEnabled ? pageIndex : contentIndex;

  // Fade-through for the fixed ContentLayer: full opacity centered on
  // effectiveContentIndex, down to 0 by half a page away in either
  // direction, so the content is fully invisible right when
  // effectiveContentIndex (above) swaps it.
  const contentFadeOpacity = useMemo(
    () =>
      reduceMotionEnabled
        ? 1
        : scrollX.interpolate({
            inputRange: [
              (effectiveContentIndex - 0.5) * width,
              effectiveContentIndex * width,
              (effectiveContentIndex + 0.5) * width,
            ],
            outputRange: [0, 1, 0],
            extrapolate: "clamp",
          }),
    [reduceMotionEnabled, scrollX, effectiveContentIndex, width],
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

  // The dwell countdown for the current slide: starts once its backdrop
  // has loaded, pauses while the user touches the carousel, and advancing
  // to the next slide (looping) when it completes.
  useEffect(() => {
    progressAnim.setValue(0);
    pausedProgressRef.current = null;

    if (!canAutoAdvance || touching || !loadedPages.has(pageIndex)) {
      return;
    }

    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: AUTO_ADVANCE_MS,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) {
        goToPage((pageIndex + 1) % pageCount);
      }
    });

    return () => animation.stop();
    // touching is intentionally excluded: resuming after a pause is its
    // own effect below, so it does not restart the countdown from zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, canAutoAdvance, loadedPages, pageCount]);

  // Pausing stops the animation in place; releasing resumes it for
  // whatever time is left, instead of restarting the full 4 seconds.
  useEffect(() => {
    if (!canAutoAdvance) {
      return;
    }
    if (touching) {
      progressAnim.stopAnimation((value) => {
        pausedProgressRef.current = value;
      });
      return;
    }
    if (pausedProgressRef.current === null || !loadedPages.has(pageIndex)) {
      return;
    }
    const remaining = AUTO_ADVANCE_MS * (1 - pausedProgressRef.current);
    pausedProgressRef.current = null;
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: Math.max(remaining, 0),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) {
        goToPage((pageIndex + 1) % pageCount);
      }
    });
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touching]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      if (layoutMeasurement.width === 0) {
        return;
      }
      setPageIndex(Math.round(contentOffset.x / layoutMeasurement.width));
    },
    [],
  );

  return (
    <View style={{ flex: 1 }}>
      <AnimatedFlatList
        ref={listRef}
        testID="home-pager"
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `${item.show.id}-${item.episodes[0].id}`}
        onScrollBeginDrag={() => setTouching(true)}
        onScrollEndDrag={() => setTouching(false)}
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
            onBackdropLoad={() => markLoaded(index)}
          />
        )}
      />

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

      <ContentLayer
        slide={slides[effectiveContentIndex]}
        badge={badgeFor(effectiveContentIndex)}
        todayDate={todayDate}
        opacity={contentFadeOpacity}
        onIndicatorAnchor={setIndicatorAnchorY}
      />

      {pageCount > 1 && indicatorAnchorY !== null && (
        <PageIndicator
          count={pageCount}
          pageIndexAnim={pageIndexAnim}
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
function PageIndicator({
  count,
  pageIndexAnim,
  progressAnim,
  reduceMotionEnabled,
  screenReaderEnabled,
  currentPage,
  top,
  width,
  onAdjust,
}: {
  count: number;
  pageIndexAnim: Animated.Value;
  progressAnim: Animated.Value;
  reduceMotionEnabled: boolean;
  screenReaderEnabled: boolean;
  currentPage: number;
  top: number;
  width: number;
  onAdjust: (delta: 1 | -1) => void;
}) {
  // Reduce Motion and VoiceOver both turn off the animated sweep: plain,
  // evenly sized dots that only mark which page is current, no progress.
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
      {Array.from({ length: count }, (_, index) =>
        plain ? (
          <View
            key={index}
            style={[styles.dot, index === currentPage && styles.dotActivePlain]}
          />
        ) : (
          <AnimatedDot
            key={index}
            active={index === currentPage}
            pageIndexAnim={pageIndexAnim}
            progressAnim={progressAnim}
            index={index}
          />
        ),
      )}
    </View>
  );
}

function AnimatedDot({
  index,
  active,
  pageIndexAnim,
  progressAnim,
}: {
  index: number;
  active: boolean;
  pageIndexAnim: Animated.Value;
  progressAnim: Animated.Value;
}) {
  const widthAnim = pageIndexAnim.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [DOT_SIZE, PILL_WIDTH, DOT_SIZE],
    extrapolate: "clamp",
  });

  return (
    <Animated.View style={[styles.dot, { width: widthAnim }]}>
      {/* Only the active dot carries the sweep, so shrinking back to a
          plain dot leaves no fill behind, and the incoming pill starts
          from empty (progressAnim itself resets to 0 on every page
          change, see HeroPager). */}
      {active && (
        <Animated.View
          style={[
            styles.dotFill,
            { width: Animated.multiply(progressAnim, widthAnim) },
          ]}
        />
      )}
    </Animated.View>
  );
}

// Backdrop only: the scrim and the text/logo/meta/Open-in block are fixed
// overlays now (ScrimLayer, ContentLayer, both siblings of the FlatList in
// HeroPager), not part of each slide, so only the backdrop's parallax and
// crossfade need to ride the pager.
function HeroPage({
  item,
  index,
  width,
  todayDate,
  scrollX,
  reduceMotionEnabled,
  onBackdropLoad,
}: {
  item: HeroSlide;
  index: number;
  width: number;
  todayDate: string;
  scrollX: Animated.Value;
  reduceMotionEnabled: boolean;
  onBackdropLoad: () => void;
}) {
  const { height } = useWindowDimensions();
  const scale = height / REF_HEIGHT;
  const show = item.show as TvMazeShowWithEmbeds;
  const { data: images } = useShowImages(show, deviceTimeZone(), todayDate);
  const backdropPath = images?.backdrop?.filePath;

  // Overscanned wider than the screen and centered, so the parallax shift
  // below never reveals the page background at either edge.
  const backdropWidth = width * (1 + 2 * HERO_PARALLAX_FACTOR);
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

  return (
    <View
      style={{
        width,
        height,
        overflow: reduceMotionEnabled ? "hidden" : "visible",
      }}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}
      >
        {backdropPath && (
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: backdropLeft,
              width: backdropWidth,
              height: 580 * scale,
              transform: [{ translateX }],
            }}
          >
            <Image
              source={`${IMAGE_BASE}/w1280${backdropPath}`}
              style={{ width: backdropWidth, height: 580 * scale }}
              contentFit="cover"
              contentPosition="center"
              accessibilityIgnoresInvertColors
              onLoad={onBackdropLoad}
            />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

// Fixed overlay, a sibling of the paging FlatList in HeroPager (like the
// scrim and PageIndicator): shows only the current slide's text/logo/meta/
// Open-in block, does not move with the swipe. `opacity` is HeroPager's
// scroll-driven crossfade (or fixed 1 under Reduce Motion); `slide` swaps
// under it once that crossfade reaches 0, see contentIndex in HeroPager.
function ContentLayer({
  slide,
  badge,
  todayDate,
  opacity,
  onIndicatorAnchor,
}: {
  slide: HeroSlide;
  badge: string;
  todayDate: string;
  opacity: number | Animated.AnimatedInterpolation<number>;
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

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity }]}
      pointerEvents="box-none"
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
    gap: 8,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    // Apple TV style: inactive dots and the active pill's own track are
    // both this same translucent white; only the sweep is solid white.
    backgroundColor: "rgba(255,255,255,0.4)",
    overflow: "hidden",
  },
  dotActivePlain: {
    // Reduce Motion / VoiceOver: no pill, no sweep, just solid white to
    // mark the current page.
    backgroundColor: "#FFFFFF",
  },
  dotFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
  },
});
