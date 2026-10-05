// The follow list as TanStack Query state (FR-002, FR-003, ADR 0009): the
// list itself is not cached remote data, but reading it through a query
// lets Search and Home stay in sync after a follow/unfollow without each
// keeping their own local copy.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  follow,
  getFollowedIds,
  unfollow,
  type ShowId,
} from "@/storage/follow-list";

const FOLLOWED_IDS_QUERY_KEY = ["followedIds"];

export function useFollowList() {
  const queryClient = useQueryClient();

  const followedIdsQuery = useQuery({
    queryKey: FOLLOWED_IDS_QUERY_KEY,
    queryFn: getFollowedIds,
  });

  // Optimistic (CRI-86): the list changes at once, storage catches up, and
  // a failed write puts the list back.
  function optimistic(change: (ids: ShowId[], showId: ShowId) => ShowId[]) {
    return {
      onMutate: async (showId: ShowId) => {
        await queryClient.cancelQueries({ queryKey: FOLLOWED_IDS_QUERY_KEY });
        const previous = queryClient.getQueryData<ShowId[]>(
          FOLLOWED_IDS_QUERY_KEY,
        );
        queryClient.setQueryData<ShowId[]>(FOLLOWED_IDS_QUERY_KEY, (ids) =>
          change(ids ?? [], showId),
        );
        return { previous };
      },
      onError: (
        _error: unknown,
        _showId: ShowId,
        context: { previous: ShowId[] | undefined } | undefined,
      ) => {
        queryClient.setQueryData(FOLLOWED_IDS_QUERY_KEY, context?.previous);
      },
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: FOLLOWED_IDS_QUERY_KEY }),
    };
  }

  const followMutation = useMutation({
    mutationFn: (showId: ShowId) => follow(showId),
    ...optimistic((ids, showId) =>
      ids.includes(showId) ? ids : [...ids, showId],
    ),
  });

  const unfollowMutation = useMutation({
    mutationFn: (showId: ShowId) => unfollow(showId),
    ...optimistic((ids, showId) => ids.filter((id) => id !== showId)),
  });

  const followedIds = new Set(followedIdsQuery.data ?? []);

  return {
    followedIds,
    isLoaded: followedIdsQuery.isSuccess,
    isFollowed: (showId: ShowId) => followedIds.has(showId),
    follow: (showId: ShowId) => followMutation.mutateAsync(showId),
    unfollow: (showId: ShowId) => unfollowMutation.mutateAsync(showId),
  };
}
