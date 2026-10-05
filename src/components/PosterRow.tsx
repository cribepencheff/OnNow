// A poster row on Home, and in Search before typing (FR-038, FR-039,
// FR-026). Its card strip has one fixed height in every state, so nothing
// on the page moves: while its cards load it keeps that height, invisible,
// then fades in (CRI-110). A new batch (Refresh, Start over) crossfades in
// over the old one, scrolled to its start; an empty row says why where its
// cards were (CRI-123). Removed only when it has no cards and nothing to
// say, which means its source has no shows at all.

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { useAccessibilityFlags } from "@/hooks/useAccessibilityFlags";
import { t, type } from "@/theme/tokens";
import { CARD_HEIGHT } from "./ShowCard";

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
  emptyText,
  batch = 0,
  testID,
  children,
  footer,
}: {
  title: string;
  isLoading: boolean;
  hasCards: boolean;
  // Said where the cards were when there are none (CRI-123).
  emptyText?: string | null;
  // Which batch the cards are; a new one crossfades in (CRI-123).
  batch?: number;
  testID: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { reduceMotionEnabled } = useAccessibilityFlags();
  const isShown = hasCards || Boolean(emptyText);
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

  // The crossfade between batches. A new batch is noticed while
  // rendering, so the old cards are kept for the same frame; the fade
  // itself starts before paint.
  const [incoming] = useState(() => new Animated.Value(1));
  const [fading] = useState(() => new Animated.Value(0));
  const [shownBatch, setShownBatch] = useState({ batch, children });
  const [outgoing, setOutgoing] = useState<Outgoing | null>(null);
  // Where the strip rests, kept when a scroll ends.
  const [scrollOffset, setScrollOffset] = useState(0);

  if (batch !== shownBatch.batch) {
    setShownBatch({ batch, children });
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
      <View style={styles.stripBox}>
        {!hasCards && emptyText ? (
          <Animated.View
            testID={`${testID}-empty`}
            style={[styles.empty, { opacity: incoming }]}
          >
            <Text style={styles.emptyText}>{emptyText}</Text>
          </Animated.View>
        ) : (
          <Animated.View style={{ opacity: incoming }}>
            <ScrollView
              // A new batch is a new strip, so it starts at its beginning.
              key={batch}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.strip}
              testID={`${testID}-cards`}
              contentContainerStyle={styles.cards}
              onScrollEndDrag={keepScrollOffset}
              onMomentumScrollEnd={keepScrollOffset}
            >
              {children}
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
              style={styles.strip}
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
    marginTop: t.space6,
    gap: t.space2,
  },
  heading: {
    ...type.headline,
    color: t.ink,
    paddingHorizontal: t.space4,
  },
  stripBox: {
    height: CARD_HEIGHT,
  },
  strip: {
    height: CARD_HEIGHT,
  },
  cards: {
    paddingHorizontal: t.space4,
    gap: t.space2,
  },
  empty: {
    height: CARD_HEIGHT,
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
