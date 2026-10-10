// The poster rows on Home and in Search (FR-038, FR-039, FR-026): walk a ranking in order from a start
// position to the end, never wrapping (CRI-131: at the end the row ends),
// and check titles a few at a time until the batch is full. Checking is the only network cost, so it stops as soon as it
// can; the TVmaze client's rate limit holds whatever the batch size.

import type { LocalDate } from "./local-date";
import type { RankedRecommendation } from "./recommendations";

export interface PosterItem {
  tmdbId: number;
  tvmazeId: number;
  name: string;
  posterPath: string;
}

export interface FilledPage<Extra = object> {
  cards: (PosterItem & Extra)[];
  // Where the next page starts in the ranking.
  nextStart: number;
  // Whether a next page has any titles left to look at (CRI-123).
  hasMore: boolean;
  // Followed titles passed over, so an empty page can tell "all followed"
  // from "nothing at all" (CRI-123).
  followedSkipped: number;
}

// Titles checked at once: quicker than one by one, and at most two wasted
// checks when the row fills mid-batch.
export const CHECK_BATCH = 3;

export async function fillTopPicks<Extra = object>(
  ranking: RankedRecommendation[],
  start: number,
  size: number,
  // A title's TVmaze id, or null when TVmaze has none.
  resolveTvMazeId: (tmdbId: number) => Promise<number | null>,
  isFollowed: (tvmazeId: number) => boolean,
  // Optional further checks (a service in the region, airing this week),
  // which can reject a title (null) or add to its card.
  check?: (tvmazeId: number, tmdbId: number) => Promise<Extra | null>,
): Promise<FilledPage<Extra>> {
  const total = ranking.length;
  // Every position once, in rank order from `start` to the end, titles
  // without a poster left out (no request for them).
  const positions = Array.from(
    { length: Math.max(total - start, 0) },
    (_, i) => start + i,
  ).filter((index) => ranking[index].recommendation.poster_path);
  let followedSkipped = 0;

  async function evaluate(index: number): Promise<(PosterItem & Extra) | null> {
    const { recommendation } = ranking[index];
    const tvmazeId = await resolveTvMazeId(recommendation.id);
    if (tvmazeId === null) {
      return null;
    }
    if (isFollowed(tvmazeId)) {
      followedSkipped += 1;
      return null;
    }
    const extra = check
      ? await check(tvmazeId, recommendation.id)
      : ({} as Extra);
    return extra === null
      ? null
      : {
          tmdbId: recommendation.id,
          tvmazeId,
          name: recommendation.name,
          posterPath: recommendation.poster_path as string,
          ...extra,
        };
  }

  const cards: (PosterItem & Extra)[] = [];
  let nextStart = Math.min(start, total);
  for (
    let b = 0;
    b < positions.length && cards.length < size;
    b += CHECK_BATCH
  ) {
    const batch = positions.slice(b, b + CHECK_BATCH);
    const results = await Promise.all(batch.map(evaluate));
    for (let i = 0; i < batch.length; i += 1) {
      nextStart = batch[i] + 1;
      const card = results[i];
      if (card) {
        cards.push(card);
        if (cards.length === size) {
          break;
        }
      }
    }
  }
  const hasMore = positions.some((index) => index >= nextStart);
  return { cards, nextStart, hasMore, followedSkipped };
}

// "Top picks for you" starts each day from a different part of its ranking
// (CRI-131): the day's offset is a row's cap further on than the day
// before's, wrapping round, so the shows past one day's cap lead the next.
// The same all day, on Home and in Search; from the ranking already
// fetched, so no fetch of its own.
export function rotateForDay<Item>(
  ranking: Item[],
  todayDate: LocalDate,
  step: number,
): Item[] {
  if (ranking.length === 0) {
    return ranking;
  }
  const offset = (dayNumber(todayDate) * step) % ranking.length;
  return [...ranking.slice(offset), ...ranking.slice(0, offset)];
}

// Days since 1970-01-01 of a local date.
function dayNumber(localDate: LocalDate): number {
  const [year, month, day] = localDate.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000));
}

// Whether "Top picks for you" is shown (CRI-125): hidden without followed
// shows, shown (with skeleton cards) while its first batch loads, and
// hidden when that batch has no picks to show (none with a service in the
// region, or every pick followed).
export function isTopPicksShown({
  followedCount,
  isLoading,
  hasCards,
}: {
  followedCount: number;
  isLoading: boolean;
  hasCards: boolean;
}): boolean {
  if (followedCount === 0) {
    return false;
  }
  return isLoading || hasCards;
}
