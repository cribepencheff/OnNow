// PROTOTYPE (proto/home-backdrop, not for merge): "Unfollowing and
// following again picks anew" (owner decision). Nothing else clears a
// stored backdrop, so this watches the follow list itself for a show that
// drops out of it and clears that show's stored pick, without touching the
// real useFollowList/follow-list.ts (kept as they are). Mounted once, at
// the tab layout, so it watches for the whole app session.

import { useEffect, useRef } from "react";

import { useFollowList } from "@/hooks/useFollowList";
import { clearStoredBackdrop } from "./backdrop-storage";

export function useBackdropUnfollowReset(): void {
  const { followedIds } = useFollowList();
  const previous = useRef<Set<number> | null>(null);

  useEffect(() => {
    if (previous.current) {
      for (const id of previous.current) {
        if (!followedIds.has(id)) {
          clearStoredBackdrop(id);
        }
      }
    }
    previous.current = followedIds;
  }, [followedIds]);
}
