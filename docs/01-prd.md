# Product Requirements Document (PRD)

Status: draft. Owner: Cribe.

## 1. Overview
On Now is a stripped, cinematic radar for TV series. It shows which followed
series have a new episode today, with a calendar for past and upcoming
episodes. See `00-vision.md`.

## 2. Goals
- Answer "what came out today?" within two seconds of opening the app.
- Feel like a premium streaming service.
- Cost nothing to run.

## 3. Non-goals
Everything listed under "Not doing" in `00-vision.md`.

## 4. Target user
People who follow several series across several streaming services. The
first user is the author, who currently uses Next Episode.

## 5. Views

### 5.1 Home
- **Job:** answer "what came out today?" within two seconds.
- **Needs:** see which followed series have an episode today. Never meet a
  dead screen.
- **Concept:** a full-width backdrop hero (ADR 0012), one show per slide.
  Horizontal swipe between slides, page dots below. The hero covers the next
  7 days, today first. A show with several episodes in that window is one
  slide (CRI-94). A label such as "TODAY · 1/3" ("TOMORROW", "UPCOMING")
  carries the slide count. Two metadata lines: the original air date and
  episode code ("Fri 9 Oct · S2E4"), or a range ("5–7 Oct · S23E156–158",
  "S1E10–S2E1" across seasons, "Today–Thu" or "Tomorrow–Fri" when it starts today or tomorrow, always
  from today as days pass), then the first episode's title, or the count
  ("2 episodes") when a range starts with a placeholder title such as
  "Episode 9" or "TBA"; a single episode with a placeholder title reads
  "Title not announced" (FR-031). No network: where to watch is "Open in". Tapping the card
  opens Show detail (FR-030). No search entry while shows are followed:
  Search is reached from the Shows tab (FR-007).
- **Empty week:** when nothing airs within the 7 days, the cards show the
  episodes of the next day with episodes,
  labelled with that day ("TOMORROW" or a date, with the year when it is
  not in the current year) and the count, in the same pager as today.
- **Below the hero:** one row, "Top picks for you" (FR-038, ADR 0016):
  TMDB's recommendations for each followed show, already followed shows
  removed, ranked by how many followed shows recommend the same title, and
  only shows with at least one streaming service in the user's region
  (subscription, free or ads, add-on channels included; pay-TV never
  counts, the same rule as "Open in"). Not filtered by origin country or
  language. The cards are built from the app's existing components and design system
  tokens: a poster, the show's name, and the Search follow circle, which
  follows at once; tapping a card opens Show detail. A show followed from
  the row stays in it, marked as followed. A "Refresh" control under the
  row drops followed shows and shows the next ones in rank order (11–20,
  then 21–30, wrapping around when the list runs out), with no new TMDB
  fetch unless the day's data is stale. Hidden when the follow list is
  empty. The same row appears in Search before typing (FR-026), and
  Refresh there moves this row too.
- **Second row:** "Airing this week" (FR-039, ADR 0016): candidates from
  TMDB discover for the user's region and the week (on a streaming service
  there, an episode within the 7 days), in TMDB's popularity order, soaps
  excluded; each must have a streaming service in the region by the same
  rule as "Open in", and TVmaze decides: a show is in the row only if it
  would be in the hero if followed (a TVmaze episode within the 7 days),
  and only scripted shows and documentaries, no reality, talk shows, news,
  game shows, sports or soaps. Not filtered by origin country or language.
  Shows the user follows are left out. The same cards as
  "Top picks for you", plus the next episode's air date in the window in
  the hero's words ("Today", "Tomorrow", then the weekday, "Fri"). A show
  followed from the row stays in it, marked as followed; no Refresh.
  Always shown, also with an empty follow list, when it is the first row
  under the hero. The same row appears in Search before typing (FR-026).
  No all-time charts, and no trending without a time link, on Home.

### 5.2 Calendar
- **Job:** give an overview backwards and forwards in time.
- **Needs:** find what I missed, see what is coming and which days are busy.
  Followed series only, no filters, no "all shows" mode.
- **Month grid:** weeks start on the day the phone's locale says. Swipe
  sideways between months. Today has a ring and is preselected. Days with
  episodes are marked with a short line under the date, in the accent
  colour (a status, like the follow check). The selected day is filled.
  Reference: Next Episode's calendar, which marks days with an underline.
