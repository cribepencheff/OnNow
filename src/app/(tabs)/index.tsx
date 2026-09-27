// Home (PRD 5.1, FR-004, FR-005, FR-006, FR-007, FR-011, FR-012, FR-013,
// FR-037): which followed shows have a new episode today. Visual design
// comes later, so styling here stays minimal and functional; nothing below
// the card is a Design phase decision (backlog CRI-66).

import { useCallback, useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
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
import { findHeroSlides, HeroPager, type HeroSlide } from "@/proto/HomeHeroB";
import { t as protoTokens } from "@/proto/tokens";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useToday } from "@/hooks/useToday";
import {
  deriveHomeViewState,
  homeCardMetaLine,
  nextDayCountLabel,
} from "@/logic/home";
import type { ShowEpisodesToday } from "@/logic/episodes-today";
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
      testID="home-add-show"
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

  const {
    followedCount,
    isLoading,
    isRefetching,
    isError,
    followedShows,
    showsWithEpisodeToday,
    nextDayEpisodes,
    refetch,
  } = useFollowedEpisodes();

  const [pageIndex, setPageIndex] = useState(0);

  const state = deriveHomeViewState({
    followedCount,
    isLoading,
    isError,
    showsWithEpisodeToday,
    nextDayEpisodes,
  });

  // PROTOTYPE (proto/home-backdrop): the hero's 7-day horizon (see
  // HOME_HERO_HORIZON_DAYS in HomeHeroB.tsx). Falls back to the existing
  // single nearest-day pager (state.kind === "next-day") only when nothing
  // followed has an episode within the horizon at all.
  const heroSlides = useMemo(
    () => findHeroSlides(followedShows, deviceTimeZone(), todayDate),
    [followedShows, todayDate],
  );

  const openSearch = useCallback(() => router.push("/search"), [router]);

  // PROTOTYPE (proto/home-backdrop): the outer ScrollView's raw vertical
  // offset, native-driven, and how far it's been pulled past its resting
  // top (see pullDistance below) drive HeroPager's stretchy backdrop on
  // pull-to-refresh (Apple TV Store tab style: the backdrop's top edge
  // stays pinned and the image zooms into the pulled gap, while the
  // foreground moves down with the pull as normal).
  const [scrollY] = useState(() => new Animated.Value(0));
  // The ScrollView's real resting offset: 0 whenever contentInset.top is 0
  // (contentInsetAdjustmentBehavior="never" keeps it that way here), but
  // measured rather than assumed, in case a safe-area or manual inset ever
  // changes that.
  const [pullRestOffsetY, setPullRestOffsetY] = useState(0);

  const handleOuterScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const restOffsetY = -event.nativeEvent.contentInset.top;
          setPullRestOffsetY((current) =>
            current === restOffsetY ? current : restOffsetY,
          );
        },
      }),
    [scrollY],
  );

  // How far the ScrollView has been pulled past its resting top, in
  // points, clamped to never go below 0 (scrolling up into the page has no
  // effect on it). Built once per pullRestOffsetY, which only changes if
  // the measured resting offset itself does, not per scroll frame.
  const pullDistance = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [pullRestOffsetY - 1, pullRestOffsetY],
        outputRange: [1, 0],
        extrapolateLeft: "extend",
        extrapolateRight: "clamp",
      }),
    [scrollY, pullRestOffsetY],
  );

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
    <View style={[styles.container, { backgroundColor: protoTokens.bg }]}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
        onScroll={handleOuterScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            testID="home-refresh-control"
            refreshing={isRefetching}
            onRefresh={refetch}
            // Legible over the hero backdrop (dark image, white foreground
            // text): tintColor is iOS's own spinner, colors is Android's.
            tintColor="#FFFFFF"
            colors={["#FFFFFF"]}
          />
        }
      >
        {/* PROTOTYPE (proto/home-backdrop): Home, direction B. */}
        {heroSlides.length > 0 && (
          <HeroPager
            slides={heroSlides}
            badgeFor={(index) => `UPCOMING · ${index + 1}/${heroSlides.length}`}
            todayDate={todayDate}
            pullDistance={pullDistance}
          />
        )}

        {/* Nothing followed has an episode within the horizon: fall back
            to the single nearest upcoming day, same as before the 7-day
            horizon. */}
        {heroSlides.length === 0 && state.kind === "next-day" && (
          <HeroPager
            slides={state.shows.map((show): HeroSlide => ({
              ...show,
              localDate: state.localDate,
            }))}
            badgeFor={(index) =>
              nextDayCountLabel(
                state.localDate,
                todayDate,
                index,
                state.shows.length,
              )
            }
            todayDate={todayDate}
            pullDistance={pullDistance}
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
      </Animated.ScrollView>
    </View>
  );
}

interface EpisodePagerProps {
  shows: ShowEpisodesToday[];
  badgeLabel: string;
  width: number;
  pageIndex: number;
  onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

// Today's shows (FR-004, FR-005) and the next day with episodes (FR-006)
// use the same pager: one card per show, paged horizontally, with a badge
// above (the count, or the day and the count) and page dots below.
function EpisodePager({
  shows,
  badgeLabel,
  width,
  pageIndex,
  onMomentumScrollEnd,
}: EpisodePagerProps) {
  const router = useRouter();

  return (
    <View style={styles.pagerContainer}>
      <Text style={styles.badge}>{badgeLabel}</Text>
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
              onPress={() =>
                router.push({
                  pathname: "/show/[id]",
                  params: { id: String(item.show.id) },
                })
              }
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

function EmptyFollowList({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add your first show"
      onPress={onPress}
      style={styles.emptyState}
      testID="home-empty-state"
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
