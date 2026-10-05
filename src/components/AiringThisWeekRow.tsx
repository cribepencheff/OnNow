// "Airing this week" on Home (FR-039, ADR 0016): shows on a service in the
// region that would be in the hero if followed, by popularity, followed
// shows left out, each with its day. Always shown; a card followed from
// the row stays, marked, until Refresh shows the next shows. At the end of
// the week's shows the control reads "Start over"; the row is empty, with
// a line saying so, only when every show is followed (CRI-123).

import { useAiringThisWeek } from "@/hooks/useAiringThisWeek";
import { PosterRow } from "./PosterRow";
import { RowRefresh } from "./RowRefresh";
import { ShowCard, type DetailPathname } from "./ShowCard";

export function AiringThisWeekRow({
  detailPathname,
}: {
  detailPathname?: DetailPathname;
} = {}) {
  const {
    cards,
    isLoading,
    refresh,
    isRefreshing,
    control,
    allFollowed,
    batch,
  } = useAiringThisWeek();

  return (
    <PosterRow
      title="Airing this week"
      isLoading={isLoading}
      hasCards={cards.length > 0}
      emptyText={allFollowed ? "That's all this week" : null}
      batch={batch}
      testID="airing-this-week-row"
      footer={
        <RowRefresh
          control={control}
          onPress={refresh}
          isRefreshing={isRefreshing}
          refreshHint="Shows the next shows airing this week"
          testID="airing-refresh"
        />
      }
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
