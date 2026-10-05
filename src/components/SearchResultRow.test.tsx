import { fireEvent, render, screen } from "@testing-library/react-native";

import { SearchResultRow } from "./SearchResultRow";
import { useShow } from "@/hooks/useShow";
import { useStreamingService } from "@/hooks/useStreamingService";
import { NOT_ON_TMDB } from "@/logic/streaming-service";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";
import type { TvMazeShow } from "@/api/tvmaze-types";

jest.mock("@/hooks/useShow", () => ({
  useShow: jest.fn(),
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
    // Fixed clock and time zone, so the next-line assertion below is exact
    // rather than dependent on the real date the test happens to run on.
    jest.useFakeTimers().setSystemTime(new Date("2026-09-01T00:00:00Z"));
    Intl.DateTimeFormat = ((...args: unknown[]) => {
      const format = new originalDateTimeFormat(
        ...(args as ConstructorParameters<typeof Intl.DateTimeFormat>),
      );
      return {
        ...format,
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

  it("shows the title and year · genres, no summary, status or network (PRD 5.4)", async () => {
    const show = showSlowHorsesFixture as unknown as TvMazeShow;

    await render(
      <SearchResultRow
        show={show}
        followed={false}
        onToggleFollow={jest.fn()}
      />,
    );

    expect(screen.getByText("Slow Horses")).toBeTruthy();
    expect(screen.getByText("2022 · Drama, Thriller, Espionage")).toBeTruthy();
    expect(screen.queryByText(/Slow Horses follows the story/)).toBeNull();
    expect(screen.queryByText(/Running/)).toBeNull();
    expect(screen.queryByText("Apple TV")).toBeNull();
    expect(screen.queryByTestId("search-result-status")).toBeNull();
  });

  it('shows the service, or plain "Unavailable" without the region (FR-027, CRI-97)', async () => {
    const show = showSlowHorsesFixture as unknown as TvMazeShow;
    mockProviders([{ providerId: 350, providerName: "Apple TV" }]);

    const { rerender } = await render(
      <SearchResultRow
        show={show}
        followed={false}
        onToggleFollow={jest.fn()}
      />,
    );
    expect(screen.getByText("On Apple TV")).toBeTruthy();

    mockProviders([]);
    await rerender(
      <SearchResultRow
        show={show}
        followed={false}
        onToggleFollow={jest.fn()}
      />,
    );
    expect(screen.getByText("Unavailable")).toBeTruthy();
  });

  it("shows no service when TMDB does not know the show (CRI-102)", async () => {
    const show = showSlowHorsesFixture as unknown as TvMazeShow;
    mockProviders(NOT_ON_TMDB);

    await render(
      <SearchResultRow
        show={show}
        followed={false}
        onToggleFollow={jest.fn()}
      />,
    );

    expect(screen.getByTestId("search-result-service").props.children).toBe("");
  });

  it("shows Show detail's status line once followed (FR-025)", async () => {
    mockedUseShow.mockReturnValue({
      data: showSlowHorsesFixture,
    } as never);
    const show = showSlowHorsesFixture as unknown as TvMazeShow;

    await render(
      <SearchResultRow
        show={show}
        followed={true}
        onToggleFollow={jest.fn()}
      />,
    );

    // Season 6 episode 1 airs 2026-09-16, after season 5: a dated next
    // season as of the fixed 2026-09-01 clock above (PRD 5.5).
    expect(screen.getByText("Season 6 · Wed 16 Sep")).toBeTruthy();
  });

  it("calls onToggleFollow when the follow circle is pressed", async () => {
    const onToggleFollow = jest.fn();
    const show = showSlowHorsesFixture as unknown as TvMazeShow;

    await render(
      <SearchResultRow
        show={show}
        followed={false}
        onToggleFollow={onToggleFollow}
      />,
    );

    // The row itself is a button too (CRI-79), so the circle is found by
    // its own name.
    fireEvent.press(screen.getByRole("button", { name: "Follow" }));

    expect(onToggleFollow).toHaveBeenCalledTimes(1);
  });

  it("CRI-79: pressing the row opens Show detail and does not follow", async () => {
    const onToggleFollow = jest.fn();
    const onPress = jest.fn();
    const show = showSlowHorsesFixture as unknown as TvMazeShow;

    await render(
      <SearchResultRow
        show={show}
        followed={false}
        onToggleFollow={onToggleFollow}
        onPress={onPress}
      />,
    );

    fireEvent.press(screen.getByTestId("search-result-row"));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onToggleFollow).not.toHaveBeenCalled();
  });

  it("NFR-008: screen reader users can follow from the row's accessibility action", async () => {
    const onToggleFollow = jest.fn();
    const show = showSlowHorsesFixture as unknown as TvMazeShow;

    await render(
      <SearchResultRow
        show={show}
        followed={false}
        onToggleFollow={onToggleFollow}
      />,
    );

    fireEvent(screen.getByTestId("search-result-row"), "accessibilityAction", {
      nativeEvent: { actionName: "toggleFollow" },
    });

    expect(onToggleFollow).toHaveBeenCalledTimes(1);
  });
});
