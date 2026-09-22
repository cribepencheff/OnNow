// Today's date in the user's own time zone (ADR 0001). Not a TanStack
// Query hook: there is nothing to fetch, only the device clock and time
// zone, but it lives here because views use it the same way as the data
// fetching hooks.

import { useEffect, useState } from "react";

import { today as computeToday, type LocalDate } from "@/logic/local-date";

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function useToday(): LocalDate {
  const [todayDate, setTodayDate] = useState(() =>
    computeToday(deviceTimeZone()),
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTodayDate(computeToday(deviceTimeZone()));
    }, 60_000);

    return () => clearInterval(intervalId);
  }, []);

  return todayDate;
}
