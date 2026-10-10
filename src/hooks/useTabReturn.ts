// Calls onReturn when a tab's screen is selected again after another tab
// was (CRI-131), not when a screen pushed over it (Show detail, Search) is
// closed: that is still the same visit.

import { useEffect } from "react";
import { useNavigation } from "expo-router";

// onReturn should keep its identity (useCallback): a new one starts over.
export function useTabReturn(onReturn: () => void): void {
  const navigation = useNavigation();

  useEffect(() => {
    // Whether the screen was left for another tab, judged as it lost focus:
    // the tab navigator then has the other tab selected, while a screen
    // pushed over the tabs leaves the selection as it was.
    let leftForAnotherTab = false;
    const ownKey = () => {
      const state = navigation.getState();
      return state?.routes[state.index]?.key;
    };
    const myKey = ownKey();
    const offBlur = navigation.addListener("blur", () => {
      leftForAnotherTab = ownKey() !== myKey;
    });
    const offFocus = navigation.addListener("focus", () => {
      if (leftForAnotherTab) {
        leftForAnotherTab = false;
        onReturn();
      }
    });
    return () => {
      offBlur();
      offFocus();
    };
  }, [navigation, onReturn]);
}
