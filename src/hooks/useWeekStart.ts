// The first day of the week from the phone's locale (PRD 5.2, 5.7: "Monday
// in Sweden"). Not a TanStack Query hook: there is nothing to fetch, only
// the device's locale settings, but it lives here because views use it the
// same way as the data fetching hooks (ADR 0009).

import { useCalendars } from "expo-localization";

// 0 (Sunday) to 6 (Saturday), matching Date#getDay(). expo-localization's
// Weekday enum numbers Sunday 1 through Saturday 7; `firstWeekday` can be
// null on platforms that do not expose it, in which case Sunday is used.
export function useWeekStart(): number {
  const [calendar] = useCalendars();
  return (calendar.firstWeekday ?? 1) - 1;
}
