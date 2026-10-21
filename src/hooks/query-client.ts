// The shared TanStack Query client (ADR 0009). Its cache is persisted to
// AsyncStorage so Home can show cached data immediately on start and the
// app works offline (NFR-001, NFR-002). The follow list itself is not
// stored here: it lives in src/storage (ADR 0009 boundary).

import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

// TVmaze's own cache is one hour (NFR-005, spike 0001), so data is never
// refetched more often than that; an ended show only about weekly
// (showStaleTime, logic/show-staleness.ts, CRI-107).
import { SHOW_STALE_TIME_MS } from "@/logic/show-staleness";

export { SHOW_STALE_TIME_MS };

// Cached data can be shown for a long time while offline; a stale query
// still refetches in the background once online and stale.
const CACHE_TIME_MS = 24 * 60 * 60 * 1000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: SHOW_STALE_TIME_MS,
        gcTime: CACHE_TIME_MS,
      },
    },
  });
}

export const queryClient = createQueryClient();

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "onnow.queryCache",
});
