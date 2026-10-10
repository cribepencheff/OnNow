// The day "Top picks for you" is ordered by (CRI-131). A new day changes
// where the row starts (rotateForDay), so it never takes effect under the
// user's finger: the screen keeps the day it settled on, and settles again
// when it regains focus or on pull to refresh. Then the row starts over
// from the first batch of the new day's order. The screen provides the
// day to its rows through SettledDayContext.

import { createContext, useCallback, useContext, useState } from "react";

import { today as todayIn, type LocalDate } from "@/logic/local-date";
import { useToday } from "./useToday";

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export const SettledDayContext = createContext<LocalDate | null>(null);

// The day a row is ordered by: its screen's, or today outside one.
export function useRowDay(): LocalDate {
  const today = useToday();
  return useContext(SettledDayContext) ?? today;
}

export function useSettledDay(): {
  day: LocalDate;
  // Takes today's date as it is now.
  settle: () => void;
} {
  // How many times the screen asked to settle, and the day taken at the
  // last of them, while rendering, from the clock as it is then (judged
  // when it acts, not at useToday's last minute tick).
  const [asked, setAsked] = useState(0);
  const [settled, setSettled] = useState(() => ({
    asked,
    day: todayIn(deviceTimeZone()),
  }));
  if (settled.asked !== asked) {
    setSettled({ asked, day: todayIn(deviceTimeZone()) });
  }
  const settle = useCallback(() => setAsked((count) => count + 1), []);
  return { day: settled.day, settle };
}
