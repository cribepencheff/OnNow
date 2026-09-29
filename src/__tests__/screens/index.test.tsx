import { fireEvent, render, screen } from "@testing-library/react-native";

import HomeScreen, { HomeHeaderAddButton } from "@/app/(tabs)/index";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import type { TvMazeEpisode, TvMazeShowWithEmbeds } from "@/api/tvmaze-types";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/hooks/useFollowedEpisodes", () => ({
  useFollowedEpisodes: jest.fn(),
}));
jest.mock("@/hooks/useToday", () => ({
  useToday: () => "2026-09-21",
}));
jest.mock("@/hooks/useShowImages", () => ({
  useShowImages: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
}));
jest.mock("@/hooks/useEpisodeStill", () => ({
  useEpisodeStill: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
}));
jest.mock("@/hooks/useSwedishService", () => ({
  useSwedishService: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
}));

const mockedUseFollowedEpisodes = useFollowedEpisodes as jest.MockedFunction<
  typeof useFollowedEpisodes
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
    // followedShows (used by the hero's findHeroSlides) needs
    // TvMazeShowWithEmbeds, unlike the old showsWithEpisodeToday/
    // nextDayEpisodes fields, which only need TvMazeShow.
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
    followedShows: [],
    showsWithEpisodeToday: [],
    nextDayEpisodes: null,
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
  });

  it("renders one card when one followed show has an episode today (FR-004)", async () => {
    const show = makeShow({ name: "Slow Horses" });
    const episode = makeEpisode();
    mockFollowedEpisodes({
      followedShows: [{ show, episodes: [episode] }],
    });

    await render(<HomeScreen />);

    expect(screen.getByTestId("home-pager")).toBeTruthy();
    expect(screen.getByText("TODAY · 1/1")).toBeTruthy();
    expect(screen.getByText("Slow Horses")).toBeTruthy();
    expect(screen.getByText("MON 21 SEP · S1E1 · Episode")).toBeTruthy();
  });

  it("renders several cards with paging and a count label when several shows have an episode today (FR-004, FR-005)", async () => {
    const showA = makeShow({ id: 1, name: "Slow Horses" });
    const showB = makeShow({ id: 2, name: "Silo" });
    const showC = makeShow({ id: 3, name: "The Bear" });
    mockFollowedEpisodes({
      followedShows: [
        { show: showA, episodes: [makeEpisode()] },
        { show: showB, episodes: [makeEpisode()] },
        { show: showC, episodes: [makeEpisode()] },
      ],
    });

    await render(<HomeScreen />);

    expect(screen.getByText("TODAY · 1/3")).toBeTruthy();
    expect(screen.getByText("Slow Horses")).toBeTruthy();

    // The pager loops (loopSlideData): logical slide 0 lives at physical
    // slot 1, so settling on physical slot 2 (contentOffset.x = 2 *
    // layoutMeasurement.width) is logical slide 1, the second show.
    await fireEvent(screen.getByTestId("home-pager"), "momentumScrollEnd", {
      nativeEvent: {
        contentOffset: { x: 800 },
        layoutMeasurement: { width: 400 },
      },
    });

    expect(screen.getByText("TODAY · 2/3")).toBeTruthy();
    expect(screen.getByText("Silo")).toBeTruthy();
  });

  // The hero's 7-day horizon deliberately does not group same-day episodes
  // of one show into one slide the way the Home card's meta line used to
  // (logic/hero-carousel.ts's findHeroSlides: "never a same-show/same-day
  // range... a show with two episodes on one day within the horizon gets
  // two slides, not one grouped slide", from the original horizon commit).
  // This replaces the old grouped-card scenario with the hero's actual,
  // deliberately different behaviour for this same input; it is not a
  // regression. FR-012 grouping still applies where it always did outside
  // the hero: the next-day fallback pager (see the next-day version of
  // this test below, still grouped) and Show detail's season-drop
  // handling (logic/show-detail.ts, untouched by this branch).
  it("shows one slide per episode, not a grouped card, for several same-day episodes of one show on the hero (FR-012 does not apply to the 7-day horizon)", async () => {
    const show = makeShow({ name: "The Bear" });
    const episodes = [1, 2, 3].map((number) => makeEpisode({ number }));
    mockFollowedEpisodes({
      followedShows: [{ show, episodes }],
    });

    await render(<HomeScreen />);

    expect(screen.getByText("TODAY · 1/3")).toBeTruthy();
    expect(screen.getByText("MON 21 SEP · S1E1 · Episode")).toBeTruthy();

    await fireEvent(screen.getByTestId("home-pager"), "momentumScrollEnd", {
      nativeEvent: {
        contentOffset: { x: 800 },
        layoutMeasurement: { width: 400 },
      },
    });

    expect(screen.getByText("TODAY · 2/3")).toBeTruthy();
    expect(screen.getByText("MON 21 SEP · S1E2 · Episode")).toBeTruthy();
  });

  it("shows one card labelled TOMORROW · 1/1 when one show releases on the next day with episodes (FR-006)", async () => {
    const show = makeShow({ name: "Silo" });
    const episode = makeEpisode({
      season: 2,
      number: 3,
      airstamp: "2026-09-22T18:00:00+00:00",
    });
    mockFollowedEpisodes({
      nextDayEpisodes: {
        localDate: "2026-09-22",
        shows: [{ show, episodes: [episode] }],
      },
    });

    await render(<HomeScreen />);

    expect(screen.getByTestId("home-pager")).toBeTruthy();
    expect(screen.getByText("TOMORROW · 1/1")).toBeTruthy();
    expect(screen.getByText("Silo")).toBeTruthy();
    // Network dropped from the meta line (94e72ad: "the network
    // contradicted the Open in button... the episode itself, not the
    // network, goes here instead").
    expect(screen.getByText("TUE 22 SEP · S2E3 · Episode")).toBeTruthy();
  });

  it("shows two cards labelled TOMORROW · 1/2 and 2/2 when two shows release on the next day with episodes (FR-006)", async () => {
    const showA = makeShow({ id: 1, name: "Slow Horses" });
    const showB = makeShow({ id: 2, name: "Silo" });
    const episodeA = makeEpisode({ airstamp: "2026-09-22T18:00:00+00:00" });
    const episodeB = makeEpisode({ airstamp: "2026-09-22T20:00:00+00:00" });
    mockFollowedEpisodes({
      nextDayEpisodes: {
        localDate: "2026-09-22",
        shows: [
          { show: showA, episodes: [episodeA] },
          { show: showB, episodes: [episodeB] },
        ],
      },
    });

    await render(<HomeScreen />);

    expect(screen.getByText("TOMORROW · 1/2")).toBeTruthy();
    expect(screen.getByText("Slow Horses")).toBeTruthy();

    // See the "renders several cards with paging" test above for why
    // settling at physical slot 2 (not 1) lands on logical slide 1.
    await fireEvent(screen.getByTestId("home-pager"), "momentumScrollEnd", {
      nativeEvent: {
        contentOffset: { x: 800 },
        layoutMeasurement: { width: 400 },
      },
    });

    expect(screen.getByText("TOMORROW · 2/2")).toBeTruthy();
    expect(screen.getByText("Silo")).toBeTruthy();
  });

  it("labels the next day with episodes by its date, not TOMORROW, when it is further away (FR-006)", async () => {
    const show = makeShow({ name: "Silo" });
    const episode = makeEpisode({ airstamp: "2026-09-24T18:00:00+00:00" });
    mockFollowedEpisodes({
      nextDayEpisodes: {
        localDate: "2026-09-24",
        shows: [{ show, episodes: [episode] }],
      },
    });

    await render(<HomeScreen />);

    expect(screen.getByText("UPCOMING · 1/1")).toBeTruthy();
    expect(screen.getByText("THU 24 SEP · S1E1 · Episode")).toBeTruthy();
  });

  // Unlike the hero's own 7-day horizon (see the FR-012-does-not-apply test
  // above), the next-day fallback pager still uses the old, pre-grouped
  // ShowEpisodesToday shape (findNextDayWithEpisodes /
  // findShowsWithEpisodeToday, logic/home.ts and episodes-today.ts, both
  // untouched by this branch): several same-day episodes of one show are
  // still one HeroSlide with several episodes, not split. FR-012 grouping
  // is intact here.
  it("shows several episodes of one show on the next day as one card (FR-012)", async () => {
    const show = makeShow({ name: "The Bear" });
    const episodes = [1, 2, 3].map((number) =>
      makeEpisode({ number, airstamp: "2026-09-22T18:00:00+00:00" }),
    );
    mockFollowedEpisodes({
      nextDayEpisodes: {
        localDate: "2026-09-22",
        shows: [{ show, episodes }],
      },
    });

    await render(<HomeScreen />);

    expect(screen.getByText("TOMORROW · 1/1")).toBeTruthy();
    expect(screen.getByText("TUE 22 SEP · Episodes 1–3")).toBeTruthy();
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
      nextDayEpisodes: null,
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
// HomeScreen itself. (No longer covered by a real-navigation-header test:
// the "+" button this exercised was removed from Home, 86d0a4a. This
// component itself is now unused by the app and untested elsewhere; kept
// here since it still exports cleanly and nothing has asked for its
// removal yet.)
describe("HomeHeaderAddButton (FR-007)", () => {
  it("opens Search when pressed", async () => {
    await render(<HomeHeaderAddButton />);

    fireEvent.press(screen.getByRole("button", { name: "Add show" }));

    expect(mockPush).toHaveBeenCalledWith("/search");
  });
});
