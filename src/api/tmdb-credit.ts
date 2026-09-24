// TMDB and JustWatch attribution (spike 0002, NFR-007, CRI-82). TMDB's
// terms require this notice wherever TMDB data is used; its watch provider
// data comes from JustWatch, which must be credited as the source.
export const TMDB_CREDIT = {
  notice:
    "This app uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.",
  url: "https://www.themoviedb.org",
} as const;

export const JUSTWATCH_CREDIT = {
  text: "Streaming services: JustWatch",
  url: "https://www.justwatch.com",
} as const;
