// One hero slide's own visuals: the backdrop (HeroPage, parallax/crossfade/
// pull-to-refresh stretch) and the fixed text/logo/meta/Open-in overlay
// (ContentLayer), both mounted per LOGICAL slide by HeroPager
// (contentMountFrames, logic/hero-carousel.ts). The vertical layout comes
// from heroLayout (logic/hero-layout.ts): every block has a fixed height,
// so the content's position is computed and nothing moves per slide.

import { memo, useCallback, useEffect, useMemo } from "react";
import {
  Animated,
  PixelRatio,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaskedView from "@react-native-masked-view/masked-view";

import { IMAGE_BASE } from "@/api/tmdb-types";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import { openExternalUrl, useGuardedRouter } from "@/hooks/useGuardedRouter";
import { useStreamingService } from "@/hooks/useStreamingService";
import { useShowImages } from "@/hooks/useShowImages";
import { openInAccessibilityLabel } from "@/logic/streaming-service";
import { ImdbRating } from "../ImdbRating";
import { PaidSubscriptionMarker } from "../PaidSubscriptionMarker";
import { ProgressiveMask } from "../ProgressiveBlur";
import { DatePill } from "./DatePill";
import {
  HERO_CONTENT_FADE_PAGES,
  HERO_CROSSFADE_FLOOR,
  HERO_PARALLAX_FACTOR,
  heroAvailability,
  heroEpisodeLine,
  heroPillLabel,
  type HeroAvailability,
  type HeroSlide,
} from "@/logic/hero-carousel";
import {
  CONTENT_GAP,
  EPISODE_LINE_HEIGHT,
  TITLE_GAP,
  NOTE_LINE,
  PILL_HEIGHT,
  TITLE_BLOCK_HEIGHT,
  heroImageSize,
  heroLayout,
} from "@/logic/hero-layout";
import { t, type } from "@/theme/tokens";

// How strongly Android blurs its copy of the image and the mirror, where
// the progressive BlurView does not run (ProgressiveBlur).
const ANDROID_MIRROR_BLUR_RADIUS = 30;

// The hero's layout for this screen (logic/hero-layout.ts).
export function useHeroLayout() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return heroLayout(height, insets.top);
}

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
}: {
  availability: HeroAvailability;
}) {
  // On short screens the reserved slot sits closer to the episode line and
  // the button/placeholder shrink to 44 (heroLayout).
  const { buttonHeight, openInMargin } = useHeroLayout();
  const slotStyle = {
    marginTop: openInMargin,
    height: buttonHeight + NOTE_LINE,
  };
  const buttonHeightStyle = { height: buttonHeight };

  return (
    // Fixed height across all four HeroAvailability states (button, loading
    // placeholder, text note, or nothing for "none"), so the reserved space
    // is constant and nothing below it shifts per slide.
    <View style={slotStyle}>
      {availability.kind === "loading" && (
        <View style={[styles.buttonPlaceholder, buttonHeightStyle]} />
      )}
      {availability.kind === "text" && (
        <Text style={styles.availabilityNote} numberOfLines={1}>
          {availability.label}
        </Text>
      )}
      {availability.kind === "button" && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={openInAccessibilityLabel(availability.link)}
            onPress={() => openExternalUrl(availability.link.url)}
            style={[styles.button, buttonHeightStyle]}
          >
            <Text style={styles.buttonLabel}>
              Open in {availability.link.service}
            </Text>
          </Pressable>
          {/* As in Show detail, under the button (CRI-90, CRI-101). */}
          {availability.link.requires && (
            <View style={styles.requires}>
              <PaidSubscriptionMarker
                channel={availability.link.requires}
                color={t.inkMuted}
                textStyle={styles.availabilityNote}
              />
            </View>
          )}
        </>
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
  const {
    heroHeight,
    imageTop,
    imageHeight,
    blurTop,
    topBlurHeight,
    topBlurFullTo,
  } = useHeroLayout();
  const router = useGuardedRouter();
  const show = item.show as TvMazeShowWithEmbeds;
  const { data: images, isLoading: imagesLoading } = useShowImages(
    show,
    deviceTimeZone(),
    todayDate,
  );
  // The show's highest-rated backdrop (chooseHighestRatedBackdrop:
  // textless first, then vote_average, vote_count as tie-break), the same
  // image on every visit to the slide (ADR 0012, amended for CRI-124).
  // Nothing below this line (parallax, crossfade, pull-zoom, mirror, blur)
  // depends on which image it is.
  const displayPath = images?.highestRatedBackdrop?.file_path;
  // The sharp image runs from under the top safe area down to the title
  // slot's bottom (heroLayout), mirrored above and below it (Apple TV
  // style); HeroPager's progressive blurs, one at each end for all slides,
  // turn the mirrors soft. backdropHeight is the whole column's reach down
  // to the bottom seam, which the pull stretch works on.
  const backdropHeight = imageHeight;
  const imageBoxHeight = imageHeight - imageTop;
  // Ready for auto-advance once the image loads, fails, or turns out not to
  // exist; a slide without an image must never hold the pager.
  const handleLoad = useCallback(
    () => onBackdropLoad(index),
    [onBackdropLoad, index],
  );
  const noImage = !displayPath && !imagesLoading;
  useEffect(() => {
    if (noImage) {
      onBackdropLoad(index);
    }
  }, [noImage, onBackdropLoad, index]);

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
  // Sharp on this screen's pixels at the width the image is drawn
  // (heroImageSize): "original" on today's phones.
  const imageSize = heroImageSize(
    backdropWidth,
    imageBoxHeight,
    PixelRatio.get(),
  );

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
    // FR-030: a tap opens Show detail; a swipe still pages (the list owns the drag).
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={show.name}
      accessibilityHint="Opens the show"
      onPress={() =>
        router.push({ pathname: "/show/[id]", params: { id: show.id } })
      }
      style={{ width, height: heroHeight, overflow: "visible" }}
      testID="home-card"
    >
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
              <ImageColumn
                uri={`${IMAGE_BASE}/${imageSize}${displayPath}`}
                width={backdropWidth}
                imageTop={imageTop}
                boxHeight={imageBoxHeight}
                onLoad={handleLoad}
              />
              {/* Android has no progressive BlurView (ProgressiveBlur): a
                  blurred copy of the column shows through the same eased
                  masks instead, at both ends. */}
              {Platform.OS === "android" && (
                <>
                  <MaskedView
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: blurTop,
                      left: 0,
                      width: backdropWidth,
                      height: heroHeight - blurTop,
                    }}
                    maskElement={
                      <ProgressiveMask
                        fullAt={
                          (backdropHeight - blurTop) / (heroHeight - blurTop)
                        }
                      />
                    }
                  >
                    <View
                      style={{ position: "absolute", top: -blurTop, left: 0 }}
                    >
                      <ImageColumn
                        uri={`${IMAGE_BASE}/${imageSize}${displayPath}`}
                        width={backdropWidth}
                        imageTop={imageTop}
                        boxHeight={imageBoxHeight}
                        blurRadius={ANDROID_MIRROR_BLUR_RADIUS}
                      />
                    </View>
                  </MaskedView>
                  <MaskedView
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: backdropWidth,
                      height: topBlurHeight,
                    }}
                    maskElement={
                      <ProgressiveMask
                        fullAt={(topBlurHeight - topBlurFullTo) / topBlurHeight}
                        strongAt="top"
                      />
                    }
                  >
                    <ImageColumn
                      uri={`${IMAGE_BASE}/${imageSize}${displayPath}`}
                      width={backdropWidth}
                      imageTop={imageTop}
                      boxHeight={imageBoxHeight}
                      blurRadius={ANDROID_MIRROR_BLUR_RADIUS}
                    />
                  </MaskedView>
                </>
              )}
            </Animated.View>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
});

