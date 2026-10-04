// Pure math and derivation behind the Home hero carousel
// (components/Hero/*): the bidirectional loop's physical/logical index
// mapping, the settled-pageIndex-only dot indicator, the paging release
// target, the pull-to-refresh backdrop stretch, and which slides the pager
// shows at all. No React in this file.

import { episodesLabel, upcomingDayLabel } from "@/logic/home";
import {
  addDays,
  localDateFromAirstamp,
  type LocalDate,
} from "@/logic/local-date";
import { formatLabelDate } from "@/logic/next-episode-label";
import { searchResultNetworkName } from "@/logic/search-results";
import { serviceLink, type ServiceLink } from "@/logic/service-link";
import {
  availabilityText,
  openInLink,
  type StreamingProvider,
} from "@/logic/streaming-service";
import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";

// How far the backdrop trails the slide's own horizontal scroll (Apple TV+
// style parallax), as a fraction of one page width. 0 pins the backdrop to
// the slide; 1 would move it a full page width, same as the content itself
// (no parallax at all).
export const HERO_PARALLAX_FACTOR = 0.75;

// How visible each slide is at the mid-swipe blend point, a half page away
// from center, where the outgoing and incoming backdrops overlap. 1 would
// mean no fade at all.
export const HERO_CROSSFADE_FLOOR = 0.45;

// At most this many dots show at once; beyond that, the indicator shows a
// window around the active page instead of one dot per slide.
const DOT_WINDOW_SIZE = 8;
const DOT_WINDOW_HALF = Math.floor(DOT_WINDOW_SIZE / 2);

// The window of dot indices to render around the settled page, and whether
// slides exist beyond each end of it. Pure and settled-index only: the
// dots are a function of pageIndex alone, recomputed once per settle
// (see PageIndicator), never per scroll frame.
export function dotWindowRange(
  count: number,
  pageIndex: number,
): { start: number; end: number; hasMoreLeft: boolean; hasMoreRight: boolean } {
  if (count <= DOT_WINDOW_SIZE) {
    return { start: 0, end: count, hasMoreLeft: false, hasMoreRight: false };
  }
  const start = Math.max(
    0,
    Math.min(pageIndex - DOT_WINDOW_HALF, count - DOT_WINDOW_SIZE),
  );
  const end = start + DOT_WINDOW_SIZE;
  return { start, end, hasMoreLeft: start > 0, hasMoreRight: end < count };
}

export type DotKind = "normal" | "edge" | "active";

// What each rendered dot position looks like, for a given settled
// pageIndex: a pure function of dotWindowRange plus which slide is active,
// with no rendering or animation concerns of its own. The "active" check
// comes first, though it can never actually collide with "edge" in
// practice: dotWindowRange only ever flags a position as having more
// slides beyond it (hasMoreLeft/hasMoreRight) on the side where the
// window isn't pinned, which is exactly the side with enough margin from
// pageIndex for that position to never BE pageIndex.
export function dotKinds(
  count: number,
  pageIndex: number,
): { index: number; kind: DotKind }[] {
  const { start, end, hasMoreLeft, hasMoreRight } = dotWindowRange(
    count,
    pageIndex,
  );
  const kinds: { index: number; kind: DotKind }[] = [];
  for (let index = start; index < end; index++) {
    const kind: DotKind =
      index === pageIndex
        ? "active"
        : (index === start && hasMoreLeft) ||
            (index === end - 1 && hasMoreRight)
          ? "edge"
          : "normal";
    kinds.push({ index, kind });
  }
  return kinds;
}

// How far ahead of release (onScrollEndDrag) a fast flick's offset is
// projected, when there's no native paging target to trust directly (see
// targetOffsetX below). Tuned for iOS's own velocity unit (points/ms,
// confirmed from RCTScrollViewComponentView.mm: onScrollEndDrag forwards
// UIKit's scrollViewWillEndDragging:withVelocity: value unmodified); a
// fast flick is commonly a few tenths of a point per ms, so 250ms projects
// that into a meaningful fraction of a page without overshooting a slow
// drag's small residual velocity.
const RELEASE_PROJECTION_MS = 250;

