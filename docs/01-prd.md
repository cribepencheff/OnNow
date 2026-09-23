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
- **Concept:** a large portrait poster card, nearly edge to edge, one show per
  card. Horizontal swipe between today's shows, page dots below. A label such
  as "NEW TODAY · 1/3" carries the count. Metadata line with episode code and
  service. "+" in the header.
- **Empty day:** the cards show the episodes of the next day with episodes,
  labelled with that day ("TOMORROW" or a date, with the year when it is
  not in the current year) and the count, in the same pager as today.
- **Below the card:** nothing, or at most one thin row. Decided in the Design
  phase.

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
  ("Episodes 1–8"). Episodes not yet available in Sweden are muted with the
  label (MVP). Tapping a row opens Show detail (MVP; in the PoC nothing
  happens).
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
- **Concept:** the list of followed series with next episode or status, and
  swipe to unfollow. A search field on top opens Search (5.4).

### 5.4 Search
- **Job:** add series quickly. Without series there is no app.
- **Needs:** find the right show, even when several share a name, and follow
  several in a row.
- **Entry points:** "+" on Home, the search field in Shows, and "Add your
  first show" on an empty Home. All open the same Search.
- **Presentation:** a sheet over the current view. Large search field on top
  with the keyboard already open. Results appear while typing.
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
  year and status ("2026 · Returning", "Ended"), a two line summary, and the
  services in Sweden on their own line (MVP; PoC shows the network).
- **Follow control:** a circle at the right edge of each row, aligned in one
  column. Not followed: hollow circle with a "+" at lower opacity. Followed:
  filled with the accent colour and a check, with light haptic feedback. The
  filled state is a status, not a competing action.
- **After following:** the row shows the next episode ("New today",
  "Next: Tomorrow", "Next: Tue 24 Sep", or "No date yet"), confirming the
  app knows the show. A date in another year than the current one shows
  its year ("Next: Fri 9 Jul 2027"), so a date far ahead does not read like
  one that has passed. When the next episode is episode 1 of a season, or
  an announced season's premiere date, it reads as a premiere instead of
  "Next:" ("Season 4 premiere · Fri 9 Jul 2027"). Data first: episode 1
  means a premiere, nothing is guessed. The Shows list uses the same labels.
- **Before typing:** "New this week": shows with a series premiere or a new
  season starting this week, each with a Follow button. "Trending" is a
  possible secondary list, added only if "New this week" proves too thin.
- **Edge cases:** no results gives a short hint to try the original title.
  Shows without an image get a neutral placeholder with the title. Running
  shows rank above ended ones.

### 5.5 Show detail (PoC slice, complete in MVP)
The PoC has a slice of this view with TVmaze data only: the network instead
of services, "Follow" and "Following" as the actions, and no "Not in Sweden
yet" state. Services, "Open in [service]" and the territory state come in
the MVP (CRI-79).

- **Job:** answer "is this the right show, and what is it?" and lead to the
  one thing to do next.
- **Entry points:** tapping a row in Search, the card on Home, an episode in
  Calendar, or a show in Shows. The same view everywhere.
- **Content (stripped):** large image on top in the same cinematic feel as
  Home, title, year, status, network or service, and the summary. Then two
  episode cards, next and latest, each with a landscape still, episode title,
  a short summary, "Episode 2 of 10" and relative time ("In 3 days",
  "Tomorrow", "2 days ago", no time of day). Then the services in the user's
  territory, each with the seasons it carries ("SkyShowtime · Season 1",
  "Apple TV · Seasons 1–2").
  References: Next Episode (episode blocks, "of 10"), PlayPilot (primary
  button by the image, services with season, episode cards with stills).
  Not included: cast, ratings, reviews, trailers, similar shows, FAQ, lists.
- **Between seasons:** when the current season has ended, the "next"
  episode card becomes a next season card, so it is clear when new episodes
  can be expected. It shows what the data source provides and nothing more:
  the next announced episode or season with its date if there is one,
  otherwise the show's status as the source states it. The exact states and
  wording are decided from the results of spike 0001 (principle: data first).
- **Status wording:** TVmaze's fixed status values are shown in plain words,
  here and in Shows and Search: "To Be Determined" reads "Renewal not
  announced", "In Development" reads "In development"; "Running" and
  "Ended" stay as they are. A translation of the source's own vocabulary,
  not a guess (CRI-81).
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
  - not in Sweden yet: muted, with the label
  - finale: a small "Finale" badge on the last episode of a season
  An announced season without episodes gets a muted tab with its premiere
  date or "Announced".
- **Primary action changes with state:** not followed gives a bold "Follow"
  in the accent colour. Followed gives "Open in [service]" as the primary
  action, with a quiet "Following" status that can be tapped to unfollow.
- **Search keeps its quick path:** the circle on the row follows without
  opening the detail view. Tapping the row opens the detail view.

