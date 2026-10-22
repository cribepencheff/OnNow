import { StyleSheet } from "react-native";
import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";

import { SearchResultRow } from "./SearchResultRow";
import { LARGE_POSTER } from "./ShowRow";
import { t } from "@/theme/tokens";
import { useShow } from "@/hooks/useShow";
import { useStreamingService } from "@/hooks/useStreamingService";
import { NOT_ON_TMDB } from "@/logic/streaming-service";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";
import type { TvMazeShow } from "@/api/tvmaze-types";

// The list poster (CRI-100): TVmaze's, as these rows had before; its TMDB
// lookup is tested in useListPoster.test.ts.
jest.mock("@/hooks/useListPoster", () => ({
  useListPoster: (show: { image?: { medium?: string | null } | null }) => ({
    uri: show.image?.medium ?? undefined,
    pending: false,
  }),
}));
jest.mock("@/hooks/useShow", () => ({
  useShow: jest.fn(),
}));
const mockToggle = jest.fn();
let mockFollowed = false;
jest.mock("@/hooks/useFollowList", () => ({
  useFollowToggle: () => ({ followed: mockFollowed, toggle: mockToggle }),
}));
jest.mock("@/hooks/useStreamingService", () => ({
  useStreamingService: jest.fn(),
}));

const mockedUseShow = useShow as jest.MockedFunction<typeof useShow>;
const mockedUseStreamingService = useStreamingService as jest.MockedFunction<
  typeof useStreamingService
>;

function mockProviders(data: unknown) {
  mockedUseStreamingService.mockReturnValue({
    data,
  } as unknown as ReturnType<typeof useStreamingService>);
}

