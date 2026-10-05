// Date labels for a release (PRD 5.5, CRI-78): "New today", "Next:
// Tomorrow", "Next: [date]" or "Season 4 premiere · [date]", used by Show
// detail's premiere cards. Dates are shown in the user's own time zone (ADR
// 0001); no time of day.

import { isNextDay, type LocalDate } from "./local-date";

// "New today" once the date has arrived (it is no longer "next", it is
// out), otherwise "Next: Tomorrow" or "Next: [date]". A season premiere
// reads "Season 4 premiere · Tomorrow" or "Season 4 premiere · [date]"
// instead (CRI-78). Data first: a premiere is episode 1 of a season, or an
// announced season's premiere date, as TVmaze gives them; nothing else is
// used to decide it.
export function nextDateLabel(
  localDate: LocalDate,
  todayDate: LocalDate,
  premiereSeason: number | null = null,
): string {
  if (localDate === todayDate) {
    return "New today";
  }

  const when = isNextDay(todayDate, localDate)
    ? "Tomorrow"
    : formatLabelDate(localDate, todayDate);

  return premiereSeason !== null
    ? `Season ${premiereSeason} premiere · ${when}`
    : `Next: ${when}`;
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "Tue 24 Sep" (PRD 5.4): weekday, day, month, no comma. The year is added
// only for a date in another year than today's, "Fri 9 Jul 2027", so a
// date far ahead does not read like one that has passed (CRI-78).
export function formatLabelDate(isoDate: string, todayDate: LocalDate): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const label = `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  const todayYear = Number(todayDate.slice(0, 4));
  return year === todayYear ? label : `${label} ${year}`;
}
