import { fireEvent, render, screen } from "@testing-library/react-native";

import HomeScreen, { HomeHeaderAddButton } from "@/app/(tabs)/index";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useShow } from "@/hooks/useShow";
import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/hooks/useFollowedEpisodes", () => ({
  useFollowedEpisodes: jest.fn(),
}));
jest.mock("@/hooks/useShow", () => ({
  useShow: jest.fn(),
}));
jest.mock("@/hooks/useToday", () => ({
  useToday: () => "2026-09-21",
}));

const mockedUseFollowedEpisodes = useFollowedEpisodes as jest.MockedFunction<
  typeof useFollowedEpisodes
>;
const mockedUseShow = useShow as jest.MockedFunction<typeof useShow>;

function makeShow(overrides: Partial<TvMazeShow> = {}): TvMazeShow {
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
    airdate: "2026-09-21",
    airtime: "20:00",
    airstamp: "2026-09-21T18:00:00+00:00",
    runtime: 45,
    image: null,
    summary: null,
    ...overrides,
  };
}

const refetch = jest.fn();

function mockFollowedEpisodes(
  overrides: Partial<ReturnType<typeof useFollowedEpisodes>>,
) {
  mockedUseFollowedEpisodes.mockReturnValue({
    followedCount: 1,
    isLoading: false,
    isRefetching: false,
    isError: false,
    dataUpdatedAt: null,
    showsWithEpisodeToday: [],
    nextByShow: [],
    refetch,
    ...overrides,
  });
}

// CRI-66 "done when": component tests cover today with one, several and no
// shows, and an empty follow list.
describe("HomeScreen", () => {
  beforeEach(() => {
    mockPush.mockClear();
    refetch.mockClear();
    mockedUseShow.mockReturnValue({ data: undefined } as never);
  });

  it("renders one card when one followed show has an episode today (FR-004)", async () => {
    const show = makeShow({ name: "Slow Horses" });
    const episode = makeEpisode();
    mockFollowedEpisodes({
      showsWithEpisodeToday: [{ show, episodes: [episode] }],
    });

    await render(<HomeScreen />);

    expect(screen.getAllByTestId("home-card")).toHaveLength(1);
    expect(screen.getByText("Slow Horses")).toBeTruthy();
    expect(screen.getByText("NEW TODAY · 1/1")).toBeTruthy();
  });

  it("renders several cards with paging and a count label when several shows have an episode today (FR-004, FR-005)", async () => {
    const showA = makeShow({ id: 1, name: "Slow Horses" });
    const showB = makeShow({ id: 2, name: "Silo" });
    const showC = makeShow({ id: 3, name: "The Bear" });
    mockFollowedEpisodes({
      showsWithEpisodeToday: [
        { show: showA, episodes: [makeEpisode()] },
        { show: showB, episodes: [makeEpisode()] },
        { show: showC, episodes: [makeEpisode()] },
      ],
    });

    await render(<HomeScreen />);

    expect(screen.getAllByTestId("home-card")).toHaveLength(3);
    expect(screen.getByText("NEW TODAY · 1/3")).toBeTruthy();

    await fireEvent(screen.getByTestId("home-pager"), "momentumScrollEnd", {
      nativeEvent: {
        contentOffset: { x: 400 },
        layoutMeasurement: { width: 400 },
      },
    });

    expect(screen.getByText("NEW TODAY · 2/3")).toBeTruthy();
  });

  it("renders several episodes of one show on the same day as one card (FR-012)", async () => {
    const show = makeShow({ name: "The Bear" });
    const episodes = [1, 2, 3].map((number) => makeEpisode({ number }));
    mockFollowedEpisodes({
      showsWithEpisodeToday: [{ show, episodes }],
    });

    await render(<HomeScreen />);

    expect(screen.getAllByTestId("home-card")).toHaveLength(1);
    expect(screen.getByText("Episodes 1–3 · AMC")).toBeTruthy();
  });

  it("shows the next upcoming episode labelled with its day when today is empty (FR-006)", async () => {
    const show = makeShow({ name: "Silo" });
    const episode = makeEpisode({
      season: 2,
      number: 3,
      airstamp: "2026-09-22T18:00:00+00:00",
    });
    mockFollowedEpisodes({
      nextByShow: [{ showId: show.id, next: { kind: "episode", episode } }],
    });
    mockedUseShow.mockReturnValue({ data: show } as never);

    await render(<HomeScreen />);

    expect(screen.getByText("TOMORROW")).toBeTruthy();
    expect(screen.getByText("Silo")).toBeTruthy();
    expect(screen.getByText("S2E3 · AMC")).toBeTruthy();
  });

  it("shows Add your first show when the follow list is empty and opens Search (backlog CRI-66, PRD FR-013)", async () => {
    mockFollowedEpisodes({ followedCount: 0 });

    await render(<HomeScreen />);

    expect(screen.getByText("Add your first show")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: "Add your first show" }),
    );

    expect(mockPush).toHaveBeenCalledWith("/search");
  });

  it("shows a quiet line when followed shows exist but none has a known upcoming episode", async () => {
    mockFollowedEpisodes({
      followedCount: 2,
      nextByShow: [
        { showId: 1, next: { kind: "status", status: "Ended" } },
        { showId: 2, next: { kind: "status", status: "To Be Determined" } },
      ],
    });

    await render(<HomeScreen />);

    expect(screen.getByText("Nothing upcoming.")).toBeTruthy();
  });

  it("shows a quiet line while nothing has loaded yet, never a blank screen (NFR-001)", async () => {
    mockFollowedEpisodes({ isLoading: true });

    await render(<HomeScreen />);

    expect(screen.getByText("Loading your shows…")).toBeTruthy();
  });

  it("shows a quiet line on a fetch error instead of inventing a status (NFR-002)", async () => {
    mockFollowedEpisodes({ isError: true });

    await render(<HomeScreen />);

    expect(
      screen.getByText("Couldn't load your shows. Pull to refresh."),
    ).toBeTruthy();
  });
});

// Rendered through the Home tab's native header (`(tabs)/_layout.tsx`), not
// HomeScreen itself; see home-header.test.tsx for coverage of it actually
// appearing in the real navigation header.
describe("HomeHeaderAddButton (FR-007)", () => {
  it("opens Search when pressed", async () => {
    await render(<HomeHeaderAddButton />);

    fireEvent.press(screen.getByRole("button", { name: "Add show" }));

    expect(mockPush).toHaveBeenCalledWith("/search");
  });
});
