// Home (PRD 5.1, FR-004, FR-005, FR-006, FR-007, FR-011, FR-012, FR-013,
// FR-037): which followed shows have a new episode today. Visual design
// comes later, so styling here stays minimal and functional; nothing below
// the card is a Design phase decision (backlog CRI-66).

import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

import { HomeCard } from "@/components/HomeCard";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useShow } from "@/hooks/useShow";
import { useToday } from "@/hooks/useToday";
import {
  deriveHomeViewState,
  homeCardMetaLine,
  todayCountLabel,
  upcomingDayLabel,
} from "@/logic/home";
import { localDateFromAirstamp, type LocalDate } from "@/logic/local-date";
import type { ShowEpisodesToday } from "@/logic/episodes-today";
import type { TvMazeEpisode } from "@/api/tvmaze-types";
import { accent } from "@/theme/color";

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// FR-007: the "+" in Home's header, opening Search. Rendered through the
// tab navigator's own `headerRight` (configured in `(tabs)/_layout.tsx`)
// rather than as custom content inside the screen body: a previous version
// placed it in an in-screen row, which did not render in Expo Go. Using the
// native header slot puts it under React Navigation's own header layout
// instead of this screen's.
export function HomeHeaderAddButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add show"
      onPress={() => router.push("/search")}
      hitSlop={16}
      style={styles.headerAddButton}
    >
      <SymbolView
        name={{ ios: "plus", android: "add", web: "add" }}
        tintColor={accent}
        size={22}
      />
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const todayDate = useToday();
  const timeZone = deviceTimeZone();

  const {
    followedCount,
    isLoading,
    isRefetching,
    isError,
    showsWithEpisodeToday,
    nextByShow,
    refetch,
  } = useFollowedEpisodes();

  const [pageIndex, setPageIndex] = useState(0);

  const state = deriveHomeViewState({
    followedCount,
    isLoading,
    isError,
    showsWithEpisodeToday,
    nextByShow,
  });

  const openSearch = useCallback(() => router.push("/search"), [router]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      if (layoutMeasurement.width === 0) {
        return;
      }
      setPageIndex(Math.round(contentOffset.x / layoutMeasurement.width));
    },
    [],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        alwaysBounceVertical
        refreshControl={
          <RefreshControl
            testID="home-refresh-control"
            refreshing={isRefetching}
            onRefresh={refetch}
          />
        }
      >
        {state.kind === "today" && (
          <TodayPager
            shows={state.shows}
            width={width}
            pageIndex={pageIndex}
            onMomentumScrollEnd={handleMomentumScrollEnd}
          />
        )}

        {state.kind === "next-episode" && (
          <NextEpisodeCard
            showId={state.showId}
            episode={state.episode}
            todayDate={todayDate}
            timeZone={timeZone}
          />
        )}

        {state.kind === "empty-follow-list" && (
          <EmptyFollowList onPress={openSearch} />
        )}

        {state.kind === "no-upcoming" && (
          <Text style={styles.quietLine}>Nothing upcoming.</Text>
        )}

        {state.kind === "error" && (
          <Text style={styles.quietLine}>
            Couldn&apos;t load your shows. Pull to refresh.
          </Text>
        )}

        {state.kind === "loading" && (
          <Text style={styles.quietLine}>Loading your shows…</Text>
        )}
      </ScrollView>
    </View>
  );
}

interface TodayPagerProps {
  shows: ShowEpisodesToday[];
  width: number;
  pageIndex: number;
  onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

function TodayPager({
  shows,
  width,
  pageIndex,
  onMomentumScrollEnd,
}: TodayPagerProps) {
  return (
    <View style={styles.pagerContainer}>
      <Text
        style={styles.badge}
        accessibilityLabel={`New today, show ${pageIndex + 1} of ${shows.length}`}
      >
        {todayCountLabel(pageIndex, shows.length)}
      </Text>
      <FlatList
        testID="home-pager"
        data={shows}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.show.id)}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <HomeCard
              show={item.show}
              metaLine={homeCardMetaLine(item.show, item.episodes)}
            />
          </View>
        )}
      />
      {shows.length > 1 && (
        <View
          style={styles.dots}
          accessibilityLabel={`Show ${pageIndex + 1} of ${shows.length}`}
        >
          {shows.map((show, index) => (
            <View
              key={show.show.id}
              style={[styles.dot, index === pageIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface NextEpisodeCardProps {
  showId: number;
  episode: TvMazeEpisode;
  todayDate: LocalDate;
  timeZone: string;
}

function NextEpisodeCard({
  showId,
  episode,
  todayDate,
  timeZone,
}: NextEpisodeCardProps) {
  const { data: show } = useShow(showId);

  if (!show) {
    return null;
  }

  const localDate = localDateFromAirstamp(episode.airstamp, timeZone);

  return (
    <View style={styles.pagerContainer}>
      <Text style={styles.badge}>{upcomingDayLabel(localDate, todayDate)}</Text>
      <HomeCard show={show} metaLine={homeCardMetaLine(show, [episode])} />
    </View>
  );
}

function EmptyFollowList({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add your first show"
      onPress={onPress}
      style={styles.emptyState}
    >
      <Text style={styles.emptyStateText}>Add your first show</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAddButton: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  pagerContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  badge: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#666666",
    marginBottom: 8,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D0D0D0",
  },
  dotActive: {
    backgroundColor: accent,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: "600",
    color: accent,
  },
  quietLine: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    color: "#666666",
    fontSize: 15,
    paddingHorizontal: 32,
  },
});
