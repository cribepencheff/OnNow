// A show's IMDb and TheTVDB IDs: TVmaze's, with TMDB's filling any gap
// (CRI-103). TMDB is asked only when TVmaze lacks one; a found answer is
// kept, "not on TMDB" or no key is asked again after a day.

import { useQuery } from "@tanstack/react-query";

import { tmdbClient, tmdbShowRef } from "@/api/tmdb-client";
import type { TvMazeShow } from "@/api/tvmaze-types";
import {
  hasAllExternalIds,
  mergeExternalIds,
  type ExternalIds,
} from "@/logic/external-ids";

const DAY_MS = 24 * 60 * 60 * 1000;

export function useShowExternals(show: TvMazeShow): ExternalIds {
  const tvmaze: ExternalIds = {
    imdb: show.externals?.imdb ?? null,
    thetvdb: show.externals?.thetvdb ?? null,
  };
  const { data } = useQuery({
    queryKey: ["externalIds", "v1", show.id],
    enabled: !hasAllExternalIds(tvmaze),
    staleTime: (query) =>
      typeof query.state.data === "object" && query.state.data !== null
        ? Infinity
        : DAY_MS,
    queryFn: () => tmdbClient.findExternalIds(tmdbShowRef(show)),
  });
  return mergeExternalIds(
    tvmaze,
    typeof data === "object" && data !== null ? data : null,
  );
}
