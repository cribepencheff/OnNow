// A poster row on Home, and in Search before typing (FR-038, FR-039,
// FR-026). Its card strip has one fixed height in every state, and a slot
// of fixed height is kept under it, so nothing on the page moves (CRI-110,
// CRI-127, CRI-131). On a first load, with nothing cached, it shows
// skeleton cards of the real cards' exact size, which crossfade into the
// cards (CRI-127). An empty row says why where its cards were (CRI-123).
// Removed only when it has no cards and nothing to say, which means its
// source has no shows at all. A swipe always comes to rest with a card at
// the left margin (CRI-127).
//
// Loading more is a deliberate gesture (CRI-131): dragged past its end,
// the strip shows a spinner to the right of the last card, and once the
// drag passes LOAD_MORE_PULL it gives a light haptic and asks for one more
// batch (onLoadMore), once per drag. The batch comes in as skeleton cards
// at the end, which crossfade into the new cards. At the end of the pool
// there is no spinner, and "You're all caught up" fades in under the row.
// When cards are taken out (followed shows, on a return to the screen),
// the strip keeps its first visible card first.

import * as Haptics from "expo-haptics";
import {
  Children,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { useAccessibilityFlags } from "@/hooks/useAccessibilityFlags";
import {
  LOAD_MORE_PULL,
  anchoredOffset,
  pastEnd,
} from "@/logic/poster-batches";
import { POSTER_CARD_GAP, posterSnapOffsets } from "@/logic/poster-snap";
import { t, type } from "@/theme/tokens";
import {
  POSTER_HEIGHT,
  POSTER_WIDTH,
  SkeletonCard,
  cardHeight,
} from "./ShowCard";

// Skeleton cards on a first load: two full and the peek of a third, as
// many as the screen shows.
const SKELETON_COUNT = 3;
// Skeleton cards at the end while more is loading (CRI-131).
const LOADING_MORE_SKELETON_COUNT = 2;

const CROSSFADE_MS = 250;

// The slot under a row's cards, where "You're all caught up" fades in: the
// old Refresh control's size and place (CRI-131).
export const ROW_END_SLOT_HEIGHT = 36;
export const CAUGHT_UP_TEXT = "You're all caught up";

// The load more spinner's box, to the right of the last card.
const SPINNER_BOX = 40;

const STRIDE = POSTER_WIDTH + POSTER_CARD_GAP;

// A row's full height (CRI-125): the heading, the cards and the slot under
// them, with the row's gap between them. Every part has a fixed size, so
// this is exact.
export function posterRowHeight(withCaption: boolean): number {
  return (
    type.headline.lineHeight +
    t.space2 +
    cardHeight(withCaption) +
    t.space2 +
    ROW_END_SLOT_HEIGHT
  );
}

export function PosterRow({
  title,
  isLoading,
  hasCards,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  withCaption = false,
  emptyText,
  testID,
  children,
}: {
  title: string;
  isLoading: boolean;
  hasCards: boolean;
  // More cards are on their way: skeleton cards at the end (CRI-131).
  isLoadingMore?: boolean;
  // The pool has more: a drag past the end loads it (CRI-131).
  hasMore?: boolean;
  // Called once per drag past the end, to load one more batch (CRI-131).
  onLoadMore?: () => void;
  // Whether the cards have a caption line ("Today"), which sets the row's
  // fixed height.
  withCaption?: boolean;
  // Said where the cards were when there are none (CRI-123).
  emptyText?: string | null;
  testID: string;
  children: ReactNode;
}) {
  const { reduceMotionEnabled } = useAccessibilityFlags();
  const { width: viewportWidth } = useWindowDimensions();
  const height = cardHeight(withCaption);
  // No cards yet and none cached: skeleton cards hold the row's place.
  const showSkeleton = isLoading && !hasCards;
  const isShown = hasCards || Boolean(emptyText) || showSkeleton;
  const canLoadMore = hasCards && !showSkeleton && hasMore && !isLoadingMore;
  const caughtUp = hasCards && !isLoading && !isLoadingMore && !hasMore;
  const [opacity] = useState(() => new Animated.Value(isShown ? 1 : 0));

  useEffect(() => {
    if (!isShown) {
      return;
    }
    if (reduceMotionEnabled) {
      opacity.setValue(1);
      return;
    }
    const fadeIn = Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    });
    fadeIn.start();
    return () => fadeIn.stop();
  }, [isShown, reduceMotionEnabled, opacity]);

  // "You're all caught up" fades in at the end of the pool.
  const [caughtUpOpacity] = useState(
    () => new Animated.Value(caughtUp ? 1 : 0),
  );
  useEffect(() => {
    if (!caughtUp || reduceMotionEnabled) {
      caughtUpOpacity.setValue(caughtUp ? 1 : 0);
      return;
    }
    const fadeIn = Animated.timing(caughtUpOpacity, {
      toValue: 1,
      duration: CROSSFADE_MS,
      useNativeDriver: true,
    });
    fadeIn.start();
    return () => fadeIn.stop();
  }, [caughtUp, reduceMotionEnabled, caughtUpOpacity]);

  const skeletons = (count: number, prefix: string) =>
    Array.from({ length: count }, (_, index) => (
      <SkeletonCard key={`${prefix}${index}`} withCaption={withCaption} />
    ));
  const childCount = Children.count(children);
  const cardCount = showSkeleton
    ? SKELETON_COUNT
    : childCount + (isLoadingMore ? LOADING_MORE_SKELETON_COUNT : 0);

  // The crossfade from the first load's skeleton cards to the cards. It is
  // noticed while rendering, so the skeleton cards are kept for the same
  // frame; the fade itself starts before paint.
  const [incoming] = useState(() => new Animated.Value(1));
  const [fading] = useState(() => new Animated.Value(0));
  const [wasSkeleton, setWasSkeleton] = useState(showSkeleton);
  const [outgoing, setOutgoing] = useState(false);
  if (wasSkeleton !== showSkeleton) {
    setWasSkeleton(showSkeleton);
    if (!showSkeleton && !reduceMotionEnabled) {
      setOutgoing(true);
    }
  }

  useLayoutEffect(() => {
    if (!outgoing) {
      incoming.setValue(1);
      return;
    }
    incoming.setValue(0);
    fading.setValue(1);
    const crossfade = Animated.parallel([
      Animated.timing(incoming, {
        toValue: 1,
        duration: CROSSFADE_MS,
        useNativeDriver: true,
      }),
      Animated.timing(fading, {
        toValue: 0,
        duration: CROSSFADE_MS,
        useNativeDriver: true,
      }),
    ]);
    crossfade.start(({ finished }) => {
      if (finished) {
        setOutgoing(false);
      }
    });
    return () => crossfade.stop();
  }, [outgoing, incoming, fading]);

  // The same crossfade for a batch loaded with a drag: the skeleton cards
  // at the end fade out where they stood while the new cards, each in its
  // own FadeInCard, fade in (CRI-131). Noticed while rendering, so the new
  // cards mount already fading in. `moreFrom` is how many cards there
  // were before the batch, where its skeleton cards started.
  const [moreFading] = useState(() => new Animated.Value(0));
  const [wasLoadingMore, setWasLoadingMore] = useState(isLoadingMore);
  const [moreFrom, setMoreFrom] = useState(childCount);
  const [moreOutgoing, setMoreOutgoing] = useState(false);
  if (wasLoadingMore !== isLoadingMore) {
    setWasLoadingMore(isLoadingMore);
    if (isLoadingMore) {
      setMoreFrom(childCount);
    } else if (!reduceMotionEnabled && childCount > moreFrom) {
      setMoreOutgoing(true);
    }
  }

  useLayoutEffect(() => {
    if (!moreOutgoing) {
      return;
    }
    moreFading.setValue(1);
    const fadeOut = Animated.timing(moreFading, {
      toValue: 0,
      duration: CROSSFADE_MS,
      useNativeDriver: true,
    });
    fadeOut.start(({ finished }) => {
      if (finished) {
        setMoreOutgoing(false);
      }
    });
    return () => fadeOut.stop();
  }, [moreOutgoing, moreFading]);

  const keys = Children.toArray(children).map((child) =>
    isValidElement(child) ? String(child.key) : "",
  );

  const snapOffsets = posterSnapOffsets({
    count: cardCount,
    cardWidth: POSTER_WIDTH,
    gap: POSTER_CARD_GAP,
    margin: t.space4,
    viewportWidth,
  });

  // Cards taken out (followed shows): keep the first visible card first,
  // or the next one that stayed (CRI-131).
  const scrollRef = useRef<ScrollView>(null);
  const offsetX = useRef(0);
  const previousKeys = useRef(keys);
  useLayoutEffect(() => {
    const before = previousKeys.current;
    previousKeys.current = keys;
    const removed = before.some((key) => !keys.includes(key));
    if (!removed) {
      return;
    }
    const offset = anchoredOffset({
      previousKeys: before,
      keys,
      offsetX: offsetX.current,
      stride: STRIDE,
      maxOffset: snapOffsets[snapOffsets.length - 1],
    });
    if (offset !== null) {
      offsetX.current = offset;
      scrollRef.current?.scrollTo({ x: offset, animated: false });
    }
  });

  // One batch per drag past the end (CRI-131).
  const dragging = useRef(false);
  const triggered = useRef(false);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    offsetX.current = contentOffset.x;
    if (!dragging.current || triggered.current || !canLoadMore) {
      return;
    }
    const pulled = pastEnd({
      offsetX: contentOffset.x,
      viewportWidth: layoutMeasurement.width,
      contentWidth: contentSize.width,
    });
    if (pulled >= LOAD_MORE_PULL) {
      triggered.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onLoadMore?.();
    }
  }

  const fixedHeight = { height };

  if (!isLoading && !isShown) {
    return null;
  }
  return (
    <Animated.View
      style={[styles.section, { opacity }]}
      testID={testID}
      // Nothing to read until the cards are in.
      accessibilityElementsHidden={!isShown}
      importantForAccessibility={isShown ? "auto" : "no-hide-descendants"}
    >
      <Text style={styles.heading} accessibilityRole="header">
        {title}
      </Text>
      <View
        style={fixedHeight}
        // Skeleton cards say nothing to a screen reader.
        accessibilityElementsHidden={showSkeleton}
        importantForAccessibility={
          showSkeleton ? "no-hide-descendants" : "auto"
        }
      >
        {!showSkeleton && !hasCards && emptyText ? (
          <Animated.View
            testID={`${testID}-empty`}
            style={[styles.empty, fixedHeight, { opacity: incoming }]}
          >
            <Text style={styles.emptyText}>{emptyText}</Text>
          </Animated.View>
        ) : (
          <Animated.View style={{ opacity: incoming }}>
            <ScrollView
              ref={scrollRef}
              // The first load's strip and the cards' are separate.
              key={showSkeleton ? "skeleton" : "cards"}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={fixedHeight}
              testID={showSkeleton ? `${testID}-skeleton` : `${testID}-cards`}
              contentContainerStyle={styles.cards}
              snapToOffsets={snapOffsets}
              decelerationRate="fast"
              scrollEnabled={!showSkeleton}
              onScroll={handleScroll}
              onScrollBeginDrag={() => {
                dragging.current = true;
                triggered.current = false;
              }}
              onScrollEndDrag={() => {
                dragging.current = false;
              }}
              scrollEventThrottle={16}
            >
              {showSkeleton ? (
                skeletons(SKELETON_COUNT, "first")
              ) : (
                <>
                  {Children.map(children, (child, index) => (
                    // The new batch's cards mount as its skeleton cards
                    // fade out, and fade in where they stood.
                    <FadeInCard fadeIn={moreOutgoing && index >= moreFrom}>
                      {child}
                    </FadeInCard>
                  ))}
                  {isLoadingMore &&
                    skeletons(LOADING_MORE_SKELETON_COUNT, "more")}
                  {moreOutgoing && (
                    <Animated.View
                      testID={`${testID}-more-outgoing`}
                      pointerEvents="none"
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={[
                        styles.moreOutgoing,
                        { left: t.space4 + moreFrom * STRIDE },
                        { opacity: moreFading },
                      ]}
                    >
                      {skeletons(LOADING_MORE_SKELETON_COUNT, "fading")}
                    </Animated.View>
                  )}
                  {canLoadMore && (
                    // Beyond the strip's end: seen only while it is
                    // dragged past it.
                    <View
                      testID={`${testID}-load-more`}
                      pointerEvents="none"
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={styles.loadMore}
                    >
                      <ActivityIndicator size="small" color={t.inkMuted} />
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </Animated.View>
        )}
        {outgoing && (
          <Animated.View
            testID={`${testID}-outgoing`}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[StyleSheet.absoluteFill, { opacity: fading }]}
          >
            <View style={[styles.cards, styles.outgoingStrip, fixedHeight]}>
              {skeletons(SKELETON_COUNT, "first")}
            </View>
          </Animated.View>
        )}
      </View>
      <View style={styles.endSlot} testID={`${testID}-end-slot`}>
        {caughtUp && (
          <Animated.Text
            style={[styles.caughtUp, { opacity: caughtUpOpacity }]}
            testID={`${testID}-caught-up`}
          >
            {CAUGHT_UP_TEXT}
          </Animated.Text>
        )}
      </View>
    </Animated.View>
  );
}

// A card that fades in as it mounts, when it is new to the row.
function FadeInCard({
  fadeIn,
  children,
}: {
  fadeIn: boolean;
  children: ReactNode;
}) {
  const [opacity] = useState(() => new Animated.Value(fadeIn ? 0 : 1));
  useEffect(() => {
    if (!fadeIn) {
      return;
    }
    const fade = Animated.timing(opacity, {
      toValue: 1,
      duration: CROSSFADE_MS,
      useNativeDriver: true,
    });
    fade.start();
    return () => fade.stop();
    // Only as it mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  section: {
    gap: t.space2,
  },
  heading: {
    ...type.headline,
    color: t.ink,
    paddingHorizontal: t.space4,
  },
  cards: {
    paddingHorizontal: t.space4,
    gap: POSTER_CARD_GAP,
  },
  // The skeleton cards fading out, laid out as the strip was.
  outgoingStrip: {
    flexDirection: "row",
    overflow: "hidden",
  },
  moreOutgoing: {
    position: "absolute",
    top: 0,
    flexDirection: "row",
    gap: POSTER_CARD_GAP,
  },
  // Right of the strip's end margin, centred on the poster, not the name
  // under it.
  loadMore: {
    position: "absolute",
    top: 0,
    right: -SPINNER_BOX,
    width: SPINNER_BOX,
    height: POSTER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.space4,
  },
  emptyText: {
    ...type.body,
    color: t.inkMuted,
    textAlign: "center",
  },
  // Quiet, like the meta line; where Refresh's label sat.
  endSlot: {
    height: ROW_END_SLOT_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: t.space4,
  },
  caughtUp: {
    ...type.meta,
    color: t.inkMuted,
  },
});
