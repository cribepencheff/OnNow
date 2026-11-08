// Show detail's Trailers row (ADR 0021, owner 2026-11-08): which of TMDB's
// videos it shows, and the links and player page for them. TMDB gives a
// video's site and its id there (key), never a URL; the app builds the
// YouTube links itself.

import type { TmdbVideo, TmdbVideosResponse } from "@/api/tmdb-types";

// At most this many trailers in the row.
export const TRAILERS_MAX = 6;

const TRAILER_TYPES = ["Trailer", "Teaser"];

// TMDB's videos, trimmed, without any it gives no id for.
export function tmdbVideos(
  response: TmdbVideosResponse | undefined,
): TmdbVideo[] {
  return (response?.results ?? [])
    .map((video) => ({
      key: video.key?.trim() ?? "",
      name: video.name?.trim() ?? "",
      site: video.site ?? "",
      type: video.type ?? "",
      official: video.official === true,
      language: video.iso_639_1 ?? null,
      publishedAt: video.published_at ?? null,
    }))
    .filter((video) => video.key !== "");
}

// A video the row shows: an official trailer or teaser in English, on
// YouTube, the only site the app plays (ADR 0021). Clips, featurettes and
// opening credits are left out.
export function isTrailerVideo(video: TmdbVideo): boolean {
  return (
    video.site === "YouTube" &&
    TRAILER_TYPES.includes(video.type) &&
    video.official &&
    video.language === "en"
  );
}

// The row's trailers: the latest season's and the show's own, each once,
// newest first (owner, 2026-11-08: "ofta vill man se senaste trailern").
export function pickTrailers(
  seasonVideos: TmdbVideo[],
  showVideos: TmdbVideo[],
): TmdbVideo[] {
  const byKey = new Map<string, TmdbVideo>();
  [...seasonVideos, ...showVideos].filter(isTrailerVideo).forEach((video) => {
    if (!byKey.has(video.key)) {
      byKey.set(video.key, video);
    }
  });
  return [...byKey.values()]
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, TRAILERS_MAX);
}

// The season whose trailers the row shows: the latest with episodes
// listed. A season only announced (Slow Horses' seasons 7 and 8) is often
// not on TMDB yet, and has no trailer to show.
export function trailerSeasonNumber(
  episodes: { season: number; type: string }[],
): number | undefined {
  const seasons = episodes
    .filter((episode) => episode.type === "regular")
    .map((episode) => episode.season);
  return seasons.length > 0 ? Math.max(...seasons) : undefined;
}

// The video's own page, opened in the YouTube app or the browser.
export function youtubeWatchUrl(key: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(key)}`;
}

// YouTube's still for the video: 4:3 with bars, drawn cropped to 16:9.
export function youtubeThumbnailUrl(key: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(key)}/hqdefault.jpg`;
}

// The page the in-app player loads (ADR 0021): YouTube's official IFrame
// player, unchanged, from youtube-nocookie.com, starting at once. It tells
// the app when it plays and when YouTube refuses the video (embedding off,
// removed, or the page's origin not accepted, codes 2, 5, 100, 101, 150,
// 153), so the app can offer the video on YouTube instead. The page is
// loaded with PLAYER_ORIGIN as its base, so YouTube gets an origin.
// Captions start off (cc_load_policy: 0, and the captions module unloaded
// the first time it loads), as they came on by themselves, over burned-in
// subtitles; the CC button turns them on. The player's language is English
// (hl: "en", ADR 0003): signed out, YouTube goes by the phone's language,
// and turned captions on for an English trailer on a Swedish phone.
// YouTube's own full-screen button is hidden (fs: 0, one of its player
// parameters): the app's player already fills the screen and turns with
// the phone, so a full screen inside it would be one too many (owner,
// 2026-11-08).
export const PLAYER_ORIGIN = "https://cribepencheff.github.io";

export type PlayerMessage =
  { type: "playing" } | { type: "error"; code: number };

export function trailerPlayerHtml(key: string): string {
  const videoId = JSON.stringify(key);
  const origin = JSON.stringify(PLAYER_ORIGIN);
  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000}#player{position:absolute;inset:0;width:100%;height:100%}</style>
</head>
<body>
<div id="player"></div>
<script>
function post(message) {
  window.ReactNativeWebView.postMessage(JSON.stringify(message));
}
// Captions off when the player first loads them (owner, 2026-11-08: they
// came on by themselves, often machine translated, over a trailer's own
// burned-in subtitles). Once only, so the player's CC button still turns
// them on.
var captionsOff = false;
function onYouTubeIframeAPIReady() {
  new YT.Player("player", {
    host: "https://www.youtube-nocookie.com",
    videoId: ${videoId},
    playerVars: { autoplay: 1, playsinline: 1, fs: 0, rel: 0, cc_load_policy: 0, hl: "en", origin: ${origin} },
    events: {
      onReady: function (event) { event.target.playVideo(); },
      onApiChange: function (event) {
        if (captionsOff) { return; }
        var modules = event.target.getOptions ? event.target.getOptions() : [];
        if (modules.indexOf("captions") >= 0 || modules.indexOf("cc") >= 0) {
          captionsOff = true;
          event.target.unloadModule("captions");
          event.target.unloadModule("cc");
        }
      },
      onStateChange: function (event) {
        if (event.data === YT.PlayerState.PLAYING) { post({ type: "playing" }); }
      },
      onError: function (event) { post({ type: "error", code: event.data }); }
    }
  });
}
</script>
<script src="https://www.youtube.com/iframe_api" onerror="post({ type: 'error', code: -1 })"></script>
</body>
</html>`;
}

// A message from the player page, or null for anything else.
export function parsePlayerMessage(data: string): PlayerMessage | null {
  try {
    const message = JSON.parse(data) as { type?: unknown; code?: unknown };
    if (message.type === "playing") {
      return { type: "playing" };
    }
    if (message.type === "error" && typeof message.code === "number") {
      return { type: "error", code: message.code };
    }
  } catch {
    // Not one of the player's messages.
  }
  return null;
}

// Whether the player's web view may load a request: anything inside the
// player's frame, and the page itself. A link out of the player (YouTube's
// logo, "Watch on YouTube") opens outside the app instead.
export function playerMayLoad(url: string, isTopFrame: boolean): boolean {
  if (!isTopFrame) {
    return true;
  }
  return url === "about:blank" || url.startsWith(PLAYER_ORIGIN);
}