- **Day list:** below the grid, the selected day's episodes. Rows use the
  same visual language as Search: poster, show title, episode code and
  episode title. Several episodes of one show on the same day become one row
  ("Episodes 1–8"). Episodes not yet available in the user's region are
  muted with the label (after MVP, ADR 0015). Tapping a row opens Show
  detail (MVP; in the PoC nothing happens).
- **Empty day:** a short line, for example "Nothing on this day".
- **Back to today:** when the user has moved away from today, a "Today"
  button appears. It is the only primary action in the view and disappears
  when today is selected again.
- **Range:** no artificial limit. Everything the data source has for the
  followed series, past and announced, can be shown (principle: data
  first).

### 5.3 Shows
- **Job:** manage what I follow.
- **Needs:** see that the list is right, unfollow, and reach search.
- **Concept:** the list of followed series with their status, and swipe to
  unfollow. A search field on top opens Search (5.4).
- **Search field:** always visible at the top. Tapping it opens the Search
  sheet with the keyboard open (FR-007). It does not filter the list.
- **Two segments (FR-010):** "Active" and "Inactive", each header with its
  count. Alphabetical by title within each. Both are always open, and each
  header stays at the top while its rows scroll. A segment without shows
  is left out.
  - **Active:** something is airing now, or a new season is confirmed:
    airing (including a show whose latest episode is out today with
    nothing dated after it, and a show mid-season whose next episode is
    listed without an airstamp yet), a dated next season, or a new season
    listed without a date (TBA).
  - **Inactive:** between seasons, future uncertain, ended.
- **Row (FR-010, FR-035):** poster, title, the status line from Show detail
  in its wording ("Airing · next ep Fri 9 Oct", "Season 3 · TBA", "Ended",
  5.5), and the service slot: "On [service]" or plain "Unavailable", without
  the region name (FR-027, CRI-97). Nothing when TMDB does not know the
  show (CRI-102). Tapping the row opens Show detail (FR-030).
- **Unfollow (FR-002):** swiping a row left reveals an "Unfollow" button;
  tapping it unfollows. A full swipe never unfollows on its own. Screen
  reader users get "Unfollow" as an accessibility action on the row
  (NFR-008).
- **Empty state:** with no followed shows, a short line and a button that
  opens Search, in the same pattern as Home's "Add your first show"
  (FR-013).
- **Refresh and footer:** pull to refresh (FR-011). The footer keeps the
  "Streaming region" line (FR-016) and the TVmaze credit (NFR-007).

### 5.4 Search
- **Job:** add series quickly. Without series there is no app.
- **Needs:** find the right show, even when several share a name, and follow
  several in a row.
- **Entry points:** the search field in Shows, the button on an empty
  Shows list, and "Add your first show" on an empty Home. All open the same
  Search (FR-007).
- **Presentation:** a sheet over the current view. Large search field on top
  with the keyboard already open. Results appear while typing, after a
  short pause (about 250 ms) so each keystroke is not a request. A clear
  button (X) inside the field empties it, the same on iOS and Android.
- **Scope:** Search finds every show in TVmaze. It is not filtered by
  region or by show type: talk shows, reality and shows unavailable in the
  user's region are all found. Each show appears once.
- **Leaving:** a round close button (X) at the top right, next to the search
  field, or swipe the sheet down. The close button is always visible, also
  while the keyboard is open (references: Next Episode's search, current iOS
  sheets). Both return to where you came from, so from Home you are back on
  Home with the new shows in place. There is no "Cancel": following is saved
  immediately, the close button only closes.
- **Keyboard:** open on entry. Following a show keeps it open, so several
  shows can be followed in a row. Dragging the results or pressing the
  return key ("Search") closes it. Autocorrect and spell check are off, so
  original titles are not rewritten.
- **Result row (references: PlayPilot, Spotify "Add to playlist"):** large
  portrait poster on the left. Next to it: title in bold, a meta line with
  year and genres ("2026 · Drama, Thriller"), the status line (below), and
  the service slot on its own line, by the same rules as the Shows row: "On [service]", or plain
  "Unavailable" when there is none (Show detail and the Home hero name the
  region, rows do not), and nothing when TMDB does not know the show
  (FR-027, CRI-97, CRI-102). No summary and no IMDb rating: the rating is
  shown only in Show detail, to save OMDb calls (ADR 0013). The original
  network is not shown.
- **Follow control:** a circle at the right edge of each row, aligned in one
  column. Not followed: hollow circle with a "+" at lower opacity. Followed:
  filled with the accent colour and a check, with light haptic feedback. The
  filled state is a status, not a competing action.
