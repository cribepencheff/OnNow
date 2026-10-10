// The batches behind a poster row, "Top picks for you" and "Airing this
// week" (FR-038, FR-039, CRI-123, CRI-127). A batch is filled once and
// left alone, so following from the row never reshuffles it. The page
// number lives in the query cache, so Home's and Search's rows move
// together (FR-026).
//
// The next batch is prepared in the background as soon as the current one
// is on screen, so Refresh is near instant (CRI-127). Only one batch ahead,
// never the whole pool: each batch checks its shows online (a TVmaze id, a
// service in the region), and that is the row's whole network cost
// (CRI-107).

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import {
  nextBatch,
  rowControl,
  type Batch,
  type BatchControl,
} from "@/logic/poster-batches";
import type { FilledPage, PosterItem } from "@/logic/top-picks";

export interface PosterBatches<Extra> {
  cards: (PosterItem & Extra)[];
  // No batch yet: the row shows skeleton cards (CRI-127).
  isLoading: boolean;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  // "Refresh", "Start over", or null when hidden (CRI-123, CRI-127).
  control: BatchControl | null;
  // Empty because every show is followed.
  allFollowed: boolean;
  // Which batch is on screen; a new one crossfades in.
  batch: number;
}

export function usePosterBatches<Extra = object>({
  pageKey,
  pageIndexKey,
  enabled,
  fill,
  isFollowed,
  source,
}: {
  // The cache key of a batch by its page number.
  pageKey: (index: number) => QueryKey;
  // Where the page number on screen is kept.
  pageIndexKey: QueryKey;
  // Whether the row's sources are in, so a batch can be filled.
  enabled: boolean;
  fill: (start: number) => Promise<FilledPage<Extra>>;
  isFollowed: (tvmazeId: number) => boolean;
  // The data the batches are filled from, fetched again on Refresh when
  // older than maxAgeMs, judged at the tap (CLAUDE.md, CRI-95).
  source: { queryKey: QueryKey; maxAgeMs: number };
}): PosterBatches<Extra> {
  const queryClient = useQueryClient();
  const { data: pageIndex = 0 } = useQuery({
    queryKey: pageIndexKey,
    queryFn: () => 0,
    initialData: 0,
    staleTime: Infinity,
  });

  function fetchPage(index: number): Promise<Batch<Extra>> {
    return nextBatch(
      queryClient.getQueryData<Batch<Extra>>(pageKey(index - 1)),
      fill,
    );
  }

  const page = useQuery({
    queryKey: pageKey(pageIndex),
    enabled,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    queryFn: () => fetchPage(pageIndex),
  });
  // The batch for this page number, not the previous one kept on screen
  // while it loads.
  const current = page.isPlaceholderData ? undefined : page.data;

  // One batch ahead, once this one is in and the pool has more.
  const next = useQuery({
    queryKey: pageKey(pageIndex + 1),
    enabled: enabled && current?.hasMore === true,
    staleTime: Infinity,
    queryFn: () => fetchPage(pageIndex + 1),
  });

  // Refresh and Start over alike.
  async function refresh(): Promise<void> {
    const sourceWasStale = queryClient
      .getQueryCache()
      .findAll({ queryKey: source.queryKey })
      .some((query) => query.isStaleByTime(source.maxAgeMs));
    await queryClient.refetchQueries({
      queryKey: source.queryKey,
      predicate: (query) => query.isStaleByTime(source.maxAgeMs),
    });
    // The batch prepared ahead is dropped, and filled again now, when it
    // was filled from data that has just been fetched again, or holds a
    // show followed since: Refresh leaves followed shows out.
    const nextKey = pageKey(pageIndex + 1);
    const prepared = queryClient.getQueryData<Batch<Extra>>(nextKey);
    if (
      prepared &&
      (sourceWasStale ||
        prepared.cards.some((card) => isFollowed(card.tvmazeId)))
    ) {
      queryClient.removeQueries({ queryKey: nextKey, exact: true });
    }
    queryClient.setQueryData<number>(pageIndexKey, (index = 0) => index + 1);
  }

  return {
    cards: page.data?.cards ?? [],
    isLoading: page.data === undefined && !page.isError,
    refresh,
    isRefreshing: page.isFetching,
    // While a refresh loads, the control of the batch still on screen, so
    // it stays (turning) until the new batch is in.
    control: rowControl(current ?? page.data, next.data),
    allFollowed: page.data?.allFollowed ?? false,
    batch: page.data?.index ?? 0,
  };
}
