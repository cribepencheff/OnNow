// Search results while typing (FR-001, ADR 0009). Views never call the API
// directly; this wraps TVmaze's own search and ranking (spike 0001), only
// re-ordering running shows above ended ones (FR-024 edge case).

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { tvMazeClient } from "@/api/tvmaze-client";
import { rankSearchResults } from "@/logic/search-results";
import type { TvMazeSearchResult } from "@/api/tvmaze-types";

export function useSearchShows(
  query: string,
): UseQueryResult<TvMazeSearchResult[]> {
  const trimmedQuery = query.trim();

  return useQuery({
    queryKey: ["searchShows", trimmedQuery],
    queryFn: async () => {
      const results = await tvMazeClient.searchShows(trimmedQuery);
      return rankSearchResults(results);
    },
    enabled: trimmedQuery.length > 0,
  });
}