- **Status line (FR-025):** every row shows the status line from Show
  detail, the same as the Shows row ("Airing · next ep Fri 9 Oct",
  "Season 3 · TBA", "Ended", 5.5), followed or not, so it helps decide what
  to follow and the row does not change height when followed. It comes
  from the same cached show lookup as Show detail; the pause in typing and
  that cache keep it within TVmaze's rate limit (NFR-005).
- **Before typing (FR-026):** Home's two poster rows, reused as they are:
  the same component, titles and data (5.1, FR-038, FR-039).
  "Top picks for you" with its "Refresh" control, then "Airing this week".
  With an empty follow list, only "Airing this week", as on Home. Both are
  region filtered as on Home. Refresh is shared with Home: refreshing in
  Search also moves Home's row to the next picks. The poster rows
  deliberately look different from search results.
- **Edge cases:** no results gives a short hint to try the original title.
  A show without an image gets no poster, as everywhere in the app (design
  system: "No image: show nothing, never a grey placeholder box"): the
  poster space stays empty and the title stays in its column. Running
  shows rank above ended ones.

### 5.5 Show detail (PoC slice, complete in MVP)
The PoC has a slice of this view with TVmaze data only: the network instead
of services, "Follow" and "Following" as the actions, and no "Not in Sweden
yet" state (CRI-79). "Open in [service]" is part of the PoC too, for the
show's Swedish service from TMDB (CRI-80, CRI-82, FR-014). Without a
button, a quiet text says what TMDB's data shows: "Unavailable in
[region]" ("Unavailable in Sweden", from the region setting) when there is
no service in the user's region (MVP; the PoC said "Not streaming in
Sweden"), or "On [service]" for a service the app cannot link to (CRI-84,
CRI-91, CRI-97). The Home hero uses the same text. This is availability per show, since TMDB cannot
give it per season (spike 0002). The list of services in the user's
territory, the menu for several services (FR-015) and the territory state
per season come in the MVP.

- **Job:** answer "is this the right show, and what is it?" and lead to the
  one thing to do next.
- **Entry points:** tapping a row in Search, the card on Home, an episode in
  Calendar, or a show in Shows. The same view everywhere.
- **Content (stripped):** large image on top in the same cinematic feel as
  Home, title, a meta line ("2026 · Philippines · Drama, Thriller": year,
  first origin country, genres), status, service, and the summary. Then two
  episode cards, next and latest, each with a landscape still, episode title,
  a short summary, "Episode 2 of 10" and relative time ("In 3 days",
  "Tomorrow", "2 days ago", no time of day). Then the services in the user's
  territory, each with the seasons it carries ("SkyShowtime · Season 1",
  "Apple TV · Seasons 1–2").
  References: Next Episode (episode blocks, "of 10"), PlayPilot (primary
  button by the image, services with season, episode cards with stills).
  The IMDb rating sits just below the backdrop, above the meta line,
  linked to the show on IMDb, and is left out when there is none (CRI-87,
  ADR 0013).
  Not included: cast, other ratings, reviews, trailers, similar shows, FAQ,
  lists.
- **Between seasons:** when the current season has ended, the "next"
  episode card becomes a next season card, so it is clear when new episodes
  can be expected. It shows what the data source provides and nothing more:
  the next announced episode or season with its date if there is one,
  otherwise the show's status as the source states it. The exact states and
  wording are decided from the results of spike 0001 (principle: data first).
- **Hero (CRI-86):** a square crop of a textless TMDB backdrop (ADR 0012).
  On the backdrop, as on Home: the show's TMDB logo (the title as text when
  there is none) and "Open in [service]" as a full button in every state,
  followed or not. Below the backdrop: the meta line (year · first origin country · genres; the
  country is the show's origin, kept on purpose, while the original network
  stays out of the UI), the status line,
  then a "Follow" / "Following" toggle button that updates at once.
- **Status line (CRI-86):** one state derived from TVmaze's status,
  episodes and seasons, dated facts first: "Airing · next ep <date>" (next
  episode in the season that is airing), "Airing · new ep today" (the
  latest episode is out today and nothing is dated after it), "Airing ·
  next ep TBA" (the next episode in the season that is airing is listed
  without a date), "Season <n> · <date>" (a dated
  next season), "Season <n> · TBA" (a new season listed without a date),
  "Between seasons" (Running, nothing listed; no renewal implied), "Future
  uncertain" (To Be Determined), "Ended". It alone says whether anything is
  airing. TVmaze and TMDB give season dates as full dates or none, never a
  year only, so there is no year state.
  The same line is used on the Shows row (5.3) and on a followed Search
  row (5.4), and its state decides the Shows segment.
  When it falls back to TVmaze's raw status, "In Development" reads "In
  development" (CRI-81).
