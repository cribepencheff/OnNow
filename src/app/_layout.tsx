import { useEffect } from "react";
import { Stack } from "expo-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { setUpAppStateFocus } from "@/hooks/app-state-focus";
import { asyncStoragePersister, queryClient } from "@/hooks/query-client";

export default function RootLayout() {
  useEffect(() => setUpAppStateFocus(), []);

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
            name="search"
            options={{ presentation: "modal", headerShown: false }}
          />
        </Stack>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
