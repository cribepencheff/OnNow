// One hero slide's own visuals: the backdrop (HeroPage, parallax/crossfade/
// pull-to-refresh stretch) and the fixed text/logo/meta/Open-in overlay
// (ContentLayer), both mounted per LOGICAL slide by HeroPager
// (contentMountFrames, logic/hero-carousel.ts). Measurements are for a
// 390 × 844 screen and scale with the screen height here.

import { memo, useCallback, useMemo } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { Image } from "expo-image";
import * as Linking from "expo-linking";

import { IMAGE_BASE } from "@/api/tmdb-types";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import { useStreamingService } from "@/hooks/useStreamingService";
import { useEpisodeStill } from "@/hooks/useEpisodeStill";
import { useShowImages } from "@/hooks/useShowImages";
import { addDays } from "@/logic/local-date";
import { formatLabelDate } from "@/logic/next-episode-label";
import { openInLabel } from "@/logic/streaming-service";
import {
  HERO_CROSSFADE_FLOOR,
  HERO_PARALLAX_FACTOR,
  heroAvailability,
  heroMetaLine,
  type HeroAvailability,
  type HeroSlide,
} from "@/logic/hero-carousel";
import { REF_HEIGHT, t, type } from "@/theme/tokens";

// Short screens (iPhone SE is 667pt tall) tighten the vertical gaps below
// the meta line so the page dots clear the tab bar at rest. The threshold
// sits between the SE (667) and the next size up (iPhone 12/13 mini at 812,
// 12 Pro at 844), so every screen taller than the SE keeps the regular
// values below and looks exactly as before.
const SHORT_SCREEN_MAX_HEIGHT = 700;

// Vertical layout of the content block's lower half. The Open-in button
// block sits OPEN_IN_MARGIN below the meta line (on top of the content
// block's own row gap), the button is BUTTON_HEIGHT tall (kept at/above the
// 44pt minimum tap target even when tightened), and the page dots sit
// DOTS_GAP below the button. Each has a tighter value used only on short
// screens; the regular values reproduce today's layout exactly.
const OPEN_IN_MARGIN = 8;
const OPEN_IN_MARGIN_SHORT = 0;
const BUTTON_HEIGHT = 52;
const BUTTON_HEIGHT_SHORT = 44;
const DOTS_GAP = 16;
const DOTS_GAP_SHORT = 8;

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// The "Open in" slot itself, one component for all four HeroAvailability
// states, exported so the dev images screen can render the same look for
// forced, synthetic states that are hard or unsafe to reproduce live (a
// failed lookup, an unmapped service with no test-set show left to show
// it).
export function OpenInSlot({
  availability,
  onLayout,
}: {
  availability: HeroAvailability;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { height } = useWindowDimensions();
  const isShort = height < SHORT_SCREEN_MAX_HEIGHT;
  // On short screens the reserved slot sits closer to the meta line and the
  // button/placeholder shrink to BUTTON_HEIGHT_SHORT (still >= 44); taller
  // screens keep styles.openInSlot's own regular values.
  const slotStyle = isShort
    ? { marginTop: OPEN_IN_MARGIN_SHORT, height: BUTTON_HEIGHT_SHORT }
    : null;
  const buttonHeightStyle = isShort ? { height: BUTTON_HEIGHT_SHORT } : null;

  return (
    <View style={[styles.openInSlot, slotStyle]} onLayout={onLayout}>
      {availability.kind === "loading" && (
        <View style={[styles.buttonPlaceholder, buttonHeightStyle]} />
      )}
      {availability.kind === "text" && (
        <Text style={styles.availabilityNote} numberOfLines={1}>
          {availability.label}
        </Text>
      )}
      {availability.kind === "button" && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={openInLabel(availability.link)}
          onPress={() => Linking.openURL(availability.link.url)}
          style={[styles.button, buttonHeightStyle]}
        >
          <Text style={styles.buttonLabel}>
            {openInLabel(availability.link)}
          </Text>
        </Pressable>
      )}
      {/* kind === "none": nothing to show, height still reserved above. */}
    </View>
  );
}

