// The Home hero's vertical layout and image size (CRI-124). Pure, so the
// measurements can be tested without rendering. Every block in the hero
// has a fixed height, so the content's position is computed, never
// measured, and nothing moves from one slide to the next.

import { t, type } from "@/theme/tokens";
import { HEADER_BAR_HEIGHT } from "./header";

// The translucent tab bar's height (app/(tabs)/_layout.tsx).
export const TAB_BAR_HEIGHT = 83;

// The hero ends this far above the tab bar, so the first row's heading and
// the top of its posters show below it (the owner's sketch, CRI-124).
export const HERO_END_ABOVE_TAB_BAR = 100;

// Short screens (iPhone SE is 667pt tall) tighten the gaps around the
// button. The threshold sits between the SE (667) and the next size up
// (812), so every taller screen keeps the regular values.
export const SHORT_SCREEN_MAX_HEIGHT = 700;

// The date pill's height, centred in its own row.
export const PILL_HEIGHT = 26;
// The logo box under the pill: a logo or the display title.
export const TITLE_BLOCK_HEIGHT = 88;
// The "Open in" button: 50, a tad over the Apple TV reference (47) at the
// owner's request; 44 on short screens (still the minimum tap target).
export const BUTTON_HEIGHT = 50;
export const BUTTON_HEIGHT_SHORT = 44;
// The episode line under the logo: its text and, at its right end, the
// IMDb chip, which sets the height (ImdbRating's IMDB_CHIP_HEIGHT).
export const EPISODE_LINE_HEIGHT = 20;
// One note line under the button, reserved on every slide so the dots stay
// put: an add-on's "Requires hayu subscription" (CRI-101).
export const NOTE_LINE = 4 + type.meta.lineHeight;
// The page dots' height, and the space under them to the hero's end.
const DOTS_HEIGHT = 8;
const DOTS_BOTTOM_SPACE = 8;
// The gap between the content block's rows.
export const CONTENT_GAP = t.space2;
// Above and below the show's logo, more than between the other rows, so
// the logo has room (owner, CRI-124).
export const TITLE_GAP = t.space4;

export interface HeroLayout {
  // The hero's own height.
  heroHeight: number;
  // How tall the image is: down to the fixed bottom of the title (logo)
  // slot, the same on every slide, so the seam never moves (owner,
  // CRI-124). Below it, to the hero's end, the image mirrored.
  imageHeight: number;
  // Where the progressive blur starts: the pill's top, on the image
  // itself, so it is already soft at the seam and the mirror's symmetry
  // does not read. It grows to full by the seam and stays full below.
  blurTop: number;
  isShort: boolean;
  buttonHeight: number;
  // Above the button, on top of the content's own row gap.
  openInMargin: number;
  // From the note line under the button to the page dots.
  dotsGap: number;
  // Where the content block (pill, logo, episode line, button) starts.
  contentTop: number;
  // Where the page dots sit, dotsGap under the button's note line.
  dotsTop: number;
  // Where the fade into bg starts (with the blur); it ends, solid, at
  // heroHeight.
  fadeTop: number;
  // How tall the top gradient behind the status bar and logo is.
  topGradientHeight: number;
}

export function heroLayout(windowHeight: number, topInset: number): HeroLayout {
  const isShort = windowHeight < SHORT_SCREEN_MAX_HEIGHT;
  const buttonHeight = isShort ? BUTTON_HEIGHT_SHORT : BUTTON_HEIGHT;
  const openInMargin = isShort ? 0 : 8;
  // Tight under the note line, which is often empty (the owner's sketch).
  const dotsGap = isShort ? 4 : 6;
  const heroHeight = windowHeight - TAB_BAR_HEIGHT - HERO_END_ABOVE_TAB_BAR;

  // Pill row, logo box, episode line, then the "Open in" slot with its
  // note line, with the content's row gap between them.
  const contentHeight =
    PILL_HEIGHT +
    TITLE_GAP +
    TITLE_BLOCK_HEIGHT +
    TITLE_GAP +
    EPISODE_LINE_HEIGHT +
    CONTENT_GAP +
    openInMargin +
    buttonHeight +
    NOTE_LINE;
  const contentTop =
    heroHeight - DOTS_BOTTOM_SPACE - DOTS_HEIGHT - dotsGap - contentHeight;

  return {
    heroHeight,
    isShort,
    buttonHeight,
    openInMargin,
    dotsGap,
    imageHeight: contentTop + PILL_HEIGHT + TITLE_GAP + TITLE_BLOCK_HEIGHT,
    blurTop: contentTop,
    contentTop,
    dotsTop: contentTop + contentHeight + dotsGap,
    fadeTop: contentTop,
    topGradientHeight: topInset + HEADER_BAR_HEIGHT + 24,
  };
}

