// "Next: [date]" or "No date yet" after following a show in Search
// (FR-025, PRD 5.4). Dates are shown in the user's own time zone
// (ADR 0001); no time of day.

import type { NextForShow } from "./next-episode";

export function nextEpisodeLabel(next: NextForShow | undefined): string {
  if (!next) {
    return "No date yet";
  }

  if (next.kind === "episode") {
    return `Next: ${formatLabelDate(next.episode.airdate)}`;
  }

  if (next.kind === "announced-season" && next.season.premiereDate) {
    return `Next: ${formatLabelDate(next.season.premiereDate)}`;
  }

  return "No date yet";
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
