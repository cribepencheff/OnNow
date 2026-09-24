import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";

import * as Linking from "expo-linking";

import { ShowDetail } from "./ShowDetail";
import { useShow } from "@/hooks/useShow";
import { useFollowList } from "@/hooks/useFollowList";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";
import showSiloFixture from "@/api/fixtures/show-silo.json";
import showFoundationFixture from "@/api/fixtures/show-foundation.json";
import showKillingEveFixture from "@/api/fixtures/show-killing-eve.json";
import showNeagleyFixture from "@/api/fixtures/show-neagley.json";
import showTheDiplomatFixture from "@/api/fixtures/show-the-diplomat.json";

jest.mock("expo-linking", () => ({
  openURL: jest.fn(),
}));
jest.mock("@/hooks/useShow", () => ({
  useShow: jest.fn(),
}));
jest.mock("@/hooks/useFollowList", () => ({
  useFollowList: jest.fn(),
}));
// Slow Horses S6E2 comes out on this day in Stockholm.
jest.mock("@/hooks/useToday", () => ({
  useToday: () => "2026-09-23",
}));

const mockedUseShow = useShow as jest.MockedFunction<typeof useShow>;
const mockedUseFollowList = useFollowList as jest.MockedFunction<
  typeof useFollowList
>;

const follow = jest.fn();
const unfollow = jest.fn();

function mockShow(fixture: unknown) {
  mockedUseShow.mockReturnValue({
    data: fixture,
    isLoading: false,
    isError: false,
  } as never);
}

function mockFollowed(followed: boolean) {
  mockedUseFollowList.mockReturnValue({
    followedIds: new Set(),
    isFollowed: () => followed,
    follow,
    unfollow,
  });
}

