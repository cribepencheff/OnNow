import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { setUpAppStateFocus } from "@/hooks/app-state-focus";
import { asyncStoragePersister, queryClient } from "@/hooks/query-client";

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
        <Stack>
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
