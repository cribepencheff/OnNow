import { render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { useShowCast } from "@/hooks/useShowCast";
import { ShowCast } from "./ShowCast";

jest.mock("@/hooks/useShowCast", () => ({ useShowCast: jest.fn() }));
const mockedUseShowCast = useShowCast as jest.Mock;

// CRI-143, owner 2026-11-08: Show detail's Cast row, from TVmaze.
describe("ShowCast (CRI-143)", () => {
  it("lists each cast member with portrait, name and character, in TVmaze's order", async () => {
    mockedUseShowCast.mockReturnValue({
      data: [
        {
          personId: 1,
          name: "Gary Oldman",
          imageUrl: "oldman.jpg",
          character: "Jackson Lamb",
        },
        {
          personId: 2,
          name: "Jack Lowden",
          imageUrl: null,
          character: "River Cartwright",
        },
      ],
    });
    await render(<ShowCast showId={45039} creators={[]} />);

    const row = within(screen.getByTestId("show-detail-cast"));
    expect(row.getByRole("header", { name: "Cast" })).toBeTruthy();
    const members = row.getAllByLabelText(/, /);
    expect(members.map((m) => m.props.accessibilityLabel)).toEqual([
      "Gary Oldman, Jackson Lamb",
      "Jack Lowden, River Cartwright",
    ]);
    // A portrait only where TVmaze has one.
    expect(row.getAllByTestId("cast-portrait")).toHaveLength(1);
  });

  it("adds TMDB's creators after the cast, as Cast & Crew", async () => {
    mockedUseShowCast.mockReturnValue({
      data: [
        {
          personId: 1,
          name: "Kim You-jung",
          imageUrl: "kim.jpg",
          character: "Lee Ga-kyung",
        },
      ],
    });
    await render(
      <ShowCast
        showId={90249}
        creators={[
          { name: "Ryu Bo-ri", profilePath: "/ryu.jpg" },
          { name: "Yoo In-sik", profilePath: null },
        ]}
      />,
    );
    const row = within(screen.getByTestId("show-detail-cast"));
    expect(row.getByRole("header", { name: "Cast & Crew" })).toBeTruthy();
    expect(
      row.getAllByLabelText(/, /).map((m) => m.props.accessibilityLabel),
    ).toEqual([
      "Kim You-jung, Lee Ga-kyung",
      "Ryu Bo-ri, Creator",
      "Yoo In-sik, Creator",
    ]);
    expect(
      JSON.stringify(row.getAllByTestId("cast-portrait")[1].props.source),
    ).toContain("/w185/ryu.jpg");
  });

  it("shows the creators alone when TVmaze lists no cast", async () => {
    mockedUseShowCast.mockReturnValue({ data: [] });
    await render(
      <ShowCast
        showId={1}
        creators={[{ name: "A Creator", profilePath: null }]}
      />,
    );
    expect(screen.getByLabelText("A Creator, Creator")).toBeTruthy();
  });

  it("fits three people across and a fourth at the edge", async () => {
    mockedUseShowCast.mockReturnValue({
      data: [{ personId: 1, name: "A", imageUrl: null, character: "B" }],
    });
    await render(<ShowCast showId={1} creators={[]} />);
    const item = screen.getByLabelText("A, B");
    const width = StyleSheet.flatten(item.props.style).width as number;
    // 750 wide in Jest: (750 - 24) / 3.4 - 12.
    expect(width).toBe(Math.floor((750 - 24) / 3.4 - 12));
  });

  it("shows the name alone without a character (data first)", async () => {
    mockedUseShowCast.mockReturnValue({
      data: [{ personId: 1, name: "A Host", imageUrl: null, character: null }],
    });
    await render(<ShowCast showId={1} creators={[]} />);
    expect(screen.getByLabelText("A Host")).toBeTruthy();
  });

  it("shows no row without a cast, while loading or on an error", async () => {
    mockedUseShowCast.mockReturnValue({ data: [] });
    await render(<ShowCast showId={1} creators={[]} />);
    expect(screen.queryByTestId("show-detail-cast")).toBeNull();
    await screen.unmount();

    mockedUseShowCast.mockReturnValue({ data: undefined });
    await render(<ShowCast showId={1} creators={[]} />);
    expect(screen.queryByTestId("show-detail-cast")).toBeNull();
  });
});
