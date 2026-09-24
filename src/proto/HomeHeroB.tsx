// PROTOTYPE (proto/home-backdrop, not for merge): Home, direction B, per
// docs/design/design-system.md. Measurements are for a 390 × 844 screen and
// scale with the screen height here.

import { useCallback, useEffect, useRef, useState } from "react";
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
import { homeCardMetaLine } from "@/logic/home";
import { serviceLink } from "@/logic/service-link";
import { openInLink } from "@/logic/swedish-service";
import type { ShowEpisodesToday } from "@/logic/episodes-today";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import { useAccessibilityFlags } from "./accessibility";
import { IMAGE_BASE } from "./images";
import { t, type } from "./tokens";
import { useShowImages } from "./useShowImages";

const REF_HEIGHT = 844;

// One constant, easy to change: how long each slide dwells before the
// carousel auto-advances to the next one.
const AUTO_ADVANCE_MS = 4000;
// How long the indicator's active dot takes to widen into a pill, or
// shrink back, when the current slide changes.
const DOT_TRANSITION_MS = 220;

const DOT_SIZE = 8;
const PILL_WIDTH = 24;

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function HeroPager({
  shows,
  badgeFor,
  todayDate,
}: {
  shows: ShowEpisodesToday[];
  badgeFor: (pageIndex: number) => string;
  todayDate: string;
}) {
  const { width } = useWindowDimensions();
  const { reduceMotionEnabled, screenReaderEnabled } = useAccessibilityFlags();
  const pageCount = shows.length;

  const [pageIndex, setPageIndex] = useState(0);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [indicatorAnchorY, setIndicatorAnchorY] = useState<number | null>(null);
  const [touching, setTouching] = useState(false);

  const listRef = useRef<FlatList<ShowEpisodesToday>>(null);
  // useState, not useRef(new Animated.Value()).current: reading a ref's
  // .current during render is unsafe under the React Compiler.
  const [pageIndexAnim] = useState(() => new Animated.Value(0));
  const [progressAnim] = useState(() => new Animated.Value(0));
  const pausedProgressRef = useRef<number | null>(null);

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

  // The sliding pill follows pageIndex with a short width/position
  // transition; skipped (jumps instantly) under Reduce Motion.
  useEffect(() => {
    Animated.timing(pageIndexAnim, {
      toValue: pageIndex,
      duration: reduceMotionEnabled ? 0 : DOT_TRANSITION_MS,
      useNativeDriver: false,
    }).start();
  }, [pageIndex, pageIndexAnim, reduceMotionEnabled]);

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
      <FlatList
        ref={listRef}
        testID="home-pager"
        data={shows}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.show.id)}
        onScrollBeginDrag={() => setTouching(true)}
        onScrollEndDrag={() => setTouching(false)}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item, index }) => (
          <HeroPage
            item={item}
            width={width}
            badge={badgeFor(index)}
            todayDate={todayDate}
            active={index === pageIndex}
            onBackdropLoad={() => markLoaded(index)}
            onIndicatorAnchor={
              index === pageIndex ? setIndicatorAnchorY : undefined
            }
          />
        )}
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

function HeroPage({
  item,
  width,
  badge,
  todayDate,
  active,
  onBackdropLoad,
  onIndicatorAnchor,
}: {
  item: ShowEpisodesToday;
  width: number;
  badge: string;
  todayDate: string;
  active: boolean;
  onBackdropLoad: () => void;
  onIndicatorAnchor?: (y: number) => void;
}) {
  const { height } = useWindowDimensions();
  const scale = height / REF_HEIGHT;
  const contentTop = 452 * scale;
  const show = item.show as TvMazeShowWithEmbeds;
  const { data: images } = useShowImages(show, deviceTimeZone(), todayDate);
  const { data: providers, isError } = useSwedishService(show, true);
  const link = providers
    ? openInLink(providers, show.officialSite)
    : providers === null || isError
      ? serviceLink(show.officialSite)
      : null;

  const backdropPath = images?.backdrop?.filePath;
  const logo = images?.logo;

  const handleButtonLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!onIndicatorAnchor) return;
      const { y, height: buttonHeight } = event.nativeEvent.layout;
      // Page dots sit 16 below the button (design system, "Home, direction
      // B"); the button's own y is relative to `content`, which is itself
      // offset from the slide's top by contentTop.
      onIndicatorAnchor(contentTop + y + buttonHeight + 16);
    },
    [contentTop, onIndicatorAnchor],
  );

  return (
    <View style={{ width, height, backgroundColor: t.bg }}>
      {backdropPath && (
        <Image
          source={`${IMAGE_BASE}/w1280${backdropPath}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height: 580 * scale,
          }}
          contentFit="cover"
          contentPosition="center"
          accessibilityIgnoresInvertColors
          onLoad={onBackdropLoad}
        />
      )}
      {/* Fade from 280 to 580: transparent bg, 75% bg at the middle, solid bg. */}
      <View
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
          <Text style={styles.displayTitle} numberOfLines={1}>
            {show.name}
          </Text>
        )}
        <Text style={styles.meta} numberOfLines={1}>
          {homeCardMetaLine(show, item.episodes)}
        </Text>
        {link && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open in ${link.service}`}
            onPress={() => Linking.openURL(link.url)}
            onLayout={active ? handleButtonLayout : undefined}
            style={styles.button}
          >
            <Text style={styles.buttonLabel}>Open in {link.service}</Text>
          </Pressable>
        )}
      </View>
    </View>
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
  displayTitle: {
    ...type.display,
    color: t.ink,
  },
  meta: {
    ...type.meta,
    color: t.inkMuted,
  },
  button: {
    marginTop: 8, // 8 gap + 8 = 16 down from the meta line
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
