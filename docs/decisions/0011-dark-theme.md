# 0011. Dark theme only

Status: Accepted

## Context
`01-prd.md` section 9 left the theme open: dark by default, or follow the
system setting. The vision already points to a dark, soft, cinematic look
(`00-vision.md`, "Design direction"), and the product principle is to
prefer a fixed decision over a setting.

## Decision
- The app is dark only. There is no light mode and no option to follow the
  system setting.
- The accent colour is `#75E4AF`, with near-black text on accent surfaces
  (for example the "Follow" button).
- Visual reference: Hulu's iOS app (dark, image led, cinematic), together
  with the references already named in `00-vision.md` and `01-prd.md`
  (Apple TV, Netflix, Next Episode, PlayPilot, and the dark fintech app
  concept from Discovery).
- Implemented in the Design phase. The PoC stays function before form and
  keeps its current plain styling.

## Consequences
- One colour palette to design, build and test, not two.
- Listed as a fixed default in `01-prd.md` section 5.7, not a setting.
- Near-black text on accent replaces the white text used on accent surfaces
  in the PoC (for example "Follow" in Show detail); this changes in the
  Design phase, not before.
- The Expo config (`userInterfaceStyle`) and the colour tokens change in the
  Design phase.
