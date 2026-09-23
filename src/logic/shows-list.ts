// Derived values for the Shows list (PRD 5.3, FR-010, FR-035). Views and
// hooks only render this; they do not decide it (ADR 0009).

import { localDateFromAirstamp, type LocalDate } from "./local-date";
import { nextDateLabel } from "./next-episode-label";
import type { NextForShow } from "./next-episode";

// Alphabetical by title (PRD 5.3 review decision: order the followed list
// by name, not by air date or status).
export function sortShowsByTitle<T extends { show: { name: string } }>(
  shows: T[],
): T[] {
  return [...shows].sort((a, b) => a.show.name.localeCompare(b.show.name));
}

// "New today", "Next: Tomorrow" or "Next: Tue 24 Sep" when a date is
// known, from an upcoming episode or an announced season (FR-010), the
// same relative-day language as Search's row after following. Between
// seasons with nothing announced yet, the show's own status stands in
// instead (FR-035): never invented, and never a generic "no date"
// placeholder when TVmaze does provide a status. Never a time of day
// (ADR 0001); an episode's local day comes from its airstamp, not its
// airdate (ADR 0006).
export function showsRowLine(
  next: NextForShow,
  status: string,
  timeZone: string,
  todayDate: LocalDate,
): string {
  if (next.kind === "episode") {
    return nextDateLabel(
      localDateFromAirstamp(next.episode.airstamp, timeZone),
      todayDate,
    );
  }
  if (next.kind === "announced-season" && next.season.premiereDate) {
    return nextDateLabel(next.season.premiereDate, todayDate);
  }
  return status;
}