// The page a paging horizontal scroll will settle on, computed at release
// (HeroPager's onScrollEndDrag) rather than waiting for the full
// deceleration tail (onMomentumScrollEnd): pageIndex, and everything that
// follows it (dots, pill, countdown, contentMountRange), can then commit
// while the swipe is still visually mid-flight, in sync with ContentLayer's
// own native scrollX-driven crossfade, which is already most of the way
// faded in by release. Pure and exported for its own unit tests. Never
// returns more than one page away from startPage: paging can't skip pages,
// so neither can the page committed for it.
//
// targetOffsetX is UIKit's own already-computed landing offset
// (NativeScrollEvent.targetContentOffset.x; iOS only, RN's own types say
// so) and is trusted directly when present, since it already reflects
// UIKit's paging snap for a pagingEnabled scroll view, not an estimate.
// Without it (Android has no equivalent), this falls back to projecting
// the release offset forward by velocityX: what makes a fast flick that
// never crosses the halfway mark still page forward, the way the real
// paging scroll would once it decelerates, without waiting for that.
export function pagingReleaseTarget(
  offsetX: number,
  pageWidth: number,
  pageCount: number,
  startPage: number,
  velocityX: number,
  targetOffsetX: number | null,
): number {
  if (pageWidth <= 0 || pageCount <= 0) {
    return Math.min(Math.max(startPage, 0), Math.max(pageCount - 1, 0));
  }

  const clampToNeighbor = (page: number) =>
    Math.min(
      Math.max(page, Math.max(0, startPage - 1)),
      Math.min(pageCount - 1, startPage + 1),
    );

  if (targetOffsetX !== null) {
    return clampToNeighbor(Math.round(targetOffsetX / pageWidth));
  }

  const projected = offsetX + velocityX * RELEASE_PROJECTION_MS;
  return clampToNeighbor(Math.round(projected / pageWidth));
}

// Bidirectional loop (Apple TV+ style) for the hero pager. pageIndex, and
// everything derived from it (dots, pill, countdown, contentMountRange,
// badges), stays LOGICAL throughout, 0..count-1; only the FlatList's own
// physical data array and scroll position know the loop exists at all. The
// physical list pads one duplicate of the last slide before the first, and
// one duplicate of the first slide after the last, so swiping past either
// edge lands on a real, already-rendered slide (not an empty page) whose
// content happens to be identical to the real slide it stands in for. Once
// the native scroll genuinely settles there, HeroPager's handleScrollEnd
// silently repositions it onto that slide's own real physical slot
// (scrollToIndex, animated: false): imperceptible, since both slots show
// the exact same frame at the exact same settled position. No loop, no
// duplicates, for count <= 1 (nothing to wrap to).
export function loopSlideData<T>(slides: T[]): T[] {
  const count = slides.length;
  if (count <= 1) {
    return slides;
  }
  return [slides[count - 1], ...slides, slides[0]];
}

// The physical FlatList index a logical slide's own (non-duplicate) slot
// lives at.
export function logicalToPhysical(logicalIndex: number, count: number): number {
  return count <= 1 ? logicalIndex : logicalIndex + 1;
}

// The logical slide a physical FlatList index shows, whether that's the
// slide's own slot or one of the two duplicate wrap slots (physical 0 and
// physical count + 1, which map back to the last and first slide
// respectively). Clamps rather than requiring an exact match, matching
// this file's other index math (pagingReleaseTarget's clampToNeighbor):
// defensive against an out-of-range physical index rather than assuming
// one can't occur.
export function physicalToLogical(
  physicalIndex: number,
  count: number,
): number {
  if (count <= 1) {
    return physicalIndex;
  }
  if (physicalIndex <= 0) {
    return count - 1;
  }
  if (physicalIndex >= count + 1) {
    return 0;
  }
  return physicalIndex - 1;
}