- **Season drops:** when several episodes of a season come out on the same
  day, the latest or next card shows them as one item, for example "Season
  1 · all 8 episodes · Wed 16 Sep" (same grouping as FR-012). "all" only
  when the season's episode order equals the number released that day,
  otherwise "3 episodes". An upcoming drop that starts a season reads
  "Season 3 premiere · all 8 episodes · Thu 16 Oct". When every episode of
  the latest season is out and the count matches the episode order, a quiet
  "All episodes available" sits under the status line (CRI-81).
- **Seasons and episodes:** below the episode cards, season tabs with the
  current season preselected (not season 1). Each episode shows number,
  title and relative date. States:
  - aired: normal style
  - today: a quiet highlight (a status, not an action)
  - upcoming: muted, with date or "TBA"
  - not in the user's region yet: muted, with the label (after MVP, ADR
    0015)
  - finale: a small "Finale" badge on the last episode of a season
  An announced season without episodes gets a muted tab with its premiere
  date or "Announced".
- **Two actions, followed or not (CRI-86):** a "Follow" / "Following"
  toggle button ("Follow" in the accent colour, "Following" quiet; tap again
  to undo) and "Open in [service]" as a full button whenever the show has a
  service in the user's region. Without a service, a quiet text says what
  the data shows instead.
- **Search keeps its quick path:** the circle on the row follows without
  opening the detail view. Tapping the row opens the detail view.

### 5.6 Navigation rules
- **Going deeper gives a back arrow.** Views pushed on top of another (Show
  detail) have a back arrow top left and support the edge swipe back.
- **Opening something on top gives a close button.** Sheets (Search) close
  with a round close button (X) at the top right or a swipe down.
- **Inside a sheet, going deeper gives only a back arrow.** Show detail
  opened from Search (a result or a poster card) has a back arrow to Search
  and no close button. Swiping the sheet down still closes all of Search.

### 5.7 Fixed defaults
These are decisions, not settings. They match how the first user has set up
Next Episode. A setting is added only if real use shows it is needed.

| Behaviour | Default | Reference |
| --------- | ------- | --------- |
| Dates in the user's time zone | Always | ADR 0006 |
| Manual day offset | None | ADR 0006 |
| Specials | Hidden | FR-037 |
| First day of the week | From the phone's locale (Monday in Sweden) | 5.2 |
| Service on rows | Shown on Search and Shows rows: the services in the user's region, or "Unavailable" (FR-010, FR-027) | 5.3, 5.4 |
| Original network on rows and in the hero | Not shown; where to watch is "Open in" | 5.1, 5.4, ADR 0015 |
| Time of day | Not shown | ADR 0001 |
| Theme | Dark only, no light mode and no system setting | ADR 0011 |

### 5.8 Settings (MVP)
Reached from an icon. Territory and notifications.

## 6. Functional requirements

