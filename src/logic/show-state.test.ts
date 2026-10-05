import { showState, showStateLabel, type ShowState } from "./show-state";
import type {
  TvMazeEpisode,
  TvMazeSeason,
  TvMazeShowWithEmbeds,
} from "@/api/tvmaze-types";
import showMoblandFixture from "@/api/fixtures/show-mobland.json";
import showKillingEveFixture from "@/api/fixtures/show-killing-eve.json";

const TZ = "Europe/Stockholm";
const TODAY = "2026-10-04";

function episode(
  season: number,
  number: number,
  airdate: string | null,
  type = "regular",
): TvMazeEpisode {
  return {
    id: season * 100 + number,
    season,
    number,
    type,
    name: `S${season}E${number}`,
    airdate: airdate ?? "",
    airstamp: airdate ? `${airdate}T12:00:00+00:00` : null,
  } as unknown as TvMazeEpisode;
}

function season(number: number, premiereDate: string | null): TvMazeSeason {
  return { id: number, number, premiereDate } as TvMazeSeason;
}

function stateOf(
  status: string,
  episodes: TvMazeEpisode[],
  seasons: TvMazeSeason[],
  todayDate = TODAY,
): ShowState {
  return showState({ status }, episodes, seasons, TZ, todayDate);
}

const season1Aired = [episode(1, 1, "2026-01-10"), episode(1, 2, "2026-01-17")];

