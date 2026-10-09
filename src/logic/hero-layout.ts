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
// The "Open in" button: 47 (Apple TV reference), 44 on short screens
// (still the minimum tap target).
export const BUTTON_HEIGHT = 47;
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

export interface HeroLayout {
  // The hero's own height: the backdrop fills it and fades out at its end.
  heroHeight: number;
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
  // Where the fade into bg starts; it ends, solid, at heroHeight.
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
    CONTENT_GAP +
    TITLE_BLOCK_HEIGHT +
    CONTENT_GAP +
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
    contentTop,
    dotsTop: contentTop + contentHeight + dotsGap,
    // A long, gentle fade that is already well under way where the pill
    // sits, so the text reads on any image.
    fadeTop: Math.max(0, contentTop - 160),
    topGradientHeight: topInset + HEADER_BAR_HEIGHT + 24,
  };
}

// The TMDB image size for the hero backdrop (CRI-124). The image is cropped
// to fill (cover) a box as tall as the hero, so a landscape image is drawn
// wider than the box and only its middle shows (about a third on a phone).
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
