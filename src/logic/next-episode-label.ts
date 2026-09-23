// "New today", "Next: Tomorrow" or "Next: [date]" (or "No date yet") after
// following a show in Search, and reused by the Shows list (FR-025,
// FR-010, PRD 5.4). Dates are shown in the user's own time zone (ADR
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
  if (!next) {
    return "No date yet";
  }

  if (next.kind === "episode") {
    return nextDateLabel(
      localDateFromAirstamp(next.episode.airstamp, timeZone),
      todayDate,
    );
  }

  if (next.kind === "announced-season" && next.season.premiereDate) {
    return nextDateLabel(next.season.premiereDate, todayDate);
  }

  return "No date yet";
}

// Shared with the Shows list (src/logic/shows-list.ts): "New today" once
// the date has arrived (it is no longer "next", it is out), "Next:
// Tomorrow" the day before, otherwise a plain date.
export function nextDateLabel(
  localDate: LocalDate,
  todayDate: LocalDate,
): string {
  if (localDate === todayDate) {
    return "New today";
  }
  if (isNextDay(todayDate, localDate)) {
    return "Next: Tomorrow";
  }
  return `Next: ${formatLabelDate(localDate)}`;
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

// "Tue 24 Sep" (PRD 5.4): weekday, day, month, no comma, no year.
export function formatLabelDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}
