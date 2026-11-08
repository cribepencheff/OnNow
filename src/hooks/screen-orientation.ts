// The app is held upright, and only the trailer player turns with the
// phone (ADR 0021, owner 2026-11-08). app.json allows every orientation
// ("default"), so the player can turn; the app locks itself to portrait at
// launch, and again when the player closes. A native build also starts
// upright (the plugin's initialOrientation); Expo Go relies on the lock.
// A failed lock is left alone: the app then turns, which harms nothing.

import * as ScreenOrientation from "expo-screen-orientation";

export function holdPortrait(): void {
  ScreenOrientation.lockAsync(
    ScreenOrientation.OrientationLock.PORTRAIT_UP,
  ).catch(() => {});
}

export function allowAnyOrientation(): void {
  ScreenOrientation.unlockAsync().catch(() => {});
}
