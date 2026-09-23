import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";

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

// react-native-calendars' CalendarList moves months by a real swipe gesture,
// tracked through FlatList's viewability config. RNTL has no real layout
// engine, so a synthetic scroll event never triggers it (the same class of
// limitation as RefreshControl's pull-to-refresh elsewhere in this app).
// The real component still renders (marking, day press, week start and the
// day list are all tested against it directly), but this wrapper adds one
// extra, test-only Pressable that calls the same onMonthChange prop the
// library would call on a real swipe, so the "Today" button's reaction to a
// month change can still be verified.
jest.mock("react-native-calendars", () => {
  const actual = jest.requireActual("react-native-calendars");
  const { Fragment, createElement } = jest.requireActual("react");
  const { Pressable } = jest.requireActual("react-native");
  return {
    ...actual,
    CalendarList: (props: {
      current?: string;
      onMonthChange?: (date: unknown) => void;
    }) => {
      const nextMonth = () => {
        const [year, month] = (props.current ?? "2026-09-01")
          .split("-")
          .map(Number);
        const next =
          month === 12
            ? { year: year + 1, month: 1 }
            : { year, month: month + 1 };
        props.onMonthChange?.({
          ...next,
          day: 1,
          dateString: `${next.year}-${String(next.month).padStart(2, "0")}-01`,
          timestamp: 0,
        });
      };
      return createElement(
        Fragment,
        null,
        createElement(actual.CalendarList, props),
        createElement(Pressable, {
          testID: "test-only-next-month",
          onPress: nextMonth,
        }),
      );
    },
  };
});

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

  it("moves to the next month and shows Today (FR-036)", async () => {
    await render(<CalendarScreen />);

    // Scoped to the static header: react-native-calendars also renders a
    // (hidden, covered) header per buffered month item, which would
    // otherwise make "September 2026" ambiguous.
    const header = () =>
      within(
        screen.getByTestId("calendar-grid.staticHeader", { hidden: true }),
      );

    expect(header().getByText("September 2026", { hidden: true })).toBeTruthy();
    expect(screen.queryByLabelText("Today")).toBeNull();

    // See the react-native-calendars mock above: this calls the same
    // onMonthChange prop a real swipe would.
    await fireEvent.press(screen.getByTestId("test-only-next-month"));

    expect(header().getByText("October 2026", { hidden: true })).toBeTruthy();
    expect(screen.getByLabelText("Today")).toBeTruthy();
  });

  it("starts the grid on Monday when the locale is Monday-first (PRD 5.7)", async () => {
    mockedUseWeekStart.mockReturnValue(1);

    await render(<CalendarScreen />);

    // The weekday row lives in react-native-calendars' static header, which
    // is one accessibility-hidden "adjustable" control by design (see the
    // note above): the labels are real, visible text, just not queryable
    // without hidden: true.
    const labels = screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/, {
      hidden: true,
    });
    expect(labels[0].props.children).toBe("Mon");
  });

  it("starts the grid on Sunday when the locale is Sunday-first", async () => {
    mockedUseWeekStart.mockReturnValue(0);

    await render(<CalendarScreen />);

    const labels = screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/, {
      hidden: true,
    });
    expect(labels[0].props.children).toBe("Sun");
  });

  it("renders exactly one weekday header row, via the library's static header (CRI-76 review)", async () => {
    await render(<CalendarScreen />);

    expect(
      screen.getAllByTestId("calendar-grid.staticHeader", { hidden: true }),
    ).toHaveLength(1);
    expect(
      screen.getAllByTestId("calendar-grid.staticHeader.dayNames", {
        hidden: true,
      }),
    ).toHaveLength(1);
  });

  it("does not render month navigation arrows (CRI-76 review)", async () => {
    await render(<CalendarScreen />);

    expect(
      screen.queryByTestId("calendar-grid.header.leftArrow", {
        hidden: true,
      }),
    ).toBeNull();
    expect(
      screen.queryByTestId("calendar-grid.header.rightArrow", {
        hidden: true,
      }),
    ).toBeNull();
  });
});
