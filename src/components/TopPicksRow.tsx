// "Top picks for you" under the Home hero (FR-038, ADR 0016). A card
// followed from the row stays, marked, until Refresh shows the next picks.

import type { TvMazeShow } from "@/api/tvmaze-types";
import { useTopPicks } from "@/hooks/useTopPicks";
import { PosterRow } from "./PosterRow";
import { RowRefresh } from "./RowRefresh";
import { ShowCard, type DetailPathname } from "./ShowCard";

export function TopPicksRow({
  followedShows,
  detailPathname,
}: {
  followedShows: TvMazeShow[];
  detailPathname?: DetailPathname;
}) {
  const { cards, isLoading, refresh, isRefreshing } =
    useTopPicks(followedShows);

  return (
    <PosterRow
      title="Top picks for you"
      isLoading={isLoading}
      hasCards={cards.length > 0}
      testID="top-picks-row"
      footer={
        <RowRefresh
          onPress={refresh}
          isRefreshing={isRefreshing}
          accessibilityHint="Shows the next top picks"
          testID="top-picks-refresh"
        />
      }
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
  );
}
