// "Airing this week" on Home (FR-039, ADR 0016): shows that would be in the
// hero if followed, by popularity, followed shows left out, each with its
// day. Always shown; a card followed from the row stays, marked.

import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAiringThisWeek } from "@/hooks/useAiringThisWeek";
import { t, type } from "@/theme/tokens";
import { ShowCard } from "./ShowCard";

export function AiringThisWeekRow() {
  const cards = useAiringThisWeek();

  if (cards.length === 0) {
    return null;
  }
  return (
    <View style={styles.section} testID="airing-this-week-row">
      <Text style={styles.heading} accessibilityRole="header">
        Airing this week
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cards}
      >
        {cards.map((card) => (
          <ShowCard
            key={card.tmdbId}
            card={card}
            caption={card.day}
            testID="airing"
          />
        ))}
      </ScrollView>
    </View>
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
  cards: {
    paddingHorizontal: t.space4,
    gap: t.space2,
  },
});
