// A poster row on Home, and in Search before typing (FR-038, FR-039,
// FR-026). Its card strip has one fixed height in every state, so nothing
// on the page moves (CRI-110, CRI-127). On a first load, with nothing
// cached, it shows skeleton cards of the real cards' exact size, which
// crossfade into the cards (CRI-127). Swiped towards its end it asks for
// more (onNearEnd), and the next cards are appended; while they are on
// their way, skeleton cards wait at the end (CRI-131). An empty row says
// why where its cards were (CRI-123). Removed only when it has no cards and
// nothing to say, which means its source has no shows at all. A swipe
// always comes to rest with a card at the left margin (CRI-127).

import {
  Children,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import {
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
import { LOAD_MORE_AHEAD_CARDS, isNearEnd } from "@/logic/poster-batches";
import {
  POSTER_CARD_GAP,
  POSTER_ROW_TOP_MARGIN,
  posterSnapOffsets,
} from "@/logic/poster-snap";
import { t, type } from "@/theme/tokens";
import { POSTER_WIDTH, SkeletonCard, cardHeight } from "./ShowCard";

// Skeleton cards on a first load: two full and the peek of a third, as
// many as the screen shows.
const SKELETON_COUNT = 3;
// Skeleton cards at the end while more is loading (CRI-131).
const LOADING_MORE_SKELETON_COUNT = 2;

const CROSSFADE_MS = 250;

// A row's full height (CRI-125): the space above it, the heading and the
// cards, with the row's gap between them. Every part has a fixed size, so
// this is exact.
export function posterRowHeight(withCaption: boolean): number {
  return (
    POSTER_ROW_TOP_MARGIN +
    type.headline.lineHeight +
    t.space2 +
    cardHeight(withCaption)
  );
}

export function PosterRow({
  title,
  isLoading,
  hasCards,
  isLoadingMore = false,
  onNearEnd,
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
  // Called as the strip is swiped near its end, to load more (CRI-131).
  onNearEnd?: () => void;
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

  const skeletons = (count: number, prefix: string) =>
    Array.from({ length: count }, (_, index) => (
      <SkeletonCard key={`${prefix}${index}`} withCaption={withCaption} />
    ));
  const cardCount = showSkeleton
    ? SKELETON_COUNT
    : Children.count(children) +
      (isLoadingMore ? LOADING_MORE_SKELETON_COUNT : 0);

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

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (
      onNearEnd &&
      isNearEnd({
        offsetX: contentOffset.x,
        viewportWidth: layoutMeasurement.width,
        contentWidth: contentSize.width,
        aheadWidth: LOAD_MORE_AHEAD_CARDS * (POSTER_WIDTH + POSTER_CARD_GAP),
      })
    ) {
      onNearEnd();
    }
  }

  const snapOffsets = posterSnapOffsets({
    count: cardCount,
    cardWidth: POSTER_WIDTH,
    gap: POSTER_CARD_GAP,
    margin: t.space4,
    viewportWidth,
  });
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
              scrollEventThrottle={100}
            >
              {showSkeleton ? (
                skeletons(SKELETON_COUNT, "first")
              ) : (
                <>
                  {children}
                  {isLoadingMore &&
                    skeletons(LOADING_MORE_SKELETON_COUNT, "more")}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: POSTER_ROW_TOP_MARGIN,
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
});