describe("showState (FR-028, FR-034)", () => {
  it("is airing when the next episode is in the same season as the last aired one", () => {
    const episodes = [
      episode(2, 1, "2026-09-27"),
      episode(2, 2, "2026-10-04"),
      episode(2, 3, "2026-10-11"),
    ];
    expect(stateOf("Running", episodes, [season(2, "2026-09-27")])).toEqual({
      kind: "airing",
      nextDate: "2026-10-11",
    });
  });

  it("counts an episode out today as aired, not as next", () => {
    const episodes = [episode(2, 1, "2026-10-04"), episode(2, 2, "2026-10-11")];
    expect(stateOf("Running", episodes, [])).toEqual({
      kind: "airing",
      nextDate: "2026-10-11",
    });
  });

  it('is "new ep today" when the latest episode is out today and nothing is dated after it (PRD 5.5)', () => {
    const episodes = [episode(2, 1, "2026-09-27"), episode(2, 2, "2026-10-04")];
    expect(stateOf("Running", episodes, [])).toEqual({ kind: "airing-today" });
  });

  it('prefers "new ep today" over a next episode listed without a date (PRD 5.5)', () => {
    const episodes = [episode(2, 1, "2026-10-04"), episode(2, 2, null)];
    expect(stateOf("Running", episodes, [])).toEqual({ kind: "airing-today" });
  });

  it('is "new ep today" for an Ended show whose last episode is out today (PRD 5.5)', () => {
    const episodes = [episode(3, 8, "2026-10-04")];
    expect(stateOf("Ended", episodes, [])).toEqual({ kind: "airing-today" });
  });

  it("lets a dated next season win over an episode out today", () => {
    const episodes = [episode(2, 8, "2026-10-04")];
    expect(
      stateOf("Running", episodes, [
        season(2, "2026-08-01"),
        season(3, "2027-03-01"),
      ]),
    ).toEqual({ kind: "season-dated", season: 3, date: "2027-03-01" });
  });

  it('is "next ep TBA" when the airing season\'s next episode is listed without a date (PRD 5.5)', () => {
    const episodes = [
      episode(2, 1, "2026-09-20"),
      episode(2, 2, "2026-09-27"),
      episode(2, 3, null),
    ];
    expect(stateOf("Running", episodes, [])).toEqual({ kind: "airing-tba" });
  });

  it('prefers "next ep TBA" over a new season listed without a date', () => {
    const episodes = [episode(2, 1, "2026-09-27"), episode(2, 2, null)];
    expect(
      stateOf("Running", episodes, [season(2, "2026-09-27"), season(3, null)]),
    ).toEqual({ kind: "airing-tba" });
  });

  it("does not read an undated episode of an Ended show as airing", () => {
    const episodes = [episode(2, 1, "2026-09-27"), episode(2, 2, null)];
    expect(stateOf("Ended", episodes, [])).toEqual({ kind: "ended" });
  });

  it("does not read an undated episode of an earlier season as airing", () => {
    const episodes = [episode(1, 9, null), episode(2, 1, "2026-09-27")];
    expect(stateOf("Running", episodes, [])).toEqual({
      kind: "between-seasons",
    });
  });

  it("is a dated next season when the next episode starts a new season", () => {
    const episodes = [...season1Aired, episode(2, 1, "2027-03-05")];
    expect(stateOf("Running", episodes, [])).toEqual({
      kind: "season-dated",
      season: 2,
      date: "2027-03-05",
    });
  });

  it("is a dated next season for a new show whose first episode is upcoming", () => {
    expect(stateOf("Running", [episode(1, 1, "2026-11-01")], [])).toEqual({
      kind: "season-dated",
      season: 1,
      date: "2026-11-01",
    });
  });

  it("is a dated next season when a listed season has a premiere date but no episodes", () => {
    const seasons = [season(1, "2026-01-10"), season(2, "2027-06-01")];
    expect(stateOf("Running", season1Aired, seasons)).toEqual({
      kind: "season-dated",
      season: 2,
      date: "2027-06-01",
    });
  });

  it("is an undated next season when a new season is listed without a date", () => {
    const seasons = [season(1, "2026-01-10"), season(2, null)];
    expect(stateOf("Running", season1Aired, seasons)).toEqual({
      kind: "season-tba",
      season: 2,
    });
  });

  it("prefers a listed undated season over To Be Determined", () => {
    const seasons = [season(1, "2026-01-10"), season(2, null)];
    expect(stateOf("To Be Determined", season1Aired, seasons)).toEqual({
      kind: "season-tba",
      season: 2,
    });
  });

  it("does not take an old season with a missing date for a new one", () => {
    const seasons = [season(1, null), season(2, "2026-05-01")];
    const episodes = [episode(1, 1, "2025-01-10"), episode(2, 1, "2026-05-01")];
    expect(stateOf("Running", episodes, seasons)).toEqual({
      kind: "between-seasons",
    });
  });

  it("is between seasons when running with no next episode and no new season listed", () => {
    expect(stateOf("Running", season1Aired, [season(1, "2026-01-10")])).toEqual(
      { kind: "between-seasons" },
    );
  });

  it("is future uncertain for To Be Determined", () => {
    expect(stateOf("To Be Determined", season1Aired, [])).toEqual({
      kind: "future-uncertain",
    });
  });

  it("is ended for Ended", () => {
    expect(stateOf("Ended", season1Aired, [])).toEqual({ kind: "ended" });
  });

  it("lets an announced season's date win over a stale Ended status", () => {
    expect(
      stateOf("Ended", [...season1Aired, episode(2, 1, "2027-01-01")], []),
    ).toEqual({ kind: "season-dated", season: 2, date: "2027-01-01" });
  });

  it("shows any other TVmaze status in plain words", () => {
    expect(stateOf("In Development", [], [])).toEqual({
      kind: "other",
      status: "In development",
    });
  });

  // An undated regular episode in the airing season is "next ep TBA" (PRD
  // 5.5), tested above.
  it("ignores specials (FR-037)", () => {
    const episodes = [
      ...season1Aired,
      episode(1, 0, "2026-12-24", "significant_special"),
      episode(1, 0, null, "significant_special"),
    ];
    expect(stateOf("Running", episodes, [])).toEqual({
      kind: "between-seasons",
    });
  });

  it("uses the local day of the airstamp in the user's time zone (ADR 0006)", () => {
    // 23:30 UTC on 4 Oct is 5 Oct in Stockholm, but still 4 Oct in New York.
    const late = {
      ...episode(2, 2, "2026-10-04"),
      airstamp: "2026-10-04T23:30:00+00:00",
    };
    const episodes = [episode(2, 1, "2026-09-27"), late];
    expect(showState({ status: "Running" }, episodes, [], TZ, TODAY)).toEqual({
      kind: "airing",
      nextDate: "2026-10-05",
    });
    expect(
      showState({ status: "Running" }, episodes, [], "America/New_York", TODAY),
    ).toEqual({ kind: "airing-today" });
  });

  it("reads MobLand season 2 as airing (real TVmaze fixture)", () => {
    const mobland = showMoblandFixture as unknown as TvMazeShowWithEmbeds;
    const state = showState(
      mobland,
      mobland._embedded.episodes,
      mobland._embedded.seasons,
      TZ,
      TODAY,
    );
    expect(state.kind).toBe("airing");
  });

  it("reads Killing Eve as ended (real TVmaze fixture)", () => {
    const killingEve = showKillingEveFixture as unknown as TvMazeShowWithEmbeds;
    expect(
      showState(
        killingEve,
        killingEve._embedded.episodes,
        killingEve._embedded.seasons,
        TZ,
        TODAY,
      ),
    ).toEqual({ kind: "ended" });
  });
});

describe("showStateLabel (FR-028)", () => {
  it.each<[ShowState, string]>([
    [{ kind: "airing", nextDate: "2026-10-11" }, "Airing · next ep Sun 11 Oct"],
    [{ kind: "airing-today" }, "Airing · new ep today"],
    [{ kind: "airing-tba" }, "Airing · next ep TBA"],
    [
      { kind: "season-dated", season: 3, date: "2027-07-09" },
      "Season 3 · Fri 9 Jul 2027",
    ],
    [{ kind: "season-tba", season: 2 }, "Season 2 · TBA"],
    [{ kind: "between-seasons" }, "Between seasons"],
    [{ kind: "future-uncertain" }, "Future uncertain"],
    [{ kind: "ended" }, "Ended"],
    [{ kind: "other", status: "In development" }, "In development"],
  ])("labels %j as %s", (state, label) => {
    expect(showStateLabel(state, TODAY)).toBe(label);
  });
});
