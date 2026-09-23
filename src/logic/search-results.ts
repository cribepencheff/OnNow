// Derived values for the Search sheet's result rows (FR-024, PRD 5.4).
// TVmaze's own search ranking (`score`) is trusted as-is (data first); this
// module only re-orders running shows above ended ones and derives display
// text, it does not re-rank by relevance.

import { statusLabel } from "./show-status";
import type { TvMazeSearchResult, TvMazeShow } from "@/api/tvmaze-types";

export function rankSearchResults(
  results: TvMazeSearchResult[],
): TvMazeSearchResult[] {
  // A stable sort with a single narrow rule: a Running show ranks above an
  // Ended show. Every other status pairing (including Running vs. Running,
  // Ended vs. Ended, or either against an unrelated status like "In
  // Development") is left exactly as TVmaze ranked it.
  return [...results].sort((a, b) => {
    if (a.show.status === "Running" && b.show.status === "Ended") {
      return -1;
    }
    if (a.show.status === "Ended" && b.show.status === "Running") {
      return 1;
    }
    return 0;
  });
}

// "2022 · Running": premiere year and status, the status in plain words
// (CRI-81).
export function searchResultMetaLine(show: TvMazeShow): string {
  const year = show.premiered ? show.premiered.slice(0, 4) : null;
  const status = statusLabel(show.status);
  return year ? `${year} · ${status}` : status;
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
