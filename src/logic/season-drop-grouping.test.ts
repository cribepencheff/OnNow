import { calendarRowLine } from "./calendar";
import { findShowsWithEpisodeToday } from "./episodes-today";
import { homeCardMetaLine } from "./home";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import showNeagleyFixture from "@/api/fixtures/show-neagley.json";

const neagley = showNeagleyFixture as unknown as TvMazeShowWithEmbeds;

// CRI-81: a whole-season release (Neagley, all 8 episodes on Wed 16 Sep)
// is one item on Home and in Calendar, per FR-012.
describe("season drops on Home and in Calendar (FR-012, CRI-81)", () => {
  const onDropDay = findShowsWithEpisodeToday(
    [{ show: neagley, episodes: neagley._embedded.episodes }],
    "Europe/Stockholm",
    "2026-09-16",
  );

  it("groups the drop into one show with all 8 episodes", () => {
    expect(onDropDay).toHaveLength(1);
    expect(onDropDay[0].episodes).toHaveLength(8);
  });

  it("labels the Home card and the Calendar row as one range", () => {
    expect(homeCardMetaLine(neagley, onDropDay[0].episodes)).toBe(
      "Episodes 1–8 · Prime Video",
    );
    expect(calendarRowLine(onDropDay[0].episodes)).toBe("Episodes 1–8");
  });
});
