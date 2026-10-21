// The follow controls' haptic, in one place, so every follow control feels
// the same (the circles in Search and on poster cards, Show detail's Follow
// button; PRD 5.4): a light impact on follow, a lighter selection tick on
// unfollow, so removing a show reads as just as instant as adding one
// (both are optimistic, useFollowList).

import * as Haptics from "expo-haptics";

// `following`: the state the tap moves to, true for a follow.
export function followHaptic(following: boolean): void {
  if (following) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } else {
    void Haptics.selectionAsync();
  }
}
