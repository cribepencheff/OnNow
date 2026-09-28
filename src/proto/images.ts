// PROTOTYPE (proto/home-backdrop, not for merge): the image rules from
// docs/design/design-system.md, "Imagery". Pure and free of app imports, so
// the throwaway report script can run it too.

export interface TmdbImage {
  file_path: string;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
  width: number;
  height: number;
}

export interface TmdbImages {
  backdrops?: TmdbImage[];
  logos?: TmdbImage[];
}

// An added backdrop from TMDB's changes endpoint, with its upload time.
export interface AddedBackdrop {
  file_path: string;
  time: string;
}

export type BackdropRule =
  | "newest"
  | "most voted (airing, newest unknown)"
  | "second most voted"
  | "most voted (only one)";

export interface BackdropChoice {
  filePath: string;
  rule: BackdropRule;
  // Upload time of the chosen backdrop when "newest" was determined.
  newestTime: string | null;
}

export const IMAGE_BASE = "https://image.tmdb.org/t/p";

// Textless images have no language (TMDB: iso_639_1 null; newer uploads can
// use "xx" for "no language").
function isTextless(image: TmdbImage): boolean {
  return image.iso_639_1 === null || image.iso_639_1 === "xx";
}

function byVotes(a: TmdbImage, b: TmdbImage): number {
  return b.vote_average - a.vote_average || b.vote_count - a.vote_count;
}

export function textlessBackdrops(images: TmdbImages): TmdbImage[] {
  return (images.backdrops ?? []).filter(isTextless).sort(byVotes);
}

// "A show with a season airing now gets the newest backdrop; any other show
// gets the second most voted, or the most voted when there is only one."
// Newest: the latest upload time among backdrops still in the list; a batch
// uploaded at the same time is broken by votes. Unknown newest: the most
// voted (owner's fallback).
export function chooseBackdrop(
  images: TmdbImages,
  airingNow: boolean,
  added: AddedBackdrop[],
): BackdropChoice | null {
  const textless = textlessBackdrops(images);
  if (textless.length === 0) {
    return null;
  }

  if (airingNow) {
    const inList = new Map(textless.map((image) => [image.file_path, image]));
    const newest = added
      .filter((entry) => inList.has(entry.file_path))
      .sort((a, b) => b.time.localeCompare(a.time));
    if (newest.length > 0) {
      const newestTime = newest[0].time;
      const batch = newest
        .filter((entry) => entry.time === newestTime)
        .map((entry) => inList.get(entry.file_path)!)
        .sort(byVotes);
      return { filePath: batch[0].file_path, rule: "newest", newestTime };
    }
    return {
      filePath: textless[0].file_path,
      rule: "most voted (airing, newest unknown)",
      newestTime: null,
    };
  }

  return textless.length > 1
    ? {
        filePath: textless[1].file_path,
        rule: "second most voted",
        newestTime: null,
      }
    : {
        filePath: textless[0].file_path,
        rule: "most voted (only one)",
        newestTime: null,
      };
}

// PROTOTYPE (quick experiment, home hero backdrop fallback): the
// highest-rated backdrop TMDB has for the show, textless preferred.
// Unlike chooseBackdrop above, this never looks at airingNow or the
// changes endpoint (no "newest upload" concept at all): just a fixed
// ranking (byVotes: vote_average, then vote_count) of whatever backdrops
// currently exist, textlessBackdrops first (already byVotes-sorted, so
// its own first element is the answer), falling back to the same ranking
// over every backdrop, textless or not, only when there's no textless one
// at all.
export function chooseHighestRatedBackdrop(
  images: TmdbImages,
): TmdbImage | null {
  const textless = textlessBackdrops(images);
  if (textless.length > 0) {
    return textless[0];
  }
  return (images.backdrops ?? []).slice().sort(byVotes)[0] ?? null;
}

// PROTOTYPE (quick experiment, home hero backdrop): a single episode's
// TMDB stills, the same TmdbImage shape as backdrops/logos above, just
// under its own "stills" key (TMDB's own
// /tv/{id}/season/{s}/episode/{e}/images endpoint response shape).
export interface TmdbEpisodeImages {
  stills?: TmdbImage[];
}

// "The highest-rated still": same rule as any other TMDB image list here
// (byVotes: vote_average, then vote_count). No language/textless filter,
// unlike chooseBackdrop: episode stills are plain screenshots, not
// promotional art that can carry alternate-language text baked in.
export function chooseEpisodeStill(
  images: TmdbEpisodeImages,
): TmdbImage | null {
  const stills = (images.stills ?? []).slice().sort(byVotes);
  return stills[0] ?? null;
}

