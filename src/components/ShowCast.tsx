// Show detail's Cast & Crew row (CRI-143, owner 2026-11-08; Apple TV's
// Cast & Crew as the reference): TVmaze's cast in its own order, then the
// show's creators from TMDB (from the request that already gives the
// show's images), each a round portrait with the name and, muted, the
// character or "Creator". Nothing to tap. Without a portrait, a plain
// circle with a person symbol; without a character, the name alone (data
// first). "Cast" alone when TMDB lists no creators; no row at all when
// there is no one, while loading, or on an error.

import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { IMAGE_BASE, type TmdbCreator } from "@/api/tmdb-types";
import { useShowCast } from "@/hooks/useShowCast";
import { t, type } from "@/theme/tokens";

// How many people show across the screen: three, and the fourth at the
// edge, a hint that the row scrolls (owner, 2026-11-08).
const PEOPLE_ACROSS = 3.4;
const GAP = 12;

interface Person {
  key: string;
  name: string;
  imageUrl: string | null;
  role: string | null;
}

export function ShowCast({
  showId,
  creators,
}: {
  showId: number;
  creators: TmdbCreator[];
}) {
  const { data: cast } = useShowCast(showId);
  const { width } = useWindowDimensions();

  const people: Person[] = [
    ...(cast ?? []).map((member, index) => ({
      // One person can play more than one character.
      key: `cast-${member.personId}-${member.character ?? index}`,
      name: member.name,
      imageUrl: member.imageUrl,
      role: member.character,
    })),
    ...creators.map((creator) => ({
      key: `creator-${creator.name}`,
      name: creator.name,
      imageUrl: creator.profilePath
        ? `${IMAGE_BASE}/w185${creator.profilePath}`
        : null,
      role: "Creator",
    })),
  ];
  if (people.length === 0) {
    return null;
  }

  const itemWidth = Math.floor((width - t.contentInset) / PEOPLE_ACROSS - GAP);

  return (
    <View style={styles.section} testID="show-detail-cast">
      <Text style={styles.heading} accessibilityRole="header">
        {creators.length > 0 ? "Cast & Crew" : "Cast"}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {people.map((person) => (
          <PersonItem key={person.key} person={person} size={itemWidth} />
        ))}
      </ScrollView>
    </View>
  );
}

function PersonItem({ person, size }: { person: Person; size: number }) {
  return (
    <View
      style={[styles.item, { width: size }]}
      accessible
      accessibilityLabel={
        person.role ? `${person.name}, ${person.role}` : person.name
      }
    >
      <View
        style={[
          styles.portrait,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        {person.imageUrl ? (
          <Image
            source={person.imageUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityIgnoresInvertColors
            testID="cast-portrait"
          />
        ) : (
          <SymbolView
            name="person.fill"
            tintColor={t.inkSubtle}
            size={Math.round(size * 0.4)}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {person.name}
      </Text>
      {person.role && (
        <Text style={styles.role} numberOfLines={2}>
          {person.role}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: t.space6,
  },
  // As Show detail's other headings ("About", "Season 6").
  heading: {
    ...type.headline,
    color: t.ink,
    paddingHorizontal: t.contentInset,
    marginBottom: 12,
  },
  row: {
    paddingHorizontal: t.contentInset,
    gap: GAP,
  },
  item: {
    alignItems: "center",
    gap: 2,
  },
  portrait: {
    backgroundColor: t.surfaceRaised,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  name: {
    ...type.meta,
    color: t.ink,
    textAlign: "center",
  },
  role: {
    ...type.meta,
    color: t.inkMuted,
    textAlign: "center",
  },
});
