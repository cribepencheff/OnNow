// A streaming service's TMDB icon, clipped to a squircle (CRI-132): a true
// superellipse, not a rounded rectangle, since a circle crops a square mark
// too hard (clearest on TV4 Play and Prime Video).
//
// The icon is drawn larger than the box and centred ("bleed"), so its own
// edge colour fills the squircle's corners instead of leaving a hole. TMDB's
// provider icons are solid-colour square canvases (not transparent
// cutouts), so a plain scaled-up crop reads the same as true edge-extend
// without needing pixel sampling.
//
// A thin dark ring sits on every icon, regardless of its own colour: against
// the always-light "Open in" pill, a dark ring gives a white icon (Prime
// Video) a visible edge, and reads as a quiet outline on a dark icon too.

import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import MaskedView from "@react-native-masked-view/masked-view";
import Svg, { Path } from "react-native-svg";

import { IMAGE_BASE } from "@/api/tmdb-types";

// Roughly n=5 in the superellipse family |x/a|^n + |y/b|^n = 1.
const SQUIRCLE_EXPONENT = 5;
const SQUIRCLE_STEPS = 48;
// A square TMDB icon already covers the squircle corner to corner with no
// scale-up needed (a squircle sits inside its own bounding square); scaling
// it up would crop away the icon's own margin and zoom in on the mark
// (CRI-132, caught in review: too tight against Viaplay's "V").
const ICON_SCALE = 1;
const RING_COLOR = "rgba(0, 0, 0, 0.35)";
const RING_WIDTH = 1;

function squirclePath(size: number): string {
  const r = size / 2;
  const points: string[] = [];
  for (let i = 0; i < SQUIRCLE_STEPS; i++) {
    const angle = (i / SQUIRCLE_STEPS) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = r + r * Math.sign(cos) * Math.abs(cos) ** (2 / SQUIRCLE_EXPONENT);
    const y = r + r * Math.sign(sin) * Math.abs(sin) ** (2 / SQUIRCLE_EXPONENT);
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
  const iconSize = size * ICON_SCALE;
  const offset = (iconSize - size) / 2;

  return (
    <View style={{ width: size, height: size }}>
      <MaskedView
        style={{ width: size, height: size }}
        maskElement={
          <Svg width={size} height={size}>
            <Path d={path} fill="#000" />
          </Svg>
        }
      >
        <Image
          source={{ uri: `${IMAGE_BASE}/w154${logoPath}` }}
          style={{
            width: iconSize,
            height: iconSize,
            marginLeft: -offset,
            marginTop: -offset,
          }}
          contentFit="cover"
        />
      </MaskedView>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Path
          d={path}
          fill="none"
          stroke={RING_COLOR}
          strokeWidth={RING_WIDTH}
        />
      </Svg>
    </View>
  );
}