// "The most voted English logo, PNG preferred."
export function chooseLogo(images: TmdbImages): TmdbImage | null {
  const english = (images.logos ?? [])
    .filter((logo) => logo.iso_639_1 === "en")
    .sort(byVotes);
  return (
    english.find((logo) => logo.file_path.endsWith(".png")) ??
    english[0] ??
    null
  );
}

// Added backdrops from one changes response.
export function addedBackdrops(changes: {
  changes?: {
    key: string;
    items: {
      action: string;
      time: string;
      value?: { backdrop?: { file_path: string } };
    }[];
  }[];
}): AddedBackdrop[] {
  return (changes.changes ?? [])
    .filter((change) => change.key === "images")
    .flatMap((change) => change.items)
    .filter((item) => item.action === "added" && item.value?.backdrop)
    .map((item) => ({
      file_path: item.value!.backdrop!.file_path,
      time: item.time,
    }));
}

// 14-day windows back from today, newest first (TMDB's changes endpoint
// allows at most 14 days per query).
export function changeWindows(
  todayDate: string,
  count: number,
): { start: string; end: string }[] {
  const day = 86_400_000;
  const end0 = Date.parse(`${todayDate}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const end = new Date(end0 - i * 14 * day);
    const start = new Date(end.getTime() - 13 * day);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  });
}

// "A season airing now": the latest episode out and the next one belong to
// the same season, or the latest came out within the last 14 days (covers
// whole-season drops).
export function isAiringNow(
  latest: { season: number; localDate: string } | null,
  next: { season: number } | null,
  todayDate: string,
): boolean {
  if (!latest) {
    return false;
  }
  if (next && next.season === latest.season) {
    return true;
  }
  const days =
    (Date.parse(`${todayDate}T00:00:00Z`) -
      Date.parse(`${latest.localDate}T00:00:00Z`)) /
    86_400_000;
  return days <= 14;
}

export type BackdropPickTrigger =
  | { should: false }
  | {
      should: true;
      // "followed": no backdrop stored yet, so this is the first pick.
      // "new-episode": today falls in the re-pick window around a release
      // (see backdropPickTrigger); always uses the "newest" rule,
      // regardless of the general "airing now" window.
      reason: "followed" | "new-episode";
      releaseDate: string | null;
    };

// How many days before an upcoming release the re-pick window opens, so the
// backdrop stays fresh going into the day (owner decision, one-shot re-pick
// on the release day itself was too early: TMDB often hasn't uploaded the
// new episode's backdrop yet, so it locked in a stale set).
export const HERO_BACKDROP_LEAD_DAYS = 1;

// How many days after a release the window stays open, so a late TMDB
// upload is still caught.
export const HERO_BACKDROP_SETTLE_DAYS = 3;

// Same day-math style as changeWindows/isAiringNow above: no import from
// logic/local-date, so this file stays free of app imports.
function shiftDate(isoDate: string, days: number): string {
  const day = 86_400_000;
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * day)
    .toISOString()
    .slice(0, 10);
}

// The stored backdrop stays frozen except in a re-pick window around each
// release: from HERO_BACKDROP_LEAD_DAYS before the next upcoming episode
// (leading into the day, exclusive of the release date itself, which the
// settle window below already covers) through HERO_BACKDROP_SETTLE_DAYS
// after the latest released episode. Inside that window, every run
// re-picks with the "newest" rule; the query already refetches once a day,
// so this converges on the newest backdrop as TMDB uploads it, with no
// thrashing since "newest" is deterministic by upload time. Outside the
// window, nothing changes: the first "followed" pick (nothing stored yet)
// is immediate and unaffected by any of this.
export function backdropPickTrigger(
  stored: { pickedForReleaseDate: string | null } | null,
  todayDate: string,
  latestReleaseDate: string | null,
  nextReleaseDate: string | null,
): BackdropPickTrigger {
  if (!stored) {
    return { should: true, reason: "followed", releaseDate: latestReleaseDate };
  }

  const leadingIn =
    nextReleaseDate !== null &&
    todayDate >= shiftDate(nextReleaseDate, -HERO_BACKDROP_LEAD_DAYS) &&
    todayDate < nextReleaseDate;

  const settling =
    latestReleaseDate !== null &&
    todayDate >= latestReleaseDate &&
    todayDate <= shiftDate(latestReleaseDate, HERO_BACKDROP_SETTLE_DAYS);

  if (leadingIn || settling) {
    return {
      should: true,
      reason: "new-episode",
      releaseDate: latestReleaseDate,
    };
  }

  return { should: false };
}
