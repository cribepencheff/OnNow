// How long a show's TVmaze data counts as fresh before it is fetched
// again (ADR 0017, amended 2026-10-22): by what the hero needs, never more
// often than daily. A show with an episode in the hero's week (today and
// the next six days) is asked again daily; any other show, and an ended
// one, weekly. "Today" is worked out on the phone from each episode's air
// time, so a day-old answer still shows the right day; for the exact
// details, the hero links to the service. A pull asks again for the
// hero's week at once (useFollowedEpisodes). Judged when the check runs,
// against the clock then, so a show entering the week becomes daily by
// itself.
//
// SHOW_STALE_TIME_MS stays the query client's default for other kinds of
// data: TVmaze's own cache is one hour (NFR-005, spike 0001).

import { HOME_HERO_HORIZON_DAYS } from "./hero-carousel";
import { addDays, localDateFromAirstamp, today } from "./local-date";

const DAY_MS = 24 * 60 * 60 * 1000;
export const SHOW_STALE_TIME_MS = 60 * 60 * 1000;
export const HERO_WEEK_SHOW_STALE_TIME_MS = DAY_MS;
export const OTHER_SHOW_STALE_TIME_MS = 7 * DAY_MS;
export const ENDED_SHOW_STALE_TIME_MS = 7 * DAY_MS;

export type StaleShow = {
  status?: string;
  _embedded?: {
    episodes?: { airstamp: string | null; number: number | null }[];
  };
};

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Whether the show has a regular episode in the hero's week, in the
// user's time zone.
export function isInHeroWeek(
  show: StaleShow,
  nowMs: number = Date.now(),
  timeZone: string = deviceTimeZone(),
): boolean {
  const first = today(timeZone, () => new Date(nowMs));
  const last = addDays(first, HOME_HERO_HORIZON_DAYS - 1);
  return (show._embedded?.episodes ?? []).some((episode) => {
    if (episode.number === null || !episode.airstamp) {
      return false;
    }
    const day = localDateFromAirstamp(episode.airstamp, timeZone);
    return day >= first && day <= last;
  });
}

export function showStaleTime(
  show: StaleShow | undefined,
  nowMs: number = Date.now(),
  timeZone: string = deviceTimeZone(),
): number {
  if (!show) {
    return HERO_WEEK_SHOW_STALE_TIME_MS;
  }
  if (show.status === "Ended") {
    return ENDED_SHOW_STALE_TIME_MS;
  }
  return isInHeroWeek(show, nowMs, timeZone)
    ? HERO_WEEK_SHOW_STALE_TIME_MS
    : OTHER_SHOW_STALE_TIME_MS;
}
