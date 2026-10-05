// A poster row on Home (FR-038, FR-039). While its cards load it keeps its
// full height, invisible, so nothing on the page moves when it appears;
// then it fades in. Removed only when it ends up with no cards (CRI-110).

import { useEffect, useState, type ReactNode } from "react";
import { Animated, ScrollView, StyleSheet, Text } from "react-native";

import { useAccessibilityFlags } from "@/hooks/useAccessibilityFlags";
import { t, type } from "@/theme/tokens";
import { CARD_HEIGHT } from "./ShowCard";

export function HomeRow({
  title,
  isLoading,
  hasCards,
  testID,
  children,
  footer,
}: {
  title: string;
  isLoading: boolean;
  hasCards: boolean;
  testID: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { reduceMotionEnabled } = useAccessibilityFlags();
  const [opacity] = useState(() => new Animated.Value(hasCards ? 1 : 0));

  useEffect(() => {
    if (!hasCards) {
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
  }, [hasCards, reduceMotionEnabled, opacity]);

  if (!isLoading && !hasCards) {
    return null;
  }
  return (
    <Animated.View
      style={[styles.section, { opacity }]}
      testID={testID}
      // Nothing to read until the cards are in.
      accessibilityElementsHidden={!hasCards}
      importantForAccessibility={hasCards ? "auto" : "no-hide-descendants"}
    >
      <Text style={styles.heading} accessibilityRole="header">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        testID={`${testID}-cards`}
        contentContainerStyle={styles.cards}
      >
        {children}
      </ScrollView>
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
  strip: {
    minHeight: CARD_HEIGHT,
  },
  cards: {
    paddingHorizontal: t.space4,
    gap: t.space2,
  },
});
