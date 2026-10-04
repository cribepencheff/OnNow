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
import { useStreamingService } from "@/hooks/useStreamingService";
import { useImdbRating } from "@/hooks/useImdbRating";
import type { StreamingProvider } from "@/logic/streaming-service";
import showMobLandFixture from "@/api/fixtures/show-mobland.json";
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
jest.mock("@/hooks/useStreamingService", () => ({
  useStreamingService: jest.fn(),
}));
jest.mock("@/hooks/useImdbRating", () => ({
  useImdbRating: jest.fn(),
}));
const mockOriginCountries = jest.fn(() => ({ data: ["GB"] }));
jest.mock("@/hooks/useOriginCountries", () => ({
  useOriginCountries: () => mockOriginCountries(),
}));
const mockShowImages = jest.fn();
jest.mock("@/hooks/useShowImages", () => ({
  useShowImages: () => mockShowImages(),
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

const mockedUseStreamingService = useStreamingService as jest.MockedFunction<
  typeof useStreamingService
>;

// TMDB's Swedish services for the show (CRI-82): a list once looked up,
// null without a TMDB key, undefined while loading.
function mockStreamingServices(
  providers: StreamingProvider[] | null | undefined,
  isLoading = false,
) {
  mockedUseStreamingService.mockReturnValue({
    data: providers,
    isLoading,
    region: "SE",
  } as never);
}

const mockedUseImdbRating = useImdbRating as jest.MockedFunction<
  typeof useImdbRating
>;

function mockImdbRating(rating: string | null | undefined) {
  mockedUseImdbRating.mockReturnValue({ data: rating } as never);
}

const APPLE_TV = { providerId: 350, providerName: "Apple TV" };
const PRIME_VIDEO = { providerId: 119, providerName: "Amazon Prime Video" };
const SKYSHOWTIME = { providerId: 1773, providerName: "SkyShowtime" };
const NETFLIX = { providerId: 8, providerName: "Netflix" };
const PLUTO_TV = { providerId: 300, providerName: "Pluto TV" };

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
    mockOriginCountries.mockReturnValue({ data: ["GB"] });
    follow.mockReset();
    unfollow.mockReset();
    mockFollowed(false);
    mockStreamingServices(undefined);
    mockImdbRating(undefined);
    mockShowImages.mockReturnValue({
      data: {
        highestRatedBackdrop: { file_path: "/textless.jpg" },
        logo: null,
      },
    });
    (Linking.openURL as jest.Mock).mockClear();
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

  it("FR-028: shows title, year, origin country, genres, status line and summary, and no network", async () => {
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);

    expect(screen.getByText("Slow Horses")).toBeTruthy();
    // Year · origin country (TMDB) · genres (TVmaze), no network.
    expect(
      screen.getByText("2022 · United Kingdom · Drama, Thriller, Espionage"),
    ).toBeTruthy();
    expect(screen.getByTestId("show-detail-status")).toHaveTextContent(
      "Airing · next ep Wed 30 Sep",
    );
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

  it("FR-034: between seasons with an undated new season, the status line says TBA and there is no next card", async () => {
    mockShow(showFoundationFixture);
    await render(<ShowDetail showId={35951} />);

    expect(screen.getByTestId("show-detail-status")).toHaveTextContent(
      "Season 4 · TBA",
    );
    expect(screen.queryByTestId("show-detail-next")).toBeNull();
  });

  it("FR-034: an ended show says Ended in the status line, and the latest card shows its last episode", async () => {
    mockShow(showKillingEveFixture);
    await render(<ShowDetail showId={22904} />);

    expect(screen.getByTestId("show-detail-status")).toHaveTextContent("Ended");
    expect(screen.queryByTestId("show-detail-next")).toBeNull();
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

  it("CRI-87: shows the IMDb rating, linking to the show on IMDb", async () => {
    mockShow(showMobLandFixture);
    mockImdbRating("8.3");
    await render(<ShowDetail showId={75026} />);

    const rating = screen.getByTestId("imdb-rating");
    expect(rating).toHaveTextContent("IMDb8.3");
    await fireEvent.press(rating);
    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://www.imdb.com/title/tt31510819/",
    );
  });

  it("CRI-87: shows nothing without a rating, while loading or without a key", async () => {
    mockShow(showMobLandFixture);
    mockImdbRating(null);
    await render(<ShowDetail showId={75026} />);
    expect(screen.queryByTestId("imdb-rating")).toBeNull();
    expect(screen.queryByText("IMDb")).toBeNull();
  });

  it("FR-029: follows the show from Follow", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(false);
    await render(<ShowDetail showId={45039} />);

    await fireEvent.press(screen.getByRole("button", { name: "Follow" }));

    expect(follow).toHaveBeenCalledWith(45039);
  });

  it("FR-029: shows Following as a toggle when followed, which unfollows when pressed", async () => {
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
    mockOriginCountries.mockReturnValue({ data: ["US"] });
    await render(<ShowDetail showId={82707} />);

    expect(
      screen.getByText("2026 · United States · Drama, Action, Thriller"),
    ).toBeTruthy();
    expect(screen.getByTestId("show-detail-status")).toHaveTextContent(
      "Future uncertain",
    );
    expect(screen.getByText("All episodes available")).toBeTruthy();
    expect(
      within(screen.getByTestId("show-detail-latest")).getByText(
        "Season 1 · all 8 episodes · 7 days ago",
      ),
    ).toBeTruthy();
    expect(screen.queryByTestId("show-detail-next")).toBeNull();
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

  // CRI-80, CRI-82, FR-014, PRD 5.5: when followed, "Open in [service]" is
  // the primary action for the show's Swedish service (TMDB), with
  // "Following" as the quiet status next to it.
  it("FR-014: opens the show directly when its Swedish service has a direct link (Slow Horses, Apple TV)", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(true);
    mockStreamingServices([APPLE_TV]);
    await render(<ShowDetail showId={45039} />);

    expect(screen.getByRole("button", { name: "Following" })).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Open in Apple TV" }),
    );

    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://tv.apple.com/show/slow-horses/umc.cmc.2szz3fdt71tl1ulnbp8utgq5o",
    );
  });

  it("FR-014: opens the service's start page without a direct link (Neagley, Prime Video)", async () => {
    mockShow(showNeagleyFixture);
    mockFollowed(true);
    mockStreamingServices([PRIME_VIDEO]);
    await render(<ShowDetail showId={82707} />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Open in Prime Video" }),
    );

    expect(Linking.openURL).toHaveBeenCalledWith("https://www.primevideo.com");
  });

  it("CRI-86: Open in is the same full button whether airing or not", async () => {
    mockFollowed(true);
    mockStreamingServices([APPLE_TV]);
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);
    const airing = screen.getByRole("button", { name: "Open in Apple TV" });

    mockStreamingServices([PRIME_VIDEO]);
    mockShow(showNeagleyFixture);
    await render(<ShowDetail showId={82707} />);
    const notAiring = screen.getByRole("button", {
      name: "Open in Prime Video",
    });

    expect(notAiring.props.style).toEqual(airing.props.style);
  });

  it("CRI-86: puts the title and Open in on the backdrop, and the status line below it", async () => {
    mockShow(showSlowHorsesFixture);
    mockStreamingServices([APPLE_TV]);
    await render(<ShowDetail showId={45039} />);

    const hero = within(screen.getByTestId("show-detail-hero"));
    expect(hero.getByText("Slow Horses")).toBeTruthy();
    expect(hero.queryByTestId("show-detail-status")).toBeNull();
    expect(screen.getByTestId("show-detail-status")).toBeTruthy();
    expect(hero.getByRole("button", { name: "Open in Apple TV" })).toBeTruthy();
  });

  it("CRI-90: names services without a start page below the hero, with no button", async () => {
    mockShow(showSlowHorsesFixture);
    mockStreamingServices([
      { providerId: 464, providerName: "Kocowa" },
      { providerId: 430, providerName: "HiDive" },
    ]);
    await render(<ShowDetail showId={45039} />);

    expect(screen.queryByRole("button", { name: /^Open in/ })).toBeNull();
    expect(
      within(screen.getByTestId("show-detail-hero")).queryByText(/^On /),
    ).toBeNull();
    expect(screen.getByTestId("show-detail-availability")).toHaveTextContent(
      "On Kocowa, HiDive",
    );
  });

  it("CRI-90: an add-on opens its host, with the extra subscription below the button", async () => {
    mockShow(showSlowHorsesFixture);
    mockStreamingServices([
      { providerId: 296, providerName: "Hayu Amazon Channel" },
    ]);
    await render(<ShowDetail showId={45039} />);

    const button = screen.getByRole("button", {
      name: "Open in Prime Video, requires hayu subscription",
    });
    expect(button).toHaveTextContent("Open in Prime Video");
    const hero = within(screen.getByTestId("show-detail-hero"));
    expect(hero.getByTestId("paid-subscription-marker")).toHaveTextContent(
      "Requires hayu subscription",
    );
  });

  it("CRI-90: a service of its own has no subscription marker", async () => {
    mockShow(showSlowHorsesFixture);
    mockStreamingServices([APPLE_TV]);
    await render(<ShowDetail showId={45039} />);

    expect(screen.queryByTestId("paid-subscription-marker")).toBeNull();
  });

  it("CRI-86: shows the TMDB logo instead of the title when there is one, as on Home", async () => {
    mockShow(showSlowHorsesFixture);
    mockShowImages.mockReturnValue({
      data: {
        highestRatedBackdrop: { file_path: "/textless.jpg" },
        logo: { file_path: "/logo.png" },
      },
    });
    await render(<ShowDetail showId={45039} />);

    const hero = within(screen.getByTestId("show-detail-hero"));
    expect(
      JSON.stringify(hero.getByTestId("show-detail-logo").props.source),
    ).toContain("/w500/logo.png");
    expect(hero.queryByText("Slow Horses")).toBeNull();
  });

  it("CRI-86: shows the TMDB backdrop, not the TVmaze poster", async () => {
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);

    expect(
      JSON.stringify(screen.getByTestId("show-detail-backdrop").props.source),
    ).toContain("/w1280/textless.jpg");
  });

  it("FR-014: uses the Swedish service, not the US network (MobLand: SkyShowtime; Killing Eve: Netflix)", async () => {
    mockShow(showMobLandFixture);
    mockFollowed(true);
    mockStreamingServices([SKYSHOWTIME]);
    const { unmount } = await render(<ShowDetail showId={75026} />);
    expect(
      screen.getByRole("button", { name: "Open in SkyShowtime" }),
    ).toBeTruthy();
    await unmount();

    mockShow(showKillingEveFixture);
    mockStreamingServices([NETFLIX]);
    await render(<ShowDetail showId={22904} />);
    expect(
      screen.getByRole("button", { name: "Open in Netflix" }),
    ).toBeTruthy();
  });

  it("FR-014: shows no Open in button without a Swedish service, even with an official site (data first)", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(true);
    mockStreamingServices([]);
    await render(<ShowDetail showId={45039} />);

    expect(screen.getByRole("button", { name: "Following" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Open in/ })).toBeNull();
  });

  // CRI-84: no button, but a quiet text saying what TMDB's data shows.
  it('CRI-84, CRI-91: says "Unavailable in Sweden" when TMDB has no Swedish service (Special Forces, CRI-97)', async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(true);
    mockStreamingServices([]);
    await render(<ShowDetail showId={45039} />);

    expect(screen.getByText("Unavailable in Sweden")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Open in/ })).toBeNull();
  });

  it("CRI-84: keeps the Open in button for Pluto TV, now that it is in the link table (Hell's Kitchen)", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(true);
    mockStreamingServices([PLUTO_TV]);
    await render(<ShowDetail showId={45039} />);

    expect(
      screen.getByRole("button", { name: "Open in Pluto TV" }),
    ).toBeTruthy();
    expect(screen.queryByText(/^On /)).toBeNull();
  });

  it("CRI-84: keeps the Open in button and no text for a linked service (Neagley)", async () => {
    mockShow(showNeagleyFixture);
    mockFollowed(true);
    mockStreamingServices([PRIME_VIDEO]);
    await render(<ShowDetail showId={82707} />);

    expect(
      screen.getByRole("button", { name: "Open in Prime Video" }),
    ).toBeTruthy();
    expect(screen.queryByText(/^On /)).toBeNull();
    expect(screen.queryByText("Unavailable in Sweden")).toBeNull();
  });

  it("CRI-84: shows no availability text while loading or when the lookup fails", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(true);
    mockStreamingServices(undefined, true);
    const loading = await render(<ShowDetail showId={45039} />);
    expect(screen.queryByText("Unavailable in Sweden")).toBeNull();
    await loading.unmount();

    mockedUseStreamingService.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);
    const failed = await render(<ShowDetail showId={45039} />);
    expect(screen.queryByText("Unavailable in Sweden")).toBeNull();
    await failed.unmount();
  });

  it("FR-029, CRI-86: says what the data shows before following, too", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(false);
    mockStreamingServices([]);
    await render(<ShowDetail showId={45039} />);
    expect(screen.getByText("Unavailable in Sweden")).toBeTruthy();
  });

  it("FR-014: shows no Open in button while the Swedish service is looked up", async () => {
    mockShow(showNeagleyFixture);
    mockFollowed(true);
    mockStreamingServices(undefined, true);
    await render(<ShowDetail showId={82707} />);

    expect(screen.queryByRole("button", { name: /^Open in/ })).toBeNull();
  });

  it("FR-014: falls back to TVmaze's direct link when there is no TMDB key", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(true);
    mockStreamingServices(null);
    await render(<ShowDetail showId={45039} />);

    expect(
      screen.getByRole("button", { name: "Open in Apple TV" }),
    ).toBeTruthy();
  });

  it("FR-029, CRI-86: shows Open in before following, next to Follow", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(false);
    mockStreamingServices([APPLE_TV]);
    await render(<ShowDetail showId={45039} />);

    expect(screen.getByRole("button", { name: "Follow" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Open in Apple TV" }),
    ).toBeTruthy();
    expect(mockedUseStreamingService).toHaveBeenCalledWith(
      expect.objectContaining({ id: 45039 }),
      true,
    );
  });

  it("NFR-007: credits TMDB and JustWatch next to TVmaze", async () => {
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);

    expect(screen.getByText("Data provided by TVmaze")).toBeTruthy();
    expect(screen.getByText("Streaming services: JustWatch")).toBeTruthy();
    expect(
      screen.getByText(
        "This app uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.",
      ),
    ).toBeTruthy();
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
