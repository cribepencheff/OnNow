// A single Home card (PRD 5.1, FR-004, FR-006): a large portrait poster,
// nearly edge to edge, one show per card. Visual design comes later, so
// styling here stays minimal and functional.

import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import type { TvMazeShow } from "@/api/tvmaze-types";

interface HomeCardProps {
  show: TvMazeShow;
  metaLine: string;
}

export function HomeCard({ show, metaLine }: HomeCardProps) {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={metaLine ? `${show.name}, ${metaLine}` : show.name}
      testID="home-card"
    >
      <Image
        source={show.image?.original ?? show.image?.medium ?? undefined}
        style={styles.poster}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {show.name}
        </Text>
        {metaLine ? (
          <Text style={styles.meta} numberOfLines={1}>
            {metaLine}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  poster: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
  },
  details: {
    paddingTop: 12,
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  meta: {
    fontSize: 14,
    color: "#666666",
  },
});
