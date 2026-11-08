import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { Alert } from "react-native";

import type { TmdbVideo } from "@/api/tmdb-types";
import { openExternalUrl } from "@/hooks/useGuardedRouter";
import { PLAYER_ORIGIN } from "@/logic/trailers";
import {
  TrailersRow,
  UNAVAILABLE_MESSAGE,
  UNAVAILABLE_TITLE,
} from "./Trailers";

// react-native-webview is mocked in jest/setup.ts as a plain view that
// keeps its props.
jest.mock("@/hooks/useGuardedRouter", () => ({ openExternalUrl: jest.fn() }));

const S6: TmdbVideo = {
  key: "s6trailer",
  name: "Season 6 Official Trailer",
  site: "YouTube",
  type: "Trailer",
  official: true,
  language: "en",
  publishedAt: "2026-08-18T16:00:00.000Z",
};
const S1: TmdbVideo = {
  ...S6,
  key: "s1trailer",
  name: "Official Trailer",
  publishedAt: "2022-03-02T16:00:00.000Z",
};

async function renderRow(trailers = [S6, S1]) {
  await render(
    <TrailersRow
      trailers={trailers}
      width={390}
      timeZone="Europe/Stockholm"
      todayDate="2026-11-08"
    />,
  );
}

function webView() {
  return screen.getByTestId("trailer-webview");
}

// ADR 0021, owner 2026-11-08: Show detail's Trailers row.
describe("TrailersRow (ADR 0021)", () => {
  beforeEach(() => {
    (openExternalUrl as jest.Mock).mockClear();
  });

  it("shows each trailer with YouTube's still, its name and its day", async () => {
    await renderRow();
    const row = within(screen.getByTestId("show-detail-trailers"));
    expect(row.getByRole("header", { name: "Trailers" })).toBeTruthy();
    const cards = row.getAllByTestId("trailer-card");
    expect(cards).toHaveLength(2);
    const first = within(cards[0]);
    expect(first.getByText("Season 6 Official Trailer")).toBeTruthy();
    expect(first.getByText("Tue 18 Aug")).toBeTruthy();
    expect(within(cards[1]).getByText("Wed 2 Mar 2022")).toBeTruthy();
  });

  it("shows no row without trailers", async () => {
    await renderRow([]);
    expect(screen.queryByTestId("show-detail-trailers")).toBeNull();
  });

  it("plays the trailer full screen in YouTube's player, and closes back to the row", async () => {
    await renderRow();
    await fireEvent.press(
      screen.getByRole("button", { name: "Play Season 6 Official Trailer" }),
    );

    const source = webView().props.source;
    expect(source.html).toContain('videoId: "s6trailer"');
    expect(source.baseUrl).toBe(`${PLAYER_ORIGIN}/`);
    expect(webView().props.mediaPlaybackRequiresUserAction).toBe(false);

    await fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("trailer-player")).toBeNull();
    expect(screen.getByTestId("show-detail-trailers")).toBeTruthy();
  });

  it("offers YouTube when the video will not play here", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await renderRow();
    await fireEvent.press(
      screen.getByRole("button", { name: "Play Season 6 Official Trailer" }),
    );
    await fireEvent(webView(), "message", {
      nativeEvent: { data: '{"type":"error","code":150}' },
    });

    expect(alert).toHaveBeenCalledWith(
      UNAVAILABLE_TITLE,
      UNAVAILABLE_MESSAGE,
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0][2] as {
      text: string;
      onPress: () => void;
    }[];
    expect(buttons.map((button) => button.text)).toEqual([
      "Cancel",
      "Open in YouTube",
    ]);
    await fireEvent(webView(), "message", {
      nativeEvent: { data: "not a player message" },
    });
    expect(alert).toHaveBeenCalledTimes(1);

    buttons[1].onPress();
    expect(openExternalUrl).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=s6trailer",
    );
    alert.mockRestore();
  });

  it("opens a link out of the player outside the app, not in its place", async () => {
    await renderRow();
    await fireEvent.press(
      screen.getByRole("button", { name: "Play Season 6 Official Trailer" }),
    );
    const mayLoad = webView().props.onShouldStartLoadWithRequest;
    expect(mayLoad({ url: `${PLAYER_ORIGIN}/`, isTopFrame: true })).toBe(true);
    expect(
      mayLoad({ url: "https://www.youtube.com/watch?v=x", isTopFrame: true }),
    ).toBe(false);
    expect(openExternalUrl).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=x",
    );
  });
});
