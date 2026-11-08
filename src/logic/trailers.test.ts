import type { TmdbVideo } from "@/api/tmdb-types";
import {
  PLAYER_ORIGIN,
  TRAILERS_MAX,
  isTrailerVideo,
  parsePlayerMessage,
  pickTrailers,
  playerMayLoad,
  tmdbVideos,
  trailerPlayerHtml,
  trailerSeasonNumber,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from "./trailers";

function video(overrides: Partial<TmdbVideo> = {}): TmdbVideo {
  return {
    key: "s6trailer",
    name: "Season 6 Official Trailer",
    site: "YouTube",
    type: "Trailer",
    official: true,
    language: "en",
    publishedAt: "2026-08-18T16:00:00.000Z",
    ...overrides,
  };
}

// ADR 0021, owner 2026-11-08: Show detail's Trailers row.
describe("tmdbVideos", () => {
  it("trims TMDB's videos and drops any without an id", () => {
    expect(
      tmdbVideos({
        results: [
          {
            key: "abc",
            name: " Official Trailer ",
            site: "YouTube",
            type: "Trailer",
            official: true,
            iso_639_1: "en",
            published_at: "2022-03-02T16:00:00.000Z",
          },
          { key: "", name: "No id" },
        ],
      }),
    ).toEqual([
      {
        key: "abc",
        name: "Official Trailer",
        site: "YouTube",
        type: "Trailer",
        official: true,
        language: "en",
        publishedAt: "2022-03-02T16:00:00.000Z",
      },
    ]);
    expect(tmdbVideos(undefined)).toEqual([]);
  });
});

describe("isTrailerVideo", () => {
  it("takes official English trailers and teasers on YouTube only", () => {
    expect(isTrailerVideo(video())).toBe(true);
    expect(isTrailerVideo(video({ type: "Teaser" }))).toBe(true);
    expect(isTrailerVideo(video({ type: "Featurette" }))).toBe(false);
    expect(isTrailerVideo(video({ type: "Opening Credits" }))).toBe(false);
    expect(isTrailerVideo(video({ official: false }))).toBe(false);
    expect(isTrailerVideo(video({ site: "Vimeo" }))).toBe(false);
    expect(isTrailerVideo(video({ language: "ko" }))).toBe(false);
  });
});

describe("pickTrailers", () => {
  it("puts the newest first, the latest season's and the show's, each once", () => {
    const season = [
      video({
        key: "teaser",
        type: "Teaser",
        publishedAt: "2026-06-13T00:00:00Z",
      }),
      video({ key: "s6", publishedAt: "2026-08-18T00:00:00Z" }),
    ];
    const show = [
      video({ key: "s1", publishedAt: "2022-03-02T00:00:00Z" }),
      video({ key: "s6", publishedAt: "2026-08-18T00:00:00Z" }),
      video({ key: "clip", type: "Clip", publishedAt: "2026-09-01T00:00:00Z" }),
    ];
    expect(pickTrailers(season, show).map((v) => v.key)).toEqual([
      "s6",
      "teaser",
      "s1",
    ]);
  });

  it(`keeps at most ${TRAILERS_MAX}`, () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      video({ key: `v${i}`, publishedAt: `2026-01-${10 + i}T00:00:00Z` }),
    );
    expect(pickTrailers(many, [])).toHaveLength(TRAILERS_MAX);
  });

  it("is empty with no trailers", () => {
    expect(pickTrailers([], [video({ type: "Clip" })])).toEqual([]);
  });
});

describe("YouTube links", () => {
  it("builds the watch page and the still from the video's id", () => {
    expect(youtubeWatchUrl("aBc_12-3")).toBe(
      "https://www.youtube.com/watch?v=aBc_12-3",
    );
    expect(youtubeThumbnailUrl("aBc_12-3")).toBe(
      "https://i.ytimg.com/vi/aBc_12-3/hqdefault.jpg",
    );
  });
});

describe("trailerPlayerHtml", () => {
  it("loads YouTube's own player from youtube-nocookie.com, with the video and an origin", () => {
    const html = trailerPlayerHtml("s6trailer");
    expect(html).toContain("https://www.youtube.com/iframe_api");
    expect(html).toContain('host: "https://www.youtube-nocookie.com"');
    expect(html).toContain('videoId: "s6trailer"');
    expect(html).toContain(`origin: "${PLAYER_ORIGIN}"`);
    expect(html).toContain("autoplay: 1");
    // The app's player is the full screen: no second one inside it.
    expect(html).toContain("fs: 0");
    // Captions off at first, over burned-in subtitles; once only, so the
    // CC button still works.
    expect(html).toContain("cc_load_policy: 0");
    expect(html).toContain('unloadModule("captions")');
    expect(html).toContain("if (captionsOff) { return; }");
  });

  it("quotes the id, so it cannot break out of the script", () => {
    expect(trailerPlayerHtml('a"; alert(1); "')).toContain(
      'videoId: "a\\"; alert(1); \\""',
    );
  });
});

describe("parsePlayerMessage", () => {
  it("reads the player's playing and error messages", () => {
    expect(parsePlayerMessage('{"type":"playing"}')).toEqual({
      type: "playing",
    });
    expect(parsePlayerMessage('{"type":"error","code":150}')).toEqual({
      type: "error",
      code: 150,
    });
  });

  it("ignores anything else", () => {
    expect(parsePlayerMessage("not json")).toBeNull();
    expect(parsePlayerMessage('{"type":"error"}')).toBeNull();
    expect(parsePlayerMessage('{"type":"other"}')).toBeNull();
  });
});

describe("playerMayLoad", () => {
  it("loads the player page and anything inside the player", () => {
    expect(playerMayLoad(`${PLAYER_ORIGIN}/`, true)).toBe(true);
    expect(playerMayLoad("about:blank", true)).toBe(true);
    expect(
      playerMayLoad("https://www.youtube-nocookie.com/embed/x", false),
    ).toBe(true);
  });

  it("keeps a link out of the player from replacing it", () => {
    expect(playerMayLoad("https://www.youtube.com/watch?v=x", true)).toBe(
      false,
    );
  });
});

describe("trailerSeasonNumber", () => {
  it("is the latest season with episodes listed, not one only announced", () => {
    // Slow Horses: episodes up to season 6; seasons 7 and 8 only announced.
    expect(
      trailerSeasonNumber([
        { season: 5, type: "regular" },
        { season: 6, type: "regular" },
        { season: 7, type: "significant_special" },
      ]),
    ).toBe(6);
    expect(trailerSeasonNumber([])).toBeUndefined();
  });
});
