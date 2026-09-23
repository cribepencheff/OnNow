// Pure month grid and day logic for Calendar (PRD 5.2, FR-008, FR-009,
// FR-012, FR-036, FR-037). Views and hooks only render this; they do not
// decide it (ADR 0009).

import { localDateFromAirstamp, type LocalDate } from "./local-date";
import type { TvMazeEpisode } from "@/api/tvmaze-types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// "September 2026" (PRD 5.2).
export function monthTitle(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export interface YearMonth {
  year: number;
  month: number; // 1-12
}

export function addMonths(
  { year, month }: YearMonth,
  delta: number,
): YearMonth {
  const total = year * 12 + (month - 1) + delta;
  const newYear = Math.floor(total / 12);
  return { year: newYear, month: total - newYear * 12 + 1 };
}

export function monthOf(date: LocalDate): YearMonth {
  const [year, month] = date.split("-").map(Number);
  return { year, month };
}

// "September 21, 2026", for accessibility labels on grid days.
export function fullDateLabel(date: LocalDate): string {
  const { year, month } = monthOf(date);
  const day = Number(date.split("-")[2]);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

// Every month page is padded to the same 6 weeks (42 cells), so swiping
// between months of different lengths never changes the grid's height.
const GRID_CELLS = 42;

// PRD 5.2, 5.7: weeks start on the day the phone's locale says. weekStart is
// 0 (Sunday) to 6 (Saturday), matching Date#getDay(). Leading and trailing
// cells outside the month are null.
export function monthGridDates(
  { year, month }: YearMonth,
  weekStart: number,
): (LocalDate | null)[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leadingBlanks = (firstWeekday - weekStart + 7) % 7;

  const dates: (LocalDate | null)[] = new Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(formatLocalDate(year, month, day));
  }
  while (dates.length < GRID_CELLS) {
    dates.push(null);
  }
  return dates;
}

function formatLocalDate(year: number, month: number, day: number): LocalDate {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// The grid as explicit week rows of exactly seven cells, so the view can
// render each row as its own non-wrapping flex row. GRID_CELLS is always a
// multiple of 7, so every week is complete.
export function monthGridWeeks(
  yearMonth: YearMonth,
  weekStart: number,
): (LocalDate | null)[][] {
  const dates = monthGridDates(yearMonth, weekStart);
  const weeks: (LocalDate | null)[][] = [];
  for (let start = 0; start < dates.length; start += 7) {
    weeks.push(dates.slice(start, start + 7));
  }
  return weeks;
}

// FR-008: which local dates, across all followed shows, have at least one
// episode. Used to mark days in the grid. Specials are already excluded
// upstream, by relying on the default TVmaze episode list (FR-037, see
// episodes-today.ts).
export function datesWithEpisodes(
  followedShows: { episodes: TvMazeEpisode[] }[],
  timeZone: string,
): Set<LocalDate> {
  const dates = new Set<LocalDate>();
  for (const { episodes } of followedShows) {
    for (const episode of episodes) {
      dates.add(localDateFromAirstamp(episode.airstamp, timeZone));
    }
  }
  return dates;
}

function episodeCode(episode: TvMazeEpisode): string {
  return episode.number !== null
    ? `S${episode.season}E${episode.number}`
    : `S${episode.season}`;
}

// PRD 5.2: "episode code and episode title", or "Episodes 1–8" when several
// episodes of one show land on the same day (FR-012): a range has no single
// title to show.
export function calendarRowLine(episodes: TvMazeEpisode[]): string {
  if (episodes.length === 0) {
    return "";
  }

  if (episodes.length === 1) {
    return `${episodeCode(episodes[0])} · ${episodes[0].name}`;
  }

  const numbers = episodes
    .map((episode) => episode.number)
    .filter((number): number is number => number !== null)
    .sort((a, b) => a - b);

  if (numbers.length === 0) {
    return "";
  }

  return `Episodes ${numbers[0]}–${numbers[numbers.length - 1]}`;
}

export interface CalendarDayCell {
  date: LocalDate;
  hasEpisodes: boolean;
  isToday: boolean;
  isSelected: boolean;
}

// One grid cell's derived state (FR-008): today gets a ring, days with
// episodes a mark, the selected day a fill. Blank padding cells (outside
// the month) are left out entirely; the view renders an empty slot for them.
export function calendarDayCell(
  date: LocalDate,
  todayDate: LocalDate,
  selectedDate: LocalDate,
  datesWithEpisodesSet: Set<LocalDate>,
): CalendarDayCell {
  return {
    date,
    hasEpisodes: datesWithEpisodesSet.has(date),
    isToday: date === todayDate,
    isSelected: date === selectedDate,
  };
}
