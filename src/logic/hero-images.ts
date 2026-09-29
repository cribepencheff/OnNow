// The image rules from docs/design/design-system.md, "Imagery": which TMDB
// image the hero shows, ranked from raw TMDB image-list data.

import type {
  TmdbEpisodeImages,
  TmdbImage,
  TmdbImages,
} from "@/api/tmdb-types";

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

// The highest-rated backdrop TMDB has for the show, textless preferred. A
// fixed ranking (byVotes: vote_average, then vote_count) of whatever
// backdrops currently exist, textlessBackdrops first (already byVotes-
// sorted, so its own first element is the answer), falling back to the same
// ranking over every backdrop, textless or not, only when there's no
// textless one at all. This is the hero's backdrop fallback when an episode
// has no TMDB still.
export function chooseHighestRatedBackdrop(
  images: TmdbImages,
): TmdbImage | null {
  const textless = textlessBackdrops(images);
  if (textless.length > 0) {
    return textless[0];
  }
  return (images.backdrops ?? []).slice().sort(byVotes)[0] ?? null;
}

// "The highest-rated still": same rule as any other TMDB image list here
// (byVotes: vote_average, then vote_count). No language/textless filter:
// episode stills are plain screenshots, not promotional art that can carry
// alternate-language text baked in.
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
