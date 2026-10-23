// Shows (PRD 5.3, FR-002, FR-010, FR-035): the followed shows in two
// segments, Active and Inactive, each row with Show detail's status line
// and its service, swipe to unfollow, and a search field that goes to the
// Search tab in typing mode (CRI-133), in the design system's dark tokens.

import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AddFirstShow } from "@/components/AddFirstShow";
import { RegionLink } from "@/components/RegionLink";
import { ShowRowSeparator } from "@/components/ShowRow";
import { ShowsRow } from "@/components/ShowsRow";
import { TvMazeCredit } from "@/components/TvMazeCredit";
import { afterThisFrame, useFollowActions } from "@/hooks/useFollowList";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { useOpenSearch } from "@/hooks/useOpenSearch";
import { useToday } from "@/hooks/useToday";
import { splitBySegment, type ShowsSegment } from "@/logic/shows-list";
import { showState, showStateLabel } from "@/logic/show-state";
import { TAB_BAR_HEIGHT } from "@/logic/tab-bar";
import { t, type } from "@/theme/tokens";
import { SearchFieldFrame, searchFieldText } from "@/components/SearchField";

const NONE_LEAVING: ReadonlySet<number> = new Set();

const SEGMENT_TITLES: Record<ShowsSegment, string> = {
  active: "Active",
  inactive: "Inactive",
};

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export default function ShowsScreen() {
  const router = useGuardedRouter();
  const todayDate = useToday();
  const timeZone = deviceTimeZone();

  const { unfollow } = useFollowActions();
  const { followedShows, followedCount, isLoading, isRefetching, refetch } =
    useFollowedEpisodes();

  // Rows unfollowed here leave at once (CRI-86): hidden until the follow
  // list changes, on the next frame. A failed write puts the list back,
  // which also brings the row back.
  const [leaving, setLeaving] = useState<{
    from: typeof followedShows;
    ids: ReadonlySet<number>;
  } | null>(null);
  const hidden: ReadonlySet<number> =
    leaving?.from === followedShows ? leaving.ids : NONE_LEAVING;
  const unfollowRow = useCallback(
    (showId: number) => {
      setLeaving((current) => ({
        from: followedShows,
        ids: new Set(current?.from === followedShows ? current.ids : []).add(
          showId,
        ),
      }));
      afterThisFrame(() => {
        unfollow(showId).catch(() => undefined);
      });
    },
    [followedShows, unfollow],
  );

  const segments = useMemo(
    () =>
      splitBySegment(
        followedShows
          .filter(({ show }) => !hidden.has(show.id))
          .map(({ show }) => ({
            show,
            state: showState(
              show,
              show._embedded.episodes,
              show._embedded.seasons,
              timeZone,
              todayDate,
            ),
          })),
      ),
    [followedShows, hidden, timeZone, todayDate],
  );

  // A segment without shows is left out.
  const sections = (["active", "inactive"] as const)
    .filter((key) => segments[key].length > 0)
    .map((key) => ({ key, data: segments[key] }));

  const openSearch = useOpenSearch();

  return (
    <View style={styles.container} testID="shows-screen">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search shows"
        onPress={openSearch}
        style={styles.searchField}
      >
        {/* Search's own field's look (SearchField). */}
        <SearchFieldFrame>
          <Text style={searchFieldText.placeholder}>Search shows</Text>
        </SearchFieldFrame>
      </Pressable>

      {followedCount === 0 ? (
        !isLoading && (
          <>
            <AddFirstShow
              onPress={openSearch}
              testID="shows-empty-state"
              buttonTestID="shows-add-show"
            />
            <View style={styles.emptyFooter}>
              <ShowsFooter />
            </View>
          </>
        )
      ) : isLoading ? (
        <Text style={styles.quietLine}>Loading your shows…</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={({ show }) => String(show.id)}
          // Each segment's header stays at the top while its rows scroll
          // (PRD 5.3); Android needs this set, iOS has it by default.
          stickySectionHeadersEnabled
          testID="shows-list"
          renderSectionHeader={({ section }) => (
            <SegmentHeader segment={section.key} count={section.data.length} />
          )}
          renderItem={({ item }) => (
            <ShowsRow
              show={item.show}
              statusLine={showStateLabel(item.state, todayDate)}
              onUnfollow={() => unfollowRow(item.show.id)}
              onPress={() =>
                router.push({
                  pathname: "/show/[id]",
                  params: { id: String(item.show.id) },
                })
              }
            />
          )}
          ItemSeparatorComponent={ShowRowSeparator}
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

// "Active · 4", on bg so rows pass under it while it sticks.
function SegmentHeader({
  segment,
  count,
}: {
  segment: ShowsSegment;
  count: number;
}) {
  const title = SEGMENT_TITLES[segment];
  return (
    <View
      style={styles.segmentHeader}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${title}, ${count}`}
      testID={`shows-segment-${segment}`}
    >
      <Text style={styles.segmentTitle}>
        {title}
        <Text style={styles.segmentCount}> · {count}</Text>
      </Text>
    </View>
  );
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
  // 16 under the title, and the segment headers 24 under the field: the
  // title, the field and the segments balanced (owner, 2026-10-23).
  container: {
    flex: 1,
    paddingTop: t.space4,
    backgroundColor: t.bg,
  },
  searchField: {
    marginHorizontal: t.contentInset,
    marginBottom: t.space2,
  },
  listContent: {
    paddingBottom: TAB_BAR_HEIGHT + t.space4,
  },
  emptyFooter: {
    paddingBottom: TAB_BAR_HEIGHT,
  },
  segmentHeader: {
    backgroundColor: t.bg,
    paddingHorizontal: t.contentInset,
    paddingTop: t.space4,
    paddingBottom: t.space2,
  },
  segmentTitle: {
    ...type.headline,
    color: t.ink,
  },
  segmentCount: {
    color: t.inkMuted,
  },
  quietLine: {
    ...type.body,
    textAlign: "center",
    color: t.inkMuted,
    paddingHorizontal: t.space10,
    paddingTop: t.space6,
  },
});