// Whether a physical index is one of the two duplicate wrap slots, not a
// slide's own real slot: handleScrollEnd silently repositions off of one
// of these once the scroll genuinely settles there, never anywhere else.
export function isLoopWrapSlot(physicalIndex: number, count: number): boolean {
  return count > 1 && (physicalIndex === 0 || physicalIndex === count + 1);
}

// Which LOGICAL slides mount a ContentLayer: the settled page plus one
// neighbour on each side, wrapped, same window a non-looping pager would
// use. Purely logical, on purpose: ContentLayer's own opacity (below,
// logicalCrossfadePosition) is a periodic function of scrollX that
// already gives the same answer whether scrollX is currently expressed
// via a slide's own physical slot or (mid a wrap transition) one of
// loopSlideData's duplicate slots, so which physical slot backs a mounted
// neighbour is never this function's concern, and a slide only ever needs
// ONE mounted instance regardless. That also means a Set here is enough
// to dedupe: with exactly 2 slides, both neighbours of the current page
// are the SAME logical slide (wrapping either direction reaches the other
// one), and that single shared instance's periodic opacity already
// crossfades correctly for a swipe in either direction, so it doesn't
// need two.
export function contentMountFrames(count: number, pageIndex: number): number[] {
  if (count <= 1) {
    return count === 0 ? [] : [pageIndex];
  }
  return Array.from(
    new Set([
      (pageIndex - 1 + count) % count,
      pageIndex,
      (pageIndex + 1) % count,
    ]),
  );
}

// The top-anchored-zoom transform for HeroPage's own backdrop on
// pull-to-refresh overscroll (Apple TV Store tab style: the backdrop's top
// edge stays screen-pinned while its height grows by exactly pullDistance).
// Pure and unit tested, since the derivation is easy to get subtly wrong: a
// transform's scale is anchored at an element's OWN CENTER, not its top, so
// scaling a backdropHeight-tall element by `scale` moves its top up by
// (scale - 1) * backdropHeight / 2 and its bottom down by the same amount.
//
// This assumes its own container is ALREADY held at a fixed screen
// position, not moving with the pull: that's HeroPager's job (a separate
// -pullDistance translateY on the pager itself, not this function's
// concern), because the pager is a horizontal FlatList, a native
// UIScrollView on iOS that clips to its own frame regardless of any
// `overflow` style on a child — so nothing can be drawn "above" it to
// simulate a pin the way this function's first version tried to. With the
// container itself fixed, all this function needs to do is cancel the
// scale's own top-rise: translateY = +pullDistance / 2. What's left, the
// bottom edge, ends up pullDistance below its resting position, the same
// shift the (separately positioned, unpinned) scrim/content overlays get
// for free from the outer ScrollView's own overscroll, so the two stay
// aligned exactly as they do at rest. HeroPage applies this same pair of
// values via Animated.multiply/add/divide on pullDistance (an Animated
// node, so this exact arithmetic can't run on it directly); this function
// is the worked-out formula those calls mirror.
export function pullStretchTransform(
  pullDistance: number,
  backdropHeight: number,
): { translateY: number; scale: number } {
  return {
    translateY: pullDistance / 2,
    scale: 1 + pullDistance / backdropHeight,
  };
}

// ADR 0015, FR-031: the date is the original premiere, on the service
// TVmaze gives, never a claim about the user's region.
export function heroPremiereLine(
  slide: HeroSlide,
  todayDate: LocalDate,
): string {
  const day =
    slide.localDate === todayDate
      ? "today"
      : slide.localDate === addDays(todayDate, 1)
        ? "tomorrow"
        : formatLabelDate(slide.localDate, todayDate);
  const network = searchResultNetworkName(slide.show);
  return network ? `Premieres ${day} on ${network}` : `Premieres ${day}`;
}

