// Derived values for the Search sheet's result rows (FR-024, PRD 5.4).
// TVmaze's own search ranking (`score`) is trusted as-is (data first); this
// module only re-orders running shows above ended ones, lists each show
// once, and derives display text; it does not re-rank by relevance.

import type { TvMazeSearchResult, TvMazeShow } from "@/api/tvmaze-types";

export function rankSearchResults(
  results: TvMazeSearchResult[],
): TvMazeSearchResult[] {
  // A stable sort with a single narrow rule: a Running show ranks above an
  // Ended show. Every other status pairing (including Running vs. Running,
  // Ended vs. Ended, or either against an unrelated status like "In
  // Development") is left exactly as TVmaze ranked it. A show TVmaze lists
  // twice keeps its first place (PRD 5.4: each show once).
  const seen = new Set<number>();
  const unique = results.filter(
    ({ show }) => !seen.has(show.id) && seen.add(show.id),
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
