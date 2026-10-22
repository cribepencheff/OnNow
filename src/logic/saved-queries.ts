// Which queries are written to the phone with the saved query cache
// (ADR 0017): the kinds Home needs at once and offline after time away,
// not passing data. A list of what is saved, not of what is not: a new
// kind of data is saved only once it is added here, by choice.

// Saved whenever there is one: TMDB matches, hero images, what the
// discovery rows are filled from (the week's candidates and their TVmaze
// info; recommendations below), and the follow list and region, tiny local
// reads whose saved copies keep the launch instant. Not the rows' pages
// and page numbers: they belong to one launch (their keys have the launch
// time), so a saved one is never read again (ADR 0017 amendment).
const SAVED_KINDS = new Set([
  "tmdbFind",
  "hero-images-v6",
  "airingThisWeek",
  "tvmazeWeekInfo",
  "followedIds",
  "storedRegion",
]);

// Kinds keyed by a TVmaze show id, saved only for a followed show: a show
// ("show", id), whose key an unfollowed show opened in Show detail or
// Search shares as passing data; and its recommendations ("recommendations",
// "v1", id), which Top picks only asks for followed shows, but which stay
// in memory a while after an unfollow.
const FOLLOWED_ONLY_KINDS: Record<
  string,
  (key: readonly unknown[]) => unknown
> = {
  show: (key) => key[1],
  recommendations: (key) => key[2],
};
export function shouldSaveQuery(
  queryKey: readonly unknown[],
  followedIds: readonly number[] | undefined,
): boolean {
  const [kind] = queryKey;
  if (typeof kind !== "string") {
    return false;
  }
  const showIdOf = FOLLOWED_ONLY_KINDS[kind];
  if (showIdOf) {
    const id = showIdOf(queryKey);
    return typeof id === "number" && (followedIds ?? []).includes(id);
  }
  return SAVED_KINDS.has(kind);
}
