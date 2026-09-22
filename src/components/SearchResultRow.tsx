// A single Search result row (PRD 5.4, FR-024, FR-025): poster, title, meta
// line, two line summary, network, and a follow circle. Once followed, the
// row shows the next episode or status instead of the summary.

import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { FollowCircle } from "./FollowCircle";
import { useShow } from "@/hooks/useShow";
import { nextForShow } from "@/logic/next-episode";
import { nextEpisodeLabel } from "@/logic/next-episode-label";
import {
  plainTextSummary,
  searchResultMetaLine,
  searchResultNetworkName,
} from "@/logic/search-results";
import { today } from "@/logic/local-date";
import type { TvMazeShow } from "@/api/tvmaze-types";

interface SearchResultRowProps {
  show: TvMazeShow;
  followed: boolean;
  onToggleFollow: () => void;
}

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function SearchResultRow({
  show,
  followed,
  onToggleFollow,
}: SearchResultRowProps) {
  const summary = plainTextSummary(show.summary);
  const network = searchResultNetworkName(show);

  return (
    <View style={styles.row} testID="search-result-row">
      <Image
        source={show.image?.medium ?? undefined}
        style={styles.poster}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {show.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {searchResultMetaLine(show)}
        </Text>
        {followed ? (
          <FollowedNextLine showId={show.id} />
        ) : (
          summary && (
            <Text style={styles.summary} numberOfLines={2}>
              {summary}
            </Text>
          )
        )}
        {network && (
          <Text style={styles.network} numberOfLines={1}>
            {network}
          </Text>
        )}
      </View>
      <FollowCircle followed={followed} onPress={onToggleFollow} />
    </View>
  );
}

function FollowedNextLine({ showId }: { showId: number }) {
  const { data } = useShow(showId);

  const next = data
    ? nextForShow(
        data,
        data._embedded.episodes,
        data._embedded.seasons,
        deviceTimeZone(),
        today(deviceTimeZone()),
      )
    : undefined;

  return <Text style={styles.nextLine}>{nextEpisodeLabel(next)}</Text>;
}

const POSTER_WIDTH = 60;
const POSTER_HEIGHT = 90;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
  },
  details: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    fontSize: 13,
    color: "#666666",
  },
  summary: {
    fontSize: 13,
    color: "#333333",
  },
  nextLine: {
    fontSize: 13,
    fontWeight: "500",
  },
  network: {
    fontSize: 12,
    color: "#888888",
  },
});
