// The follow list as TanStack Query state (FR-002, FR-003, ADR 0009): the
// list itself is not cached remote data, but reading it through a query
// lets Search and Home stay in sync after a follow/unfollow without each
// keeping their own local copy.
//
// Following is optimistic everywhere (CRI-86): the control that was
// tapped changes at once, the shared list changes on the next frame, and
// storage catches up; a failed write puts both back. A control that only
// shows one show's state reads just that show (useFollowToggle), so a
// follow redraws the views that depend on the list (Home, Shows), not
// every row and card on screen.

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  follow,
  getFollowedIds,
  unfollow,
  type ShowId,
} from "@/storage/follow-list";

const FOLLOWED_IDS_QUERY_KEY = ["followedIds"];

// Runs `work` after the current frame, so a tapped control draws its new
// state before the views that depend on the follow list redraw.
export function afterThisFrame(work: () => void): void {
  requestAnimationFrame(() => work());
}

// follow and unfollow, without reading the list: a component that only
// writes does not redraw when the list changes.
export function useFollowActions() {
  const queryClient = useQueryClient();

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
      // The list already holds the change; only a failed write needs the
      // stored list read again (re-reading after every success redrew
      // Home, Shows and Search a second time for nothing).
      onError: (
        _error: unknown,
        _showId: ShowId,
        context: { previous: ShowId[] | undefined } | undefined,
      ) => {
        queryClient.setQueryData(FOLLOWED_IDS_QUERY_KEY, context?.previous);
        return queryClient.invalidateQueries({
          queryKey: FOLLOWED_IDS_QUERY_KEY,
        });
      },
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

  return {
    follow: followMutation.mutateAsync,
    unfollow: unfollowMutation.mutateAsync,
  };
}

export function useFollowList() {
  const followedIdsQuery = useQuery({
    queryKey: FOLLOWED_IDS_QUERY_KEY,
    queryFn: getFollowedIds,
  });
  const { follow, unfollow } = useFollowActions();

  const followedIds = new Set(followedIdsQuery.data ?? []);

  return {
    followedIds,
    isLoaded: followedIdsQuery.isSuccess,
    isFollowed: (showId: ShowId) => followedIds.has(showId),
    follow: (showId: ShowId) => follow(showId),
    unfollow: (showId: ShowId) => unfollow(showId),
  };
}

// One show's follow state and a toggle for it (Search circle, poster card,
// Show detail): reads only whether this show is followed, and shows the
// new state at once, before the list itself changes.
export function useFollowToggle(showId: ShowId): {
  followed: boolean;
  toggle: () => void;
} {
  const { data: stored = false } = useQuery({
    queryKey: FOLLOWED_IDS_QUERY_KEY,
    queryFn: getFollowedIds,
    select: (ids: ShowId[]) => ids.includes(showId),
  });
  const { follow, unfollow } = useFollowActions();

  // The tapped state, shown until the list changes from what it was when
  // tapped (to agree with it, or back after a failed write).
  const [pending, setPending] = useState<{
    followed: boolean;
    from: boolean;
  } | null>(null);
  const followed =
    pending !== null && pending.from === stored ? pending.followed : stored;

  const toggle = useCallback(() => {
    const next = !followed;
    setPending({ followed: next, from: stored });
    afterThisFrame(() => {
      (next ? follow : unfollow)(showId).catch(() => setPending(null));
    });
  }, [followed, stored, follow, unfollow, showId]);

  return { followed, toggle };
}
