import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";

import { ActionSheetIOS, Dimensions, StyleSheet } from "react-native";
import { HEADER_BAR_HEIGHT } from "@/logic/header";
import { BUTTON_HEIGHT, heroLayout } from "@/logic/hero-layout";
import { t } from "@/theme/tokens";
import { releaseNavigation } from "@/hooks/navigation-lock";
import * as Linking from "expo-linking";

import { ShowDetail } from "./ShowDetail";
import { useShow } from "@/hooks/useShow";
import { useFollowList } from "@/hooks/useFollowList";
import { useStreamingService } from "@/hooks/useStreamingService";
import { NOT_ON_TMDB, type ProviderAnswer } from "@/logic/streaming-service";
import showMobLandFixture from "@/api/fixtures/show-mobland.json";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";
import showSiloFixture from "@/api/fixtures/show-silo.json";
import showFoundationFixture from "@/api/fixtures/show-foundation.json";
import showKillingEveFixture from "@/api/fixtures/show-killing-eve.json";
import showNeagleyFixture from "@/api/fixtures/show-neagley.json";
import showTheDiplomatFixture from "@/api/fixtures/show-the-diplomat.json";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));
jest.mock("expo-linking", () => ({
  openURL: jest.fn(),
}));
// TMDB's rating (ADR 0019), from the find answer; its logic is tested in
// show-rating.test.ts.
const mockTmdbRating = jest.fn();
jest.mock("@/hooks/useTmdbRating", () => ({
  useTmdbRating: () => ({ data: mockTmdbRating() }),
}));
jest.mock("@/hooks/useShow", () => ({
  useShow: jest.fn(),
}));
jest.mock("@/hooks/useStreamingService", () => ({
  useStreamingService: jest.fn(),
}));
const mockOriginCountries = jest.fn(() => ({ data: ["GB"] }));
jest.mock("@/hooks/useOriginCountries", () => ({
  useOriginCountries: () => mockOriginCountries(),
}));
const mockShowImages = jest.fn();
jest.mock("@/hooks/useShowImages", () => ({
  useShowImages: () => mockShowImages(),
}));
jest.mock("@/hooks/useFollowList", () =>
  jest.requireActual("@/hooks/test-follow-list-mock").followListMock(),
);
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
// null without a TMDB key, undefined while loading, NOT_ON_TMDB when TMDB
// does not know the show.
function mockStreamingServices(
  providers: ProviderAnswer | null | undefined,
  isLoading = false,
) {
  mockedUseStreamingService.mockReturnValue({
    data: providers,
    isLoading,
    region: "SE",
  } as never);
}

const APPLE_TV = { providerId: 350, providerName: "Apple TV", logoPath: null };
const PRIME_VIDEO = {
  providerId: 119,
  providerName: "Amazon Prime Video",
  logoPath: null,
};
const SKYSHOWTIME = {
  providerId: 1773,
  providerName: "SkyShowtime",
  logoPath: null,
};
const NETFLIX = { providerId: 8, providerName: "Netflix", logoPath: null };
const PLUTO_TV = { providerId: 300, providerName: "Pluto TV", logoPath: null };

const follow = jest.fn();
const unfollow = jest.fn();

// The hero's sharp image (ImageColumn), inside the backdrop's column.
function backdropImage() {
  return within(screen.getByTestId("show-detail-backdrop")).getByTestId(
    "hero-backdrop-image",
  );
}

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
    isLoaded: true,
    isFollowed: () => followed,
    follow,
    unfollow,
  });
}

