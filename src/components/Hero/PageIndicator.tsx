// Apple TV style page indicator for the hero carousel (HeroPager): a fixed
// overlay, a sibling of the paging FlatList rather than part of each
// slide, so it stays in place horizontally while slides move. Its vertical
// anchor follows the current slide's button, measured by that slide
// (heroes have no fixed height, the button's own content decides it).
//
// The dots are a pure function of the settled pageIndex only: no scrollX,
// no listeners, no continuous motion. Nothing in the row moves during a
// swipe; every change (which dot is active, whether the window's edges
// are pinned, whether the window itself has slid) happens together, once,
// exactly when pageIndex commits (HeroPager's handleScrollEndDrag, at
// release, via pagingReleaseTarget converted to a LOGICAL index;
// onMomentumScrollEnd only corrects it after that if the real settle
// differs), via the same short DOT_TRANSITION_MS animation on every
// affected dot. count/currentPage are always the logical slide count and
// index (dotWindowRange/dotKinds have no idea the pager loops at all):
// wrapping past either end is still just pageIndex committing to a new
// value the same way any other page change does, honest linear position
// and all, not a special jump.

import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { dotKinds } from "@/logic/hero-carousel";

const DOT_SIZE = 8;
const PILL_WIDTH = 24;
// Total gap between adjacent dots, split as marginHorizontal on each dot
// (DOT_SPACING / 2 per side) rather than the container's flex `gap`: see
// styles.dot.
const DOT_SPACING = 8;

// The first or last rendered dot shrinks to this size (width and height,
// so it stays a smaller circle, not a squashed oval) when there are more
// slides beyond that edge (see dotWindowRange in hero-carousel.ts): an
// honest "more this way" hint, purely by render position, not by which
// slide it is.
const EDGE_DOT_SIZE = 4;

export function PageIndicator({
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

const styles = StyleSheet.create({
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
