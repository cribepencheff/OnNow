// Shows (PRD 5.3, FR-002, FR-010, FR-035): the followed shows list, each
// with its next episode or status, swipe to unfollow, and a search field
// that opens Search (the same sheet as Home's "+"). Visual design comes
// later, so styling here stays minimal and functional.

import { useCallback, useMemo } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { ShowsRow } from "@/components/ShowsRow";
import { TvMazeCredit } from "@/components/TvMazeCredit";
import { useFollowList } from "@/hooks/useFollowList";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useToday } from "@/hooks/useToday";
import { sortShowsByTitle } from "@/logic/shows-list";

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export default function ShowsScreen() {
  const router = useRouter();
  const todayDate = useToday();
  const timeZone = deviceTimeZone();

  const { unfollow } = useFollowList();
  const { followedShows, followedCount, isLoading, isRefetching, refetch } =
    useFollowedEpisodes();

  const sortedShows = useMemo(
    () => sortShowsByTitle(followedShows),
    [followedShows],
  );

  const openSearch = useCallback(() => router.push("/search"), [router]);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search shows"
        onPress={openSearch}
        style={styles.searchField}
      >
        <Text style={styles.searchFieldText}>Search shows</Text>
      </Pressable>

      {followedCount === 0 ? (
        !isLoading && (
          <>
            <Text style={styles.quietLine}>No shows yet</Text>
            <TvMazeCredit />
          </>
        )
      ) : isLoading ? (
        <Text style={styles.quietLine}>Loading your shows…</Text>
      ) : (
        <FlatList
          data={sortedShows}
          keyExtractor={({ show }) => String(show.id)}
          renderItem={({ item }) => (
            <ShowsRow
              show={item.show}
              timeZone={timeZone}
              todayDate={todayDate}
              onUnfollow={() => unfollow(item.show.id)}
              onPress={() =>
                router.push({
                  pathname: "/show/[id]",
                  params: { id: String(item.show.id) },
                })
              }
            />
          )}
          ListFooterComponent={TvMazeCredit}
          refreshControl={
            <RefreshControl
              testID="shows-refresh-control"
              refreshing={isRefetching}
              onRefresh={refetch}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  searchField: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
  },
  searchFieldText: {
    fontSize: 16,
    color: "#888888",
  },
  quietLine: {
    textAlign: "center",
    color: "#666666",
    fontSize: 15,
    paddingHorizontal: 32,
    paddingTop: 24,
  },
});
