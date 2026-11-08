// Show detail's "Related" row, at the foot of the page (CRI-143, owner
// 2026-11-08): TMDB's recommendations for the show (useRelatedShows), as
// Home's poster cards, each opening its own Show detail in the same tab.
// No row when TMDB recommends nothing.

import type { TvMazeShow } from "@/api/tvmaze-types";
import { useRelatedShows } from "@/hooks/useRelatedShows";
import { PosterRow } from "./PosterRow";
import { ShowCard, type DetailPathname } from "./ShowCard";

export function RelatedRow({
  show,
  detailPathname,
}: {
  show: TvMazeShow;
  detailPathname: DetailPathname;
}) {
  const { cards, isLoading } = useRelatedShows(show);
  if (!isLoading && cards.length === 0) {
    return null;
  }
  return (
    <PosterRow
      title="Related"
      isLoading={isLoading}
      hasCards={cards.length > 0}
      noEnd
      testID="show-detail-related"
    >
      {cards.map((card) => (
        <ShowCard
          key={card.tmdbId}
          card={card}
          testID="related-show"
          detailPathname={detailPathname}
        />
      ))}
    </PosterRow>
  );
}
