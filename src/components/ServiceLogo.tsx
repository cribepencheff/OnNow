// A streaming service's TMDB icon, clipped to a squircle (CRI-132): a true
// superellipse, not a rounded rectangle, since a circle crops a square mark
// too hard (clearest on TV4 Play and Prime Video).
//
// A square TMDB icon already covers the squircle corner to corner with no
// scale-up needed (a squircle sits inside its own bounding square). The
// clip and the image are both drawn inside one Svg tree (react-native-svg's
// own ClipPath, not a separate MaskedView), so they share one coordinate
// system instead of two native views that have to agree on the same pixel
// grid: a fractional size once rounded the mask and the image to slightly
// different grids on device, clipping an edge.
//
// A thin dark ring sits on every icon, regardless of its own colour: against
// the always-light "Open in" pill, a dark ring gives a white icon (Prime
// Video) a visible edge, and reads as a quiet outline on a dark icon too.

import { useId, useMemo } from "react";
import Svg, { ClipPath, Defs, Image as SvgImage, Path } from "react-native-svg";

import { IMAGE_BASE } from "@/api/tmdb-types";

// Roughly n=5 in the superellipse family |x/a|^n + |y/b|^n = 1.
const SQUIRCLE_EXPONENT = 5;
const SQUIRCLE_STEPS = 48;
const RING_COLOR = "rgba(0, 0, 0, 0.35)";
const RING_WIDTH = 1;

// Inset by half the ring's stroke: the squircle's cardinal points sit at
// the exact radius, so a centred stroke drawn at the full radius overflows
// the Svg canvas by half its width there and gets clipped by it.
function squirclePath(size: number): string {
  const r = size / 2 - RING_WIDTH / 2;
  const cx = size / 2;
  const cy = size / 2;
  const points: string[] = [];
  for (let i = 0; i < SQUIRCLE_STEPS; i++) {
    const angle = (i / SQUIRCLE_STEPS) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x =
      cx + r * Math.sign(cos) * Math.abs(cos) ** (2 / SQUIRCLE_EXPONENT);
    const y =
      cy + r * Math.sign(sin) * Math.abs(sin) ** (2 / SQUIRCLE_EXPONENT);
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${points.join(" ")} Z`;
}

export function ServiceLogo({
  logoPath,
  size,
}: {
  logoPath: string;
  size: number;
}) {
  const path = useMemo(() => squirclePath(size), [size]);
  // Unique per instance: several logos can be on screen at once (dev
  // images screen), and an id is shared across every Svg on the page.
  const clipId = `service-logo-squircle-${useId().replace(/:/g, "")}`;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <ClipPath id={clipId}>
          <Path d={path} />
        </ClipPath>
      </Defs>
      <SvgImage
        href={`${IMAGE_BASE}/w154${logoPath}`}
        x={0}
        y={0}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
      <Path d={path} fill="none" stroke={RING_COLOR} strokeWidth={RING_WIDTH} />
    </Svg>
  );
}
