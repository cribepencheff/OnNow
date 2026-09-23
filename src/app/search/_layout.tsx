// The Search sheet as its own stack (PRD 5.4, 5.6, CRI-79): the results,
// and Show detail pushed inside the sheet with a back arrow to them. The
// root layout presents this whole stack as a modal, so swiping the sheet
// down still closes all of Search.

import { Stack, useNavigation } from "expo-router";

import { CloseButton } from "@/components/CloseButton";

export default function SearchLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="show/[id]"
        options={{
          title: "",
          headerBackButtonDisplayMode: "minimal",
          headerRight: () => <CloseSearchButton />,
        }}
      />
    </Stack>
  );
}

// Closes all of Search, not only Show detail (PRD 5.6): this screen's
// navigator is the Search stack, and its parent is the root stack that
// presents Search as a sheet.
function CloseSearchButton() {
  const navigation = useNavigation();
  return (
    <CloseButton
      onPress={() => navigation.getParent()?.goBack()}
      testID="search-detail-close"
    />
  );
}
