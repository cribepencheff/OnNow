// "Airing this week" on Home (FR-039, ADR 0016): TMDB's on-the-air shows by
// popularity, followed shows left out, each with its next episode's day.
// Always shown; a card followed from the row stays, marked, this launch.

import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  useAiringThisWeek,
  useNextEpisodeWord,
} from "@/hooks/useAiringThisWeek";
import type { TopPick } from "@/logic/top-picks";
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
          <AiringCard key={card.tmdbId} card={card} />
        ))}
      </ScrollView>
    </View>
  );
}

function AiringCard({ card }: { card: TopPick }) {
  const day = useNextEpisodeWord(card.tvmazeId);
  return <ShowCard card={card} caption={day} testID="airing" />;
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
