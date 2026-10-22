// A single Search result row (PRD 5.4, FR-024, FR-025, FR-027): poster,
// title, a meta line with year and genres, Show detail's status line, the
// service slot, and a follow circle. The status line is on every row, so
// it helps decide what to follow and rows keep their height.
// Tapping the row opens Show detail; the circle still follows without
// opening it (PRD 5.4, 5.5, CRI-79). Screen reader users get the row as
// one button, with follow or unfollow as an accessibility action (NFR-008).

import { StyleSheet } from "react-native";

import { PosterFollowCircle } from "./PosterFollowCircle";
import { ImdbRating } from "./ImdbRating";
import { ShowRow, ShowRowLine, ShowRowServiceLine } from "./ShowRow";
import { useFollowToggle } from "@/hooks/useFollowList";
import { useShow } from "@/hooks/useShow";
import { useStreamingService } from "@/hooks/useStreamingService";
import { useListPoster } from "@/hooks/useListPoster";
import { useToday } from "@/hooks/useToday";
import { plainTextSummary, searchResultMetaLine } from "@/logic/search-results";
import { showState, showStateLabel } from "@/logic/show-state";
import { rowServiceLogos, rowServiceText } from "@/logic/streaming-service";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { t, type } from "@/theme/tokens";

interface SearchResultRowProps {
  show: TvMazeShow;
  onPress?: () => void;
}

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function SearchResultRow({ show, onPress }: SearchResultRowProps) {
  // Only this show's follow state: a follow redraws this row, not the list.
  const { followed, toggle } = useFollowToggle(show.id);
  const metaLine = searchResultMetaLine(show);
  const { data: providers } = useStreamingService(show, true);
  const service = rowServiceText(providers);
  const poster = useListPoster(show);

  return (
    <ShowRow
      title={show.name}
      posterUri={poster.uri}
      posterPending={poster.pending}
      summary={plainTextSummary(show.summary)}
      // Its line is kept while TMDB answers, so the row does not grow.
      subtitle={
        <ShowRowServiceLine
          logos={rowServiceLogos(providers)}
          text={service ?? ""}
          testID="search-result-service"
        />
      }
      largePoster
      titleAccessory={
        <ImdbRating show={show} linked={false} textStyle={styles.rating} />
      }
      testID="search-result-row"
      onPress={onPress}
      accessibilityLabel={show.name}
      accessibilityActions={[
        { name: "toggleFollow", label: followed ? "Unfollow" : "Follow" },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "toggleFollow") {
          toggle();
        }
      }}
      posterAccessory={
        <PosterFollowCircle
          followed={followed}
          onPress={toggle}
          testID={`follow-${show.id}`}
        />
      }
    >
      {metaLine !== "" && <ShowRowLine>{metaLine}</ShowRowLine>}
      <StatusLine showId={show.id} />
    </ShowRow>
  );
}

// FR-025: Show detail's status line ("Next ep Fri 9 Oct"), from
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
  return <ShowRowLine testID="search-result-status">{label}</ShowRowLine>;
}

const styles = StyleSheet.create({
  // The rating at the row's small size, muted beside the title.
  rating: {
    ...type.meta,
    color: t.inkMuted,
  },
});