// The TMDB image size for the hero backdrop (CRI-124). The image is cropped
// to fill (cover) its box, which is wider than the screen for the swipe's
// parallax, so a landscape image is drawn wider than the screen and only
// its middle shows (about 40% on a phone).
// It must stay sharp on the screen's pixels at that drawn width, so the
// size is the smallest TMDB size at least that many pixels wide, else
// "original". Assumes 16:9, TMDB's backdrop and still shape.
const SIZES: [name: string, width: number][] = [
  ["w780", 780],
  ["w1280", 1280],
];

export function heroImageSize(
  boxWidth: number,
  boxHeight: number,
  pixelRatio: number,
): string {
  const drawnWidth = Math.max(boxWidth, (boxHeight * 16) / 9);
  const neededPixels = drawnWidth * pixelRatio;
  const fit = SIZES.find(([, width]) => width >= neededPixels);
  return fit ? fit[0] : "original";
}

// The progressive blur's mask (CRI-124): from clear at the blur's top to
// full at `fullAt` (a fraction of the blur's height: where the seam is),
// eased so neither end shows as a line, then full to the bottom. Colours
// and locations for expo-linear-gradient.
export function progressiveMaskStops(fullAt: number): {
  colors: string[];
  locations: number[];
} {
  const end = Math.min(Math.max(fullAt, 0.05), 1);
  const ramp: [at: number, alpha: number][] = [
    [0, 0],
    [0.2, 0.08],
    [0.4, 0.28],
    [0.6, 0.56],
    [0.8, 0.84],
    [1, 1],
  ];
  const colors = ramp.map(([, alpha]) => `rgba(0,0,0,${alpha})`);
  const locations = ramp.map(([at]) => at * end);
  if (end < 1) {
    colors.push("rgba(0,0,0,1)");
    locations.push(1);
  }
  return { colors, locations };
}

// The same stops upside down: strong at the top, clear at the bottom (the
// top edge blur band, CRI-124).
export function reverseMaskStops({
  colors,
  locations,
}: {
  colors: string[];
  locations: number[];
}): { colors: string[]; locations: number[] } {
  return {
    colors: [...colors].reverse(),
    locations: [...locations].reverse().map((at) => 1 - at),
  };
}

// The poster rows under the hero are dimmed at rest, so the hero has more
// weight (CRI-124, an experiment): this much black over each poster.
export const POSTER_REST_DIM = 0.3;

// How far Home is scrolled when the dimming is gone: when the first row's
// heading (a section gap under the hero) reaches the middle of the screen.
export function posterDimEndScroll(
  heroHeight: number,
  windowHeight: number,
): number {
  return Math.max(1, heroHeight + t.space6 - windowHeight / 2);
}

// The dimming at a scroll offset: full at rest and during a pull, easing
// off to none at posterDimEndScroll.
export function posterDimAt(scrollOffset: number, endScroll: number): number {
  "worklet";
  const progress = Math.min(Math.max(scrollOffset / endScroll, 0), 1);
  // Eased at both ends (smoothstep): about half gone halfway.
  const eased = progress * progress * (3 - 2 * progress);
  return POSTER_REST_DIM * (1 - eased);
}
