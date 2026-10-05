// Shows (PRD 5.3, FR-002, FR-010, FR-035): the followed shows list, each
// with its next episode or status, swipe to unfollow, and a search field
// that opens Search (the same sheet as Home's "+"), in the design
// system's dark tokens.

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
import { SymbolView } from "expo-symbols";

import { RegionLink } from "@/components/RegionLink";
import { ShowsRow } from "@/components/ShowsRow";
import { TvMazeCredit } from "@/components/TvMazeCredit";
import { useFollowList } from "@/hooks/useFollowList";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useToday } from "@/hooks/useToday";
import { sortShowsByTitle } from "@/logic/shows-list";
import { t, type } from "@/theme/tokens";

// The translucent tab bar's height (tabs layout): the list ends above it.
const TAB_BAR_HEIGHT = 83;

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
        <SymbolView
          name={{ ios: "magnifyingglass", android: "search", web: "search" }}
          tintColor={t.inkMuted}
          size={16}
        />
        <Text style={styles.searchFieldText}>Search shows</Text>
      </Pressable>

      {followedCount === 0 ? (
        !isLoading && (
          <>
            <Text style={styles.quietLine}>No shows yet</Text>
            <ShowsFooter />
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
          ItemSeparatorComponent={RowSeparator}
          ListFooterComponent={ShowsFooter}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              testID="shows-refresh-control"
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={t.inkMuted}
            />
          }
        />
      )}
    </View>
  );
}

function RowSeparator() {
  return <View style={styles.separator} />;
}

// The region sits here until there is a settings view (CRI-88).
function ShowsFooter() {
  return (
    <>
      <RegionLink />
      <TvMazeCredit />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: t.space2,
    backgroundColor: t.bg,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space2,
    marginHorizontal: t.space4,
    marginBottom: t.space2,
    paddingHorizontal: t.space4,
    paddingVertical: 12,
    borderRadius: t.radiusPill,
    backgroundColor: t.surfaceRaised,
  },
  searchFieldText: {
    ...type.body,
    color: t.inkMuted,
  },
  listContent: {
    paddingBottom: TAB_BAR_HEIGHT + t.space4,
  },
  // Inset to the text column, as on iOS lists.
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: t.space4 + 60 + t.space2 + 4,
    backgroundColor: t.hairline,
  },
  quietLine: {
    ...type.body,
    textAlign: "center",
    color: t.inkMuted,
    paddingHorizontal: t.space10,
    paddingTop: t.space6,
  },
});
