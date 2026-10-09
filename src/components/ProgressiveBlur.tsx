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

// Eased, so neither the start nor the end of the blur shows as a line:
// clear at the top, full from about two thirds down.
const MASK_COLORS = [
  "rgba(0,0,0,0)",
  "rgba(0,0,0,0.08)",
  "rgba(0,0,0,0.3)",
  "rgba(0,0,0,0.62)",
  "rgba(0,0,0,0.88)",
  "rgba(0,0,0,1)",
] as const;
const MASK_LOCATIONS = [0, 0.12, 0.28, 0.45, 0.62, 0.72] as const;

// The mask itself: what it covers shows from nothing at the top to fully
// at about two thirds down.
export function ProgressiveMask() {
  return (
    <LinearGradient
      colors={MASK_COLORS}
      locations={MASK_LOCATIONS}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function ProgressiveBlur({
  intensity,
  style,
  testID,
}: {
  intensity: number;
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
      maskElement={<ProgressiveMask />}
      testID={testID}
    >
      <BlurView
        intensity={intensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
    </MaskedView>
  );
}
