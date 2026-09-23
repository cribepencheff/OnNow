// An episode's local date is derived from its TVmaze `airstamp`, converted
// to the user's IANA time zone (ADR 0001, ADR 0006), not from `airdate`
// (which is in the network's time zone).

export type LocalDate = string; // "YYYY-MM-DD"

export function localDateFromAirstamp(
  airstamp: string,
  timeZone: string,
): LocalDate {
  const date = new Date(airstamp);
  return date.toLocaleDateString("en-CA", { timeZone });
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