// FR-024, FR-025, FR-027, PRD 5.4: result row content, the service slot and
// the after-follow status line.
describe("SearchResultRow", () => {
  const originalDateTimeFormat = Intl.DateTimeFormat;

  beforeEach(() => {
    mockedUseShow.mockReturnValue({ data: undefined } as never);
    mockProviders(undefined);
    mockToggle.mockClear();
    mockFollowed = false;
    // Fixed clock and time zone, so the next-line assertion below is exact
    // rather than dependent on the real date the test happens to run on.
    jest.useFakeTimers().setSystemTime(new Date("2026-09-01T00:00:00Z"));
    Intl.DateTimeFormat = ((...args: unknown[]) => {
      const format = new originalDateTimeFormat(
        ...(args as ConstructorParameters<typeof Intl.DateTimeFormat>),
      );
      return {
        ...format,
        // Kept, so code that formats dates still works.
        format: (date?: Date | number) => format.format(date),
        resolvedOptions: () => ({
          ...format.resolvedOptions(),
          timeZone: "UTC",
        }),
      };
    }) as typeof Intl.DateTimeFormat;
  });

  afterEach(() => {
    Intl.DateTimeFormat = originalDateTimeFormat;
    jest.useRealTimers();
  });

  // Owner, 2026-10-22: two lines about the show under the title again
  // (the MVP had dropped the PoC's summary).
  // Owner, 2026-10-22: no year and genres in the row (too much room);
  // Show detail's meta line has them.
  it("shows the title and two lines about the show; no year · genres, TVmaze status or network (PRD 5.4)", async () => {
    const show = showSlowHorsesFixture as unknown as TvMazeShow;

    await render(<SearchResultRow show={show} />);

    expect(screen.getByText("Slow Horses")).toBeTruthy();
    expect(screen.queryByText(/2022 · Drama/)).toBeNull();
    // Three lines (owner, 2026-10-22): room for them once year and genres
    // went, matching the poster's height.
    expect(
      screen.getByText(/Slow Horses follows the story/).props.numberOfLines,
    ).toBe(3);
    expect(screen.queryByText(/Running/)).toBeNull();
    expect(screen.queryByText("Apple TV")).toBeNull();
  });

  it("keeps the status line's space while the show lookup answers", async () => {
    const show = showSlowHorsesFixture as unknown as TvMazeShow;

    await render(<SearchResultRow show={show} />);

    expect(screen.getByTestId("search-result-status")).toHaveTextContent(/^$/);
  });

  // Owner, 2026-10-22: the show's status under the title; "Unavailable"
  // belongs with the services, at the bottom.
  it('shows the service, or plain "Unavailable", at the bottom (FR-027, CRI-97)', async () => {
    const show = showSlowHorsesFixture as unknown as TvMazeShow;
    mockProviders([{ providerId: 350, providerName: "Apple TV" }]);

    const { rerender } = await render(<SearchResultRow show={show} />);
    expect(screen.getByTestId("search-result-service")).toHaveTextContent(
      "On Apple TV",
    );

    mockProviders([]);
    await rerender(<SearchResultRow show={show} />);
    expect(screen.getByTestId("search-result-service")).toHaveTextContent(
      "Unavailable",
    );
    expect(
      screen.getByTestId("service-unavailable-dot", {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(screen.getByTestId("search-result-status")).toHaveTextContent(/^$/);
  });

  it("puts the status right under the title, and the services last", async () => {
    mockedUseShow.mockReturnValue({ data: showSlowHorsesFixture } as never);
    await render(
      <SearchResultRow show={showSlowHorsesFixture as unknown as TvMazeShow} />,
    );
    const order = screen
      .getByTestId("search-result-row-details")
      .children.map((child) =>
        typeof child === "string" ? child : child.props.testID,
      );
    // The status right under the title, in ink.
    expect(order.slice(0, 2)).toEqual([
      "search-result-row-title-row",
      "search-result-status",
    ]);
    expect(order[order.length - 1]).toBe("search-result-service");
    expect(
      StyleSheet.flatten(screen.getByTestId("search-result-status").props.style)
        .color,
    ).toBe(t.ink);
  });

  it("shows no service when TMDB does not know the show (CRI-102)", async () => {
    const show = showSlowHorsesFixture as unknown as TvMazeShow;
    mockProviders(NOT_ON_TMDB);

    await render(<SearchResultRow show={show} />);

    expect(screen.getByTestId("search-result-service")).toHaveTextContent(/^$/);
  });

  it.each([false, true])(
    "shows Show detail's status line whether followed or not (followed: %s, FR-025)",
    async (followed) => {
      mockFollowed = followed;
      mockedUseShow.mockReturnValue({
        data: showSlowHorsesFixture,
      } as never);
      const show = showSlowHorsesFixture as unknown as TvMazeShow;

      await render(<SearchResultRow show={show} />);

      // Season 6 episode 1 airs 2026-09-16, after season 5: a dated next
      // season as of the fixed 2026-09-01 clock above (PRD 5.5).
      expect(screen.getByText("Season 6 · Wed 16 Sep")).toBeTruthy();
      expect(mockedUseShow).toHaveBeenCalledWith(show.id);
    },
  );

  it("toggles follow when the follow circle is pressed", async () => {
    const show = showSlowHorsesFixture as unknown as TvMazeShow;

    await render(<SearchResultRow show={show} />);

    // The row itself is a button too (CRI-79), so the circle is found by
    // its own name.
    fireEvent.press(screen.getByRole("button", { name: "Follow" }));

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it("CRI-79: pressing the row opens Show detail and does not follow", async () => {
    const onPress = jest.fn();
    const show = showSlowHorsesFixture as unknown as TvMazeShow;

    await render(<SearchResultRow show={show} onPress={onPress} />);

    fireEvent.press(screen.getByTestId("search-result-row"));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(mockToggle).not.toHaveBeenCalled();
  });

  it("NFR-008: screen reader users can follow from the row's accessibility action", async () => {
    const show = showSlowHorsesFixture as unknown as TvMazeShow;

    await render(<SearchResultRow show={show} />);

    fireEvent(screen.getByTestId("search-result-row"), "accessibilityAction", {
      nativeEvent: { actionName: "toggleFollow" },
    });

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  // Owner, 2026-10-22: no IMDb rating in Search for now.
  it("shows no IMDb rating", async () => {
    await render(
      <SearchResultRow show={showSlowHorsesFixture as unknown as TvMazeShow} />,
    );
    expect(screen.queryByText("IMDb")).toBeNull();
  });

  // Owner, 2026-10-22: the poster cards' follow circle, exactly; a taller
  // poster for the taller row.
  it("follows from the poster cards' own circle", async () => {
    await render(
      <SearchResultRow show={showSlowHorsesFixture as unknown as TvMazeShow} />,
    );
    const circle = StyleSheet.flatten(
      screen.getByTestId(`follow-${showSlowHorsesFixture.id}-circle`).props
        .style,
    );
    expect(circle.backgroundColor).toBe(t.imageControlBackdrop);
    // A little smaller than the cards' 32 on the row's poster.
    expect(circle.width).toBe(28);
    expect(circle.borderColor).toBe(t.imageControlEdge);
    // On the poster, as on the cards.
    expect(
      within(
        screen.getByTestId("search-result-row-poster-accessory"),
      ).getByTestId(`follow-${showSlowHorsesFixture.id}`),
    ).toBeTruthy();
  });

  it("draws a taller poster than a Shows row's", async () => {
    await render(
      <SearchResultRow show={showSlowHorsesFixture as unknown as TvMazeShow} />,
    );
    const poster = StyleSheet.flatten(
      screen.getByTestId("search-result-row-poster").props.style,
    );
    expect(poster.width).toBe(LARGE_POSTER.width);
    expect(poster.height).toBe(LARGE_POSTER.height);
    expect(LARGE_POSTER.height).toBeGreaterThan(90);
  });
});
