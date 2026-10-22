// Which image a show's hero (Home) and Show detail draw (CRI-100, owner
// 2026-10-22), the first there is:
// 1. TMDB's backdrop (ADR 0012), at its own shape.
// 2. TVmaze's poster: TMDB has no backdrop for a few small shows that
//    TVmaze has an image for. Already in the show's data, so no request.
//    Cropped from the top; a title near its bottom may show, which is
//    accepted as rare.
// 3. None: the "No image" placeholder (NoImage), for a show with no image
//    anywhere yet, such as one announced but not out.

import type { TvMazeImage } from "@/api/tvmaze-types";

export type ShowImage =
  | { kind: "tmdb"; path: string; aspectRatio: number }
  | { kind: "tvmaze"; sharp: string; small: string }
  | { kind: "none" };

export function chooseShowImage(
  backdrop:
    { file_path: string; width: number; height: number } | null | undefined,
  tvmazeImage: TvMazeImage | null | undefined,
): ShowImage {
  if (backdrop) {
    return {
      kind: "tmdb",
      path: backdrop.file_path,
      aspectRatio:
        backdrop.height > 0 ? backdrop.width / backdrop.height : 16 / 9,
    };
  }
  const sharp = tvmazeImage?.original ?? tvmazeImage?.medium;
  const small = tvmazeImage?.medium ?? tvmazeImage?.original;
  if (sharp && small) {
    return { kind: "tvmaze", sharp, small };
  }
  return { kind: "none" };
}
