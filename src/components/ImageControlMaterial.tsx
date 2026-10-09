// The material of a small control drawn on an image (CRI-124), Apple TV
// style: a background blur with image-control-backdrop over it. Fills its
// parent, which gives the shape (a pill, a circle), the image-control-edge
// hairline and overflow: "hidden" to clip the blur. Shared by the hero's
// date pill and the header's search button.

import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

import { t } from "@/theme/tokens";

export function ImageControlMaterial() {
  return (
    <>
      {/* The blur first, the fill over it: a fill under the blur would be
          blurred into a solid colour. */}
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.fill]} />
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    backgroundColor: t.imageControlBackdrop,
  },
});
