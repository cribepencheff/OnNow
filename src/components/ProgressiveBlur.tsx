// A blur that grows from nothing at its top edge to full strength lower
// down, Apple TV style (CRI-124). Adapted from rit3zh/expo-progressive-blur
// (a demo, not a package): expo-blur's BlurView, masked by an eased
// expo-linear-gradient through MaskedView. All three are Expo SDK modules,
// so it runs in Expo Go. iOS only: Android's BlurView needs a blur target
// set up around what it blurs, so there the hero blurs its own mirrored
// image instead (HeroPage, ProgressiveMask).

import {
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { progressiveMaskStops } from "@/logic/hero-layout";

// The mask itself: what it covers shows from nothing at the top to fully
// at `fullAt` (a fraction of its height), eased, then fully below
// (progressiveMaskStops).
export function ProgressiveMask({ fullAt }: { fullAt: number }) {
  const { colors, locations } = progressiveMaskStops(fullAt);
  return (
    <LinearGradient
      colors={colors as [string, string, ...string[]]}
      locations={locations as [number, number, ...number[]]}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function ProgressiveBlur({
  intensity,
  fullAt,
  style,
  testID,
}: {
  intensity: number;
  // Where the blur reaches full strength, as a fraction of its height.
  fullAt: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  if (Platform.OS !== "ios") {
    return null;
  }
  return (
    <MaskedView
      pointerEvents="none"
      style={style}
      maskElement={<ProgressiveMask fullAt={fullAt} />}
      testID={testID}
    >
      <BlurView
        intensity={intensity}
        tint="default"
        style={StyleSheet.absoluteFill}
      />
    </MaskedView>
  );
}
