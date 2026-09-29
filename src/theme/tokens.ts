// Values from docs/design/tokens.json, used as plain constants here.
//
// t.accent currently duplicates theme/color.ts's accent (both #75e4af,
// different casing). Left as two sources for now; reconcile in a later
// cleanup rather than in this move.
export const t = {
  bg: "#0b0c0f",
  bgTint: "#0d1814",
  surface: "#16181d",
  surfaceRaised: "#22252c",
  hairline: "#2c2f37",
  ink: "#f4f4f6",
  inkMuted: "#a3a6ae",
  inkSubtle: "#8b8e97",
  accent: "#75e4af",
  onAccent: "#07130e",
  space2: 8,
  space4: 16,
  space6: 24,
  space10: 40,
  radiusSm: 10,
  radiusLg: 22,
  radiusPill: 999,
} as const;

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
} as const;
