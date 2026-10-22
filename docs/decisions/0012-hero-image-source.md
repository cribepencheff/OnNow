# 0012. Hero image source: episode stills first

Status: Accepted, amended (CRI-124)

## Context
The Home hero (direction B) shows one image per slide, behind the show
title and episode meta. We had to decide which image to show and from
where. All image data comes from TMDB (ADR 0005). TMDB offers backdrops
at the show level and stills at the episode level; a show has several
backdrops, an episode has zero or more stills.

## Options
- **Show backdrop only:** one image per show, reused for every episode.
  Simple, but every slide of the same show looks identical, and the image
  says nothing about the specific episode.
- **Episode still, with a show backdrop fallback:** the image belongs to
  the episode when one exists, otherwise the show's backdrop.
- **Stored "official" backdrop with a re-pick window:** a per-show
  backdrop kept in storage, re-picked in a window around each release,
  using `/tv/{id}/changes` to find the newest upload. Built first, then
  abandoned (see Decision).
- **Previous episode's still as a stand-in** for upcoming episodes that
  have no still yet.

## Decision
Use the **episode still first, and the show's highest-rated backdrop as
the fallback.**

The fallback is chosen as: textless backdrops first (those without burned-in
title text), then highest `vote_average`, with `vote_count` as the
tie-break. The highest-rated backdrop is computed on every fetch; it is
not stored and sits behind no re-pick window.

## Consequences
- Upcoming episodes often have no still yet, so a large share of slides
  show the show backdrop. This is expected.
- Several episodes of the same show within the hero's horizon, all
  without stills, share one backdrop; the dots and the meta line are then
  the only thing distinguishing them.
- `ShowImages` keeps `mostVoted`, `secondMostVoted` and `textlessCount`
  for the dev image screen; the app itself does not read them.
- The show images request (`/tv/{id}/images`) is still made even when a
  slide uses a still, because the logo comes from the same response.

## Rejected: the stored backdrop pick
The stored "official" backdrop, its re-pick window
(`HERO_BACKDROP_LEAD_DAYS` / `SETTLE_DAYS`) and the six sequential
`/tv/{id}/changes` requests were removed once stills were adopted. The
re-pick window existed to wait out TMDB's upload delay for *new*
backdrops after a release; a highest-rated pick draws from backdrops that
already exist, so there is no delay to wait out. The six sequential
requests were also the largest single per-show latency cost on a cold
cache.

## Rejected: the previous episode's still
Considered for upcoming episodes with no still. Rejected: the image would
belong to the wrong episode, which defeats the point of using a still,
and it could reveal something from an episode the user has not seen. The
show backdrop is neutral and is preferred.

## Note
A caching lesson surfaced during this work: `useShowImages` is persisted
with `staleTime: Infinity` and a daily key, so changing the `ShowImages`
shape left cached entries missing new fields and slides rendered black.
The query key is versioned and must be bumped on any shape change. This
belongs with the data-fetching decision (ADR 0009) rather than here.

## Amendment: the highest-rated backdrop only (CRI-124, 2026-10-09)
Status: Accepted (approved with #71, 2026-10-10)

### Context
Stills were chosen so that several slides of one show would not look
identical. Since CRI-94 the hero has one slide per show, so that reason no
longer applies. Meanwhile stills have costs: an upcoming episode usually has
none yet, so the hero mixed stills and backdrops; stills are screenshots,
often lower resolution, framed for the episode rather than for a poster
wall; and a still can give away something from an episode the user has not
seen.

### Decision
The hero shows **the show's highest-rated backdrop**, by the rule above:
textless backdrops first, then highest `vote_average`, with `vote_count` as
the tie-break. No episode stills on the hero.

### Consequences
- One image per show, the same on every visit, curated, usually larger, and
  never a spoiler.
- The episode still lookup (`/tv/{id}/season/{s}/episode/{e}/images`, one
  request per slide) and its code are removed; only the show images request
  (backdrops and logo) remains. Show detail's own episode stills are not
  affected.
- The first consequence above ("a large share of slides show the show
  backdrop") and the second (several slides sharing one backdrop) no longer
  apply: every slide shows its show's backdrop, and a show has one slide.
- The hero draws the backdrop over its upper part, mirrored and blurred
  below (design system, Home refinement round); the image source does not
  change that.

## Amendment: the backdrop's size (CRI-140, 2026-10-22)
Status: Accepted (approved with #102, 2026-10-22)

### Context
The hero fetched its backdrop at "original", often 3840×2160 and about
800 kB, chosen for sharpness (CRI-124). The hero's image box is tall, so
the image fills it by height: on an iPhone 15 Pro it needs about 1,370
pixels of image height. TMDB's documented backdrop sizes are w300, w780,
w1280 and "original"; w1280 (720 pixels tall) is enlarged about 1.9 times
and visibly softer. TMDB's image server also serves w1920 (1920×1080,
about 255 kB for the same image), which TMDB's own website uses but its
`/configuration` does not list. Query strings are ignored, and other
sizes are refused.

With only the settled slide and its neighbours drawing the sharp image
(CRI-136), the owner compared "original" with w1920 on the phone and saw
no difference.

### Decision
The hero and Show detail fetch their backdrop at **w1920**, the largest
size fetched. If w1920 fails to load, the same image is fetched at
"original" instead.

### Consequences
- A third of the download per backdrop, and about a quarter of the
  decoding work and its passing memory (about 8 MB per image instead of
  33 MB), so a launch shows the sharp image sooner.
- w1920 is enlarged about 1.3 times on today's phones; the owner could
  not tell it from "original".
- Show detail's square backdrop goes from w1280 (enlarged about 1.6
  times) to w1920 (about 1.1 times).
- The size is not documented, so TMDB may drop it without notice; the
  fallback to "original" keeps every backdrop showing if it does.
- The posters (w500, TVmaze medium) already match their drawn size and
  are unchanged.

## Amendment: when there is no backdrop (CRI-100, 2026-10-22)
Status: Proposed

### Context
A few small shows have no TMDB backdrop (5 of 142 matched in a sample of
197 scripted, animation and documentary shows airing that week); TVmaze
had an image for every one of them. A show announced but not out yet,
such as *The Girl with the Dragon Tattoo*, often has no image anywhere.
The hero then showed its text on black, and Show detail an empty square.

### Decision
The hero and Show detail take the first there is:
1. TMDB's highest-rated backdrop, as above.
2. TVmaze's poster, already in the show's data, so no request. Cropped
   from the top, where a poster's title usually is not; a title that
   still shows is accepted as rare.
3. A "No image" placeholder (design system): a still, dark gradient,
   never a guess at a picture.

TMDB's poster is not used: it would take another request, and in the
sample TVmaze had an image for every show it would have covered.

### Consequences
- Nothing is chosen while TMDB's answer is on its way, so a poster never
  flashes in before the backdrop.
- A list's small poster (Shows, Search, Calendar) shows the placeholder's
  surface without words; it already used TVmaze's poster.
- Once a show gets its images, they appear by themselves: TVmaze's data
  is refreshed within an hour, TMDB's images within a day.
