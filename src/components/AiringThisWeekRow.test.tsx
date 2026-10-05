import { fireEvent, render, screen } from "@testing-library/react-native";

import { AiringThisWeekRow } from "./AiringThisWeekRow";

const mockRefresh = jest.fn();
let mockRow = { canRefresh: true, isRefreshing: false };
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
    ...mockRow,
  }),
}));
jest.mock("@/hooks/useFollowList", () => ({
  useFollowToggle: () => ({ followed: false, toggle: jest.fn() }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

// CRI-123: the same Refresh as "Top picks for you", only while shows are
// left for the week.
describe("AiringThisWeekRow Refresh (FR-039, CRI-123)", () => {
  beforeEach(() => {
    mockRefresh.mockClear();
    mockRow = { canRefresh: true, isRefreshing: false };
  });

  it("shows Refresh while shows are left, and asks for the next ones", async () => {
    await render(<AiringThisWeekRow />);

    await fireEvent.press(screen.getByRole("button", { name: "Refresh" }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("hides Refresh when no shows are left for the week", async () => {
    mockRow = { canRefresh: false, isRefreshing: false };
    await render(<AiringThisWeekRow />);

    expect(screen.getByText("Lanterns")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
  });

  it("is busy, not pressable, while the next shows load", async () => {
    mockRow = { canRefresh: true, isRefreshing: true };
    await render(<AiringThisWeekRow />);

    await fireEvent.press(screen.getByRole("button", { name: "Refresh" }));
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
