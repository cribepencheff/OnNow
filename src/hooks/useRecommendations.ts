// "Recommended for you" (FR-038, ADR 0016): TMDB's recommendations for each
// followed show, ranked by rankRecommendations, each found on TVmaze so it
// can be followed and opened. Recommendations are kept a day.

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import {
  tmdbClient,
  tmdbShowRef,
  type TmdbRecommendations,
} from "@/api/tmdb-client";
import { tvMazeClient } from "@/api/tvmaze-client";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { rankRecommendations } from "@/logic/recommendations";

const DAY_MS = 24 * 60 * 60 * 1000;
// Ranked candidates looked up on TVmaze; the row shows at most ROW_SIZE.
const CANDIDATES = 15;
export const ROW_SIZE = 10;

// An answer with recommendations, not "not on TMDB", no key or loading.
function isFound(data: unknown): data is TmdbRecommendations {
  return typeof data === "object" && data !== null;
}

export interface RecommendedShow {
  tmdbId: number;
  tvmazeId: number;
  name: string;
  posterPath: string;
}

export function useRecommendations(
  followedShows: TvMazeShow[],
  // Shows followed from the row this session stay in it (TMDB ids).
  keptTmdbIds: ReadonlySet<number>,
): RecommendedShow[] {
  const answers = useQueries({
    queries: followedShows.map((show) => ({
      queryKey: ["recommendations", "v1", show.id],
      staleTime: DAY_MS,
      queryFn: () => tmdbClient.findRecommendations(tmdbShowRef(show)),
    })),
  });

  const ranked = useMemo(() => {
    const found = answers.map((query) => query.data).filter(isFound);
    const followedTmdbIds = new Set(
      found.map(({ tvId }) => tvId).filter((id) => !keptTmdbIds.has(id)),
    );
    // No image: show nothing (design system), so a card needs a poster.
    return rankRecommendations(
      found.map(({ results }) => results),
      followedTmdbIds,
      Infinity,
    )
      .filter(({ recommendation }) => recommendation.poster_path)
      .slice(0, CANDIDATES);
  }, [answers, keptTmdbIds]);

  const tvmazeIds = useQueries({
    queries: ranked.map(({ recommendation }) => ({
      queryKey: ["tvmazeIdForTmdb", "v1", recommendation.id],
      staleTime: Infinity,
      queryFn: async () => {
        const ids = await tmdbClient.externalIdsById(recommendation.id);
        return ids ? tvMazeClient.lookupShowId(ids) : null;
      },
    })),
  });

  return useMemo(() => {
    const followedIds = new Set(followedShows.map((show) => show.id));
    return ranked
      .map(({ recommendation }, index) => ({
        recommendation,
        tvmazeId: tvmazeIds[index]?.data,
      }))
      .filter(
        (item): item is typeof item & { tvmazeId: number } =>
          typeof item.tvmazeId === "number" &&
          (!followedIds.has(item.tvmazeId) ||
            keptTmdbIds.has(item.recommendation.id)),
      )
      .slice(0, ROW_SIZE)
      .map(({ recommendation, tvmazeId }) => ({
        tmdbId: recommendation.id,
        tvmazeId,
        name: recommendation.name,
        posterPath: recommendation.poster_path as string,
      }));
  }, [ranked, tvmazeIds, followedShows, keptTmdbIds]);
}