// The hero's second meta line: the episode code, and its title when the
// slide is a single episode.
export function heroEpisodeLine(episodes: TvMazeEpisode[]): string {
  const code = episodesLabel(episodes);
  const title = episodes.length === 1 ? episodes[0]?.name : null;
  return title ? `${code} · ${title}` : code;
}

// What goes where the "Open in" button would be, in one of four states, so
// Home never claims a show is unavailable when it simply has no answer
// (lookup running or failed) and never shows a stale, contradicting
// network name next to a quiet, honest note.
export type HeroAvailability =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "button"; link: ServiceLink }
  | { kind: "text"; label: string };

export function heroAvailability(
  providers: StreamingProvider[] | null | undefined,
  isLoading: boolean,
  isError: boolean,
  officialSite: string | null,
  region: string | undefined,
): HeroAvailability {
  if (isError || providers === null) {
    // No TMDB key or a failed lookup: the TVmaze-based link, as in Show detail.
    const direct = serviceLink(officialSite);
    return direct ? { kind: "button", link: direct } : { kind: "none" };
  }
  if (isLoading || providers === undefined || region === undefined) {
    return { kind: "loading" };
  }
  const link = openInLink(providers, officialSite);
  if (link) {
    return { kind: "button", link };
  }
  return { kind: "text", label: availabilityText(providers, region) };
}

// How far ahead the hero pager looks, in the same airstamp + device time
// zone terms as "today" (today through today + this many days minus one,
// inclusive). One place to change while tuning during PoC week.
export const HOME_HERO_HORIZON_DAYS = 7;

// One hero slide per episode within the horizon, never a same-show/same-day
// range (unlike the Home card's meta line): a show with two episodes on one
// day within the horizon gets two slides, not one grouped slide.
// `episodes` is non-empty by construction (findHeroSlides below always
// pushes one, and the existing single-day fallback in index.tsx keeps its
// own prior grouping); shaped as an array, not a tuple, so it stays
// interchangeable with ShowEpisodesToday for that fallback.
export interface HeroSlide {
  show: TvMazeShow;
  episodes: TvMazeEpisode[];
  localDate: LocalDate;
}

// Every followed show's episode airing from today through
// HOME_HERO_HORIZON_DAYS - 1 days out, one slide each, in chronological
// order. Airstamp + device time zone decide "today" and the horizon
// boundary (episodes-today.ts, local-date.ts), not airdate: a show with an
// episode today still starts the pager on today, not tomorrow.
export function findHeroSlides(
  followedShows: { show: TvMazeShow; episodes: TvMazeEpisode[] }[],
  timeZone: string,
  todayDate: LocalDate,
): HeroSlide[] {
  const horizonEnd = addDays(todayDate, HOME_HERO_HORIZON_DAYS - 1);
  const slides: HeroSlide[] = [];

  for (const { show, episodes } of followedShows) {
    for (const episode of episodes) {
      const localDate = localDateFromAirstamp(episode.airstamp, timeZone);
      if (localDate >= todayDate && localDate <= horizonEnd) {
        slides.push({ show, episodes: [episode], localDate });
      }
    }
  }

  // Chronological order (todayDate first, when present) is also what makes
  // the pager open on today's episode, or otherwise the nearest upcoming
  // one: whichever sorts first, at index 0.
  return slides.sort((a, b) => {
    if (a.localDate !== b.localDate) {
      return a.localDate < b.localDate ? -1 : 1;
    }
    return a.episodes[0].airstamp.localeCompare(b.episodes[0].airstamp);
  });
}

// "TODAY", "TOMORROW", or the weekday/date further out (same formatting as
// Home's next-day badge, logic/home.ts), always upper case to match.
export function heroDayLabel(
  localDate: LocalDate,
  todayDate: LocalDate,
): string {
  return localDate === todayDate
    ? "TODAY"
    : upcomingDayLabel(localDate, todayDate);
}
