// The batches behind a poster row, "Top picks for you" and "Airing this
// week" (FR-038, FR-039, CRI-131). The row is every loaded batch, appended
// in order: each drag past its end loads one more (loadMore), earlier
// cards stay where they are, and the row ends with the pool. A batch is
// filled once and left alone, so following from the row never reshuffles
// it. How many batches are loaded lives in the query cache, so Home's and
// Search's rows grow together (FR-026), and a tab switch keeps them; the
// cache key holds the launch, so the next launch starts from the first
// batch again.
//
// Nothing is fetched ahead: a batch is only fetched when a drag asks for
// it. Each batch checks its shows online (a TVmaze id, a service in the
// region), and that is the row's whole network cost (CRI-107). One batch
// is fetched at a time: loadMore moves on one batch at most, and not at
// all while the last one is still on its way, however often it is asked.

import { useEffect, useRef, useState } from "react";
import {
  useQueries,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import {
  MIN_LOAD_MORE_MS,
  nextBatch,
  rowCards,
  visibleCards,
  type Batch,
} from "@/logic/poster-batches";
import type { FilledPage, PosterItem } from "@/logic/top-picks";

export interface PosterBatches<Extra> {
  cards: (PosterItem & Extra)[];
  // No batch yet: the row shows skeleton cards (CRI-127).
  isLoading: boolean;
  // A drag asked for more and it is still on its way: skeleton cards at
  // the row's end (CRI-131).
  isLoadingMore: boolean;
  // The pool has more than the row holds.
  hasMore: boolean;
  // Load the next batch; the row calls it on a drag past its end.
  loadMore: () => void;
  // Empty because every show is followed.
  allFollowed: boolean;
}

export function usePosterBatches<Extra = object>({
  pageKey,
  pageIndexKey,
  enabled,
  fill,
  hidden,
  minCards,
}: {
  // The cache key of a batch by its place in the row.
  pageKey: (index: number) => QueryKey;
  // Where the index of the row's last batch is kept.
  pageIndexKey: QueryKey;
  // Whether the row's sources are in, so a batch can be filled.
  enabled: boolean;
  fill: (start: number, size: number) => Promise<FilledPage<Extra>>;
  // Shows followed when the screen last settled the rows: left out
  // (visibleCards).
  hidden: ReadonlySet<number>;
  // The fewest cards the row shows while the pool has more (CRI-125).
  minCards?: number;
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
  const last = pages[lastIndex]?.data;

  // A new batch shows its skeleton cards for at least MIN_LOAD_MORE_MS,
  // however quick the fetch: it reads as new content arriving.
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
      }
    },
    [],
  );

  const isLoadingMore =
    lastIndex > 0 &&
    !pages[lastIndex]?.isError &&
    (last === undefined || holding);
  // While the new batch is held back, the row shows the ones before it.
  const shownPages = isLoadingMore ? pages.slice(0, lastIndex) : pages;
  const batches = shownPages
    .map((page) => page.data)
    .filter((batch): batch is Batch<Extra> => batch !== undefined);
  const hasMore = !isLoadingMore && (last?.hasMore ?? false);
  const isLoading = pages[0]?.data === undefined && !pages[0]?.isError;

  function loadMore(): void {
    // Judged against the cache, not this render: a fast drag can ask again
    // before the row has redrawn, and must not skip a batch ahead. While
    // the last batch is on its way (not in the cache), nothing happens.
    const current = queryClient.getQueryData<number>(pageIndexKey) ?? 0;
    if (current !== lastIndex) {
      return;
    }
    const lastBatch = queryClient.getQueryData<Batch<Extra>>(pageKey(current));
    if (!lastBatch?.hasMore) {
      return;
    }
    queryClient.setQueryData<number>(pageIndexKey, current + 1);
    setHolding(true);
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
    }
    holdTimer.current = setTimeout(() => setHolding(false), MIN_LOAD_MORE_MS);
  }

  // Whether more can come in place of the cards left out: a batch on its
  // way counts.
  const poolHasMore = isLoadingMore || (last?.hasMore ?? false);
  const cards = visibleCards({
    cards: rowCards(batches),
    hidden,
    minCards,
    hasMore: poolHasMore,
  });

  // A row with a minimum that has fallen under it (followed shows left
  // out) loads one more batch in their place (CRI-125).
  const underMinimum =
    minCards !== undefined &&
    !isLoading &&
    !isLoadingMore &&
    hasMore &&
    cards.length < minCards;
  useEffect(() => {
    if (!underMinimum) {
      return;
    }
    // Once this render is done: loading more sets state.
    const load = setTimeout(loadMore, 0);
    return () => clearTimeout(load);
    // loadMore judges against the cache, so its identity does not matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [underMinimum]);

  return {
    cards,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    allFollowed: batches[0]?.allFollowed ?? false,
  };
}
