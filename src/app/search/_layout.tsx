// The Search sheet as its own stack (PRD 5.4, 5.6, CRI-79): the results,
// and Show detail pushed inside the sheet with only a back arrow to them,
// no close button, in a header of fixed height (SheetBackHeader). The root
// layout presents this whole stack as a modal, so swiping the sheet down
// still closes all of Search.

import { Stack } from "expo-router";

import { SheetBackHeader } from "@/components/SheetBackHeader";
import { t } from "@/theme/tokens";

export default function SearchLayout() {
  return (
    <Stack
      // Show detail inside the sheet gets the same dark header as elsewhere.
      screenOptions={{
        headerStyle: { backgroundColor: t.bg },
        headerTintColor: t.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: t.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="show/[id]"
        options={{ header: () => <SheetBackHeader /> }}
      />
    </Stack>
  );
}
