// Show detail's "Related" row (CRI-143, owner 2026-11-08): TMDB's
// recommendations for the show, as Top picks uses them (FR-038, ADR 0016).
// The recommendations are the same query as Top picks' for a followed
// show, so for one already there they come at no cost; each title's
// TVmaze id is the stored one Top picks resolves (resolveTvMazeId), so
// only a title seen nowhere before costs a lookup. Followed titles stay in
// the row, marked by their follow circle; the show itself is left out.
// The first RELATED_MAX, in TMDB's order, with a poster: a sample, not a
// list to browse.

import { useQuery } from "@tanstack/react-query";

import {
  tmdbClient,
  tmdbShowRef,
  type TmdbRecommendations,
} from "@/api/tmdb-client";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { rankRecommendations } from "@/logic/recommendations";
import { fillTopPicks, type PosterItem } from "@/logic/top-picks";

// Six: the strongest of TMDB's ranked recommendations, about two screens
// wide (owner, 2026-11-08).
export const RELATED_MAX = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

function isFound(data: unknown): data is TmdbRecommendations {
  return typeof data === "object" && data !== null;
}

export function useRelatedShows(show: TvMazeShow) {
  const recommendations = useQuery({
    // Top picks' own key, so a followed show's answer is shared.
    queryKey: ["recommendations", "v1", show.id],
    staleTime: DAY_MS,
    queryFn: () => tmdbClient.findRecommendations(tmdbShowRef(show)),
  });
  const found = isFound(recommendations.data) ? recommendations.data : null;

  const related = useQuery({
    queryKey: ["related", "v1", show.id],
    enabled: found !== null,
    staleTime: DAY_MS,
    queryFn: async (): Promise<PosterItem[]> => {
      if (!found) {
        return [];
      }
      const ranking = rankRecommendations(
        [found.results],
        new Set([found.tvId]),
        Infinity,
      );
      const page = await fillTopPicks(
        ranking,
        0,
        RELATED_MAX,
        resolveTvMazeId,
        // Only the show itself is left out; followed titles stay.
        (tvmazeId) => tvmazeId === show.id,
      );
      return page.cards;
    },
  });

  return {
    cards: related.data ?? [],
    // Loading until there is an answer to show, or none to wait for.
    isLoading:
      recommendations.isLoading || (found !== null && related.isLoading),
  };
}
