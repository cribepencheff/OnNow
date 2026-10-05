// The batches of a poster row, "Top picks for you" and "Airing this week"
// (FR-038, FR-039, CRI-123). Each batch continues where the last one
// stopped, while shows are left ("Refresh"); at the end of the pool the
// row offers "Start over", which begins again at the top, minus the shows
// followed meanwhile. The row is empty only when every show in it is
// followed.

import type { FilledPage } from "./top-picks";

export type BatchControl = "refresh" | "startOver";

export interface Batch<Extra = object> extends FilledPage<Extra> {
  // Which batch is on screen; a new one crossfades in.
  index: number;
  control: BatchControl;
  // No cards because every show is followed (not because there are none).
  allFollowed: boolean;
}

export async function nextBatch<Extra = object>(
  previous: Batch<Extra> | undefined,
  fill: (start: number) => Promise<FilledPage<Extra>>,
): Promise<Batch<Extra>> {
  const start = previous?.hasMore ? previous.nextStart : 0;
  const filled = await fill(start);

  // Every show left was left out by the checks: this was the end of the
  // pool. The row keeps its cards and offers to start over.
  if (filled.cards.length === 0 && start > 0 && previous) {
    return { ...previous, hasMore: false, control: "startOver" };
  }

  return {
    ...filled,
    index: previous ? previous.index + 1 : 0,
    control: filled.hasMore ? "refresh" : "startOver",
    allFollowed: filled.cards.length === 0 && filled.followedSkipped > 0,
  };
}
