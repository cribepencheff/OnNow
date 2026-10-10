// "Airing this week" on Home (FR-039, ADR 0016): shows on a service in the
// region that would be in the hero if followed, by popularity, followed
// shows left out, each with its day. Always shown; a card followed from
// the row stays in it, marked, until Home's tab is selected again. Dragged
// past its end the row loads the next shows and appends them; at the end
// of the week's shows it says so (CRI-131). The row is empty, with a line saying so, only when every
// show is followed (CRI-123).

import { useAiringThisWeek } from "@/hooks/useAiringThisWeek";
import { PosterRow } from "./PosterRow";
import { ShowCard, type DetailPathname } from "./ShowCard";

export function AiringThisWeekRow({
  detailPathname,
  quietEndOnArrival,
}: {
  detailPathname?: DetailPathname;
  // Inside Search: no end element if the row is already at its end there.
  quietEndOnArrival?: boolean;
} = {}) {
  const { cards, isLoading, isLoadingMore, hasMore, loadMore, allFollowed } =
    useAiringThisWeek();

  return (
    <PosterRow
      title="Airing this week"
      isLoading={isLoading}
      hasCards={cards.length > 0}
      // The day on its own second line (CRI-127).
      withCaption
      emptyText={allFollowed ? "That's all this week" : null}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      onLoadMore={loadMore}
      quietEndOnArrival={quietEndOnArrival}
      testID="airing-this-week-row"
    >
      {cards.map((card) => (
        <ShowCard
          key={card.tmdbId}
          card={card}
          caption={card.day}
          testID="airing"
          detailPathname={detailPathname}
        />
      ))}
    </PosterRow>
  );
}
