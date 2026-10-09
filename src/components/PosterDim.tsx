// Dims the posters in Home's rows at rest so the hero has more weight
// (CRI-124, an experiment). Home provides how dark (0 to POSTER_REST_DIM),
// a Reanimated value tied to its scroll position; the overlay over each
// poster follows it on the UI thread. Anywhere without a provider (Search's
// rows) nothing is dimmed. Only the posters: row headings stay as they are,
// and the overlay takes no touches, so a dimmed poster still opens.

import { createContext, useContext } from "react";
import { StyleSheet } from "react-native";
import Reanimated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { t } from "@/theme/tokens";

export const PosterDimContext = createContext<SharedValue<number> | null>(null);

export function PosterDimOverlay() {
  const dim = useContext(PosterDimContext);
  return dim ? <Overlay dim={dim} /> : null;
}

function Overlay({ dim }: { dim: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: dim.value }));
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[styles.overlay, style]}
      testID="poster-dim"
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: t.radiusSm,
    backgroundColor: "#000000",
  },
});
