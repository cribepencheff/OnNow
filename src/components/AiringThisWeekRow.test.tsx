import { fireEvent, render, screen } from "@testing-library/react-native";

import { AiringThisWeekRow } from "./AiringThisWeekRow";

const mockLoadMore = jest.fn();
let mockRow: {
  isLoadingMore?: boolean;
  allFollowed?: boolean;
  cards?: unknown[];
} = {};
// Ten cards: a strip longer than the screen.
const tenCards = Array.from({ length: 10 }, (_, i) => ({
  tmdbId: i + 1,
  tvmazeId: i + 1001,
  name: `Show ${i + 1}`,
  posterPath: `/p${i + 1}.jpg`,
  day: "Today",
  date: "2026-10-05",
}));
jest.mock("@/hooks/useAiringThisWeek", () => ({
  useAiringThisWeek: () => ({
    cards: tenCards,
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    loadMore: mockLoadMore,
    allFollowed: false,
    ...mockRow,
  }),
}));
jest.mock("@/hooks/useFollowList", () => ({
  useFollowToggle: () => ({ followed: false, toggle: jest.fn() }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const scrollTo = (x: number) => ({
  nativeEvent: {
    contentOffset: { x, y: 0 },
    layoutMeasurement: { width: 390, height: 268 },
    // 16 + 10 × 150 + 9 × 12 + 16.
    contentSize: { width: 1640, height: 268 },
  },
});

// CRI-131: no Refresh; swiping near the end loads more, appended.
describe("AiringThisWeekRow loading more (FR-039, CRI-131)", () => {
  beforeEach(() => {
    mockLoadMore.mockClear();
    mockRow = {};
  });

  it("has no Refresh or Start over control", async () => {
    await render(<AiringThisWeekRow />);
    expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
  });

  it("asks for more when swiped near its end, not at its start", async () => {
    await render(<AiringThisWeekRow />);
    const strip = screen.getByTestId("airing-this-week-row-cards");

    await fireEvent.scroll(strip, scrollTo(0));
    expect(mockLoadMore).not.toHaveBeenCalled();

    // Three cards (3 × 162 = 486) from the end: 1640 - 390 - 486 = 764.
    await fireEvent.scroll(strip, scrollTo(800));
    expect(mockLoadMore).toHaveBeenCalled();
  });

  it("shows skeleton cards at its end while more is on its way", async () => {
    mockRow = { isLoadingMore: true };
    await render(<AiringThisWeekRow />);
    expect(screen.getByText("Show 10")).toBeTruthy();
    expect(
      screen.getAllByTestId("skeleton-card", { includeHiddenElements: true }),
    ).toHaveLength(2);
  });

  it('says "That\'s all this week" only when every show is followed', async () => {
    mockRow = { cards: [], allFollowed: true };
    await render(<AiringThisWeekRow />);
    expect(screen.getByText("That's all this week")).toBeTruthy();
  });
});
