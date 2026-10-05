// "Top picks for you" under the Home hero (FR-038, ADR 0016). A card
// followed from the row stays, marked, until Refresh shows the next picks.
// At the end of the picks the control reads "Start over"; the row is
// empty, with a line saying so, only when every pick is followed
// (CRI-123).

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
  const {
    cards,
    isLoading,
    refresh,
    isRefreshing,
    control,
    allFollowed,
    batch,
  } = useTopPicks(followedShows);

  return (
    <PosterRow
      title="Top picks for you"
      isLoading={isLoading}
      hasCards={cards.length > 0}
      emptyText={allFollowed ? "That's all for now" : null}
      batch={batch}
      testID="top-picks-row"
      footer={
        <RowRefresh
          control={control}
          onPress={refresh}
          isRefreshing={isRefreshing}
          refreshHint="Shows the next top picks"
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