// CRI-79, PRD 5.5: Show detail, PoC slice.
describe("ShowDetail", () => {
  let resolvedOptionsSpy: jest.SpyInstance;

  beforeEach(() => {
    mockTmdbRating.mockReturnValue({
      value: "8.6",
      url: "https://www.themoviedb.org/tv/247718",
    });
    mockOriginCountries.mockReturnValue({ data: ["GB"] });
    follow.mockReset();
    unfollow.mockReset();
    mockFollowed(false);
    mockStreamingServices(undefined);
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

  it("FR-028: shows title, year, origin country, genres and summary, and no network", async () => {
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);

    expect(screen.getByText("Slow Horses")).toBeTruthy();
    // Year · origin country (TMDB) · genres (TVmaze), no network.
    expect(
      screen.getByText("2022 · United Kingdom · Drama, Thriller, Espionage"),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("show-detail-section")).getByText(
        /Slow Horses follows the story/,
      ),
    ).toBeTruthy();
  });

  // Owner, 2026-11-08: the status rides in the hero's pill when there is
  // no news, in place of a status line of its own.
  describe("status in the pill (FR-034)", () => {
    function pillText() {
      return within(screen.getByTestId("show-detail-pill-row"));
    }

    it("has no status line below the hero", async () => {
      mockShow(showSiloFixture);
      await render(<ShowDetail showId={38052} />);
      expect(screen.queryByTestId("show-detail-status")).toBeNull();
    });

    it("shows a dated next season between seasons", async () => {
      mockShow(showSiloFixture);
      await render(<ShowDetail showId={38052} />);
      expect(pillText().getByText("Season 4 · Fri 9 Jul 2027")).toBeTruthy();
    });

    it("shows TBA for an undated new season", async () => {
      mockShow(showFoundationFixture);
      await render(<ShowDetail showId={35951} />);
      expect(pillText().getByText("Season 4 · TBA")).toBeTruthy();
    });

    it("shows Ended for an ended show", async () => {
      mockShow(showKillingEveFixture);
      await render(<ShowDetail showId={22904} />);
      expect(pillText().getByText("Ended")).toBeTruthy();
    });

    it("lets news win over the status (Slow Horses, a week into season 6)", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      expect(pillText().getByText("New season")).toBeTruthy();
      expect(screen.queryByText("Next ep Wed 30 Sep")).toBeNull();
    });

    it("CRI-81: shows Neagley's drop in the pill, with no line of its own", async () => {
      mockShow(showNeagleyFixture);
      await render(<ShowDetail showId={82707} />);
      expect(pillText().getByText("All episodes now available")).toBeTruthy();
      expect(screen.queryByText("All episodes available")).toBeNull();
    });

    it("CRI-81: shows The Diplomat's dated season 4 after its season 3 drop", async () => {
      mockShow(showTheDiplomatFixture);
      await render(<ShowDetail showId={60213} />);
      expect(pillText().getByText("Season 4 · Thu 15 Oct")).toBeTruthy();
    });
  });

  // Owner, 2026-11-08 (Apple TV): "About", the summary in a panel, three
  // lines, with More opening the whole text in a sheet.
  describe("About", () => {
    const LONG = Array.from({ length: 5 }, () => ({ text: "line" }));

    function layOut(lines: { text: string }[]) {
      return fireEvent(
        screen.getByTestId("show-detail-summary-measure", {
          includeHiddenElements: true,
        }),
        "textLayout",
        { nativeEvent: { lines } },
      );
    }

    it("shows the summary in three lines under an About heading", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      const section = within(screen.getByTestId("show-detail-section"));
      expect(section.getByRole("header", { name: "About" })).toBeTruthy();
      expect(
        within(screen.getByTestId("show-detail-about")).getByText(
          /Slow Horses follows the story/,
        ).props.numberOfLines,
      ).toBe(3);
    });

    it("opens the whole summary in a sheet from More, and closes it", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      expect(screen.queryByRole("button", { name: "More" })).toBeNull();
      await layOut(LONG);

      await fireEvent.press(screen.getByRole("button", { name: "More" }));
      const sheet = within(screen.getByTestId("show-detail-about-sheet"));
      expect(sheet.getByRole("header", { name: "Slow Horses" })).toBeTruthy();
      expect(
        sheet.getByText(/Slow Horses follows the story/).props.numberOfLines,
      ).toBeUndefined();

      // Every genre, and the facts the data gives.
      expect(sheet.getByText("Drama, Thriller, Espionage")).toBeTruthy();
      const facts = within(sheet.getByTestId("show-detail-about-facts"));
      expect(facts.getByRole("header", { name: "Information" })).toBeTruthy();
      expect(facts.getByLabelText("Years, 2022–")).toBeTruthy();
      expect(facts.getByLabelText("Runtime, 45 min")).toBeTruthy();
      expect(facts.getByLabelText("Origin, United Kingdom")).toBeTruthy();

      await fireEvent.press(sheet.getByRole("button", { name: "Close" }));
      expect(screen.queryByTestId("show-detail-about-sheet")).toBeNull();
    });

    it("shows no More when the summary fits in three lines", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      await layOut(LONG.slice(0, 3));
      expect(screen.queryByRole("button", { name: "More" })).toBeNull();
    });
  });

  // FR-032, FR-033, owner 2026-11-08: a season heading with a menu, and
  // the season's episodes as cards to swipe, in place of the latest and
  // next cards.
  describe("episodes (FR-032, FR-033)", () => {
    let actionSheet: jest.SpyInstance;
    // The option the user picks in the action sheet, by its label.
    function pickSeason(label: string) {
      actionSheet.mockImplementationOnce((options, callback) => {
        callback(options.options.indexOf(label));
      });
      return fireEvent.press(screen.getByTestId("show-detail-season-picker"));
    }
    const row = () => within(screen.getByTestId("show-detail-episodes"));

    beforeEach(() => {
      actionSheet = jest
        .spyOn(ActionSheetIOS, "showActionSheetWithOptions")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      actionSheet.mockRestore();
    });

    it("has no latest and next cards", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      expect(screen.queryByTestId("show-detail-latest")).toBeNull();
      expect(screen.queryByTestId("show-detail-next")).toBeNull();
      expect(screen.queryByText("LATEST")).toBeNull();
      expect(screen.queryByText("NEXT")).toBeNull();
    });

    it("opens a running show on its current season, at the latest episode out", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      expect(screen.getByTestId("show-detail-season-picker")).toHaveTextContent(
        "Season 6",
      );
      // S6E2 is out today, the second card.
      expect(
        screen.getByTestId("show-detail-episodes").props.initialScrollIndex,
      ).toBe(1);
    });

    it("opens the latest aired season between seasons", async () => {
      mockShow(showSiloFixture);
      await render(<ShowDetail showId={38052} />);
      expect(screen.getByTestId("show-detail-season-picker")).toHaveTextContent(
        "Season 3",
      );
    });

    it("opens an ended show on season 1, episode 1", async () => {
      mockShow(showKillingEveFixture);
      await render(<ShowDetail showId={22904} />);
      expect(screen.getByTestId("show-detail-season-picker")).toHaveTextContent(
        "Season 1",
      );
      expect(
        screen.getByTestId("show-detail-episodes").props.initialScrollIndex,
      ).toBe(0);
    });

    it("lists every season in the menu, an announced one with its note", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      await fireEvent.press(screen.getByTestId("show-detail-season-picker"));
      const options = actionSheet.mock.calls[0][0].options as string[];
      expect(options).toEqual(
        expect.arrayContaining([
          "Season 1",
          "Season 6",
          "Season 7 · Announced",
          "Cancel",
        ]),
      );
    });

    it("switches the episodes when another season is picked, opening at its first", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      expect(row().getByText("Daddy Issues")).toBeTruthy();

      await pickSeason("Season 5");

      expect(screen.getByTestId("show-detail-season-picker")).toHaveTextContent(
        "Season 5",
      );
      expect(row().getByText("Circus")).toBeTruthy();
      expect(row().queryByText("Daddy Issues")).toBeNull();
      expect(
        screen.getByTestId("show-detail-episodes").props.initialScrollIndex,
      ).toBe(0);
    });

    it("FR-033: says No episodes yet for an announced season", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      await pickSeason("Season 7 · Announced");

      expect(screen.getByText("No episodes yet.")).toBeTruthy();
      expect(screen.getByTestId("show-detail-season-picker")).toHaveTextContent(
        "Season 7Announced",
      );
    });

    it("PRD 5.5: each card has Episode N of M, the title and its relative day", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);

      const today = within(row().getByTestId("episode-today"));
      expect(today.getByText("Episode 2 of 6")).toBeTruthy();
      expect(today.getByText("Daddy Issues")).toBeTruthy();
      expect(today.getByText("Today")).toBeTruthy();

      const next = within(row().getAllByTestId("episode-upcoming")[0]);
      expect(next.getByText("Resurrection")).toBeTruthy();
      expect(next.getByText("Episode 3 of 6")).toBeTruthy();
      expect(next.getByText("In 7 days")).toBeTruthy();
    });

    it("marks aired, today and upcoming episodes, and the finale", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);

      const upcoming = row().getAllByTestId("episode-upcoming");
      expect(upcoming).toHaveLength(4);
      const finale = upcoming[3];
      expect(within(finale).getByText("Judgment Day")).toBeTruthy();
      expect(within(finale).getByText("Finale")).toBeTruthy();
      expect(within(upcoming[0]).queryByText("Finale")).toBeNull();

      // Season 5 is all out, and opens at its first episode.
      await pickSeason("Season 5");
      expect(
        within(row().getAllByTestId("episode-aired")[0]).getByText(
          "Episode 1 of 6",
        ),
      ).toBeTruthy();
      expect(row().queryByTestId("episode-upcoming")).toBeNull();
    });
  });

  // ADR 0019: TMDB's rating, the same as a Search row's, from the find
  // answer, linking to the show on TMDB.
  it("shows TMDB's rating, linking to the show on TMDB", async () => {
    mockShow(showMobLandFixture);
    await render(<ShowDetail showId={75026} />);

    const rating = screen.getByTestId("show-rating");
    expect(rating).toHaveTextContent("TMDB8.6");
    expect(rating.props.accessibilityLabel).toBe("TMDB rating 8.6");
    await fireEvent.press(rating);
    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://www.themoviedb.org/tv/247718",
    );
  });

  it("shows no rating when TMDB has none", async () => {
    mockShow(showMobLandFixture);
    mockTmdbRating.mockReturnValue(null);
    await render(<ShowDetail showId={75026} />);
    expect(screen.queryByTestId("show-rating")).toBeNull();
  });

  it("FR-029: follows the show from Follow", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(false);
    await render(<ShowDetail showId={45039} />);

    await fireEvent.press(screen.getByRole("button", { name: "Follow" }));

    expect(follow).toHaveBeenCalledWith(45039);
  });

  it("FR-029: shows Following on the follow button when followed, which unfollows when pressed", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(true);
    await render(<ShowDetail showId={45039} />);

    expect(screen.queryByRole("button", { name: "Follow" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Following" }));

    expect(unfollow).toHaveBeenCalledWith(45039);
  });

  // CRI-80, CRI-82, FR-014, PRD 5.5: when followed, "Open in [service]" is
  // the primary action for the show's Swedish service (TMDB), with
  // the follow circle next to it (CRI-143).
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

  it("CRI-86: puts the title and Open in on the backdrop", async () => {
    mockShow(showSlowHorsesFixture);
    mockStreamingServices([APPLE_TV]);
    await render(<ShowDetail showId={45039} />);

    const hero = within(screen.getByTestId("show-detail-hero"));
    expect(hero.getByText("Slow Horses")).toBeTruthy();
    expect(hero.getByRole("button", { name: "Open in Apple TV" })).toBeTruthy();
  });

  it("CRI-90: names services without a start page under the follow circle, with no button, as on Home", async () => {
    mockShow(showSlowHorsesFixture);
    mockStreamingServices([
      { providerId: 464, providerName: "Kocowa", logoPath: null },
      { providerId: 430, providerName: "HiDive", logoPath: null },
    ]);
    await render(<ShowDetail showId={45039} />);

    expect(screen.queryByRole("button", { name: /^Open in/ })).toBeNull();
    expect(
      within(screen.getByTestId("show-detail-hero")).getByTestId(
        "show-detail-availability",
      ),
    ).toHaveTextContent("On Kocowa, HiDive");
  });

  it("CRI-90: an add-on opens its host, with the extra subscription below the button", async () => {
    mockShow(showSlowHorsesFixture);
    mockStreamingServices([
      { providerId: 296, providerName: "Hayu Amazon Channel", logoPath: null },
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

    expect(JSON.stringify(backdropImage().props.source)).toContain(
      "/w1920/textless.jpg",
    );
  });

  // CRI-140: w1920 is not a documented TMDB size; if it fails, the same
  // image at "original".
  // CRI-100: without a TMDB backdrop, TVmaze's poster; without any image,
  // "No image".
  it("CRI-100: shows TVmaze's poster when TMDB has no backdrop", async () => {
    mockShow(showSlowHorsesFixture);
    mockShowImages.mockReturnValue({
      data: { highestRatedBackdrop: null, logo: null },
    });
    await render(<ShowDetail showId={45039} />);

    expect(JSON.stringify(backdropImage().props.source)).toContain(
      showSlowHorsesFixture.image!.original as string,
    );
    expect(screen.queryByText("No image")).toBeNull();
  });

  it("CRI-100: without any image, the Home hero's No image placeholder, with the title over it", async () => {
    mockShow({ ...showSlowHorsesFixture, image: null });
    mockShowImages.mockReturnValue({
      data: { highestRatedBackdrop: null, logo: null },
    });
    await render(<ShowDetail showId={45039} />);

    expect(screen.queryByTestId("show-detail-backdrop")).toBeNull();
    expect(screen.getByTestId("no-image")).toBeTruthy();
    expect(screen.getByText("Slow Horses")).toBeTruthy();
  });

  it("CRI-140: falls back to the original backdrop if w1920 fails", async () => {
    mockShow(showSlowHorsesFixture);
    await render(<ShowDetail showId={45039} />);

    await fireEvent(backdropImage(), "error", {
      nativeEvent: { error: "404" },
    });
    expect(JSON.stringify(backdropImage().props.source)).toContain(
      "/original/textless.jpg",
    );
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

  it("CRI-102: shows no Open in and no text when TMDB does not know the show, not TVmaze's link", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(true);
    mockStreamingServices(NOT_ON_TMDB);
    await render(<ShowDetail showId={45039} />);

    expect(screen.queryByRole("button", { name: /^Open in/ })).toBeNull();
    expect(screen.queryByTestId("show-detail-availability")).toBeNull();
  });

  it("CRI-106: shows no Open in without a TMDB answer, not TVmaze's direct link", async () => {
    mockShow(showSlowHorsesFixture);
    mockFollowed(true);
    mockStreamingServices(null);
    await render(<ShowDetail showId={45039} />);

    expect(screen.queryByRole("button", { name: /^Open in/ })).toBeNull();
    expect(screen.queryByTestId("show-detail-availability")).toBeNull();
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

  // CRI-129 (owner, 2026-10-22; Apple TV and Instagram as references): the
  // backdrop runs up under the status bar, and a round back button floats
  // over it, staying put while the page scrolls.
  describe("floating header (CRI-129)", () => {
    it("runs the backdrop up under the status bar, as tall as the Home hero's (CRI-143)", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      const layout = heroLayout(Dimensions.get("window").height, 0);
      const hero = StyleSheet.flatten(
        screen.getByTestId("show-detail-hero").props.style,
      );
      const column = StyleSheet.flatten(
        screen.getByTestId("show-detail-backdrop").props.style,
      );
      expect(hero.height).toBe(layout.heroHeight);
      expect(column.top).toBe(0);
      expect(column.height).toBe(layout.imageHeight);
    });

    // Owner, 2026-10-22: no scroll indicator, as on Home (and Apple TV's
    // show page): an image page read as a whole.
    it("shows no scroll indicator", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      expect(
        screen.getByTestId("show-detail-scroll").props
          .showsVerticalScrollIndicator,
      ).toBe(false);
    });

    it("floats a round back button that goes back", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      const circle = StyleSheet.flatten(
        screen.getByTestId("floating-back").props.style,
      );
      expect(circle.borderRadius).toBe(circle.width / 2);
      expect(circle.borderColor).toBe(t.imageControlEdge);
      releaseNavigation();
      await fireEvent.press(screen.getByRole("button", { name: "Back" }));
      expect(mockBack).toHaveBeenCalled();
    });

    it("keeps the title clear of the floating header without an image", async () => {
      mockShow({ ...showSlowHorsesFixture, image: null });
      mockShowImages.mockReturnValue({
        data: { highestRatedBackdrop: null, logo: null },
      });
      await render(<ShowDetail showId={45039} />);
      const content = StyleSheet.flatten(
        screen.getByTestId("show-detail-hero-content").props.style,
      );
      expect(content.top).toBeGreaterThanOrEqual(HEADER_BAR_HEIGHT);
    });
  });

  // CRI-143: the Home hero slide as the reference.
  describe("hero (CRI-143)", () => {
    it("shows the status pill over the title (Slow Horses, a week into season 6)", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      expect(
        within(screen.getByTestId("show-detail-pill-row")).getByText(
          "New season",
        ),
      ).toBeTruthy();
    });

    it("shows the rating and the meta line under the title", async () => {
      mockShow(showSlowHorsesFixture);
      await render(<ShowDetail showId={45039} />);
      const meta = within(screen.getByTestId("show-detail-meta-row"));
      expect(meta.getByTestId("show-rating")).toBeTruthy();
      // The rating's chip comes last, as Home's Premiere chip.
      const row = screen.getByTestId("show-detail-meta-row");
      const children = row.children as { props: { testID?: string } }[];
      expect(children[children.length - 1].props.testID).toBe("show-rating");
      expect(meta.getByText(/^2022 · United Kingdom/)).toBeTruthy();
    });

    it("puts the follow circle beside Open in, as tall as the button", async () => {
      mockShow(showSlowHorsesFixture);
      mockFollowed(false);
      mockStreamingServices([APPLE_TV]);
      await render(<ShowDetail showId={45039} />);
      const circle = StyleSheet.flatten(
        screen.getByTestId("show-detail-follow").props.style,
      );
      const button = StyleSheet.flatten(
        screen.getByTestId("show-detail-open-in").props.style,
      );
      expect(button.height).toBe(BUTTON_HEIGHT);
      // As wide as on Home, less the circle and the gap (owner).
      expect(
        StyleSheet.flatten(
          screen.getByTestId("show-detail-main-action").props.style,
        ).flex,
      ).toBe(1);
      expect(circle.width).toBe(BUTTON_HEIGHT);
      expect(circle.height).toBe(BUTTON_HEIGHT);
      await fireEvent.press(screen.getByRole("button", { name: "Follow" }));
      expect(follow).toHaveBeenCalledWith(45039);
    });

    it("keeps the circle to its symbol beside Open in", async () => {
      mockShow(showSlowHorsesFixture);
      mockStreamingServices([APPLE_TV]);
      await render(<ShowDetail showId={45039} />);
      expect(
        within(screen.getByTestId("show-detail-follow")).queryByText("Follow"),
      ).toBeNull();
    });

    it("says Follow, or Following, when it stands alone without a service", async () => {
      mockShow(showSlowHorsesFixture);
      mockFollowed(false);
      mockStreamingServices([]);
      const { unmount } = await render(<ShowDetail showId={45039} />);
      expect(screen.queryByRole("button", { name: /^Open in/ })).toBeNull();
      const follow = within(screen.getByTestId("show-detail-follow"));
      expect(follow.getByText("Follow")).toBeTruthy();
      // Compact, as a secondary action: 176 beside where the circle would be.
      expect(
        StyleSheet.flatten(
          screen.getByTestId("show-detail-main-action").props.style,
        ).width,
      ).toBe(240 - 12 - BUTTON_HEIGHT);
      await unmount();

      mockFollowed(true);
      await render(<ShowDetail showId={45039} />);
      expect(
        within(screen.getByTestId("show-detail-follow")).getByText("Following"),
      ).toBeTruthy();
    });
  });
});
