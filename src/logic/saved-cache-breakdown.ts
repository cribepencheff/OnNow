// What the saved query cache holds, per kind of data (ADR 0017): each
// kind's share of the saved copy, for the dev readout (Images (dev)), to
// see which kind takes the space. A kind is a query key's first part
// ("show", "hero-images-v5", ...). Sizes are JSON lengths, about bytes.

export type SavedKind = { kind: string; count: number; bytes: number };

type SavedQuery = { queryKey?: unknown[] };

function savedQueries(saved: string | null): SavedQuery[] {
  try {
    return JSON.parse(saved ?? "null")?.clientState?.queries ?? [];
  } catch {
    return [];
  }
}

export function savedCacheBreakdown(saved: string | null): SavedKind[] {
  const queries = savedQueries(saved);
  const kinds = new Map<string, SavedKind>();
  for (const query of queries) {
    const kind = String(query.queryKey?.[0] ?? "?");
    const entry = kinds.get(kind) ?? { kind, count: 0, bytes: 0 };
    entry.count += 1;
    entry.bytes += JSON.stringify(query).length;
    kinds.set(kind, entry);
  }
  return [...kinds.values()].sort((a, b) => b.bytes - a.bytes);
}

// The largest single saved queries, by key: within a kind, which entries
// are large.
export function largestSavedQueries(
  saved: string | null,
  count: number,
): { key: string; bytes: number }[] {
  return savedQueries(saved)
    .map((query) => ({
      key: JSON.stringify(query.queryKey ?? []),
      bytes: JSON.stringify(query).length,
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, count);
}
