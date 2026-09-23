import { fireEvent, render, screen } from "@testing-library/react-native";

import { SearchResultRow } from "./SearchResultRow";
import { useShow } from "@/hooks/useShow";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";
import type { TvMazeShow } from "@/api/tvmaze-types";

jest.mock("@/hooks/useShow", () => ({
  useShow: jest.fn(),
}));

const mockedUseShow = useShow as jest.MockedFunction<typeof useShow>;

// FR-024, FR-025, PRD 5.4: result row content and the after-follow next line.
describe("SearchResultRow", () => {
  const originalDateTimeFormat = Intl.DateTimeFormat;

  beforeEach(() => {
    mockedUseShow.mockReturnValue({ data: undefined } as never);
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

  it("shows the title, meta line, network and summary before following", async () => {
    const show = showSlowHorsesFixture as unknown as TvMazeShow;

    await render(
      <SearchResultRow
        show={show}
        followed={false}
        onToggleFollow={jest.fn()}
      />,
    );

    expect(screen.getByText("Slow Horses")).toBeTruthy();
    expect(screen.getByText("2022 · Running")).toBeTruthy();
    expect(screen.getByText("Apple TV")).toBeTruthy();
    expect(screen.getByText(/Slow Horses follows the story/)).toBeTruthy();
  });

  it("shows the next episode line instead of the summary once followed", async () => {
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

    expect(screen.queryByText(/Slow Horses follows the story/)).toBeNull();
    // Season 6 episode 1 ("Circle of Life") airs 2026-09-16, the earliest
    // upcoming episode as of the fixed 2026-09-01 clock above.
    expect(screen.getByText("Next: Wed 16 Sep")).toBeTruthy();
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

    fireEvent.press(screen.getByRole("button"));

    expect(onToggleFollow).toHaveBeenCalledTimes(1);
  });
});
