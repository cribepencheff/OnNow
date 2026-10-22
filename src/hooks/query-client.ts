// The shared TanStack Query client (ADR 0009). Its cache is persisted to
// the phone (SQLite, hooks/saved-cache-storage.ts) so Home can show cached
// data immediately on start and the app works offline (NFR-001, NFR-002).
// The follow list itself is not stored here: it lives in src/storage
// (ADR 0009 boundary).

import {
  QueryClient,
  defaultShouldDehydrateQuery,
  type Query,
} from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SQLiteStorage from "expo-sqlite/kv-store";

// TVmaze's own cache is one hour (NFR-005, spike 0001), so data is never
// refetched more often than that by default; a followed show daily or
// weekly, by what the hero needs (showStaleTime, logic/show-staleness.ts,
// ADR 0017).
import { shouldSaveQuery } from "@/logic/saved-queries";
import { SHOW_STALE_TIME_MS } from "@/logic/show-staleness";

import { createSavedCacheStorage } from "./saved-cache-storage";

export { SHOW_STALE_TIME_MS };

// How long cached data is kept (ADR 0017). Two limits, per kind of data:
// - Kept kinds (followed shows, TMDB matches, hero images) stay KEEP_MS,
//   in memory and in the saved copy read back on a launch, so the app
//   opens on what it had, at once and offline (NFR-001, NFR-002), after
//   time away rather than only within a day.
// - Everything else is dropped from memory after DEFAULT_GC_TIME_MS
//   unused, so passing data (searches, shows only looked at) does not pile
//   up; and it is not saved at all (shouldSaveQuery, logic/saved-queries).
// The saved copy's own age limit (the persister's maxAge, whose default
// of a day was never set here) is KEEP_MS, which TanStack wants no longer
// than a saved query's gcTime. Neither more than about 24.8 days: a timer
// past 2^31 - 1 ms overflows (see hooks/tmdb-find-cache.ts). Staleness is
// separate: a stale query still refetches in the background as before.
const DAY_MS = 24 * 60 * 60 * 1000;
export const KEEP_MS = 21 * DAY_MS;
export const DEFAULT_GC_TIME_MS = DAY_MS;
export const PERSISTED_CACHE_MAX_AGE_MS = KEEP_MS;

// The saved copy's key, in SQLite (and, before CRI-139, AsyncStorage).
export const QUERY_CACHE_STORAGE_KEY = "onnow.queryCache";

export const savedCacheStorage = createSavedCacheStorage(
  SQLiteStorage,
  AsyncStorage,
);

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: SHOW_STALE_TIME_MS,
        gcTime: DEFAULT_GC_TIME_MS,
      },
    },
  });
}

export const queryClient = createQueryClient();

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: savedCacheStorage,
  key: QUERY_CACHE_STORAGE_KEY,
});

// What PersistQueryClientProvider saves (app/_layout.tsx): only the kinds
// ADR 0017 keeps, and only queries TanStack would save at all (settled
// with data).
export function shouldSaveToPhone(query: Query): boolean {
  return (
    defaultShouldDehydrateQuery(query) &&
    shouldSaveQuery(
      query.queryKey,
      queryClient.getQueryData<number[]>(["followedIds"]),
    )
  );
}
