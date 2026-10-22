// The root view's colour, behind every screen: the page's background
// (ADR 0011). It shows while one screen slides over another (back from
// Show detail); left white, it showed as a white line at the edge. Set in
// app.json (backgroundColor) for builds, and here at launch, which also
// works in Expo Go.

import * as SystemUI from "expo-system-ui";

import { t } from "./tokens";

export function setRootBackground(): Promise<void> {
  return SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
}