### 5.6 Navigation rules
- **Going deeper gives a back arrow.** Views pushed on top of another (Show
  detail) have a back arrow top left and support the edge swipe back.
- **Opening something on top gives a close button.** Sheets (Search) close
  with a round close button (X) at the top right or a swipe down.
- **Inside a sheet the rules combine.** Show detail opened from Search has a
  back arrow to the results. The close button stays and closes all of
  Search, as does swiping the sheet down.

### 5.7 Fixed defaults
These are decisions, not settings. They match how the first user has set up
Next Episode. A setting is added only if real use shows it is needed.

| Behaviour | Default | Reference |
| --------- | ------- | --------- |
| Dates in the user's time zone | Always | ADR 0006 |
| Manual day offset | None | ADR 0006 |
| Specials | Hidden | FR-037 |
| First day of the week | From the phone's locale (Monday in Sweden) | 5.2 |
| Channel or service on episode rows | Shown | 5.2, 5.4 |
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
| FR-005 | Home shows the count of today's shows (for example "NEW TODAY · 1/3") | PoC |
| FR-006 | On a day without episodes, Home shows the episodes of the next day with episodes | PoC |
| FR-007 | "+" on Home opens Search as a sheet; the close button (X) or swipe down returns to Home | PoC |
| FR-008 | Calendar shows a month grid with days that have episodes marked, today preselected | PoC |
| FR-009 | Selecting a day in Calendar lists that day's episodes | PoC |
| FR-036 | Calendar swipes between months and shows a "Today" button when away from today | PoC |
| FR-037 | Specials are never shown, only regular episodes. No setting | PoC |
| FR-010 | Shows lists followed series with next episode or status | PoC |
| FR-011 | Data refreshes on app start when stale, and on pull to refresh | PoC |
| FR-012 | Several episodes of one show on the same day appear as one item | PoC |
| FR-013 | An empty follow list shows an empty Home with "Add your first show", which opens Search | PoC |
| FR-014 | "Open in [service]" opens the show in the service's app when the ID is known, otherwise the service's app, and the service's website when the app is not installed (ADR 0004) | MVP |
| FR-015 | When a show is on several services, a menu lets the user choose; the choice is remembered per show | MVP |
| FR-016 | Territory setting, defaulting to the phone's region | MVP |
| FR-017 | Service availability per territory decides which services are offered | MVP |
| FR-018 | Local notifications (model to be decided) | MVP |
| FR-019 | Settings view | MVP |
| FR-020 | iOS widget mirroring Home | After MVP |
| FR-021 | Direct links to the show for more services | After MVP |
| FR-022 | Explore: "what is releasing" feed with filters, starting with streaming service | After MVP |
| FR-023 | Android widget | After MVP |
| FR-024 | Search results show poster, title, year, status, a two line summary and a follow circle at the right edge | PoC |
| FR-025 | After following, the result row shows the next episode or "No date yet" | PoC |
| FR-026 | Before the user types, Search shows "New this week": series premieres and new seasons starting this week | MVP |
| FR-027 | Search results show the services that carry the show in the user's territory | MVP |
| FR-028 | Show detail view with image, title, year, status, service, summary, next and latest episode. PoC shows the network instead of the service | PoC |
| FR-029 | Show detail has one primary action: "Follow" when not followed, "Open in [service]" when followed. PoC: "Follow", and a quiet "Following" that unfollows; "Open in [service]" is MVP | PoC, MVP |
| FR-030 | Show detail opens from Search, Home, Calendar and Shows | PoC |
| FR-031 | Episodes whose season is not available in the user's territory are labelled "Not in [country] yet" and do not count as new today | MVP |
| FR-032 | Show detail has season tabs with the current season preselected and episodes marked aired, today, upcoming (muted), not in territory yet (muted) and finale. PoC: all but "not in territory yet", which is MVP | PoC, MVP |
| FR-033 | Announced future seasons appear as muted tabs with premiere date or "Announced" | PoC |
| FR-034 | Between seasons, the next episode card shows the next announced episode or season with its date, otherwise the show status from the data source | PoC |
| FR-035 | In Shows, a show between seasons shows its next announced date or its status from the data source instead of a next episode | PoC |

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
- **Territory gap (decided, FR-031):** an episode can air in the US before
  its season is available in Sweden (example: MobLand season 2 airs on
  Paramount+ in the US, while Swedish services only carry season 1). Such
  episodes are labelled "Not in Sweden yet" instead of counting as new today.
  Needs season level availability from the data source, to verify in the
  data source spike. The PoC week test measures how common this is.
- Name (working name: On Now)
- Notifications: morning summary, per episode, or both
- Menu for several services: anchored to the button or centred overlay
- What, if anything, sits below the Home card
- Android release timing
- Publisher in the App Store: personal or company