// CRI-79, PRD 5.5: Show detail, PoC slice.
describe("ShowDetail", () => {
  let resolvedOptionsSpy: jest.SpyInstance;

  beforeEach(() => {
    follow.mockReset();
    unfollow.mockReset();
    mockFollowed(false);
    // Episode days are local to the user's time zone (ADR 0001).
    const original = Intl.DateTimeFormat.prototype.resolvedOptions;
    resolvedOptionsSpy = jest
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockImplementation(function (this: Intl.DateTimeFormat) {
        return { ...original.call(this), timeZone: "Europe/Stockholm" };
      });
  });

  afterEach(() => {
    resolvedOptionsSpy.mockRestore();
  });

  it("FR-028: shows title, year, status, network and summary", async () => {
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);

    expect(screen.getByText("Slow Horses")).toBeTruthy();
    expect(screen.getByText("2022 · Running · Apple TV")).toBeTruthy();
    expect(screen.getByText(/Slow Horses follows the story/)).toBeTruthy();
  });

  it("FR-028: a running show has a latest and a next episode card", async () => {
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);

    const latest = within(screen.getByTestId("show-detail-latest"));
    expect(latest.getByText("Daddy Issues")).toBeTruthy();
    expect(latest.getByText("Episode 2 of 6")).toBeTruthy();
    expect(latest.getByText("Today")).toBeTruthy();

    const next = within(screen.getByTestId("show-detail-next"));
    expect(next.getByText("Resurrection")).toBeTruthy();
    expect(next.getByText("Episode 3 of 6")).toBeTruthy();
    expect(next.getByText("In 7 days")).toBeTruthy();
  });

  it("FR-034: between seasons with a date, the next card is the season premiere", async () => {
    mockShow(showSiloFixture);
    await render(<ShowDetail showId={38052} />);

    const next = within(screen.getByTestId("show-detail-next"));
    expect(next.getByText("Season 4 premiere · Fri 9 Jul 2027")).toBeTruthy();

    const latest = within(screen.getByTestId("show-detail-latest"));
    expect(latest.getByText("Troy")).toBeTruthy();
    expect(latest.getByText("Fri 4 Sep")).toBeTruthy();
  });

  it("FR-034: between seasons without a date, the next card shows the status from TVmaze", async () => {
    mockShow(showFoundationFixture);
    await render(<ShowDetail showId={35951} />);

    const next = within(screen.getByTestId("show-detail-next"));
    expect(next.getByText("Running")).toBeTruthy();
  });

  it("FR-034: an ended show's next card shows its status, and the latest card its last episode", async () => {
    mockShow(showKillingEveFixture);
    await render(<ShowDetail showId={22904} />);

    expect(
      within(screen.getByTestId("show-detail-next")).getByText("Ended"),
    ).toBeTruthy();
    const latest = within(screen.getByTestId("show-detail-latest"));
    expect(latest.getByText("Hello, Losers")).toBeTruthy();
    expect(latest.getByText("Sun 10 Apr 2022")).toBeTruthy();
  });

  it("FR-032: preselects the current season, not season 1", async () => {
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);

    expect(
      screen.getByRole("tab", { name: "Season 6" }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(
      screen.getByRole("tab", { name: "Season 1" }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  });

  it("FR-032: preselects the latest aired season between seasons", async () => {
    mockShow(showSiloFixture);
    await render(<ShowDetail showId={38052} />);

    expect(
      screen.getByRole("tab", { name: "Season 3" }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
  });

  it("FR-032: switches the episode list when another season tab is pressed", async () => {
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);

    const list = () => within(screen.getByTestId("show-detail-episodes"));
    expect(list().getByText("Circle of Life")).toBeTruthy();

    await fireEvent.press(screen.getByRole("tab", { name: "Season 5" }));

    expect(list().getByText("Circus")).toBeTruthy();
    expect(list().queryByText("Circle of Life")).toBeNull();
  });

  it("FR-032: marks aired, today and upcoming episodes, and the finale", async () => {
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);

    const list = within(screen.getByTestId("show-detail-episodes"));
    expect(
      within(list.getByTestId("episode-aired")).getByText("Circle of Life"),
    ).toBeTruthy();
    expect(
      within(list.getByTestId("episode-today")).getByText("Daddy Issues"),
    ).toBeTruthy();

    const upcoming = list.getAllByTestId("episode-upcoming");
    expect(upcoming).toHaveLength(4);
    expect(within(upcoming[0]).getByText("In 7 days")).toBeTruthy();

    const finale = upcoming[3];
    expect(within(finale).getByText("Judgment Day")).toBeTruthy();
    expect(within(finale).getByText("Finale")).toBeTruthy();
    expect(within(upcoming[0]).queryByText("Finale")).toBeNull();
  });

  it("FR-033: an announced season without episodes is a muted tab with its premiere date or Announced", async () => {
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);

    const tab = screen.getByRole("tab", { name: "Season 7, Announced" });
    expect(within(tab).getByText("Announced")).toBeTruthy();

    await fireEvent.press(tab);
    expect(
      within(screen.getByTestId("show-detail-episodes")).getByText(
        "No episodes yet.",
      ),
    ).toBeTruthy();
  });

  it("FR-029: follows the show from Follow", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(false);
    await render(<ShowDetail showId={45039} />);

    await fireEvent.press(screen.getByRole("button", { name: "Follow" }));

    expect(follow).toHaveBeenCalledWith(45039);
  });

  it("FR-029: shows a quiet Following when followed, which unfollows when pressed", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(true);
    await render(<ShowDetail showId={45039} />);

    expect(screen.queryByRole("button", { name: "Follow" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Following" }));

    expect(unfollow).toHaveBeenCalledWith(45039);
  });

  // CRI-81: whole-season releases and plain status wording.
  it("CRI-81: shows Neagley's drop as one latest item, the status in plain words, and All episodes available", async () => {
    mockShow(showNeagleyFixture);
    await render(<ShowDetail showId={82707} />);

    expect(
      screen.getByText("2026 · Renewal not announced · Prime Video"),
    ).toBeTruthy();
    expect(screen.getByText("All episodes available")).toBeTruthy();
    expect(
      within(screen.getByTestId("show-detail-latest")).getByText(
        "Season 1 · all 8 episodes · 7 days ago",
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("show-detail-next")).getByText(
        "Renewal not announced",
      ),
    ).toBeTruthy();
  });

  it("CRI-81: shows The Diplomat's season 3 drop as the latest item and its season 4 premiere as next", async () => {
    mockShow(showTheDiplomatFixture);
    await render(<ShowDetail showId={60213} />);

    expect(
      within(screen.getByTestId("show-detail-latest")).getByText(
        "Season 3 · all 8 episodes · Thu 16 Oct 2025",
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("show-detail-next")).getByText(
        "Season 4 premiere · Thu 15 Oct",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("All episodes available")).toBeNull();
  });

  it("CRI-81: keeps a weekly show's episode cards and no All episodes available", async () => {
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);

    expect(
      within(screen.getByTestId("show-detail-latest")).getByText(
        "Daddy Issues",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("All episodes available")).toBeNull();
  });

  // CRI-80, FR-014 (keyless PoC version), PRD 5.5: when followed and
  // TVmaze's official site is a known service's show page, "Open in
  // [service]" is the primary action and "Following" the quiet status.
  it("FR-014: shows Open in Apple TV next to Following when followed, and opens the link", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(true);
    await render(<ShowDetail showId={45039} />);

    expect(screen.getByRole("button", { name: "Following" })).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Open in Apple TV" }),
    );

    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://tv.apple.com/show/slow-horses/umc.cmc.2szz3fdt71tl1ulnbp8utgq5o",
    );
  });

  it("FR-014: shows no Open in button when followed but the service has no link", async () => {
    mockShow(showKillingEveFixture);
    mockFollowed(true);
    await render(<ShowDetail showId={22904} />);

    expect(screen.getByRole("button", { name: "Following" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Open in/ })).toBeNull();
  });

  it("FR-029: keeps Follow as the only action when not followed, even with a link", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(false);
    await render(<ShowDetail showId={45039} />);

    expect(screen.getByRole("button", { name: "Follow" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Open in/ })).toBeNull();
  });

  it("shows a quiet line while the show loads", async () => {
    mockedUseShow.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);
    await render(<ShowDetail showId={45039} />);

    expect(screen.getByText("Loading…")).toBeTruthy();
  });
});
