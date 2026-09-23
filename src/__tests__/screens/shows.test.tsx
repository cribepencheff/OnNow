import { fireEvent, render, screen } from "@testing-library/react-native";

import ShowsScreen from "@/app/(tabs)/shows";
import { TVMAZE_CREDIT } from "@/api/tvmaze-credit";
import { useFollowList } from "@/hooks/useFollowList";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import type {
  TvMazeEpisode,
  TvMazeSeason,
  TvMazeShowWithEmbeds,
} from "@/api/tvmaze-types";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/hooks/useFollowedEpisodes", () => ({
  useFollowedEpisodes: jest.fn(),
}));
jest.mock("@/hooks/useFollowList", () => ({
  useFollowList: jest.fn(),
}));
jest.mock("@/hooks/useToday", () => ({
  useToday: () => "2026-09-21",
}));

const mockedUseFollowedEpisodes = useFollowedEpisodes as jest.MockedFunction<
  typeof useFollowedEpisodes
>;
const mockedUseFollowList = useFollowList as jest.MockedFunction<
  typeof useFollowList
>;

function makeShow(
  overrides: Partial<TvMazeShowWithEmbeds> = {},
): TvMazeShowWithEmbeds {
  return {
    id: 1,
    url: "https://www.tvmaze.com/shows/1",
    name: "Test Show",
    type: "Scripted",
    language: "English",
    genres: [],
    status: "Running",
    runtime: null,
    averageRuntime: 30,
    premiered: "2020-01-01",
    ended: null,
    officialSite: null,
    network: { id: 1, name: "AMC", country: null, officialSite: null },
    webChannel: null,
    image: null,
    summary: null,
    _links: { self: { href: "https://api.tvmaze.com/shows/1" } },
    _embedded: { episodes: [], seasons: [] },
    ...overrides,
  };
}

function makeEpisode(overrides: Partial<TvMazeEpisode> = {}): TvMazeEpisode {
  return {
    id: 1,
    url: "https://www.tvmaze.com/episodes/1",
    name: "Episode",
    season: 1,
    number: 1,
    type: "regular",
    airdate: "2026-09-24",
    airtime: "20:00",
    airstamp: "2026-09-24T18:00:00+00:00",
    runtime: 45,
    image: null,
    summary: null,
    ...overrides,
  };
}

function makeSeason(overrides: Partial<TvMazeSeason> = {}): TvMazeSeason {
  return {
    id: 1,
    url: "https://www.tvmaze.com/seasons/1",
    number: 2,
    name: "",
    episodeOrder: null,
    premiereDate: null,
    endDate: null,
    network: null,
    webChannel: null,
    image: null,
    summary: null,
    ...overrides,
  };
}

const refetch = jest.fn();
const unfollow = jest.fn();

function mockFollowedEpisodes(
  overrides: Partial<ReturnType<typeof useFollowedEpisodes>>,
) {
  mockedUseFollowedEpisodes.mockReturnValue({
    followedCount: 0,
    isLoading: false,
    isRefetching: false,
    isError: false,
    dataUpdatedAt: null,
    followedShows: [],
    showsWithEpisodeToday: [],
    nextDayEpisodes: null,
    nextByShow: [],
    refetch,
    ...overrides,
  });
}