| ID     | Requirement | Phase |
| ------ | ----------- | ----- |
| FR-001 | Search series by name | PoC |
| FR-002 | Follow and unfollow a series | PoC |
| FR-003 | The follow list is stored on the device and survives a restart | PoC |
| FR-004 | Home shows followed series with an episode released today | PoC |
| FR-005 | Home shows the slide count with a day label ("TODAY · 1/3", "TOMORROW", "UPCOMING") | PoC, MVP |
| FR-006 | When nothing airs within the hero's 7 days, Home shows the episodes of the next day with episodes | PoC, MVP |
| FR-007 | Search opens as a sheet from the search field in Shows, from the button on an empty Shows list, and from "Add your first show" on an empty Home (FR-013). With shows followed, Home has no search entry. The close button (X) or swipe down returns to where Search was opened | PoC, MVP |
| FR-008 | Calendar shows a month grid with days that have episodes marked, today preselected | PoC |
| FR-009 | Selecting a day in Calendar lists that day's episodes | PoC |
| FR-036 | Calendar swipes between months and shows a "Today" button when away from today | PoC |
| FR-037 | Specials are never shown, only regular episodes. No setting | PoC |
| FR-038 | Under the hero, Home shows one row, "Top picks for you": TMDB recommendations for each followed show, followed shows removed, ranked by how many followed shows recommend the same title, cached for a day, only shows with at least one streaming service in the user's region (subscription, free or ads, add-on channels included; pay-TV never counts, the same rule as "Open in"), not filtered by origin country or language. The cards are built from the app's existing components and design system tokens; each follows at once from its circle and opens Show detail on a tap, and a show followed from the row stays in it, marked as followed. A "Refresh" control under the row drops followed shows and shows the next ones in rank order (11–20, then 21–30, wrapping around), with no new TMDB fetch unless the day's data is stale. Hidden when the follow list is empty (ADR 0016) | MVP |
| FR-039 | Under "Top picks for you", Home shows "Airing this week": candidates from TMDB discover for the user's region and the week (on a streaming service there, an episode within the 7 days, soaps excluded) in TMDB's popularity order, kept only when the show has a streaming service in the region by the same rule as "Open in", TVmaze has an episode within the hero's 7 days (it would be in the hero if followed) and TVmaze's type is scripted, animation or documentary (no reality, talk, news, game shows, sports or soaps), not filtered by origin country or language, followed shows left out, each card with the next episode's air date ("Today", "Tomorrow", "Fri"), following at once from its circle and opening Show detail; a show followed from the row stays in it, marked as followed. Always shown, also with an empty follow list (ADR 0016) | MVP |
| FR-010 | Shows lists followed series in two segments with counts, "Active" (airing, including an episode out today with nothing dated after it and a next episode listed without an airstamp; a dated next season; a next season listed without a date) and "Inactive" (between seasons, future uncertain, ended), alphabetical within each, both always open, each header sticky while its rows scroll, a segment without shows left out. Each row: poster, title, Show detail's status line (FR-035) and the service slot, "On [service]" or plain "Unavailable", nothing when TMDB does not know the show (CRI-97, CRI-102). With no followed shows, a button opens Search | PoC, MVP |
| FR-011 | Data refreshes on app start when stale, and on pull to refresh | PoC |
| FR-012 | Several episodes of one show on the same day appear as one item. On the Home hero, all of a show's episodes within the 7 days are one slide with a date and episode range (CRI-94) | PoC, MVP |
| FR-013 | An empty follow list shows an empty Home with "Add your first show", which opens Search | PoC |
| FR-014 | "Open in [service]" opens the show in the service's app when the ID is known, otherwise the service's app, and the service's website when the app is not installed (ADR 0004). PoC: in Show detail when followed, for the show's Swedish service from TMDB: the show itself when TVmaze's official site is on that service (Apple TV, Netflix, HBO Max), otherwise the service's start page; no Swedish service gives no button (ADR 0004, CRI-82). Several services: one is picked, the menu (FR-015) is MVP. MVP: pay-TV and operator apps never count; add-on channels open their host app ("Open in Prime Video"); a line below the button, a bag icon with "Requires hayu subscription", marks the extra subscription in Show detail and on Home; the button itself has no icon, and its screen reader label says "Open in Prime Video, requires hayu subscription" (CRI-101); the button appears only when it opens the service itself. When several qualify, the order is: the show's own page on a listed service, then a listed service's start page, then an add-on channel's host, with TMDB's order within each, so a service's own offer always beats an add-on channel ("Open in MUBI", not "Open in Prime Video" for MUBI Amazon Channel; ADR 0004). Otherwise the info area below the hero lists the services as text ("On Crunchyroll, HIDIVE") or says "Unavailable in [region]" (Show detail and the Home hero) when there is no service in the user's region (ADR 0004, CRI-90, CRI-91, CRI-97) | PoC, MVP |
| FR-015 | When a show is on several services, a menu lets the user choose; the choice is remembered per show | MVP |
| FR-016 | Territory setting, defaulting to the phone's region (ADR 0014). Until a settings view exists, a "Streaming region" line in the Shows footer opens the picker (CRI-88) | MVP |
| FR-017 | Service availability per territory decides which services are offered | MVP |
| FR-018 | Local notifications (model to be decided) | MVP |
| FR-019 | Settings view | MVP |
| FR-020 | iOS widget mirroring Home | After MVP |
| FR-021 | Direct links to the show for more services | After MVP |
| FR-022 | Explore: "what is releasing" feed with filters, starting with streaming service | After MVP |
| FR-023 | Android widget | After MVP |
| FR-024 | Search results show poster, title, a meta line with year and genres, Show detail's status line (FR-025), the service slot (FR-027) and a follow circle at the right edge. PoC: year and status, and a two line summary. MVP: no summary, no TVmaze status in the meta line and no IMDb rating (the rating is in Show detail only). Results appear after a short pause in typing (about 250 ms), each show once, and are not filtered by region or show type. A clear button (X) inside the field on iOS and Android | PoC, MVP |
| FR-025 | After following, the result row shows the next episode or "No date yet" (PoC). MVP: every result row shows Show detail's status line, followed or not, the same as the Shows row (FR-035), from the cached show lookup | PoC, MVP |
| FR-026 | Before the user types, Search shows Home's rows as they are: "Top picks for you" with its shared Refresh (FR-038), then "Airing this week" (FR-039); only "Airing this week" when the follow list is empty. Region filtered as on Home (CRI-98) | MVP |
| FR-027 | Search results and Shows rows show the services that carry the show in the user's territory, or plain "Unavailable" when there is none, and nothing when TMDB does not know the show; the row does not name the region, unlike Show detail (CRI-91, CRI-97, CRI-102) | MVP |
| FR-028 | Show detail view with image, title, year, status, service, summary, next and latest episode. PoC shows the network instead of the service. MVP: a meta line with the premiere year, the first origin country from TMDB and up to three genres from TVmaze ("2026 · Philippines · Drama, Thriller"), any missing part left out; the country is the show's origin, kept on purpose, and the original network stays out of the UI. MVP adds the IMDb rating from OMDb (ADR 0013) | PoC, MVP |
| FR-029 | Show detail has a "Follow" / "Following" toggle button and, followed or not, "Open in [service]" as a full button when the show has a service in the user's territory (CRI-86). PoC: "Follow", and a quiet "Following" that unfollows; "Open in [service]" only when followed, for the show's Swedish service (FR-014); the service list in the user's territory is MVP | PoC, MVP |
| FR-030 | Show detail opens from Search, Home, Calendar and Shows | PoC |
| FR-031 | MVP: episode dates are the original air date, shown as a date with no verb and no network ("Fri 9 Oct · S2E4", with the episode title on the line below). "Open in" says the series is on a service in the user's region, never that the episode is. No "Not in [country] yet" label (ADR 0015). After MVP: episodes not yet available in the user's region are labelled "Not in [country] yet" and do not count as new today, from per-episode availability behind our own server (spike 0003, ADR 0015) | MVP, After MVP |
| FR-032 | Show detail has season tabs with the current season preselected and episodes marked aired, today, upcoming (muted), not in territory yet (muted) and finale. PoC and MVP: all but "not in territory yet", which comes after MVP (ADR 0015) | PoC, After MVP |
| FR-033 | Announced future seasons appear as muted tabs with premiere date or "Announced" | PoC |
| FR-034 | Between seasons, the next episode card shows the next announced episode or season with its date, otherwise the show status from the data source | PoC |
| FR-035 | In Shows, a show between seasons shows its next announced date or its status from the data source instead of a next episode (PoC). MVP: every Shows row uses Show detail's status line in its wording ("Airing · next ep Fri 9 Oct", "Season 3 · TBA", "Ended") | PoC, MVP |

