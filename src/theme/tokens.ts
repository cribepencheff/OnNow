// Values from docs/design/tokens.json, used as plain constants here.

import { accent } from "./color";

export const t = {
  bg: "#0b0c0f",
  bgTint: "#0d1814",
  surface: "#16181d",
  surfaceRaised: "#22252c",
  hairline: "#2c2f37",
  imageControlBackdrop: "rgba(11, 12, 15, 0.55)",
  // The hairline light border of the date pill, the Home follow circle and
  // the poster cards (Apple TV style), drawn StyleSheet.hairlineWidth wide.
  imageControlEdge: "rgba(255, 255, 255, 0.16)",
  ink: "#f4f4f6",
  inkMuted: "#a3a6ae",
  inkSubtle: "#8b8e97",
  // Same value as theme/color.ts's own accent; referenced rather than
  // duplicated as a second hardcoded hex.
  accent,
  onAccent: "#07130e",
  // A destructive action's fill (Unfollow), with ink on it (4.56:1).
  destructive: "#c93c3c",
  space2: 8,
  space4: 16,
  space6: 24,
  space10: 40,
  radiusSm: 10,
  radiusLg: 22,
  radiusPill: 999,
} as const;

// Trial (CRI-124): button labels in Manrope ExtraBold, loaded in
// app/_layout.tsx. The one place to roll it back: replace this with
// { fontWeight: "600" } and the buttons are back on the system font.
const buttonFont = { fontFamily: "Manrope_800ExtraBold" } as const;

export const type = {
  display: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  title: { fontSize: 28, lineHeight: 32, fontWeight: "700" },
  headline: { fontSize: 20, lineHeight: 25, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  meta: { fontSize: 14, lineHeight: 19, fontWeight: "400" },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  // -3% letter spacing: 18 × -0.03. One step up from 16, where Manrope
  // read small (owner, CRI-124).
  button: {
    ...buttonFont,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.54,
  },
} as const;
