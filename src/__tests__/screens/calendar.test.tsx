import { fireEvent, render, screen } from "@testing-library/react-native";

import CalendarScreen from "@/app/(tabs)/calendar";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useWeekStart } from "@/hooks/useWeekStart";
import type { TvMazeEpisode, TvMazeShowWithEmbeds } from "@/api/tvmaze-types";

jest.mock("@/hooks/useFollowedEpisodes", () => ({
  useFollowedEpisodes: jest.fn(),
}));
jest.mock("@/hooks/useToday", () => ({
  useToday: () => "2026-09-21",
}));
jest.mock("@/hooks/useWeekStart", () => ({
  useWeekStart: jest.fn(),
}));

const mockedUseFollowedEpisodes = useFollowedEpisodes as jest.MockedFunction<
  typeof useFollowedEpisodes
>;
const mockedUseWeekStart = useWeekStart as jest.MockedFunction<
  typeof useWeekStart
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

const refetch = jest.fn();

function mockFollowedEpisodes(
  overrides: Partial<ReturnType<typeof useFollowedEpisodes>>,
) {
  mockedUseFollowedEpisodes.mockReturnValue({
    isLoading: false,
    isRefetching: false,
    dataUpdatedAt: null,
    followedShows: [],
    showsWithEpisodeToday: [],
    nextByShow: [],
    refetch,
    ...overrides,
  });
}

// CRI-67 "done when": component tests cover marked days, an empty day and
// moving back to today.
describe("CalendarScreen", () => {
  beforeEach(() => {
    refetch.mockClear();
    mockedUseWeekStart.mockReturnValue(1); // Monday, as in Sweden
    mockFollowedEpisodes({});
  });

  it("marks a day with episodes and leaves other days unmarked (FR-008)", async () => {
    const show = makeShow({ name: "Silo" });
    const episode = makeEpisode({ airstamp: "2026-09-24T18:00:00+00:00" });
    mockFollowedEpisodes({ followedShows: [{ show, episodes: [episode] }] });

    await render(<CalendarScreen />);

    expect(
      screen.getByLabelText("September 24, 2026, has episodes"),
    ).toBeTruthy();
    expect(screen.getByLabelText("September 22, 2026")).toBeTruthy();
  });

  it("selects a day and lists its episodes (FR-009)", async () => {
    const show = makeShow({ name: "Silo" });
    const episode = makeEpisode({
      season: 2,
      number: 3,
      name: "Winter Light",
      airstamp: "2026-09-24T18:00:00+00:00",
    });
    mockFollowedEpisodes({ followedShows: [{ show, episodes: [episode] }] });

    await render(<CalendarScreen />);

    await fireEvent.press(
      screen.getByLabelText("September 24, 2026, has episodes"),
    );

    expect(screen.getAllByTestId("calendar-row")).toHaveLength(1);
    expect(screen.getByText("Silo")).toBeTruthy();
    expect(screen.getByText("S2E3 · Winter Light")).toBeTruthy();
  });

  it('shows "Nothing on this day" for a day with no episodes (FR-009)', async () => {
    await render(<CalendarScreen />);

    await fireEvent.press(screen.getByLabelText("September 22, 2026"));

    expect(screen.getByText("Nothing on this day.")).toBeTruthy();
  });

  it("shows several episodes of one show on one day as one row (FR-012)", async () => {
    const show = makeShow({ name: "The Bear" });
    const episodes = [1, 2, 3].map((number) =>
      makeEpisode({ number, airstamp: "2026-09-24T18:00:00+00:00" }),
    );
    mockFollowedEpisodes({ followedShows: [{ show, episodes }] });

    await render(<CalendarScreen />);

    await fireEvent.press(
      screen.getByLabelText("September 24, 2026, has episodes"),
    );

    expect(screen.getAllByTestId("calendar-row")).toHaveLength(1);
    expect(screen.getByText("Episodes 1–3")).toBeTruthy();
  });

  it("shows Today when moving away from today and returns to it when pressed (FR-036)", async () => {
    await render(<CalendarScreen />);

    expect(screen.queryByLabelText("Today")).toBeNull();

    await fireEvent.press(screen.getByLabelText("September 22, 2026"));

    expect(screen.getByLabelText("Today")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Today"));

    expect(screen.queryByLabelText("Today")).toBeNull();
    expect(
      screen.getByLabelText("September 21, 2026, today, selected"),
    ).toBeTruthy();
  });

  it("shows a quiet line instead of Nothing on this day while nothing has loaded yet (NFR-001)", async () => {
    mockFollowedEpisodes({ isLoading: true });

    await render(<CalendarScreen />);

    expect(screen.getByText("Loading your episodes…")).toBeTruthy();
    expect(screen.queryByText("Nothing on this day.")).toBeNull();
  });

  it("swipes to the next month and shows Today (FR-036)", async () => {
    await render(<CalendarScreen />);

    expect(screen.getByText("September 2026")).toBeTruthy();
    expect(screen.queryByLabelText("Today")).toBeNull();

    await fireEvent(screen.getByTestId("calendar-pager"), "momentumScrollEnd", {
      nativeEvent: {
        contentOffset: { x: 800 },
        layoutMeasurement: { width: 400 },
      },
    });

    expect(screen.getByText("October 2026")).toBeTruthy();
    expect(screen.getByLabelText("Today")).toBeTruthy();
  });

  it("starts the grid on Monday when the locale is Monday-first (PRD 5.7)", async () => {
    mockedUseWeekStart.mockReturnValue(1);

    await render(<CalendarScreen />);

    const labels = screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/);
    expect(labels[0].props.children).toBe("Mon");
  });

  it("starts the grid on Sunday when the locale is Sunday-first", async () => {
    mockedUseWeekStart.mockReturnValue(0);

    await render(<CalendarScreen />);

    const labels = screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/);
    expect(labels[0].props.children).toBe("Sun");
  });
});
