// PROTOTYPE (proto/home-backdrop, not for merge): TMDB backdrop and logo for
// a followed show, per docs/design/design-system.md "Imagery". Uses the same
// EXPO_PUBLIC_TMDB_API_KEY as src/api/tmdb-client.ts.

import { useQuery } from "@tanstack/react-query";

import { addDays, localDateFromAirstamp } from "@/logic/local-date";
import { latestEpisode } from "@/logic/show-detail";
import { nextForShow } from "@/logic/next-episode";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import {
  addedBackdrops,
  changeWindows,
  chooseBackdrop,
  chooseLogo,
  isAiringNow,
  textlessBackdrops,
  type AddedBackdrop,
  type BackdropChoice,
  type TmdbImage,
  type TmdbImages,
} from "./images";

const KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const LOOKBACK_WINDOWS = 6; // 6 × 14 days, about 12 weeks

async function tmdb<T>(path: string): Promise<T> {
  if (!KEY) {
    throw new Error("No TMDB key (EXPO_PUBLIC_TMDB_API_KEY)");
  }
  const bearer = KEY.length > 40;
  const separator = path.includes("?") ? "&" : "?";
  const url = `https://api.themoviedb.org/3${path}${bearer ? "" : `${separator}api_key=${KEY}`}`;
  const response = await fetch(
    url,
    bearer ? { headers: { Authorization: `Bearer ${KEY}` } } : undefined,
  );
  if (!response.ok) {
    throw new Error(`TMDB ${response.status} for ${path}`);
  }
  return (await response.json()) as T;
}

async function tmdbTvIdFor(show: TvMazeShowWithEmbeds): Promise<number | null> {
  const { imdb, thetvdb } = show.externals ?? { imdb: null, thetvdb: null };
  for (const [id, source] of [
    [imdb, "imdb_id"],
    [thetvdb, "tvdb_id"],
  ] as const) {
    if (!id) continue;
    const found = await tmdb<{ tv_results?: { id: number }[] }>(
      `/find/${id}?external_source=${source}`,
    );
    if (found.tv_results?.[0]) return found.tv_results[0].id;
  }
  return null;
}

export interface ShowImages {
  tmdbId: number | null;
  airingNow: boolean;
  backdrop: BackdropChoice | null;
  mostVoted: TmdbImage | null;
  secondMostVoted: TmdbImage | null;
  textlessCount: number;
  logo: TmdbImage | null;
  // Whether the changes endpoint found an upload time for a listed backdrop.
  newestDetermined: boolean;
}

export function useShowImages(
  show: TvMazeShowWithEmbeds,
  timeZone: string,
  todayDate: string,
) {
  return useQuery({
    queryKey: ["proto-images", show.id],
    staleTime: Infinity,
    // Without a key the lookup cannot work, so say so at once.
    retry: KEY ? 3 : false,
    queryFn: async (): Promise<ShowImages> => {
      const latest = latestEpisode(
        show._embedded.episodes,
        timeZone,
        todayDate,
      );
      const next = nextForShow(
        show,
        show._embedded.episodes,
        show._embedded.seasons,
        timeZone,
        addDays(todayDate, 1),
      );
      const airingNow = isAiringNow(
        latest
          ? {
              season: latest.season,
              localDate: localDateFromAirstamp(latest.airstamp, timeZone),
            }
          : null,
        next.kind === "episode" ? { season: next.episode.season } : null,
        todayDate,
      );

      const tmdbId = await tmdbTvIdFor(show);
      if (tmdbId === null) {
        return {
          tmdbId,
          airingNow,
          backdrop: null,
          mostVoted: null,
          secondMostVoted: null,
          textlessCount: 0,
          logo: null,
          newestDetermined: false,
        };
      }

      const images = await tmdb<TmdbImages>(
        `/tv/${tmdbId}/images?include_image_language=en,null,xx`,
      );

      let added: AddedBackdrop[] = [];
      if (airingNow) {
        for (const { start, end } of changeWindows(
          todayDate,
          LOOKBACK_WINDOWS,
        )) {
          added = added.concat(
            addedBackdrops(
              await tmdb(
                `/tv/${tmdbId}/changes?start_date=${start}&end_date=${end}`,
              ),
            ),
          );
        }
      }

      const textless = textlessBackdrops(images);
      const backdrop = chooseBackdrop(images, airingNow, added);
      return {
        tmdbId,
        airingNow,
        backdrop,
        mostVoted: textless[0] ?? null,
        secondMostVoted: textless[1] ?? null,
        textlessCount: textless.length,
        logo: chooseLogo(images),
        newestDetermined: backdrop?.rule === "newest",
      };
    },
  });
}
