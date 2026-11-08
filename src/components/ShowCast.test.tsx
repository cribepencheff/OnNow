import { render, screen, within } from "@testing-library/react-native";

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
    await render(<ShowCast showId={45039} />);

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

  it("shows the name alone without a character (data first)", async () => {
    mockedUseShowCast.mockReturnValue({
      data: [{ personId: 1, name: "A Host", imageUrl: null, character: null }],
    });
    await render(<ShowCast showId={1} />);
    expect(screen.getByLabelText("A Host")).toBeTruthy();
  });

  it("shows no row without a cast, while loading or on an error", async () => {
    mockedUseShowCast.mockReturnValue({ data: [] });
    await render(<ShowCast showId={1} />);
    expect(screen.queryByTestId("show-detail-cast")).toBeNull();
    await screen.unmount();

    mockedUseShowCast.mockReturnValue({ data: undefined });
    await render(<ShowCast showId={1} />);
    expect(screen.queryByTestId("show-detail-cast")).toBeNull();
  });
});
