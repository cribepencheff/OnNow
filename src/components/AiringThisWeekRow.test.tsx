import { fireEvent, render, screen } from "@testing-library/react-native";

import { AiringThisWeekRow } from "./AiringThisWeekRow";

const mockRefresh = jest.fn();
let mockRow: {
  cards?: unknown[];
  control: "refresh" | "startOver";
  isRefreshing: boolean;
  allFollowed?: boolean;
} = { control: "refresh", isRefreshing: false };
jest.mock("@/hooks/useAiringThisWeek", () => ({
  useAiringThisWeek: () => ({
    cards: [
      {
        tmdbId: 1,
        tvmazeId: 1001,
        name: "Lanterns",
        posterPath: "/p1.jpg",
        day: "Today",
        date: "2026-10-05",
      },
    ],
    isLoading: false,
    refresh: mockRefresh,
    allFollowed: false,
    batch: 0,
    ...mockRow,
  }),
}));
jest.mock("@/hooks/useFollowList", () => ({
  useFollowToggle: () => ({ followed: false, toggle: jest.fn() }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

// CRI-123: the same control as "Top picks for you": Refresh while shows
// are left, Start over at the end, never gone.
describe("AiringThisWeekRow Refresh (FR-039, CRI-123)", () => {
  beforeEach(() => {
    mockRefresh.mockClear();
    mockRow = { control: "refresh", isRefreshing: false };
  });

  it("shows Refresh while shows are left, and asks for the next ones", async () => {
    await render(<AiringThisWeekRow />);

    await fireEvent.press(screen.getByRole("button", { name: "Refresh" }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('reads "Start over" at the end of the week\'s shows, in the same slot', async () => {
    mockRow = { control: "startOver", isRefreshing: false };
    await render(<AiringThisWeekRow />);

    expect(screen.getByText("Lanterns")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Start over" }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('says "That\'s all this week" only when every show is followed, keeping Start over', async () => {
    mockRow = {
      cards: [],
      control: "startOver",
      isRefreshing: false,
      allFollowed: true,
    };
    await render(<AiringThisWeekRow />);

    expect(screen.getByText("That's all this week")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start over" })).toBeTruthy();
  });

  it("is busy, not pressable, while the next shows load", async () => {
    mockRow = { control: "refresh", isRefreshing: true };
    await render(<AiringThisWeekRow />);

    await fireEvent.press(screen.getByRole("button", { name: "Refresh" }));
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