// CRI-68 "done when": component tests cover running, between seasons and
// ended shows.
describe("ShowsScreen", () => {
  beforeEach(() => {
    mockPush.mockClear();
    refetch.mockClear();
    unfollow.mockClear();
    mockedUseFollowList.mockReturnValue({
      followedIds: new Set(),
      isFollowed: () => true,
      follow: jest.fn(),
      unfollow,
    });
    mockFollowedEpisodes({});
  });

  it("shows a running show's next episode date (FR-010)", async () => {
    const show = makeShow({
      name: "Silo",
      status: "Running",
      _embedded: {
        // A regular episode, not a season premiere (CRI-78).
        episodes: [makeEpisode({ airdate: "2026-09-24", number: 2 })],
        seasons: [],
      },
    });
    mockFollowedEpisodes({
      followedCount: 1,
      followedShows: [{ show, episodes: show._embedded.episodes }],
    });

    await render(<ShowsScreen />);

    expect(screen.getByText("Silo")).toBeTruthy();
    expect(screen.getByText("Next: Thu 24 Sep")).toBeTruthy();
  });

  it("shows the next announced date for a show between seasons (FR-035)", async () => {
    const show = makeShow({
      name: "Foundation",
      status: "Running",
      _embedded: {
        episodes: [],
        seasons: [makeSeason({ premiereDate: "2026-12-01" })],
      },
    });
    mockFollowedEpisodes({
      followedCount: 1,
      followedShows: [{ show, episodes: [] }],
    });

    await render(<ShowsScreen />);

    expect(screen.getByText("Season 2 premiere · Tue 1 Dec")).toBeTruthy();
  });

  it("shows the status for a show between seasons with no announced date (FR-035)", async () => {
    const show = makeShow({
      name: "Foundation",
      status: "Running",
      _embedded: {
        episodes: [],
        seasons: [makeSeason({ premiereDate: null, episodeOrder: 10 })],
      },
    });
    mockFollowedEpisodes({
      followedCount: 1,
      followedShows: [{ show, episodes: [] }],
    });

    await render(<ShowsScreen />);

    expect(screen.getByText("Running")).toBeTruthy();
  });

  it("shows the status for an ended show", async () => {
    const show = makeShow({
      name: "The Bear",
      status: "Ended",
      _embedded: { episodes: [], seasons: [] },
    });
    mockFollowedEpisodes({
      followedCount: 1,
      followedShows: [{ show, episodes: [] }],
    });

    await render(<ShowsScreen />);

    expect(screen.getByText("Ended")).toBeTruthy();
  });

  it("lists followed shows alphabetically by title (PRD 5.3)", async () => {
    const shows = [
      makeShow({ id: 1, name: "Silo" }),
      makeShow({ id: 2, name: "Foundation" }),
      makeShow({ id: 3, name: "The Bear" }),
    ];
    mockFollowedEpisodes({
      followedCount: 3,
      followedShows: shows.map((show) => ({ show, episodes: [] })),
    });

    await render(<ShowsScreen />);

    const titles = screen.getAllByTestId("shows-row").map((row) => {
      const label = row.props.accessibilityLabel as string;
      return label.split(",")[0];
    });
    expect(titles).toEqual(["Foundation", "Silo", "The Bear"]);
  });

  it('reveals "Unfollow" on swipe and removes the show on press (FR-002)', async () => {
    const show = makeShow({ id: 42, name: "Silo" });
    mockFollowedEpisodes({
      followedCount: 1,
      followedShows: [{ show, episodes: [] }],
    });

    await render(<ShowsScreen />);

    await fireEvent.press(screen.getByLabelText("Unfollow Silo"));

    expect(unfollow).toHaveBeenCalledWith(42);
  });

  it("unfollows through the accessibility action, for screen readers that cannot swipe (NFR-008)", async () => {
    const show = makeShow({ id: 42, name: "Silo" });
    mockFollowedEpisodes({
      followedCount: 1,
      followedShows: [{ show, episodes: [] }],
    });

    await render(<ShowsScreen />);

    const row = screen.getByTestId("shows-row");
    fireEvent(row, "accessibilityAction", {
      nativeEvent: { actionName: "unfollow" },
    });

    expect(unfollow).toHaveBeenCalledWith(42);
  });

  it("shows a short empty line when the follow list is empty", async () => {
    mockFollowedEpisodes({ followedCount: 0 });

    await render(<ShowsScreen />);

    expect(screen.getByText("No shows yet")).toBeTruthy();
  });

  it("shows a quiet placeholder instead of a status while loading", async () => {
    mockFollowedEpisodes({ followedCount: 1, isLoading: true });

    await render(<ShowsScreen />);

    expect(screen.getByText("Loading your shows…")).toBeTruthy();
    expect(screen.queryByText("Running")).toBeNull();
    expect(screen.queryByText("No shows yet")).toBeNull();
  });

  it("opens Search when the search field is pressed", async () => {
    await render(<ShowsScreen />);

    await fireEvent.press(screen.getByLabelText("Search shows"));

    expect(mockPush).toHaveBeenCalledWith("/search");
  });

  it("shows the TVmaze credit (NFR-007)", async () => {
    const show = makeShow({ name: "Silo" });
    mockFollowedEpisodes({
      followedCount: 1,
      followedShows: [{ show, episodes: [] }],
    });

    await render(<ShowsScreen />);

    expect(screen.getByText(TVMAZE_CREDIT.text)).toBeTruthy();
  });

  it("shows the TVmaze credit even when the follow list is empty", async () => {
    mockFollowedEpisodes({ followedCount: 0 });

    await render(<ShowsScreen />);

    expect(screen.getByText(TVMAZE_CREDIT.text)).toBeTruthy();
  });
});
