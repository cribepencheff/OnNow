// The shows a screen's poster rows leave out (CRI-131): those followed
// when the screen last settled its rows. A show followed from a row stays
// in it, marked, while the user stays on the screen, so the follow can be
// undone; it goes when the rows are settled again. Home settles them when
// its tab is selected again after another tab (useTabReturn); Search when
// it opens. The screen provides the set to its rows through
// SettledFollowedContext.

import { createContext, useCallback, useContext, useState } from "react";

import { useFollowList } from "./useFollowList";

const NONE: ReadonlySet<number> = new Set();

export const SettledFollowedContext = createContext<ReadonlySet<number>>(NONE);

// The set a row leaves out: its screen's, or none outside one.
export function useHiddenFollowed(): ReadonlySet<number> {
  return useContext(SettledFollowedContext);
}

export function useSettledFollowed(): {
  hidden: ReadonlySet<number>;
  // Takes the follow list as it is now.
  settle: () => void;
} {
  const { followedIds, isLoaded } = useFollowList();
  // How many times the rows were asked to settle, and the set taken at the
  // last of them: taken while rendering, from the follow list as it is
  // then, the first time once the list is in.
  const [asked, setAsked] = useState(0);
  const [settled, setSettled] = useState<{
    asked: number;
    hidden: ReadonlySet<number>;
  } | null>(null);
  if (isLoaded && settled?.asked !== asked) {
    setSettled({ asked, hidden: new Set(followedIds) });
  }
  const settle = useCallback(() => setAsked((count) => count + 1), []);
  return { hidden: settled?.hidden ?? NONE, settle };
}
