// A single Search result row (PRD 5.4, FR-024, FR-025, FR-027): poster,
// title, a meta line with year and genres, Show detail's status line, the
// service slot, and a follow circle. The status line is on every row, so
// it helps decide what to follow and rows keep their height.
// Tapping the row opens Show detail; the circle still follows without
// opening it (PRD 5.4, 5.5, CRI-79). Screen reader users get the row as
// one button, with follow or unfollow as an accessibility action (NFR-008).

import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FollowCircle } from "./FollowCircle";
import { useShow } from "@/hooks/useShow";
import { useStreamingService } from "@/hooks/useStreamingService";
import { useToday } from "@/hooks/useToday";
import { searchResultMetaLine } from "@/logic/search-results";
import { showState, showStateLabel } from "@/logic/show-state";
import { rowServiceText } from "@/logic/streaming-service";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { t, type } from "@/theme/tokens";

interface SearchResultRowProps {
  show: TvMazeShow;
  followed: boolean;
  onToggleFollow: () => void;
  onPress?: () => void;
}

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function SearchResultRow({
  show,
  followed,
  onToggleFollow,
  onPress,
}: SearchResultRowProps) {
  const metaLine = searchResultMetaLine(show);
  const { data: providers } = useStreamingService(show, true);
  const service = rowServiceText(providers);

  return (
    <Pressable
      style={styles.row}
      testID="search-result-row"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={show.name}
      accessibilityActions={[
        { name: "toggleFollow", label: followed ? "Unfollow" : "Follow" },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "toggleFollow") {
          onToggleFollow();
        }
      }}
    >
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
        {metaLine !== "" && (
          <Text style={styles.meta} numberOfLines={1}>
            {metaLine}
          </Text>
        )}
        <StatusLine showId={show.id} />
        {/* Its line is kept while TMDB answers, so the row does not grow. */}
        <Text
          style={styles.meta}
          numberOfLines={1}
          testID="search-result-service"
        >
          {service ?? ""}
        </Text>
      </View>
      <FollowCircle
        followed={followed}
        onPress={onToggleFollow}
        testID={`follow-${show.id}`}
      />
    </Pressable>
  );
}

// FR-025: Show detail's status line ("Airing · next ep Fri 9 Oct"), from
// the same cached show lookup as Show detail. Its line is kept while the
// lookup answers, so the row does not grow.
function StatusLine({ showId }: { showId: number }) {
  const { data } = useShow(showId);
  const todayDate = useToday();

  const label = data
    ? showStateLabel(
        showState(
          data,
          data._embedded.episodes,
          data._embedded.seasons,
          deviceTimeZone(),
          todayDate,
        ),
        todayDate,
      )
    : "";
  return (
    <Text style={styles.meta} numberOfLines={1} testID="search-result-status">
      {label}
    </Text>
  );
}

const POSTER_WIDTH = 60;
const POSTER_HEIGHT = 90;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: t.space2 + 4,
    paddingHorizontal: t.space4,
    gap: t.space2 + 4,
  },
  // No image: nothing, never a grey box (design system, PRD 5.4); the space
  // stays so titles line up.
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: t.radiusSm,
  },
  details: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  title: {
    ...type.headline,
    color: t.ink,
  },
  meta: {
    ...type.meta,
    minHeight: type.meta.lineHeight,
    color: t.inkMuted,
  },
});
