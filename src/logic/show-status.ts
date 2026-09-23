// TVmaze's fixed status values in plain words, wherever a status is shown
// (Show detail, Shows, Search; CRI-81). A translation of TVmaze's own
// vocabulary, not a guess (data first). Any other value is shown as
// TVmaze gives it.

const PLAIN_STATUS: Record<string, string> = {
  "To Be Determined": "Renewal not announced",
  "In Development": "In development",
};

export function statusLabel(status: string): string {
  return PLAIN_STATUS[status] ?? status;
}