// One slide's image as a column: the sharp image from imageTop down
// boxHeight, the same box flipped above it (its bottom edge continues the
// image's top edge) and flipped below it (its top edge continues the
// image's bottom edge). Positioned from the column's own top. Drawn once
// sharp, and on Android once more, blurred, for the masked blur.
function ImageColumn({
  uri,
  width,
  imageTop,
  boxHeight,
  blurRadius,
  onLoad,
}: {
  uri: string;
  width: number;
  imageTop: number;
  boxHeight: number;
  blurRadius?: number;
  // Only the sharp column reports its load (auto-advance waits for it).
  onLoad?: () => void;
}) {
  const sharp = blurRadius === undefined;
  const image = (flipped: boolean, testID?: string) => (
    <Image
      source={uri}
      style={[{ width, height: boxHeight }, flipped && styles.flipped]}
      contentFit="cover"
      // Anchored at the image's top edge: the box is shorter than the
      // drawn image (it is drawn wide for the swipe's parallax), and many
      // backdrops have little room above the heads, so the crop takes
      // from the bottom, which the lower mirror covers anyway.
      contentPosition="top"
      accessibilityIgnoresInvertColors
      blurRadius={blurRadius}
      onLoad={flipped ? undefined : onLoad}
      onError={flipped ? undefined : onLoad}
      testID={sharp ? testID : undefined}
    />
  );
  return (
    <>
      <View
        pointerEvents="none"
        testID={sharp ? "hero-backdrop-top-mirror-box" : undefined}
        style={[styles.box, { top: imageTop - boxHeight, width }]}
      >
        {image(true, "hero-backdrop-top-mirror")}
      </View>
      <View pointerEvents="none" style={[styles.box, { top: imageTop, width }]}>
        {image(false, "hero-backdrop-image")}
      </View>
      <View
        pointerEvents="none"
        testID={sharp ? "hero-backdrop-mirror-box" : undefined}
        style={[styles.box, { top: imageTop + boxHeight, width }]}
      >
        {image(true, "hero-backdrop-mirror")}
      </View>
    </>
  );
}

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
// (logicalCrossfadePosition and pageCount from HeroPager's own memo), so
// this actually takes effect without needing any further stabilizing,
// unlike HeroPage's onBackdropLoad did.
export const ContentLayer = memo(function ContentLayer({
  index,
  slide,
  todayDate,
  logicalCrossfadePosition,
  pageCount,
  reduceMotionEnabled,
  interactive,
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
}) {
  // Anchored so the page dots end just above the hero's end (heroLayout).
  const { contentTop } = useHeroLayout();
  const show = slide.show as TvMazeShowWithEmbeds;
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

  // Full opacity centered on this layer's own fixed logical index, down to
  // 0 already HERO_CONTENT_FADE_PAGES of a page away in either direction
  // (CRI-124): a swipe fades the text out almost at once, so only the
  // images move, and it fades back in as the slide lands. (This also
  // keeps the pill's blur out of a long crossfade.) Built from
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
      inputRange: [
        pageCount / 2 - HERO_CONTENT_FADE_PAGES,
        pageCount / 2,
        pageCount / 2 + HERO_CONTENT_FADE_PAGES,
      ],
      outputRange: [0, 1, 0],
      extrapolate: "clamp",
    });
  }, [reduceMotionEnabled, logicalCrossfadePosition, index, pageCount]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity }]}
      pointerEvents={interactive ? "box-none" : "none"}
    >
      {/* Only the links take touches; the rest passes through to the
          pager below, which pages on a swipe and opens detail on a tap. */}
      <View
        style={[styles.content, { top: contentTop }]}
        pointerEvents="box-none"
      >
        {/* The date pill, centred (CRI-124). The page dots give the
            slide's place in the pager. */}
        <View
          style={styles.pillRow}
          pointerEvents="none"
          testID="hero-label-row"
        >
          <DatePill label={heroPillLabel(slide, todayDate)} />
        </View>
        {/* TITLE_GAP above and below, on top of the row gap. */}
        <View pointerEvents="none" style={styles.titleRoom}>
          <View style={styles.titleBlock} testID="hero-title-block">
            {logo ? (
              <Image
                source={`${IMAGE_BASE}/w500${logo.file_path}`}
                style={styles.logo}
                contentFit="contain"
                contentPosition="left"
                accessibilityLabel={show.name}
              />
            ) : (
              <Text style={styles.displayTitle} numberOfLines={2}>
                {show.name}
              </Text>
            )}
          </View>
        </View>
        {/* One fixed line, on the fade, no block behind it: the code and
            the episode title, and the IMDb chip at its right end. Only the
            chip takes touches. */}
        <View
          style={styles.episodeRow}
          pointerEvents="box-none"
          testID="hero-episode-row"
        >
          <Text
            style={styles.episodeLine}
            numberOfLines={1}
            pointerEvents="none"
          >
            {heroEpisodeLine(slide.episodes)}
          </Text>
          <ImdbRating show={show} variant="chip" />
        </View>
        <OpenInSlot availability={availability} />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // One box of the image column (ImageColumn).
  box: {
    position: "absolute",
    left: 0,
  },
  // A mirror image: upside down, around its own centre.
  flipped: {
    transform: [{ scaleY: -1 }],
  },
  content: {
    position: "absolute",
    // One screen margin on Home, the rows' too (CRI-124).
    left: t.space4,
    right: t.space4,
    gap: CONTENT_GAP,
  },
  // As tall as the pill, so nothing below shifts per slide.
  pillRow: {
    height: PILL_HEIGHT,
    flexDirection: "row",
    justifyContent: "center",
  },
  // As tall as the IMDb chip, chip or not, so nothing below shifts.
  episodeRow: {
    height: EPISODE_LINE_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: CONTENT_GAP,
  },
  // Takes the room the chip leaves, cut with an ellipsis.
  episodeLine: {
    ...type.meta,
    color: t.inkMuted,
    flex: 1,
  },
  // One height for a logo and a text title, so nothing below shifts.
  titleRoom: {
    marginVertical: TITLE_GAP - CONTENT_GAP,
  },
  titleBlock: {
    height: TITLE_BLOCK_HEIGHT,
    justifyContent: "center",
  },
  logo: {
    width: 240,
    height: 88,
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
  requires: {
    marginTop: 4,
  },
  button: {
    borderRadius: t.radiusPill,
    backgroundColor: t.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  // Manrope ExtraBold, a trial behind one token (type.button).
  buttonLabel: {
    ...type.button,
    color: t.bg,
  },
  // Lookup running: the button's own shape, quiet, no text or spinner.
  buttonPlaceholder: {
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
