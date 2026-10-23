// Search results while typing (FR-001, ADR 0009). Views never call the API
// directly; this wraps TVmaze's own search and ranking (spike 0001), only
// re-ordering running shows above ended ones and leaving out shows long
// stuck in development (rankSearchResults, PRD 5.4). A half-typed last word
// is first completed from TMDB's titles (completeLastWord, CRI-142):
// TVmaze matches whole words only. Without TMDB's answer, it searches as
// typed.

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";

import { tmdbClient } from "@/api/tmdb-client";
import { tvMazeClient } from "@/api/tvmaze-client";
import { completeLastWord, needsCompletion } from "@/logic/search-completion";
import { rankSearchResults } from "@/logic/search-results";
import type { TvMazeSearchResult } from "@/api/tvmaze-types";

const HOUR_MS = 60 * 60 * 1000;

export function useSearchShows(
  query: string,
): UseQueryResult<TvMazeSearchResult[]> {
  const trimmedQuery = query.trim();
  const partial = needsCompletion(query);

  const suggestion = useQuery({
    queryKey: ["searchSuggest", trimmedQuery],
    queryFn: () => tmdbClient.suggestTitles(trimmedQuery),
    enabled: partial,
    staleTime: HOUR_MS,
    retry: false,
  });
  // The query TVmaze is asked: as typed, or with its last word completed
  // once TMDB has answered (or failed). Nothing while TMDB is asked.
  const searchQuery = !partial
    ? trimmedQuery
    : suggestion.isPending
      ? null
      : completeLastWord(trimmedQuery, suggestion.data ?? []);

  const search = useQuery({
    queryKey: ["searchShows", searchQuery ?? ""],
    queryFn: async () => {
      const results = await tvMazeClient.searchShows(searchQuery!);
      return rankSearchResults(results);
    },
    enabled: searchQuery !== null && searchQuery.length > 0,
    // The last results stay while the next search answers, so the list
    // does not blink empty between pauses in typing.
    placeholderData: keepPreviousData,
  });
  // Still searching while TMDB is asked, so "No results" waits for both.
  return {
    ...search,
    isFetching: search.isFetching || suggestion.isFetching,
  } as UseQueryResult<TvMazeSearchResult[]>;
}
