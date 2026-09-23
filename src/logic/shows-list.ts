// Derived values for the Shows list (PRD 5.3, FR-010, FR-035). Views and
// hooks only render this; they do not decide it (ADR 0009).

import { formatLabelDate } from "./next-episode-label";
import type { NextForShow } from "./next-episode";

// Alphabetical by title (PRD 5.3 review decision: order the followed list
// by name, not by air date or status).
export function sortShowsByTitle<T extends { show: { name: string } }>(
  shows: T[],
): T[] {
  return [...shows].sort((a, b) => a.show.name.localeCompare(b.show.name));
}

// "Next: Tue 24 Sep" when a date is known, from an upcoming episode or an
// announced season (FR-010). Between seasons with nothing announced yet,
// the show's own status stands in instead (FR-035): never invented, and
// never a generic "no date" placeholder when TVmaze does provide a status.
// Never a time of day (ADR 0001).
export function showsRowLine(next: NextForShow, status: string): string {
  if (next.kind === "episode") {
    return `Next: ${formatLabelDate(next.episode.airdate)}`;
  }
  if (next.kind === "announced-season" && next.season.premiereDate) {
    return `Next: ${formatLabelDate(next.season.premiereDate)}`;
  }
  return status;
}
