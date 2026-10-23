// Search results while typing (FR-001, ADR 0009). Views never call the API
// directly; this wraps TVmaze's own search and ranking (spike 0001), only
// re-ordering running shows above ended ones and leaving out shows long
// stuck in development (rankSearchResults, PRD 5.4). A half-typed last word
// is first completed from TMDB's titles (completeLastWord, CRI-142):
// TVmaze matches whole words only. Without TMDB's answer, it searches as
// typed. A show TMDB finds by a translated title ("Maffiablod") is looked
// up by its original title too (owner, 2026-10-23).

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";

import { tmdbClient } from "@/api/tmdb-client";
import { tvMazeClient } from "@/api/tvmaze-client";
import {
  completeLastWord,
  knownAsLine,
  matchingTranslation,
  needsCompletion,
  translatedCandidate,
} from "@/logic/search-completion";
import { rankSearchResults } from "@/logic/search-results";
import type { TvMazeSearchResult } from "@/api/tvmaze-types";

const HOUR_MS = 60 * 60 * 1000;

// A result, with why it is there when its title is not what was typed
// ("Maffiablod in Swedish").
export type SearchHit = TvMazeSearchResult & { knownAs?: string };

export function useSearchShows(query: string): UseQueryResult<SearchHit[]> {
  const trimmedQuery = query.trim();
  const partial = needsCompletion(query);

  // TVmaze, for the query as typed (whole last word).
  const typed = useQuery({
    queryKey: ["searchShows", trimmedQuery],
    queryFn: async () =>
      rankSearchResults(await tvMazeClient.searchShows(trimmedQuery)),
    enabled: !partial && trimmedQuery.length > 0,
    placeholderData: keepPreviousData,
  });
  const typedFoundNothing =
    !partial &&
    typed.isSuccess &&
    !typed.isPlaceholderData &&
    typed.data.length === 0;

  // TMDB's titles: to complete a half-typed last word (CRI-142), or, when
  // TVmaze found nothing, to find the show by a translated title.
  const suggestion = useQuery({
    queryKey: ["searchSuggest", trimmedQuery],
    queryFn: () => tmdbClient.suggestTitles(trimmedQuery),
    enabled: partial || typedFoundNothing,
    staleTime: HOUR_MS,
    retry: false,
  });
  const titles = suggestion.data ?? [];
  // A half-typed last word, completed once TMDB has answered (or failed).
  const completed =
    partial && !suggestion.isPending
      ? completeLastWord(trimmedQuery, titles)
      : null;
  const completedSearch = useQuery({
    queryKey: ["searchShows", completed ?? ""],
    queryFn: async () =>
      rankSearchResults(await tvMazeClient.searchShows(completed!)),
    enabled: completed !== null && completed.length > 0,
    placeholderData: keepPreviousData,
  });

  // A show found by a translated title (owner, 2026-10-23): TVmaze knows
  // only the original, so it is looked up too, and the translation says
  // why it is there.
  const candidate = translatedCandidate(trimmedQuery, titles);
  const original = useQuery({
    queryKey: ["searchShows", candidate?.originalName ?? ""],
    queryFn: async () =>
      rankSearchResults(
        await tvMazeClient.searchShows(candidate!.originalName),
      ),
    enabled: candidate !== null,
  });
  const translations = useQuery({
    queryKey: ["tmdbTranslations", candidate?.id],
    queryFn: () => tmdbClient.findTranslations(candidate!.id),
    enabled: candidate !== null,
    staleTime: HOUR_MS,
    retry: false,
  });

  const search = partial ? completedSearch : typed;
  const found: SearchHit[] = search.data ?? [];
  const byTranslation = candidate ? original.data?.[0] : undefined;
  const match = matchingTranslation(trimmedQuery, translations.data ?? []);
  const data = byTranslation
    ? [
        {
          ...byTranslation,
          knownAs: match ? knownAsLine(match) : undefined,
        },
        ...found.filter((hit) => hit.show.id !== byTranslation.show.id),
      ]
    : found;

  // Still searching while any part is on its way, so "No results" waits.
  return {
    ...search,
    data,
    isFetching:
      search.isFetching ||
      suggestion.isFetching ||
      original.isFetching ||
      translations.isFetching,
  } as UseQueryResult<SearchHit[]>;
}
