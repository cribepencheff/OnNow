// A value that only changes when it is settled: the screen keeps the one
// it settled on, and takes the current one again when it calls settle(),
// when `epoch` changes, or when `isUrgent` says the settled one must not be
// kept. Taken while rendering, like useSettledDay and useSettledFollowed.
// Home settles the hero's slides with it, so a follow or unfollow does not
// rebuild the hero while the user is on Home (see index.tsx).

import { useCallback, useState } from "react";

export function useSettledValue<T>(
  value: T,
  epoch: unknown,
  isUrgent: (settled: T) => boolean,
): {
  value: T;
  // Takes the value as it is now.
  settle: () => void;
} {
  const [asked, setAsked] = useState(0);
  const [settled, setSettled] = useState(() => ({ asked, epoch, value }));
  if (
    settled.asked !== asked ||
    settled.epoch !== epoch ||
    (settled.value !== value && isUrgent(settled.value))
  ) {
    setSettled({ asked, epoch, value });
  }
  const settle = useCallback(() => setAsked((count) => count + 1), []);
  return { value: settled.value, settle };
}
