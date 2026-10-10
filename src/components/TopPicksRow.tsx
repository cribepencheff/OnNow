// "Top picks for you" under the Home hero (FR-038, ADR 0016). A card
// followed from the row stays in it, marked, until Home's tab is selected
// again. Dragged past its end the row loads the next picks and appends
// them, up to the row's cap. At its end, on Home, it offers "Search more"
// (CRI-131).
// The row is hidden when it has no picks to show; when it gets some (a
// follow from "Airing this week", say) it opens with skeleton cards that
// then fill in (CRI-125).

import type { TvMazeShow } from "@/api/tvmaze-types";
import { useTopPicks } from "@/hooks/useTopPicks";
import { isTopPicksShown } from "@/logic/top-picks";
import { PosterRow, posterRowHeight } from "./PosterRow";
import { RowPresence } from "./RowPresence";
import { ShowCard, type DetailPathname } from "./ShowCard";

export function TopPicksRow({
  followedShows,
  detailPathname,
  onSearchMore,
  quietEndOnArrival,
}: {
  followedShows: TvMazeShow[];
  detailPathname?: DetailPathname;
  // "Search more" at the end of the row, on Home (CRI-131). Without it
  // (inside Search, already there) the row ends with "You're all caught
  // up", as "Airing this week" does.
  onSearchMore?: () => void;
  // Inside Search: no end element if the row is already at its end there.
  quietEndOnArrival?: boolean;
}) {
  const { cards, isLoading, isLoadingMore, hasMore, loadMore } =
    useTopPicks(followedShows);
  const shown = isTopPicksShown({
    followedCount: followedShows.length,
    isLoading,
    hasCards: cards.length > 0,
  });

  return (
    <RowPresence
      shown={shown}
      height={posterRowHeight(false)}
      testID="top-picks-presence"
    >
      <PosterRow
        title="Top picks for you"
        isLoading={isLoading}
        hasCards={cards.length > 0}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        endAction={
          onSearchMore && { label: "Search more", onPress: onSearchMore }
        }
        quietEndOnArrival={quietEndOnArrival}
        testID="top-picks-row"
      >
        {cards.map((card) => (
          <ShowCard
            key={card.tmdbId}
            card={card}
            testID="top-pick"
            detailPathname={detailPathname}
          />
        ))}
      </PosterRow>
    </RowPresence>
  );
}
