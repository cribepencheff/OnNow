// "New today", "Next: Tomorrow", "Next: [date]" or "Season 4 premiere ·
// [date]" (or "No date yet") after following a show in Search, and reused
// by the Shows list (FR-025, FR-010, PRD 5.4). Dates are shown in the user's own time zone (ADR
// 0001); no time of day. An episode's local day comes from its airstamp,
// not its airdate (ADR 0006), since the network's own calendar day can
// differ from the user's near midnight.

import { isNextDay, localDateFromAirstamp, type LocalDate } from "./local-date";
import type { NextForShow } from "./next-episode";

export function nextEpisodeLabel(
  next: NextForShow | undefined,
  timeZone: string,
  todayDate: LocalDate,
): string {
  return (next && nextReleaseLabel(next, timeZone, todayDate)) ?? "No date yet";
}

// Shared with the Shows list (src/logic/shows-list.ts): the label for the
// next release when its date is known, from an upcoming episode or an
// announced season's premiere date, or null when no date is known (each
// caller has its own fallback).
export function nextReleaseLabel(
  next: NextForShow,
  timeZone: string,
  todayDate: LocalDate,
): string | null {
  if (next.kind === "episode") {
    return nextDateLabel(
      localDateFromAirstamp(next.episode.airstamp, timeZone),
      todayDate,
      next.episode.number === 1 ? next.episode.season : null,
    );
  }

  if (next.kind === "announced-season" && next.season.premiereDate) {
    return nextDateLabel(
      next.season.premiereDate,
      todayDate,
      next.season.number,
    );
  }

  return null;
}

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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
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
