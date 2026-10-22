// A single Search result row (PRD 5.4, FR-024, FR-025, FR-027): poster
// with the follow circle on it, title, Show detail's status line, two
// lines about the show, and the service slot. The status line is on every
// row, so it helps decide what to follow and rows keep their height. Year
// and genres are in Show detail's meta line (owner, 2026-10-22).
// Tapping the row opens Show detail; the circle still follows without
// opening it (PRD 5.4, 5.5, CRI-79). Screen reader users get the row as
// one button, with follow or unfollow as an accessibility action (NFR-008).

import { StyleSheet } from "react-native";

import { PosterFollowCircle } from "./PosterFollowCircle";
import { PosterRating } from "./PosterRating";
import { ShowRow, ShowRowLine, ShowRowServiceLine } from "./ShowRow";
import { useFollowToggle } from "@/hooks/useFollowList";
import { useShow } from "@/hooks/useShow";
import { useStreamingService } from "@/hooks/useStreamingService";
import { useListPoster } from "@/hooks/useListPoster";
import { useToday } from "@/hooks/useToday";
import { plainTextSummary } from "@/logic/search-results";
import { showState, showStateLabel } from "@/logic/show-state";
import {
  rowIsUnavailable,
  rowServiceLogos,
  rowServiceText,
} from "@/logic/streaming-service";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { t } from "@/theme/tokens";

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
  const { data: providers } = useStreamingService(show, true);
  const service = rowServiceText(providers);
  const poster = useListPoster(show);

  return (
    <ShowRow
      title={show.name}
      posterUri={poster.uri}
      posterPending={poster.pending}
      summary={plainTextSummary(show.summary)}
      summaryLines={3}
      // The show's status right under the title, in ink (owner,
      // 2026-10-22).
      subtitle={<StatusLine showId={show.id} />}
      largePoster
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
      posterBadge={<PosterRating show={show} />}
      posterAccessory={
        <PosterFollowCircle
          followed={followed}
          onPress={toggle}
          testID={`follow-${show.id}`}
          size={SEARCH_FOLLOW_CIRCLE_SIZE}
        />
      }
    >
      {/* At the bottom; its line is kept while TMDB answers, so the row
          does not grow. */}
      <ShowRowServiceLine
        logos={rowServiceLogos(providers)}
        text={service ?? ""}
        unavailable={rowIsUnavailable(providers)}
        testID="search-result-service"
      />
    </ShowRow>
  );
}

// FR-025: Show detail's status line ("Next ep Fri 9 Oct"), from the same
// cached show lookup as Show detail, right under the title in ink (owner,
// 2026-10-22). Its line is kept while the lookup answers, so the row does
// not grow.
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
    <ShowRowLine testID="search-result-status" style={styles.ink}>
      {label}
    </ShowRowLine>
  );
}

// The poster cards' follow circle, a little smaller on the row's poster
// (owner, 2026-10-22).
const SEARCH_FOLLOW_CIRCLE_SIZE = 28;

const styles = StyleSheet.create({
  // The lines right under the title (owner, 2026-10-22).
  ink: {
    color: t.ink,
  },
});