## 7. Non-functional requirements

| ID      | Requirement |
| ------- | ----------- |
| NFR-001 | Home shows cached data immediately and answers the core promise within two seconds of opening the app |
| NFR-002 | The app works offline with cached data and shows when it was last updated |
| NFR-003 | No backend and no running cost |
| NFR-004 | No account. The follow list never leaves the device |
| NFR-005 | API rate limits are respected, with backoff on HTTP 429 |
| NFR-006 | Storage is plain and shareable so a widget can read it later |
| NFR-007 | Data sources are attributed according to their terms |
| NFR-008 | Supports Dynamic Type, screen readers and sufficient contrast over images |

## 8. Data and integrations
TVmaze is accepted for the PoC. TMDB and Wikidata are proposed for MVP and
later. See `decisions/0005-data-sources.md`.

## 9. Open questions
- **Territory gap (decided, FR-031, ADR 0015):** an episode can air in the
  US before it is available in the user's region (example: MobLand season 2
  on Paramount+ in the US, about four days ahead of SkyShowtime in Sweden).
  In the MVP the app labels dates as the original premiere and does not
  claim regional availability. A "Not in [country] yet" label needs
  per-episode availability behind our own server, for a public release
  (spike 0003).
- Name (working name: On Now)
- Notifications: morning summary, per episode, or both
- Menu for several services: anchored to the button or centred overlay
- Android release timing
- Publisher in the App Store: personal or company
