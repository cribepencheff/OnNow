import { fireEvent, render, screen } from "@testing-library/react-native";

import ShowsScreen from "@/app/(tabs)/shows";
import { TVMAZE_CREDIT } from "@/api/tvmaze-credit";
import { useFollowList } from "@/hooks/useFollowList";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useStreamingService } from "@/hooks/useStreamingService";
import { NOT_ON_TMDB } from "@/logic/streaming-service";
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
jest.mock("@/hooks/useStreamingService", () => ({
  useStreamingService: jest.fn(),
}));
jest.mock("@/hooks/useRegion", () => ({
  useRegion: () => ({ region: "SE" }),
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
const mockedUseStreamingService = useStreamingService as jest.MockedFunction<
  typeof useStreamingService
>;

function mockProviders(data: unknown) {
  mockedUseStreamingService.mockReturnValue({
    data,
  } as unknown as ReturnType<typeof useStreamingService>);
}

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

// Airing: an episode out before today (21 Sep) and the next on 24 Sep.
function airingShow(id: number, name: string): TvMazeShowWithEmbeds {
  return makeShow({
    id,
    name,
    _embedded: {
      episodes: [
        makeEpisode({
          number: 1,
          airdate: "2026-09-17",
          airstamp: "2026-09-17T18:00:00+00:00",
        }),
        makeEpisode({ number: 2 }),
      ],
      seasons: [],
    },
  });
}

function mockShows(shows: TvMazeShowWithEmbeds[]) {
  mockFollowedEpisodes({
    followedCount: shows.length,
    isReady: true,
    followedShows: shows.map((show) => ({
      show,
      episodes: show._embedded.episodes,
    })),
  });
}

const refetch = jest.fn();
const unfollow = jest.fn();

function mockFollowedEpisodes(
  overrides: Partial<ReturnType<typeof useFollowedEpisodes>>,
) {
  mockedUseFollowedEpisodes.mockReturnValue({
    followedCount: 0,
    isReady: true,
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
      isLoaded: true,
      isFollowed: () => true,
      follow: jest.fn(),
      unfollow,
    });
    mockFollowedEpisodes({});
    mockProviders(undefined);
  });

  it("shows Show detail's status line for an airing show (FR-010, FR-035)", async () => {
    const show = airingShow(1, "Silo");
    mockShows([show]);

    await render(<ShowsScreen />);

    expect(screen.getByText("Silo")).toBeTruthy();
    expect(screen.getByText("Airing · next ep Thu 24 Sep")).toBeTruthy();
  });

  it("puts airing shows and confirmed seasons in Active, the rest in Inactive, with counts (PRD 5.3)", async () => {
    mockShows([
      airingShow(1, "Silo"),
      makeShow({
        id: 2,
        name: "Foundation",
        _embedded: { episodes: [], seasons: [makeSeason({ number: 4 })] },
      }),
      makeShow({ id: 3, name: "The Bear", status: "Ended" }),
    ]);

    await render(<ShowsScreen />);

    expect(screen.getByLabelText("Active, 2")).toBeTruthy();
    expect(screen.getByLabelText("Inactive, 1")).toBeTruthy();
    expect(screen.getByText("Season 4 · TBA")).toBeTruthy();
  });

  it("shows Inactive rows without a tap, with sticky segment headers (PRD 5.3)", async () => {
    mockShows([
      airingShow(1, "Silo"),
      makeShow({ id: 2, name: "The Bear", status: "Ended" }),
    ]);

    await render(<ShowsScreen />);

    expect(screen.getByText("The Bear")).toBeTruthy();
    expect(screen.getByText("Ended")).toBeTruthy();
    expect(
      screen.getByTestId("shows-segment-inactive").props.accessibilityRole,
    ).toBe("header");
    // Both segment headers stick (the list keeps their indices).
    expect(
      screen.getByTestId("shows-list").props.stickyHeaderIndices,
    ).toHaveLength(2);
  });

  it("leaves out a segment without shows", async () => {
    mockShows([airingShow(1, "Silo")]);

    await render(<ShowsScreen />);

    expect(screen.getByTestId("shows-segment-active")).toBeTruthy();
    expect(screen.queryByTestId("shows-segment-inactive")).toBeNull();
  });

  it("lists each segment alphabetically by title (PRD 5.3)", async () => {
    mockShows([
      airingShow(1, "Silo"),
      airingShow(2, "Foundation"),
      airingShow(3, "The Bear"),
    ]);

    await render(<ShowsScreen />);

    const titles = screen.getAllByTestId("shows-row").map((row) => {
      const label = row.props.accessibilityLabel as string;
      return label.split(",")[0];
    });
    expect(titles).toEqual(["Foundation", "Silo", "The Bear"]);
  });

  it('shows the service, or plain "Unavailable" (FR-027, CRI-97)', async () => {
    mockShows([airingShow(1, "Silo")]);
    mockProviders([{ providerId: 350, providerName: "Apple TV" }]);

    const { rerender } = await render(<ShowsScreen />);
    expect(screen.getByText("On Apple TV")).toBeTruthy();

    mockProviders([]);
    await rerender(<ShowsScreen />);
    expect(screen.getByText("Unavailable")).toBeTruthy();
  });

  it("shows no service when TMDB does not know the show (CRI-102)", async () => {
    mockShows([airingShow(1, "Silo")]);
    mockProviders(NOT_ON_TMDB);

    await render(<ShowsScreen />);

    expect(screen.getByTestId("shows-row-service").props.children).toBe("");
  });

  it('reveals "Unfollow" on swipe and removes the show only on press (FR-002)', async () => {
    mockShows([airingShow(42, "Silo")]);

    await render(<ShowsScreen />);

    expect(unfollow).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText("Unfollow Silo"));

    expect(unfollow).toHaveBeenCalledWith(42);
  });

  it("unfollows through the accessibility action, for screen readers that cannot swipe (NFR-008)", async () => {
    mockShows([airingShow(42, "Silo")]);

    await render(<ShowsScreen />);

    const row = screen.getByTestId("shows-row");
    fireEvent(row, "accessibilityAction", {
      nativeEvent: { actionName: "unfollow" },
    });

    expect(unfollow).toHaveBeenCalledWith(42);
  });

  it("offers a button that opens Search when the follow list is empty (PRD 5.3, FR-007)", async () => {
    mockFollowedEpisodes({ followedCount: 0 });

    await render(<ShowsScreen />);

    await fireEvent.press(screen.getByTestId("shows-add-show"));

    expect(mockPush).toHaveBeenCalledWith("/search");
  });

  it("shows a quiet placeholder instead of a status while loading", async () => {
    mockFollowedEpisodes({ followedCount: 1, isLoading: true });

    await render(<ShowsScreen />);

    expect(screen.getByText("Loading your shows…")).toBeTruthy();
    expect(screen.queryByTestId("shows-row")).toBeNull();
    expect(screen.queryByTestId("shows-empty-state")).toBeNull();
  });

  it("opens Search when the search field is pressed", async () => {
    await render(<ShowsScreen />);

    await fireEvent.press(screen.getByLabelText("Search shows"));

    expect(mockPush).toHaveBeenCalledWith("/search");
  });

  it("shows the streaming region and opens the region picker (FR-016, CRI-88)", async () => {
    await render(<ShowsScreen />);

    await fireEvent.press(screen.getByText("Streaming region: Sweden"));

    expect(mockPush).toHaveBeenCalledWith("/region");
  });

  it("shows the TVmaze credit (NFR-007)", async () => {
    mockShows([airingShow(1, "Silo")]);

    await render(<ShowsScreen />);

    expect(screen.getByText(TVMAZE_CREDIT.text)).toBeTruthy();
  });

  it("shows the TVmaze credit even when the follow list is empty", async () => {
    mockFollowedEpisodes({ followedCount: 0 });

    await render(<ShowsScreen />);

    expect(screen.getByText(TVMAZE_CREDIT.text)).toBeTruthy();
  });
});