// Backdrop only: the scrim and the text/logo/meta/Open-in block are fixed
// overlays now (ScrimLayer, ContentLayer, both siblings of the FlatList in
// HeroPager), not part of each slide, so only the backdrop's parallax,
// crossfade and pull-to-refresh stretch need to ride the pager.
//
// memo-wrapped: one of physicalPageCount mounted instances at a time, and
// HeroPager itself re-renders often (touching, loadedPages, pageIndex)
// for reasons that usually have nothing to do with any given one of them;
// without this, every mounted HeroPage (each running its own
// useShowImages fetch/cache check) would re-render on every one of those,
// which is exactly the pattern RN's own "VirtualizedList: large list slow
// to update" warning points at. Only helps because every prop below is
// actually stable across those re-renders (see HeroPager's
// handleBackdropLoad/renderItem, memoized for the same reason) — a memo
// wrapper around a component still receiving a fresh prop identity every
// render would re-render anyway.
export const HeroPage = memo(function HeroPage({
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
  // Takes this instance's own (physical) index, rather than being called
  // with no arguments: lets HeroPager pass the exact same function to
  // every instance (see handleBackdropLoad), instead of a fresh closure
  // per cell that would defeat this memo regardless of anything else.
  onBackdropLoad: (index: number) => void;
}) {
  const { height } = useWindowDimensions();
  const scale = height / REF_HEIGHT;
  const show = item.show as TvMazeShowWithEmbeds;
  const { data: images } = useShowImages(show, deviceTimeZone(), todayDate);
  // The show's highest-rated backdrop (chooseHighestRatedBackdrop), used
  // when the episode has no TMDB still of its own (displayPath below prefers
  // the still). Nothing below this line (parallax, crossfade, pull-zoom,
  // scrim) knows or cares which of the two it's showing.
  const fallbackBackdropPath = images?.highestRatedBackdrop?.file_path;
  const { data: episodeStill } = useEpisodeStill(
    show,
    item.episodes[0],
    deviceTimeZone(),
    todayDate,
  );
  const displayPath = episodeStill?.filePath ?? fallbackBackdropPath;
  const backdropHeight = 580 * scale;
  const handleLoad = useCallback(
    () => onBackdropLoad(index),
    [onBackdropLoad, index],
  );

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
  // pullStretchTransform's translateY/scale formula (see hero-carousel.ts
  // for the derivation) to a wrapper around the whole backdrop, below; the
  // pager itself is pinned separately (HeroPager's pagerPinTranslateY), so
  // this only owns the top-anchored zoom, not a container-shift
  // cancellation. It never has any visible effect unless pullDistance is
  // nonzero (index.tsx's interpolation clamps it to 0 outside overscroll),
  // so nothing changes at rest or scrolling into the page either way.
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
  // scrollX-derived interpolation (see HeroPager's contentMountRange
  // comment).
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
        {displayPath && (
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
                source={`${IMAGE_BASE}/w1280${displayPath}`}
                style={{ width: backdropWidth, height: backdropHeight }}
                contentFit="cover"
                contentPosition="center"
                accessibilityIgnoresInvertColors
                onLoad={handleLoad}
              />
            </Animated.View>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
});

// Fixed overlay, a sibling of the paging FlatList in HeroPager (like the
// scrim and PageIndicator): shows one slide's text/logo/meta/Open-in
// block, does not move with the swipe. One instance is mounted per LOGICAL
// slide in HeroPager's contentMountFrames (the settled page plus one
// neighbour on each side), keyed by its own fixed logical `index`, each
// computing its own native crossfade from HeroPager's shared
// logicalCrossfadePosition, peaking at its own index — the same
// index-keyed, built-once-per-instance approach HeroPage's backdrop
// already uses for the analogous reason: recreating an index-centered
// interpolation every time the current page changed was what left content
// visibly lagging a slide change (see HeroPager's contentMountFrames
// comment). Keyed and centered by LOGICAL index specifically, not a
// physical scrollX position, because logicalCrossfadePosition is already
// periodic in scrollX (see its own comment in HeroPager): a wrap
// neighbour's crossfade reads the same way whether scrollX is currently
// on that slide's own real physical slot or, mid a wrap transition, one
// of loopSlideData's duplicate slots, so there's never a moment where
// this needs to be recentered or remounted, unlike a plain
// physical-position-centered version would.
//
// memo-wrapped for the same reason as HeroPage above: HeroPager re-renders
// often for reasons unrelated to any one mounted ContentLayer (each of
// which runs its own useShowImages/useStreamingService), and every prop
// here is already stable or stable-by-value across those re-renders
// (logicalCrossfadePosition and pageCount from HeroPager's own memo;
// badge is a freshly computed but value-equal string; onIndicatorAnchor
// is a state setter), so this actually takes effect without needing any
// further stabilizing, unlike HeroPage's onBackdropLoad did.
export const ContentLayer = memo(function ContentLayer({
  index,
  slide,
  todayDate,
  logicalCrossfadePosition,
  pageCount,
  reduceMotionEnabled,
  interactive,
  onIndicatorAnchor,
}: {
  index: number;
  slide: HeroSlide;
  todayDate: string;
  logicalCrossfadePosition: Animated.AnimatedInterpolation<number>;
  pageCount: number;
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
  const isShort = height < SHORT_SCREEN_MAX_HEIGHT;
  const dotsGap = isShort ? DOTS_GAP_SHORT : DOTS_GAP;
  const show = slide.show as TvMazeShowWithEmbeds;
  // Whether this slide's episode (or season drop) releases today or
  // tomorrow in the user's local time zone. slide.localDate is already the
  // airstamp resolved to a local date (findHeroSlides, local-date.ts), and
  // todayDate is the same "today" the rest of the hero uses (useToday), so
  // these are plain string compares against todayDate and the app's own
  // addDays, not a fresh Date() comparison.
  const isToday = slide.localDate === todayDate;
  const isTomorrow = slide.localDate === addDays(todayDate, 1);
  // Shares its query key (show id + todayDate) with HeroPage's own call
  // for the same slide, so this never double-fetches: TanStack Query
  // serves both subscribers from the one cached result.
  const { data: images } = useShowImages(show, deviceTimeZone(), todayDate);
  const {
    data: providers,
    isLoading: providersLoading,
    isError: providersError,
    region,
  } = useStreamingService(show, true);
  const availability = heroAvailability(
    providers,
    providersLoading,
    providersError,
    show.officialSite,
    region,
  );
  const logo = images?.logo;

  const handleButtonLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height: buttonHeight } = event.nativeEvent.layout;
      // Page dots sit DOTS_GAP below the button (design system, tighter on
      // short screens). The button's own y and
      // measured height already reflect the tightened slot on short screens,
      // and y is relative to `content`, itself offset from the slide's top
      // by contentTop.
      onIndicatorAnchor(contentTop + y + buttonHeight + dotsGap);
    },
    [contentTop, onIndicatorAnchor, dotsGap],
  );

  // Full opacity centered on this layer's own fixed logical index, down to
  // 0 by half a (logical) page away in either direction, the same
  // triangular shape as HeroPage's backdropOpacity, just built from
  // logicalCrossfadePosition (periodic) rather than scrollX directly: see
  // that value's own comment in HeroPager for why. wrapped shifts things
  // so the peak sits at pageCount / 2 instead of at this layer's own
  // index, purely so the falloff can wrap smoothly across the 0/pageCount
  // boundary (Animated.modulo) instead of needing a discontinuous split
  // there; interpolating around that fixed, layer-independent midpoint
  // is what lets the same three-point inputRange keep working regardless
  // of which index this particular layer peaks at. Under Reduce Motion
  // there's exactly one mounted layer (HeroPager's contentFrames), so
  // it's simply always shown.
  const opacity = useMemo(() => {
    if (reduceMotionEnabled) {
      return 1;
    }
    const wrapped = Animated.modulo(
      Animated.add(
        Animated.subtract(logicalCrossfadePosition, index),
        pageCount / 2,
      ),
      pageCount,
    );
    return wrapped.interpolate({
      inputRange: [pageCount / 2 - 0.5, pageCount / 2, pageCount / 2 + 0.5],
      outputRange: [0, 1, 0],
      extrapolate: "clamp",
    });
  }, [reduceMotionEnabled, logicalCrossfadePosition, index, pageCount]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity }]}
      pointerEvents={interactive ? "box-none" : "none"}
    >
      <View style={[styles.content, { top: contentTop }]}>
        <Text style={styles.badge}>
          <Text style={isToday ? styles.badgeToday : undefined}>
            {isToday ? "TODAY" : isTomorrow ? "TOMORROW" : "UPCOMING"}
          </Text>
          {` · ${index + 1}/${pageCount}`}
        </Text>
        {logo ? (
          <Image
            source={`${IMAGE_BASE}/w500${logo.file_path}`}
            style={styles.logo}
            contentFit="contain"
            contentPosition="left"
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
          {`${formatLabelDate(slide.localDate, todayDate).toUpperCase()} · ${heroMetaLine(
            slide.episodes,
          )}`}
        </Text>
        <OpenInSlot availability={availability} onLayout={handleButtonLayout} />
      </View>
    </Animated.View>
  );
});

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
  // "TODAY" eyebrow word: white, flagging a slide that airs today. The
  // counter after it stays the muted badge grey (it inherits styles.badge).
  badgeToday: {
    color: t.ink,
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
    // Bigger than type.display's own 34/38 for the no-logo fallback only,
    // which otherwise reads too small in the 88px title band; a tuning
    // value. lineHeight × numberOfLines={2} (below) is exactly 88, so a
    // two-line title still fits the fixed title band.
    fontSize: 40,
    lineHeight: 44,
    color: t.ink,
  },
  meta: {
    ...type.meta,
    color: t.inkMuted,
  },
  // Fixed height across all four HeroAvailability states (button, loading
  // placeholder, text note, or nothing for "none"), so the reserved space
  // is constant and nothing below the Open-in slot shifts per slide.
  openInSlot: {
    // OPEN_IN_MARGIN on top of content's own 8 row gap = 16 below the meta
    // line on regular screens (tightened on short, see OpenInSlot).
    marginTop: OPEN_IN_MARGIN,
    height: BUTTON_HEIGHT,
  },
  button: {
    height: BUTTON_HEIGHT,
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
    height: BUTTON_HEIGHT,
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
});
