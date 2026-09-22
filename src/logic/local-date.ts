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
