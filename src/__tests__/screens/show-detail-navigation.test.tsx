import { act } from "react";
import { router } from "expo-router";
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
  within,
} from "expo-router/testing-library";

import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useFollowList } from "@/hooks/useFollowList";
import { useSearchShows } from "@/hooks/useSearchShows";
import { useShow } from "@/hooks/useShow";
import type { TvMazeEpisode, TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";
import searchSlowHorsesFixture from "@/api/fixtures/search-slow-horses.json";

jest.mock("@/hooks/useFollowedEpisodes", () => ({
  useFollowedEpisodes: jest.fn(),
}));
jest.mock("@/hooks/useFollowList", () => ({
  useFollowList: jest.fn(),
}));
jest.mock("@/hooks/useSearchShows", () => ({
  useSearchShows: jest.fn(),
}));
jest.mock("@/hooks/useShow", () => ({
  useShow: jest.fn(),
}));
// Slow Horses S6E2 comes out on this day (airstamp 12:00 UTC, the same
// day in any time zone).
jest.mock("@/hooks/useToday", () => ({
  useToday: () => "2026-09-23",
}));

const slowHorses = showSlowHorsesFixture as unknown as TvMazeShowWithEmbeds;
const episodeToday = slowHorses._embedded.episodes.find(
  (episode) => episode.season === 6 && episode.number === 2,
) as TvMazeEpisode;

const follow = jest.fn();

beforeEach(() => {
  follow.mockReset();
  (useFollowedEpisodes as jest.Mock).mockReturnValue({
    followedCount: 1,
    isLoading: false,
    isRefetching: false,
    isError: false,
    dataUpdatedAt: null,
    followedShows: [
      { show: slowHorses, episodes: slowHorses._embedded.episodes },
    ],
    showsWithEpisodeToday: [{ show: slowHorses, episodes: [episodeToday] }],
    nextDayEpisodes: null,
    nextByShow: [],
    refetch: jest.fn(),
  });
  (useFollowList as jest.Mock).mockReturnValue({
    followedIds: new Set(),
    isFollowed: () => false,
    follow,
    unfollow: jest.fn(),
  });
  (useSearchShows as jest.Mock).mockReturnValue({
    data: searchSlowHorsesFixture,
    isLoading: false,
  });
  (useShow as jest.Mock).mockReturnValue({
    data: slowHorses,
    isLoading: false,
    isError: false,
  });
});

// CRI-79, FR-030, PRD 5.6: Show detail opens from Home, Calendar, Shows and
// Search, through the real navigation tree.
describe("Show detail (real navigation)", () => {
  it("FR-030: opens from the Home card", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/" });
    await rendered;

    await fireEvent.press(screen.getByTestId("home-card"));

    expect(rendered.getPathname()).toBe("/show/45039");
    expect(screen.getByTestId("show-detail-next")).toBeTruthy();
  });

  it("FR-030: opens from a Calendar row", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/calendar" });
    await rendered;

    await waitFor(() =>
      expect(screen.getByTestId("calendar-row")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId("calendar-row"));

    expect(rendered.getPathname()).toBe("/show/45039");
    expect(screen.getByTestId("show-detail-next")).toBeTruthy();
  });

  it("FR-030: opens from a Shows row, and back returns to Shows", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/shows" });
    await rendered;

    await fireEvent.press(screen.getByTestId("shows-row"));
    expect(rendered.getPathname()).toBe("/show/45039");

    // Pushed, not replaced: going back returns to Shows. The back arrow
    // itself is drawn by the native header, which this test renderer does
    // not render; the Maestro flow covers it.
    await act(() => router.back());
    expect(rendered.getPathname()).toBe("/shows");
  });

  it("FR-030, PRD 5.6: opens inside the Search sheet, where Close closes all of Search", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/" });
    await rendered;

    await fireEvent.press(screen.getByLabelText("Add show"));
    await fireEvent.changeText(
      screen.getByLabelText("Search shows"),
      "Slow Horses",
    );
    await fireEvent.press(screen.getAllByTestId("search-result-row")[0]);

    expect(rendered.getPathname()).toBe("/search/show/45039");
    expect(screen.getByTestId("show-detail-next")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("search-detail-close"));
    expect(rendered.getPathname()).toBe("/");
  });

  it("PRD 5.4: the follow circle on a Search row follows without opening Show detail", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/" });
    await rendered;

    await fireEvent.press(screen.getByLabelText("Add show"));
    await fireEvent.changeText(
      screen.getByLabelText("Search shows"),
      "Slow Horses",
    );
    const row = screen.getAllByTestId("search-result-row")[0];
    await fireEvent.press(within(row).getByRole("button", { name: "Follow" }));

    expect(follow).toHaveBeenCalledWith(45039);
    expect(rendered.getPathname()).toBe("/search");
  });
});
