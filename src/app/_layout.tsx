import { useEffect } from "react";
import { Stack } from "expo-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { setUpAppStateFocus } from "@/hooks/app-state-focus";
import { asyncStoragePersister, queryClient } from "@/hooks/query-client";

export default function RootLayout() {
  useEffect(() => setUpAppStateFocus(), []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </PersistQueryClientProvider>
  );
}
