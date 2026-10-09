# 0012. Hero image source: episode stills first

Status: Accepted; amendment proposed (CRI-124), awaiting the owner's approval

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

## Amendment (proposed): the highest-rated backdrop only (CRI-124, 2026-10-09)
Status: Proposed

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
