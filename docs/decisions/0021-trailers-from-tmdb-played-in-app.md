# 0021. Trailers from TMDB, played in the app in YouTube's player

Status: Proposed (CRI-143, owner 2026-11-08). Awaits the owner's approval.

## Context
Show detail is mostly for deciding whether to follow a show (PRD 5.5). The
owner wants its trailers there, in a row of their own after About, played
full screen in the app and back to the row when closed.

- TMDB lists a show's videos (`/tv/{id}/videos`) and a season's
  (`/tv/{id}/season/{n}/videos`), each with its site, its id there (`key`),
  its type (Trailer, Teaser, Clip, Featurette, Opening Credits, ...), an
  `official` flag, its language and when it was published. It never gives
  a URL. Almost every video is on YouTube.
- A show's own list often has only its first season's trailer (Slow
  Horses: 2022). A season's list has that season's (Slow Horses season 6:
  its trailer and two teasers, 2026).
- Both lists can be appended to requests the app already makes: the
  show's to its images request (ADR 0012), the season's to the season
  request for episode stills.
- YouTube's videos cannot be played by the app's own video player: the
  only allowed way is YouTube's IFrame player. `react-native-webview` is
  included in Expo Go (SDK 58 docs), so the player runs without a
  development build.
- YouTube refuses some videos in an embedded player (embedding turned off
  by the owner, removed, or no origin given: error 153), and its player
  reports that with an error code.
- The App Store accepts YouTube's official player shown unchanged, and
  links to the YouTube app. It rejects apps that download or save YouTube
  videos (App Review Guideline 5.2.3), or that hide or cover YouTube's
  player or branding.

## Options
- **Open YouTube** (the app or the web): simplest, but leaves the app.
- **A Safari sheet** (`expo-web-browser`, already in the app): stays in
  the app, but shows YouTube's web page, its cookie prompt and its "open
  in app" banner.
- **YouTube's player in the app, full screen** (`react-native-webview`):
  closest to the owner's wish; needs a fallback for videos YouTube will
  not play here.

## Decision
**YouTube's own IFrame player in the app, full screen, with YouTube as the
fallback.**

- **Which videos:** official trailers and teasers in English on YouTube,
  from the list of the latest season with episodes listed (not one only
  announced, which TMDB often does not have yet) and the show's own, each once, newest
  first, at most six (`pickTrailers`, `logic/trailers.ts`). Clips,
  featurettes and opening credits are left out. No row without any.
- **No new requests in the usual case:** the show's videos are appended to
  its images request, the season's to its season request. The latest
  season's request is the episode row's when that shows the latest
  season, as it does on opening a running show; an ended show opens on
  season 1 and costs one request more.
- **The card:** YouTube's still for the video (`i.ytimg.com`, no key), a
  play button, the video's name and its day.
- **The player:** a full-screen black layer with YouTube's IFrame player,
  unchanged, from `youtube-nocookie.com`, starting at once, and a close
  button. Captions start off (`cc_load_policy: 0`, and the captions
  module unloaded the first time it loads): YouTube turned them on by
  itself, machine translated, over a trailer's burned-in subtitles; the CC
  button still turns them on (owner, 2026-11-08). YouTube's own
  full-screen button is hidden with its `fs: 0`
  parameter: the layer already fills the screen and turns with the phone
  (owner, 2026-11-08). Going straight to iOS's full-screen player
  (`playsinline: 0`) was weighed and left out: its closing reads to the
  app as a pause, so the layer could not tell when to close. The page is loaded with an https base (`PLAYER_ORIGIN`) and
  gives YouTube that origin, against error 153. A link out of the player
  (YouTube's logo) opens outside the app rather than replacing it.
- **The fallback:** when YouTube's player reports an error, or the page
  fails to load, a dialog over the player: "Playback unavailable in app",
  "This trailer can only be watched on YouTube.", Cancel and Open in
  YouTube. Both close the player; Open in YouTube opens the video's page,
  in the YouTube app when it is installed.
- **Nothing downloaded or saved, and nothing over YouTube's player.** The
  close button sits outside the player (`trailerPlayerLayout`): upright,
  a "Close" pill at the foot on the right, in reach of a thumb, with the
  player from under the status bar down to it; turned, the video the
  screen's full height, edge to edge, and a round button at the top of the
  black bar beside it (owner, 2026-11-08: a smaller video lost the full
  screen feel).
- **A pull down closes it too.** A gesture laid over the web view never
  saw the touch: iOS's web view takes it first. So the page, which fits
  the player and only bounces, closes the layer once pulled down past
  100 points (`pullClosesPlayer`). Whether YouTube's player lets the pull
  through is to be checked on a phone (a first try seemed to stop the
  player upright, but that was an Expo glitch; owner, 2026-11-08); the
  Close button stays either way,
  for VoiceOver and for anyone who does not know the pull. A player filling the screen had YouTube lay its
  title and controls out to the edges, under the button (owner,
  2026-11-08).

## Consequences
- A new package, `react-native-webview` (in Expo Go). Jest mocks it in
  `jest/setup.ts`.
- New places the app loads from: YouTube's player (`youtube.com`,
  `youtube-nocookie.com`) and its stills (`i.ytimg.com`). No key, no cost.
- **Privacy, before release:** YouTube's player can set cookies and collect
  data, even from `youtube-nocookie.com` once a video plays. The App Store
  privacy details must say so, and YouTube's terms ask for a privacy
  policy that names YouTube and links to Google's. Added to the release
  checklist (CRI-83).
- The cached answers grow by their videos: the images answer
  (`hero-images-v12`) and the season answer (`tmdb-season-v2`).
- **Only the player turns** (owner, 2026-11-08). `app.json` allows every
  orientation, and the app holds itself upright with
  `expo-screen-orientation` (in Expo Go): at launch, and again when the
  player closes; the player lets it turn while it is open. A native build
  also starts upright (the plugin's `initialOrientation: PORTRAIT_UP`).
  Before, `"orientation": "portrait"` kept iOS from turning anything, the
  player included. On iPad, a lock holds only with `ios.requireFullScreen`,
  and not reliably from iOS 27; the app is for iPhone now.
- PRD 5.5 no longer lists trailers as not included.
