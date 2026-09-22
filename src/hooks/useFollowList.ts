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

  const followMutation = useMutation({
    mutationFn: (showId: ShowId) => follow(showId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLLOWED_IDS_QUERY_KEY });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (showId: ShowId) => unfollow(showId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLLOWED_IDS_QUERY_KEY });
    },
  });

  const followedIds = new Set(followedIdsQuery.data ?? []);

  return {
    followedIds,
    isFollowed: (showId: ShowId) => followedIds.has(showId),
    follow: (showId: ShowId) => followMutation.mutateAsync(showId),
    unfollow: (showId: ShowId) => unfollowMutation.mutateAsync(showId),
  };
}
