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
function onYouTubeIframeAPIReady() {
  new YT.Player("player", {
    host: "https://www.youtube-nocookie.com",
    videoId: ${videoId},
    playerVars: { autoplay: 1, playsinline: 1, rel: 0, origin: ${origin} },
    events: {
      onReady: function (event) { event.target.playVideo(); },
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
