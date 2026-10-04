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

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

// NFR-002: "Updated 5 min ago". Relative only, never a time of day
// (ADR 0001).
export function updatedAgoLabel(
  updatedAt: number | null,
  now: number,
): string | null {
  if (updatedAt === null) {
    return null;
  }
  const age = Math.max(0, now - updatedAt);
  if (age < MINUTE_MS) {
    return "Updated just now";
  }
  if (age < HOUR_MS) {
    return `Updated ${Math.floor(age / MINUTE_MS)} min ago`;
  }
  if (age < DAY_MS) {
    return `Updated ${plural(Math.floor(age / HOUR_MS), "hour")} ago`;
  }
  return `Updated ${plural(Math.floor(age / DAY_MS), "day")} ago`;
}
