// Show detail's Cast row (CRI-143, owner 2026-11-08; Apple TV's Cast &
// Crew as the reference): TVmaze's cast in its own order, each a round
// portrait with the person's name and, muted, the character's. Nothing to
// tap. Without a portrait, a plain circle with a person symbol; without a
// character, the name alone (data first). No row at all while loading,
// on an error, or for a show TVmaze lists no cast for.

import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { TvMazeCastMember } from "@/api/tvmaze-types";
import { useShowCast } from "@/hooks/useShowCast";
import { t, type } from "@/theme/tokens";

const PORTRAIT_SIZE = 80;
const ITEM_WIDTH = 96;

export function ShowCast({ showId }: { showId: number }) {
  const { data: cast } = useShowCast(showId);
  if (!cast || cast.length === 0) {
    return null;
  }

  return (
    <View style={styles.section} testID="show-detail-cast">
      <Text style={styles.heading} accessibilityRole="header">
        Cast
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {cast.map((member, index) => (
          <CastMember
            // One person can play more than one character.
            key={`${member.personId}-${member.character ?? index}`}
            member={member}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function CastMember({ member }: { member: TvMazeCastMember }) {
  return (
    <View
      style={styles.item}
      accessible
      accessibilityLabel={
        member.character ? `${member.name}, ${member.character}` : member.name
      }
    >
      <View style={styles.portrait}>
        {member.imageUrl ? (
          <Image
            source={member.imageUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityIgnoresInvertColors
            testID="cast-portrait"
          />
        ) : (
          <SymbolView
            name="person.fill"
            tintColor={t.inkSubtle}
            size={32}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {member.name}
      </Text>
      {member.character && (
        <Text style={styles.character} numberOfLines={2}>
          {member.character}
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
    gap: 12,
  },
  item: {
    width: ITEM_WIDTH,
    alignItems: "center",
    gap: 2,
  },
  portrait: {
    width: PORTRAIT_SIZE,
    height: PORTRAIT_SIZE,
    borderRadius: PORTRAIT_SIZE / 2,
    backgroundColor: t.surfaceRaised,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  name: {
    ...type.meta,
    color: t.ink,
    textAlign: "center",
  },
  character: {
    ...type.meta,
    color: t.inkMuted,
    textAlign: "center",
  },
});
