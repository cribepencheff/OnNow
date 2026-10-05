// Derived values for the Shows list (PRD 5.3, FR-010, FR-035). Views and
// hooks only render this; they do not decide it (ADR 0009).

import type { ShowState } from "./show-state";

// Alphabetical by title (PRD 5.3 review decision: order the followed list
// by name, not by air date or status).
export function sortShowsByTitle<T extends { show: { name: string } }>(
  shows: T[],
): T[] {
  return [...shows].sort((a, b) => a.show.name.localeCompare(b.show.name));
}

export type ShowsSegment = "active" | "inactive";

// Active: something is airing now, or a new season is confirmed. Everything
// else is Inactive (PRD 5.3), including any other TVmaze status.
export function showsSegment(state: ShowState): ShowsSegment {
  switch (state.kind) {
    case "airing":
    case "airing-today":
    case "airing-tba":
    case "season-dated":
    case "season-tba":
      return "active";
    default:
      return "inactive";
  }
}

// The two segments, each alphabetical by title.
export function splitBySegment<
  T extends { show: { name: string }; state: ShowState },
>(items: T[]): { active: T[]; inactive: T[] } {
  const sorted = sortShowsByTitle(items);
  return {
    active: sorted.filter((item) => showsSegment(item.state) === "active"),
    inactive: sorted.filter((item) => showsSegment(item.state) === "inactive"),
  };
}
