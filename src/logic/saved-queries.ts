// Which queries are written to the phone with the saved query cache
// (ADR 0017): the kinds Home needs at once and offline after time away,
// not passing data. A list of what is saved, not of what is not: a new
// kind of data is saved only once it is added here, by choice.

// Saved whenever there is one: TMDB matches, hero images, the discovery
// rows (their keys change with the day), and the follow list and region,
// tiny local reads whose saved copies keep the launch instant.
const SAVED_KINDS = new Set([
  "tmdbFind",
  "hero-images-v5",
  "recommendations",
  "topPicksPage",
  "topPicksPageIndex",
  "airingThisWeek",
  "airingThisWeekPage",
  "airingThisWeekPageIndex",
  "tvmazeWeekInfo",
  "followedIds",
  "storedRegion",
]);

// A TVmaze show ("show", id) only when followed: an unfollowed show opened
// in Show detail or Search uses the same key, and is passing data.
export function shouldSaveQuery(
  queryKey: readonly unknown[],
  followedIds: readonly number[] | undefined,
): boolean {
  const [kind, id] = queryKey;
  if (kind === "show") {
    return typeof id === "number" && (followedIds ?? []).includes(id);
  }
  return typeof kind === "string" && SAVED_KINDS.has(kind);
}
