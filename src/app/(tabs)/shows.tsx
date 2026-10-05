// Shows (PRD 5.3, FR-002, FR-010, FR-035): the followed shows in two
// segments, Active and Inactive, each row with Show detail's status line
// and its service, swipe to unfollow, and a search field that opens Search
// (the same sheet as Home's "+"), in the design system's dark tokens.

import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

import { AddFirstShow } from "@/components/AddFirstShow";
import { RegionLink } from "@/components/RegionLink";
import { ShowsRow } from "@/components/ShowsRow";
import { TvMazeCredit } from "@/components/TvMazeCredit";
import { useFollowList } from "@/hooks/useFollowList";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useToday } from "@/hooks/useToday";
import { splitBySegment, type ShowsSegment } from "@/logic/shows-list";
import { showState, showStateLabel } from "@/logic/show-state";
import { t, type } from "@/theme/tokens";

// The translucent tab bar's height (tabs layout): the list ends above it.
const TAB_BAR_HEIGHT = 83;

const SEGMENT_TITLES: Record<ShowsSegment, string> = {
  active: "Active",
  inactive: "Inactive",
};

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

  // Inactive starts collapsed; its header expands it (PRD 5.3).
  const [inactiveExpanded, setInactiveExpanded] = useState(false);

  const segments = useMemo(
    () =>
      splitBySegment(
        followedShows.map(({ show }) => ({
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
    [followedShows, timeZone, todayDate],
  );

  // A segment without shows is left out.
  const sections = (["active", "inactive"] as const)
    .filter((key) => segments[key].length > 0)
    .map((key) => ({
      key,
      count: segments[key].length,
      data: key === "inactive" && !inactiveExpanded ? [] : segments[key],
    }));

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
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <SegmentHeader
              segment={section.key}
              count={section.count}
              expanded={section.key === "active" || inactiveExpanded}
              onToggle={
                section.key === "inactive"
                  ? () => setInactiveExpanded((expanded) => !expanded)
                  : undefined
              }
            />
          )}
          renderItem={({ item }) => (
            <ShowsRow
              show={item.show}
              statusLine={showStateLabel(item.state, todayDate)}
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

// "Active · 4"; the Inactive header is a button that expands or collapses
// its segment.
function SegmentHeader({
  segment,
  count,
  expanded,
  onToggle,
}: {
  segment: ShowsSegment;
  count: number;
  expanded: boolean;
  onToggle?: () => void;
}) {
  const title = SEGMENT_TITLES[segment];
  const content = (
    <>
      <Text style={styles.segmentTitle}>
        {title}
        <Text style={styles.segmentCount}> · {count}</Text>
      </Text>
      {onToggle && (
        <SymbolView
          name={{
            ios: expanded ? "chevron.down" : "chevron.right",
            android: expanded ? "expand_more" : "chevron_right",
            web: expanded ? "expand_more" : "chevron_right",
          }}
          tintColor={t.inkMuted}
          size={14}
          weight="semibold"
        />
      )}
    </>
  );

  if (!onToggle) {
    return (
      <View
        style={styles.segmentHeader}
        accessibilityRole="header"
        accessible
        accessibilityLabel={`${title}, ${count}`}
        testID={`shows-segment-${segment}`}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      style={styles.segmentHeader}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count}`}
      accessibilityState={{ expanded }}
      onPress={onToggle}
      testID={`shows-segment-${segment}`}
    >
      {content}
    </Pressable>
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
  emptyFooter: {
    paddingBottom: TAB_BAR_HEIGHT,
  },
  segmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space2,
    paddingHorizontal: t.space4,
    paddingTop: t.space6,
    paddingBottom: t.space2,
  },
  segmentTitle: {
    ...type.headline,
    color: t.ink,
  },
  segmentCount: {
    color: t.inkMuted,
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
