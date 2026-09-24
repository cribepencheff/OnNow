// Derived values for the Shows list (PRD 5.3, FR-010, FR-035). Views and
// hooks only render this; they do not decide it (ADR 0009).

import type { LocalDate } from "./local-date";
import { nextReleaseLabel } from "./next-episode-label";
import { statusLabel } from "./show-status";
import type { NextForShow } from "./next-episode";

// Alphabetical by title (PRD 5.3 review decision: order the followed list
// by name, not by air date or status).
export function sortShowsByTitle<T extends { show: { name: string } }>(
  shows: T[],
): T[] {
  return [...shows].sort((a, b) => a.show.name.localeCompare(b.show.name));
}

// "New today", "Next: Tomorrow", "Next: Tue 24 Sep" or "Season 4 premiere
// · Fri 9 Jul 2027" when a date is known, from an upcoming episode or an
// announced season (FR-010, CRI-78), the
// same relative-day language as Search's row after following. Between
// seasons with nothing announced yet, the show's own status stands in
// instead (FR-035): never invented, and never a generic "no date"
// placeholder when TVmaze does provide a status, in plain words (CRI-81). Never a time of day
// (ADR 0001); an episode's local day comes from its airstamp, not its
// airdate (ADR 0006).
export function showsRowLine(
  next: NextForShow,
  status: string,
  timeZone: string,
  todayDate: LocalDate,
): string {
  return nextReleaseLabel(next, timeZone, todayDate) ?? statusLabel(status);
}
