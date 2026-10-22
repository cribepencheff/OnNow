// A list row's poster (Shows, Search, Calendar; CRI-100): TVmaze's, in
// the show's data; without one, TMDB's main poster, looked up only then
// (Cecilias Unge has none on TVmaze). Pending while that lookup runs, so
// the row shows an empty space rather than the "no image" symbol first.

import { IMAGE_BASE } from "@/api/tmdb-types";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { useShowImages } from "./useShowImages";

export function useListPoster(show: TvMazeShow): {
  uri: string | undefined;
  pending: boolean;
} {
  const tvmaze = show.image?.medium ?? show.image?.original ?? undefined;
  const { data, isLoading } = useShowImages(show, { enabled: !tvmaze });
  if (tvmaze) {
    return { uri: tvmaze, pending: false };
  }
  const path = data?.posterPath;
  return {
    uri: path ? `${IMAGE_BASE}/w185${path}` : undefined,
    pending: isLoading,
  };
}
