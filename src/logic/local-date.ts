// An episode's local date is derived from its TVmaze `airstamp`, converted
// to the user's IANA time zone (ADR 0001, ADR 0006), not from `airdate`
// (which is in the network's time zone).

export type LocalDate = string; // "YYYY-MM-DD"

// Every view converts every episode of every followed show, often several
// times per render, and building a date formatter is slow (Hermes builds a
// new one for each toLocaleDateString call). So one formatter per time
// zone, and each airstamp's answer is kept. "en-CA" formats as
// "YYYY-MM-DD".
const formatters = new Map<string, Intl.DateTimeFormat>();
const localDates = new Map<string, LocalDate>();
// Enough for every episode of many followed shows; cleared past it.
const MAX_CACHED_DATES = 50_000;

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function localDateFromAirstamp(
  airstamp: string,
  timeZone: string,
): LocalDate {
  const key = `${timeZone}|${airstamp}`;
  const cached = localDates.get(key);
  if (cached !== undefined) {
    return cached;
  }
  if (localDates.size >= MAX_CACHED_DATES) {
    localDates.clear();
  }
  const localDate = formatterFor(timeZone).format(new Date(airstamp));
  localDates.set(key, localDate);
  return localDate;
}

export function today(
  timeZone: string,
  now: () => Date = () => new Date(),
): LocalDate {
  return now().toLocaleDateString("en-CA", { timeZone });
}

// Whether `localDate` is the calendar day immediately after `todayDate`.
// Used to decide when a relative label like "Tomorrow" applies (FR-006,
// PRD 5.4).
export function isNextDay(todayDate: LocalDate, localDate: LocalDate): boolean {
  return toUtcMillis(localDate) - toUtcMillis(todayDate) === 86_400_000;
}

// Whole calendar days from `from` to `to`, negative when `to` is earlier.
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / 86_400_000);
}

// The calendar day `days` after `date` (or before, when negative).
export function addDays(date: LocalDate, days: number): LocalDate {
  return new Date(toUtcMillis(date) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function toUtcMillis(isoDate: LocalDate): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}
