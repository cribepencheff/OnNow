import { fireEvent, render, screen } from "@testing-library/react-native";

import { LOAD_MORE_PULL } from "@/logic/poster-batches";
import { AiringThisWeekRow } from "./AiringThisWeekRow";
import { CAUGHT_UP_TEXT } from "./PosterRow";

const mockLoadMore = jest.fn();
let mockRow: {
  isLoadingMore?: boolean;
  hasMore?: boolean;
  allFollowed?: boolean;
  cards?: unknown[];
} = {};
// Ten cards: a strip longer than the screen.
const mockTenCards = Array.from({ length: 10 }, (_, i) => ({
  tmdbId: i + 1,
  tvmazeId: i + 1001,
  name: `Show ${i + 1}`,
  posterPath: `/p${i + 1}.jpg`,
  day: "Today",
  date: "2026-10-05",
}));
jest.mock("@/hooks/useAiringThisWeek", () => ({
  useAiringThisWeek: () => ({
    cards: mockTenCards,
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
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));

const scrollTo = (x: number) => ({
  nativeEvent: {
    contentOffset: { x, y: 0 },
    layoutMeasurement: { width: 390, height: 268 },
    // 16 + 10 × 150 + 9 × 12 + 16.
    contentSize: { width: 1640, height: 268 },
  },
});

// CRI-131: no Refresh; a drag past the end loads more, appended.
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

  it("asks for more when dragged past its end, not when swiped near it", async () => {
    await render(<AiringThisWeekRow />);
    const strip = screen.getByTestId("airing-this-week-row-cards");

    // The strip's end: 1640 - 390 = 1250.
    await fireEvent(strip, "scrollBeginDrag");
    await fireEvent.scroll(strip, scrollTo(1250));
    expect(mockLoadMore).not.toHaveBeenCalled();

    await fireEvent.scroll(strip, scrollTo(1250 + LOAD_MORE_PULL));
    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it(`says "${CAUGHT_UP_TEXT}" at the end of the week's shows, as Top picks does`, async () => {
    mockRow = { hasMore: false };
    await render(<AiringThisWeekRow />);
    expect(screen.getByText(CAUGHT_UP_TEXT)).toBeTruthy();
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
