// A poster row on Home, and in Search before typing (FR-038, FR-039,
// FR-026). Its card strip has one fixed height in every state, so nothing
// on the page moves (CRI-110, CRI-127). On a first load, with nothing
// cached, it shows skeleton cards of the real cards' exact size, which
// crossfade into the cards (CRI-127). A new batch (Refresh, Start over)
// crossfades in over the old one, scrolled to its start; an empty row says
// why where its cards were (CRI-123). Removed only when it has no cards
// and nothing to say, which means its source has no shows at all. A swipe
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
import {
  POSTER_CARD_GAP,
  POSTER_ROW_BOTTOM_SPACE,
  POSTER_ROW_TOP_MARGIN,
  posterSnapOffsets,
} from "@/logic/poster-snap";
import { t, type } from "@/theme/tokens";
import { POSTER_WIDTH, SkeletonCard, cardHeight } from "./ShowCard";

// Skeleton cards on a first load: two full and the peek of a third, as
// many as the screen shows.
const SKELETON_COUNT = 3;
// The strip key while skeleton cards are on screen; batches count from 0.
const SKELETON_BATCH = -1;

const CROSSFADE_MS = 250;

interface Outgoing {
  children: ReactNode;
  // Where the old strip was scrolled to, so it fades out where it was.
  offset: number;
}

export function PosterRow({
  title,
  isLoading,
  hasCards,
  withCaption = false,
  emptyText,
  batch = 0,
  testID,
  children,
  footer,
}: {
  title: string;
  isLoading: boolean;
  hasCards: boolean;
  // Whether the cards have a caption line ("Today"), which sets the row's
  // fixed height.
  withCaption?: boolean;
  // Said where the cards were when there are none (CRI-123).
  emptyText?: string | null;
  // Which batch the cards are; a new one crossfades in (CRI-123).
  batch?: number;
  testID: string;
  children: ReactNode;
  footer?: ReactNode;
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

  // The skeleton counts as a batch of its own, so the cards crossfade in
  // over it like a new batch over the old.
  const stripBatch = showSkeleton ? SKELETON_BATCH : batch;
  const stripChildren = showSkeleton
    ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <SkeletonCard key={index} withCaption={withCaption} />
      ))
    : children;

  // The crossfade between batches. A new batch is noticed while
  // rendering, so the old cards are kept for the same frame; the fade
  // itself starts before paint.
  const [incoming] = useState(() => new Animated.Value(1));
  const [fading] = useState(() => new Animated.Value(0));
  const [shownBatch, setShownBatch] = useState({
    batch: stripBatch,
    children: stripChildren,
  });
  const [outgoing, setOutgoing] = useState<Outgoing | null>(null);
  // Where the strip rests, kept when a scroll ends.
  const [scrollOffset, setScrollOffset] = useState(0);

  if (stripBatch !== shownBatch.batch) {
    setShownBatch({ batch: stripBatch, children: stripChildren });
    setScrollOffset(0);
    setOutgoing(
      reduceMotionEnabled
        ? null
        : { children: shownBatch.children, offset: scrollOffset },
    );
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
        setOutgoing(null);
      }
    });
    return () => crossfade.stop();
  }, [outgoing, incoming, fading]);

  function keepScrollOffset(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setScrollOffset(event.nativeEvent.contentOffset.x);
  }

  const snapOffsets = posterSnapOffsets({
    count: Children.count(stripChildren),
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
              // A new batch is a new strip, so it starts at its beginning.
              key={stripBatch}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={fixedHeight}
              testID={showSkeleton ? `${testID}-skeleton` : `${testID}-cards`}
              contentContainerStyle={styles.cards}
              snapToOffsets={snapOffsets}
              decelerationRate="fast"
              scrollEnabled={!showSkeleton}
              onScrollEndDrag={keepScrollOffset}
              onMomentumScrollEnd={keepScrollOffset}
            >
              {stripChildren}
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
            <ScrollView
              horizontal
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: outgoing.offset, y: 0 }}
              style={fixedHeight}
              contentContainerStyle={styles.cards}
            >
              {outgoing.children}
            </ScrollView>
          </Animated.View>
        )}
      </View>
      {footer}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: POSTER_ROW_TOP_MARGIN,
    marginBottom: POSTER_ROW_BOTTOM_SPACE,
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
