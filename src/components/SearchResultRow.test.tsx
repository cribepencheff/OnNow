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
  beforeEach(() => {
    mockedUseShow.mockReturnValue({ data: undefined } as never);
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
    expect(screen.getByText(/^(New today|Next:|No date yet)/)).toBeTruthy();
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
