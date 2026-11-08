import { render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { useShowCast } from "@/hooks/useShowCast";
import { ShowCast } from "./ShowCast";

jest.mock("@/hooks/useShowCast", () => ({ useShowCast: jest.fn() }));
const mockedUseShowCast = useShowCast as jest.Mock;

const TVMAZE_CAST = [
  {
    personId: 1,
    name: "Gary Oldman",
    imageUrl: "tvmaze-oldman.jpg",
    character: "Jackson Lamb",
  },
];
const TMDB_CAST = [
  { name: "Gary Oldman", character: "Jackson Lamb", profilePath: "/go.jpg" },
  { name: "Jack Lowden", character: "River Cartwright", profilePath: null },
];

function labels() {
  return within(screen.getByTestId("show-detail-cast"))
    .getAllByLabelText(/, /)
    .map((m) => m.props.accessibilityLabel);
}

// CRI-143, owner 2026-11-08: Show detail's Cast & Crew row.
describe("ShowCast (CRI-143)", () => {
  beforeEach(() => mockedUseShowCast.mockReturnValue({ data: TVMAZE_CAST }));

  it("shows TMDB's cast with its portraits, and does not ask TVmaze", async () => {
    await render(
      <ShowCast showId={45039} tmdbCast={TMDB_CAST} creators={[]} crew={[]} />,
    );
    const row = within(screen.getByTestId("show-detail-cast"));
    expect(row.getByRole("header", { name: "Cast & Crew" })).toBeTruthy();
    expect(labels()).toEqual([
      "Gary Oldman, Jackson Lamb",
      "Jack Lowden, River Cartwright",
    ]);
    expect(
      JSON.stringify(row.getAllByTestId("cast-portrait")[0].props.source),
    ).toContain("/w185/go.jpg");
    expect(mockedUseShowCast).toHaveBeenLastCalledWith(45039, false);
  });

  it("falls back to TVmaze's cast when TMDB lists none", async () => {
    await render(
      <ShowCast showId={45039} tmdbCast={[]} creators={[]} crew={[]} />,
    );
    expect(mockedUseShowCast).toHaveBeenLastCalledWith(45039, true);
    expect(labels()).toEqual(["Gary Oldman, Jackson Lamb"]);
  });

  it("does not ask TVmaze while TMDB's answer is on its way", async () => {
    mockedUseShowCast.mockReturnValue({ data: undefined });
    await render(
      <ShowCast showId={45039} tmdbCast={undefined} creators={[]} crew={[]} />,
    );
    expect(mockedUseShowCast).toHaveBeenLastCalledWith(45039, false);
    expect(screen.queryByTestId("show-detail-cast")).toBeNull();
  });

  it("adds TMDB's creators and key crew after the cast", async () => {
    await render(
      <ShowCast
        showId={90249}
        tmdbCast={TMDB_CAST}
        creators={[{ name: "Ryu Bo-ri", profilePath: null }]}
        crew={[
          {
            name: "Pat Producer",
            job: "Executive Producer",
            profilePath: null,
          },
        ]}
      />,
    );
    expect(labels()).toEqual([
      "Gary Oldman, Jackson Lamb",
      "Jack Lowden, River Cartwright",
      "Ryu Bo-ri, Creator",
      "Pat Producer, Executive Producer",
    ]);
  });

  it("fits three people across and a fourth at the edge", async () => {
    await render(
      <ShowCast showId={1} tmdbCast={TMDB_CAST} creators={[]} crew={[]} />,
    );
    const item = screen.getByLabelText("Gary Oldman, Jackson Lamb");
    // 750 wide in Jest: (750 - 24) / 3.4 - 12.
    expect(StyleSheet.flatten(item.props.style).width).toBe(
      Math.floor((750 - 24) / 3.4 - 12),
    );
  });

  it("draws initials where there is no portrait", async () => {
    await render(
      <ShowCast showId={1} tmdbCast={TMDB_CAST} creators={[]} crew={[]} />,
    );
    const lowden = within(
      screen.getByLabelText("Jack Lowden, River Cartwright"),
    );
    expect(
      lowden.getByTestId("cast-initials", { includeHiddenElements: true }),
    ).toHaveTextContent("JL");
  });

  it("shows no row with no one", async () => {
    mockedUseShowCast.mockReturnValue({ data: [] });
    await render(<ShowCast showId={1} tmdbCast={[]} creators={[]} crew={[]} />);
    expect(screen.queryByTestId("show-detail-cast")).toBeNull();
  });
});
