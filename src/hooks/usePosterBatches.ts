// The batches behind a poster row, "Top picks for you" and "Airing this
// week" (FR-038, FR-039, CRI-131). The row is every loaded batch, appended
// in order: swiping towards its end loads the next one (loadMore), earlier
// cards stay where they are, and the row ends with the pool. A batch is
// filled once and left alone, so following from the row never reshuffles
// it. How many batches are loaded lives in the query cache, so Home's and
// Search's rows grow together (FR-026).
//
// The next batch is prepared in the background as soon as the last one is
// in, so it is usually ready before the swipe gets there (CRI-127). Only
// one batch ahead, never the whole pool: each batch checks its shows
// online (a TVmaze id, a service in the region), and that is the row's
// whole network cost (CRI-107). One batch is fetched at a time: the next
// is only asked for once the last is in, and loadMore moves on one batch
// at most, however fast the swipe.

import {
  useQueries,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { nextBatch, rowCards, type Batch } from "@/logic/poster-batches";
import type { FilledPage, PosterItem } from "@/logic/top-picks";

export interface PosterBatches<Extra> {
  cards: (PosterItem & Extra)[];
  // No batch yet: the row shows skeleton cards (CRI-127).
  isLoading: boolean;
  // The row asked for more and it is still on its way: skeleton cards at
  // its end (CRI-131).
  isLoadingMore: boolean;
  // The pool has more than the row holds.
  hasMore: boolean;
  // Load the next batch; the row calls it when swiped near its end.
  loadMore: () => void;
  // Empty because every show is followed.
  allFollowed: boolean;
}

export function usePosterBatches<Extra = object>({
  pageKey,
  pageIndexKey,
  enabled,
  fill,
  isFollowed,
}: {
  // The cache key of a batch by its place in the row.
  pageKey: (index: number) => QueryKey;
  // Where the index of the row's last batch is kept.
  pageIndexKey: QueryKey;
  // Whether the row's sources are in, so a batch can be filled.
  enabled: boolean;
  fill: (start: number) => Promise<FilledPage<Extra>>;
  isFollowed: (tvmazeId: number) => boolean;
}): PosterBatches<Extra> {
  const queryClient = useQueryClient();
  const { data: lastIndex = 0 } = useQuery({
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

  // Every batch of the row, kept by its own query so none is dropped from
  // the cache while the row shows it. Each is filled only once the one
  // before it is in, since it starts where that one stopped.
  const indices = Array.from({ length: lastIndex + 1 }, (_, index) => index);
  const pages = useQueries({
    queries: indices.map((index) => ({
      queryKey: pageKey(index),
      enabled:
        enabled &&
        (index === 0 ||
          queryClient.getQueryData(pageKey(index - 1)) !== undefined),
      staleTime: Infinity,
      queryFn: () => fetchPage(index),
    })),
  });
  const batches = pages
    .map((page) => page.data)
    .filter((batch): batch is Batch<Extra> => batch !== undefined);
  const last = pages[lastIndex]?.data;

  // One batch ahead, once the last is in and the pool has more.
  useQuery({
    queryKey: pageKey(lastIndex + 1),
    enabled: enabled && last?.hasMore === true,
    staleTime: Infinity,
    queryFn: () => fetchPage(lastIndex + 1),
  });

  function loadMore(): void {
    // Judged against the cache, not this render: a fast swipe can ask
    // again before the row has redrawn, and must not skip a batch ahead.
    const current = queryClient.getQueryData<number>(pageIndexKey) ?? 0;
    if (current !== lastIndex) {
      return;
    }
    const lastBatch = queryClient.getQueryData<Batch<Extra>>(pageKey(current));
    if (!lastBatch?.hasMore) {
      return;
    }
    // The batch prepared ahead is filled again when it holds a show
    // followed since: a new batch leaves followed shows out.
    const nextKey = pageKey(current + 1);
    const prepared = queryClient.getQueryData<Batch<Extra>>(nextKey);
    if (prepared?.cards.some((card) => isFollowed(card.tvmazeId))) {
      queryClient.removeQueries({ queryKey: nextKey, exact: true });
    }
    queryClient.setQueryData<number>(pageIndexKey, current + 1);
  }

  return {
    cards: rowCards(batches),
    isLoading: pages[0]?.data === undefined && !pages[0]?.isError,
    isLoadingMore:
      lastIndex > 0 && last === undefined && !pages[lastIndex]?.isError,
    hasMore: last?.hasMore ?? false,
    loadMore,
    allFollowed: batches[0]?.allFollowed ?? false,
  };
}
