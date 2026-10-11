// Show detail opened from Search, inside the Search tab (PRD 5.6, FR-030,
// CRI-79, CRI-133). The same view as everywhere else, with the tab bar
// over its bottom.

import { useLocalSearchParams } from "expo-router";

import { ShowDetail } from "@/components/ShowDetail";

export default function SearchShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShowDetail showId={Number(id)} overTabBar />;
}
