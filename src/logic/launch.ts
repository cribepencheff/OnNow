// Cache-first launch (CRI-95): Home is shown at once from the cache, and the
// splash waits for the first fetch only when there is nothing cached.

export function homeIsReady(input: {
  followedIdsKnown: boolean;
  followedCount: number;
  loadedCount: number;
  anyShowLoading: boolean;
}): boolean {
  if (!input.followedIdsKnown) {
    return false;
  }
  return (
    input.followedCount === 0 || input.loadedCount > 0 || !input.anyShowLoading
  );
}

// The shortest turn of Home's pull-to-refresh spinner: a pull with nothing
// stale is done at once (CRI-85), and a spinner that never turns reads as
// stuck. As long as a new row batch's skeleton (MIN_LOAD_MORE_MS).
export const MIN_REFRESH_SPIN_MS = 700;
