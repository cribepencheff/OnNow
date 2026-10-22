import {
  ENDED_SHOW_STALE_TIME_MS,
  HERO_WEEK_SHOW_STALE_TIME_MS,
  OTHER_SHOW_STALE_TIME_MS,
  isInHeroWeek,
  showStaleTime,
} from "./show-staleness";

const DAY = 24 * 60 * 60 * 1000;
// Monday 5 October 2026, noon in Stockholm (UTC+2).
const NOW = Date.parse("2026-10-05T10:00:00Z");
const TZ = "Europe/Stockholm";

const show = (
  status: string,
  ...airstamps: (string | null)[]
): NonNullable<Parameters<typeof showStaleTime>[0]> => ({
  status,
  _embedded: {
    episodes: airstamps.map((airstamp) => ({ airstamp, number: 1 })),
  },
});

// ADR 0017 amendment (owner, 2026-10-22): a followed show is asked again
// by what the hero needs. With an episode in the hero's week, daily; any
// other show weekly; never hourly.
describe("showStaleTime", () => {
  it("is a day for a show with an episode in the hero's week", () => {
    expect(
      showStaleTime(show("Running", "2026-10-09T01:00:00+00:00"), NOW, TZ),
    ).toBe(HERO_WEEK_SHOW_STALE_TIME_MS);
    expect(HERO_WEEK_SHOW_STALE_TIME_MS).toBe(DAY);
  });

  it("is a week for a running show with nothing in the hero's week", () => {
    expect(
      showStaleTime(show("Running", "2026-11-20T01:00:00+00:00"), NOW, TZ),
    ).toBe(OTHER_SHOW_STALE_TIME_MS);
    expect(showStaleTime(show("To Be Determined"), NOW, TZ)).toBe(
      OTHER_SHOW_STALE_TIME_MS,
    );
    expect(OTHER_SHOW_STALE_TIME_MS).toBe(7 * DAY);
  });

  it("is a week for an ended show", () => {
    expect(showStaleTime(show("Ended"), NOW, TZ)).toBe(
      ENDED_SHOW_STALE_TIME_MS,
    );
    expect(ENDED_SHOW_STALE_TIME_MS).toBe(7 * DAY);
  });

  it("is a day for a show not loaded yet", () => {
    expect(showStaleTime(undefined, NOW, TZ)).toBe(
      HERO_WEEK_SHOW_STALE_TIME_MS,
    );
  });
});

describe("isInHeroWeek", () => {
  it("counts today, in the user's time zone, through six days on", () => {
    // 23:00 UTC on Sunday 4 Oct is 01:00 Monday in Stockholm: today.
    expect(
      isInHeroWeek(show("Running", "2026-10-04T23:00:00+00:00"), NOW, TZ),
    ).toBe(true);
    // Sunday 11 Oct is the week's last day; Monday 12 Oct is past it.
    expect(
      isInHeroWeek(show("Running", "2026-10-11T12:00:00+00:00"), NOW, TZ),
    ).toBe(true);
    expect(
      isInHeroWeek(show("Running", "2026-10-12T12:00:00+00:00"), NOW, TZ),
    ).toBe(false);
  });

  it("leaves out specials and episodes without an airstamp", () => {
    expect(
      isInHeroWeek(
        {
          status: "Running",
          _embedded: {
            episodes: [
              { airstamp: "2026-10-06T12:00:00+00:00", number: null },
              { airstamp: null, number: 2 },
            ],
          },
        },
        NOW,
        TZ,
      ),
    ).toBe(false);
  });
});
