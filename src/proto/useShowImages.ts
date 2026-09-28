// PROTOTYPE (proto/home-backdrop, not for merge): TMDB backdrop and logo for
// a followed show, per docs/design/design-system.md "Imagery". Uses the same
// EXPO_PUBLIC_TMDB_API_KEY as src/api/tmdb-client.ts.
//
// The backdrop is picked once and stored (owner decision, CRI-79-adjacent):
// it changes only on the local release day of a new episode or a
// whole-season drop, never on an ordinary re-read. See
// src/proto/backdrop-storage.ts and images.ts's backdropPickTrigger.

import { useQuery } from "@tanstack/react-query";

import { addDays, localDateFromAirstamp } from "@/logic/local-date";
import { episodeCode } from "@/logic/home";
import { latestEpisode, regularEpisodes } from "@/logic/show-detail";
import { nextForShow } from "@/logic/next-episode";
import type { TvMazeEpisode, TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import {
  getStoredBackdrop,
  saveStoredBackdrop,
  type StoredBackdrop,
} from "./backdrop-storage";
import {
  addedBackdrops,
  backdropPickTrigger,
  changeWindows,
  chooseBackdrop,
  chooseEpisodeStill,
  chooseHighestRatedBackdrop,
  chooseLogo,
  isAiringNow,
  textlessBackdrops,
  type AddedBackdrop,
  type BackdropChoice,
  type TmdbEpisodeImages,
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

// "S2E5" for a single episode, "Season 1, 8 episodes" for a drop (several
// episodes of one season released the same local day).
function releaseLabel(
  latest: TvMazeEpisode,
  episodes: TvMazeEpisode[],
  timeZone: string,
): string {
  const localDate = localDateFromAirstamp(latest.airstamp, timeZone);
  const sameDay = regularEpisodes(episodes).filter(
    (episode) =>
      episode.season === latest.season &&
      episode.airstamp &&
      localDateFromAirstamp(episode.airstamp, timeZone) === localDate,
  );
  return sameDay.length > 1
    ? `Season ${latest.season}, ${sameDay.length} episodes`
    : episodeCode(latest);
}

export interface ShowImages {
  tmdbId: number | null;
  airingNow: boolean;
  backdrop: BackdropChoice | null;
  // PROTOTYPE (quick experiment, home hero backdrop fallback): the
  // highest-rated backdrop currently available (chooseHighestRatedBackdrop),
  // recomputed fresh every time this query runs (once a day per show, via
  // todayDate in the query key), independent of `backdrop` above and the
  // lead/settle re-pick window that gates it — see that function's own
  // comment for why re-picking on a schedule doesn't apply here the way it
  // does for `backdrop`'s "newest upload" rule.
  highestRatedBackdrop: TmdbImage | null;
  mostVoted: TmdbImage | null;
  secondMostVoted: TmdbImage | null;
  textlessCount: number;
  logo: TmdbImage | null;
  // Whether the changes endpoint found an upload time for the stored
  // backdrop, the last time it was (re-)picked.
  newestDetermined: boolean;
  // When and why the stored backdrop was picked, for the dev screen.
  pickReason: StoredBackdrop["reason"] | null;
  pickEpisodeCode: string | null;
}

export function useShowImages(
  show: TvMazeShowWithEmbeds,
  timeZone: string,
  todayDate: string,
) {
  return useQuery({
    queryKey: ["proto-images", show.id, todayDate],
    staleTime: Infinity,
    // Without a key the lookup cannot work, so say so at once.
    retry: KEY ? 3 : false,
    queryFn: async (): Promise<ShowImages> => {
      const episodes = show._embedded.episodes;
      const latest = latestEpisode(episodes, timeZone, todayDate);
      const next = nextForShow(
        show,
        episodes,
        show._embedded.seasons,
        timeZone,
        addDays(todayDate, 1),
      );
      // Only used to decide the very first ("followed") pick's rule; a
      // later re-pick always uses "newest" (see backdropPickTrigger).
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
      const latestReleaseDate = latest
        ? localDateFromAirstamp(latest.airstamp, timeZone)
        : null;
      const nextReleaseDate =
        next.kind === "episode"
          ? localDateFromAirstamp(next.episode.airstamp, timeZone)
          : null;

      const stored = await getStoredBackdrop(show.id);
      const trigger = backdropPickTrigger(
        stored,
        todayDate,
        latestReleaseDate,
        nextReleaseDate,
      );

      const tmdbId = await tmdbTvIdFor(show);
      if (tmdbId === null) {
        return {
          tmdbId,
          airingNow,
          backdrop: null,
          highestRatedBackdrop: null,
          mostVoted: null,
          secondMostVoted: null,
          textlessCount: 0,
          logo: null,
          newestDetermined: false,
          pickReason: stored?.reason ?? null,
          pickEpisodeCode: stored?.episodeCode ?? null,
        };
      }

      // Always needed for the logo, and as candidates if a pick is due.
      const images = await tmdb<TmdbImages>(
        `/tv/${tmdbId}/images?include_image_language=en,null,xx`,
      );
      const textless = textlessBackdrops(images);
      const logo = chooseLogo(images);
      // Unconditional, unlike `record` below: no re-pick window gating,
      // see ShowImages.highestRatedBackdrop's own comment for why.
      const highestRatedBackdrop = chooseHighestRatedBackdrop(images);

      let record = stored;
      if (trigger.should) {
        const useNewest = trigger.reason === "new-episode" || airingNow;
        let added: AddedBackdrop[] = [];
        if (useNewest) {
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
        // chooseBackdrop already does exactly this (find/second-most/only
        // rule + the newest-upload lookup); reused as is.
        const choice = chooseBackdrop(images, useNewest, added);
        if (choice) {
          record = {
            filePath: choice.filePath,
            reason: trigger.reason,
            rule: choice.rule,
            pickedForReleaseDate: trigger.releaseDate,
            episodeCode:
              trigger.reason === "new-episode" && latest
                ? releaseLabel(latest, episodes, timeZone)
                : null,
            newestUploadTime: choice.newestTime,
          };
          await saveStoredBackdrop(show.id, record);
        }
      }

      return {
        tmdbId,
        airingNow,
        backdrop: record
          ? {
              filePath: record.filePath,
              rule: record.rule as BackdropChoice["rule"],
              newestTime: record.newestUploadTime,
            }
          : null,
        highestRatedBackdrop,
        mostVoted: textless[0] ?? null,
        secondMostVoted: textless[1] ?? null,
        textlessCount: textless.length,
        logo,
        newestDetermined: record?.newestUploadTime != null,
        pickReason: record?.reason ?? null,
        pickEpisodeCode: record?.episodeCode ?? null,
      };
    },
  });
}

export interface EpisodeStill {
  filePath: string;
}

// PROTOTYPE (quick experiment, home hero backdrop): tries the episode's
// own TMDB stills before falling back to the show's regular backdrop
// (useShowImages above, untouched by this: it bypasses that choice for
// display, never replaces or affects it). Reuses useShowImages purely to
// get the already-resolved tmdbId; TanStack Query dedupes the identical
// ["proto-images", show.id, todayDate] key across both calls (same as
// HeroPage and ContentLayer already share it today), so this never
// double-fetches the show's own images. The still query itself is keyed
// by season/episode number, not todayDate: a released episode's own
// stills don't change day to day the way the show's re-picked backdrop
// can, so there's no reason to refetch it on that schedule.
export function useEpisodeStill(
  show: TvMazeShowWithEmbeds,
  episode: TvMazeEpisode,
  timeZone: string,
  todayDate: string,
) {
  const { data: showImages } = useShowImages(show, timeZone, todayDate);
  const tmdbId = showImages?.tmdbId ?? null;

  return useQuery({
    queryKey: ["proto-episode-still", show.id, episode.season, episode.number],
    staleTime: Infinity,
    // Regular episodes always have a number (FR-037, no specials); null
    // here would only mean this episode somehow slipped through that.
    enabled: tmdbId !== null && episode.number !== null,
    retry: KEY ? 3 : false,
    queryFn: async (): Promise<EpisodeStill | null> => {
      if (tmdbId === null || episode.number === null) {
        return null;
      }
      const images = await tmdb<TmdbEpisodeImages>(
        `/tv/${tmdbId}/season/${episode.season}/episode/${episode.number}/images`,
      );
      const still = chooseEpisodeStill(images);
      return still ? { filePath: still.file_path } : null;
    },
  });
}
