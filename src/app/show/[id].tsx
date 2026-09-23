// Show detail opened from Home, Calendar or Shows, pushed with a back arrow
// and the edge swipe back (PRD 5.6, FR-030, CRI-79).

import { useLocalSearchParams } from "expo-router";

import { ShowDetail } from "@/components/ShowDetail";

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShowDetail showId={Number(id)} />;
}
