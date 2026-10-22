// Derived values for the Search sheet's result rows (FR-024, PRD 5.4).
// TVmaze's own search ranking (`score`) is trusted as-is (data first); this
// module only re-orders running shows above ended ones, lists each show
// once, leaves out shows long stuck in development, and derives display
// text; it does not re-rank by relevance.

import type { TvMazeSearchResult, TvMazeShow } from "@/api/tvmaze-types";

// A show TVmaze still lists as "In Development" but has not updated for
// this long has most likely not gone ahead (owner, 2026-10-22): a project
// that moves on gets news (cast, channel, a date), which updates its
// record. Search leaves it out; it comes back once TVmaze updates it. A
// show already followed stays in Shows.
const STALE_DEVELOPMENT_MS = 2 * 365 * 24 * 60 * 60 * 1000;

function isStaleDevelopment(show: TvMazeShow, nowMs: number): boolean {
  return (
    show.status === "In Development" &&
    show.updated !== undefined &&
    nowMs - show.updated * 1000 > STALE_DEVELOPMENT_MS
  );
}

export function rankSearchResults(
  results: TvMazeSearchResult[],
  // When the search ran: the age is judged then (CLAUDE.md, clock time).
  nowMs: number = Date.now(),
): TvMazeSearchResult[] {
  // A stable sort with a single narrow rule: a Running show ranks above an
  // Ended show. Every other status pairing (including Running vs. Running,
  // Ended vs. Ended, or either against an unrelated status like "In
  // Development") is left exactly as TVmaze ranked it. A show TVmaze lists
  // twice keeps its first place (PRD 5.4: each show once).
  const seen = new Set<number>();
  const unique = results.filter(
    ({ show }) =>
      !isStaleDevelopment(show, nowMs) &&
      !seen.has(show.id) &&
      seen.add(show.id),
  );
  return unique.sort((a, b) => {
    if (a.show.status === "Running" && b.show.status === "Ended") {
      return -1;
    }
    if (a.show.status === "Ended" && b.show.status === "Running") {
      return 1;
    }
    return 0;
  });
}

// "2022 · Drama, Thriller": premiere year and up to three genres, as in
// Show detail's meta line; a missing part is left out (PRD 5.4, FR-024).
export function searchResultMetaLine(show: TvMazeShow): string {
  const year = show.premiered ? show.premiered.slice(0, 4) : null;
  const genres = (show.genres ?? []).slice(0, 3).join(", ");
  return [year, genres].filter(Boolean).join(" · ");
}

export function searchResultNetworkName(show: TvMazeShow): string | null {
  return show.network?.name ?? show.webChannel?.name ?? null;
}

export function plainTextSummary(summary: string | null): string | null {
  if (!summary) {
    return null;
  }
  return summary
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
