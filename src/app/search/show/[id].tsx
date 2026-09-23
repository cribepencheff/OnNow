// Show detail opened from a Search row, inside the Search sheet (PRD 5.6,
// FR-030, CRI-79). The same view as everywhere else.

import { useLocalSearchParams } from "expo-router";

import { ShowDetail } from "@/components/ShowDetail";

export default function SearchShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShowDetail showId={Number(id)} />;
}
