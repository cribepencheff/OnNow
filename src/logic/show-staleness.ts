// How long a show's TVmaze data counts as fresh before it is fetched
// again. TVmaze's own cache is one hour (NFR-005, spike 0001), so data is
// never refetched more often than that. An ended show changes far less,
// so it is refetched about weekly instead (CRI-107); still refetched,
// since TVmaze's status can change (a revival).

export const SHOW_STALE_TIME_MS = 60 * 60 * 1000;
export const ENDED_SHOW_STALE_TIME_MS = 7 * 24 * 60 * 60 * 1000;

export function showStaleTime(show: { status?: string } | undefined): number {
  return show?.status === "Ended"
    ? ENDED_SHOW_STALE_TIME_MS
    : SHOW_STALE_TIME_MS;
}
