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
