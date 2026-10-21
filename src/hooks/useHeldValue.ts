// A value whose changes show up only after a delay, except when `isUrgent`
// says the change must show at once. Home holds the hero's slides with it
// (HERO_REBUILD_DELAY_MS in index.tsx), so a follow or unfollow rebuilds
// the hero only after the tapped card's own animation is over, instead of
// both running on the UI thread at the same time.

import { useEffect, useState } from "react";

export function useHeldValue<T>(
  value: T,
  delayMs: number,
  isUrgent: (held: T, next: T) => boolean,
): T {
  const [held, setHeld] = useState(value);
  const urgent = value !== held && isUrgent(held, value);

  useEffect(() => {
    if (value === held) {
      return;
    }
    const timer = setTimeout(() => setHeld(value), urgent ? 0 : delayMs);
    return () => clearTimeout(timer);
  }, [value, held, urgent, delayMs]);

  return urgent ? value : held;
}
