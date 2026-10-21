// The Search tab's own stack (PRD 5.4, 5.6, CRI-133): the results, and
// Show detail pushed over them with only a back arrow, no close button, in
// a header of fixed height (BackHeader). The tab bar stays in view.

import { Stack } from "expo-router";

import { BackHeader } from "@/components/BackHeader";
import { releaseNavigation } from "@/hooks/navigation-lock";
import { t } from "@/theme/tokens";

export default function SearchLayout() {
  return (
    <Stack
      // Show detail inside Search gets the same dark header as elsewhere.
      screenOptions={{
        headerStyle: { backgroundColor: t.bg },
        headerTintColor: t.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: t.bg },
      }}
      // Same as the root Stack: the transition's end frees the navigation
      // guard (CRI-117).
      screenListeners={{ transitionEnd: releaseNavigation }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="show/[id]"
        options={{ header: () => <BackHeader /> }}
      />
    </Stack>
  );
}
