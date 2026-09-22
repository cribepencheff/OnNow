// Pure color helpers (same pattern as src/logic: no UI dependency). Colors
// are derived in HSL so a future change to the base hue only means changing
// `accent`, not re-deriving every shade by hand.

export const accent = "#75E4AF";

// Darker than accent, safe for text on light backgrounds; used only where
// accent-colored text sits on a light surface, never for solid surfaces
// (those use `accent` itself).
export const accentText = withLightness(accent, 40);

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));

  let h: number;
  if (max === r) {
    h = ((g - b) / delta) % 6;
  } else if (max === g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }
  h *= 60;
  if (h < 0) {
    h += 360;
  }

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: Hsl): string {
  const sFraction = s / 100;
  const lFraction = l / 100;

  const c = (1 - Math.abs(2 * lFraction - 1)) * sFraction;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lFraction - c / 2;

  let rPrime: number;
  let gPrime: number;
  let bPrime: number;

  if (h < 60) {
    [rPrime, gPrime, bPrime] = [c, x, 0];
  } else if (h < 120) {
    [rPrime, gPrime, bPrime] = [x, c, 0];
  } else if (h < 180) {
    [rPrime, gPrime, bPrime] = [0, c, x];
  } else if (h < 240) {
    [rPrime, gPrime, bPrime] = [0, x, c];
  } else if (h < 300) {
    [rPrime, gPrime, bPrime] = [x, 0, c];
  } else {
    [rPrime, gPrime, bPrime] = [c, 0, x];
  }

  return rgbToHex({
    r: rPrime + m,
    g: gPrime + m,
    b: bPrime + m,
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return { r, g, b };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const toHex = (value: number) =>
    Math.round(Math.min(Math.max(value, 0), 1) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function withLightness(hex: string, lightness: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({ ...hsl, l: lightness });
}
