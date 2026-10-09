import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Manrope_800ExtraBold, useFonts } from "@expo-google-fonts/manrope";

import { setUpAppStateFocus } from "@/hooks/app-state-focus";
import { releaseNavigation } from "@/hooks/navigation-lock";
import { asyncStoragePersister, queryClient } from "@/hooks/query-client";
import { t } from "@/theme/tokens";

// CRI-95: Home hides the splash once its data is ready (at once from the
// cache); without a cache it waits for the first fetch, at most this long.
SplashScreen.preventAutoHideAsync().catch(() => {});
const SPLASH_MAX_MS = 2000;

export default function RootLayout() {
  useEffect(() => setUpAppStateFocus(), []);
  useEffect(() => {
    const cap = setTimeout(() => SplashScreen.hide(), SPLASH_MAX_MS);
    return () => clearTimeout(cap);
  }, []);
  // The button font trial (CRI-124, type.button in theme/tokens.ts). It is
  // bundled, so this takes a moment under the splash; if it ever fails,
  // the app still opens and the buttons fall back to the system font.
  const [fontsLoaded, fontError] = useFonts({ Manrope_800ExtraBold });
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    // Required by react-native-gesture-handler (Shows list's swipe to
    // unfollow, CRI-68, FR-002) so gestures work correctly, especially on
    // Android. Pure JavaScript/already-bundled native module, no dev build
    // needed.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <Stack
          // Pushed views (Show detail, Region) get a header on bg with an
          // ink back arrow and title, like the screens under them (ADR 0011).
          screenOptions={{
            headerStyle: { backgroundColor: t.bg },
            headerTintColor: t.ink,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: t.bg },
          }}
          // A navigation is over once its screen transition ends, so the
          // next tap may navigate again (CRI-117).
          screenListeners={{ transitionEnd: releaseNavigation }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="show/[id]"
            options={{ title: "", headerBackButtonDisplayMode: "minimal" }}
          />
          <Stack.Screen
            name="region"
            options={{
              title: "Region",
              headerBackButtonDisplayMode: "minimal",
            }}
          />
          <Stack.Screen
            name="search"
            options={{ presentation: "modal", headerShown: false }}
          />
        </Stack>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
