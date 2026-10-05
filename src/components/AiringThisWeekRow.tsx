// "Airing this week" on Home (FR-039, ADR 0016): shows on a service in the
// region that would be in the hero if followed, by popularity, followed
// shows left out, each with its day. Always shown; a card followed from
// the row stays, marked.

import { useAiringThisWeek } from "@/hooks/useAiringThisWeek";
import { PosterRow } from "./PosterRow";
import { ShowCard, type DetailPathname } from "./ShowCard";

export function AiringThisWeekRow({
  detailPathname,
}: {
  detailPathname?: DetailPathname;
} = {}) {
  const { cards, isLoading } = useAiringThisWeek();

  return (
    <PosterRow
      title="Airing this week"
      isLoading={isLoading}
      hasCards={cards.length > 0}
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
