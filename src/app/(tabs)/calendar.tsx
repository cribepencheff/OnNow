// Calendar (PRD 5.2, FR-008, FR-009, FR-012, FR-036, FR-037): a month grid
// for followed series, and the selected day's episodes below, on the dark
// design system (ADR 0011, CRI-119).
//
// The pager (CRI-120) is one fixed list of months, from the first to the
// last month with an episode, so a fast swipe never runs out of pages and
// nothing is re-centred. The month on screen lives in a small store, not
// in this screen's state: only the header (month title and Today button)
// listens to it, so scrolling never redraws the screen or the pager.

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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

import {
  CalendarMonthPage,
  GRID_HORIZONTAL_PADDING,
} from "@/components/CalendarMonthPage";
import { ShowRow, ShowRowLine } from "@/components/ShowRow";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { useToday } from "@/hooks/useToday";
import { useWeekStart } from "@/hooks/useWeekStart";
import {
  calendarMonths,
  calendarRowLine,
  datesWithEpisodes,
  isTodayButtonShown,
  monthIndexAtOffset,
  monthOf,
  monthTitle,
  sameMonth,
  type YearMonth,
} from "@/logic/calendar";
import {
  findShowsWithEpisodeToday,
  type ShowEpisodesToday,
} from "@/logic/episodes-today";
import type { LocalDate } from "@/logic/local-date";
import { t, type } from "@/theme/tokens";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The translucent tab bar's height: the day list clears it (as in Shows).
const TAB_BAR_HEIGHT = 83;

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// The month on screen, for the header only (see the top of this file).
interface VisibleMonthStore {
  get: () => YearMonth;
  set: (month: YearMonth) => void;
  subscribe: (listener: () => void) => () => void;
}

function createVisibleMonthStore(initial: YearMonth): VisibleMonthStore {
  let month = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => month,
    set: (next) => {
      if (sameMonth(next, month)) {
        return;
      }
      month = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function indexOfMonth(months: YearMonth[], month: YearMonth): number {
  return months.findIndex((candidate) => sameMonth(candidate, month));
}

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const todayDate = useToday();
  const weekStart = useWeekStart();
  const timeZone = deviceTimeZone();

  const { followedShows, isLoading, isRefetching, refetch } =
    useFollowedEpisodes();

  const todayMonth = useMemo(() => monthOf(todayDate), [todayDate]);
  const [selectedDate, setSelectedDate] = useState<LocalDate>(todayDate);
  const [visibleMonth] = useState(() => createVisibleMonthStore(todayMonth));

  const episodeDates = useMemo(
    () => datesWithEpisodes(followedShows, timeZone),
    [followedShows, timeZone],
  );

  const episodesOnSelectedDay = useMemo(
    () => findShowsWithEpisodeToday(followedShows, timeZone, selectedDate),
    [followedShows, timeZone, selectedDate],
  );

  const months = useMemo(
    () => calendarMonths(episodeDates, todayDate),
    [episodeDates, todayDate],
  );
  const todayIndex = indexOfMonth(months, todayMonth);

  const pagerRef = useRef<FlatList<YearMonth>>(null);
  // The scroll handler reads the months from here, so it never changes
  // and never redraws the pager.
  const monthsRef = useRef(months);

  // When the range grows (episodes arriving, a show followed), the month
  // on screen moves to a new index: keep it on screen.
  useLayoutEffect(() => {
    if (monthsRef.current === months) {
      return;
    }
    monthsRef.current = months;
    const index = indexOfMonth(months, visibleMonth.get());
    if (index < 0) {
      visibleMonth.set(todayMonth);
    }
    pagerRef.current?.scrollToIndex({
      index: index < 0 ? todayIndex : index,
      animated: false,
    });
  }, [months, todayIndex, todayMonth, visibleMonth]);

  // The title switches as soon as a page passes halfway (CRI-120).
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      const current = monthsRef.current;
      const index = monthIndexAtOffset(
        contentOffset.x,
        layoutMeasurement.width,
        current.length,
      );
      visibleMonth.set(current[index]);
    },
    [visibleMonth],
  );

  const goToToday = useCallback(() => {
    setSelectedDate(todayDate);
    visibleMonth.set(todayMonth);
    pagerRef.current?.scrollToIndex({ index: todayIndex, animated: true });
  }, [todayDate, todayMonth, todayIndex, visibleMonth]);

  const selectDate = useCallback((date: LocalDate) => {
    setSelectedDate(date);
  }, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const renderMonth = useCallback(
    ({ item }: { item: YearMonth }) => (
      <CalendarMonthPage
        yearMonth={item}
        weekStart={weekStart}
        todayDate={todayDate}
        selectedDate={selectedDate}
        episodeDates={episodeDates}
        width={width}
        onSelectDate={selectDate}
      />
    ),
    [weekStart, todayDate, selectedDate, episodeDates, width, selectDate],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        alwaysBounceVertical
        // The month title and Today stay at the top while the day list
        // scrolls (CRI-120).
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            testID="calendar-refresh-control"
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={t.inkMuted}
          />
        }
      >
        <MonthHeader
          visibleMonth={visibleMonth}
          selectedDate={selectedDate}
          todayDate={todayDate}
          onToday={goToToday}
        />

        <View style={styles.weekdayRow}>
          {Array.from({ length: 7 }, (_, index) => (
            <Text key={index} style={styles.weekdayLabel}>
              {WEEKDAY_LABELS[(weekStart + index) % 7]}
            </Text>
          ))}
        </View>

        <FlatList
          ref={pagerRef}
          testID="calendar-pager"
          data={months}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={todayIndex}
          getItemLayout={getItemLayout}
          keyExtractor={(item) => `${item.year}-${item.month}`}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          // A month and its neighbours on each side; the rest are drawn as
          // a swipe gets near them.
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          renderItem={renderMonth}
        />

        <View style={styles.dayList}>
          {isLoading ? (
            <Text style={styles.quietLine}>Loading your episodes…</Text>
          ) : episodesOnSelectedDay.length === 0 ? (
            <Text style={styles.quietLine}>Nothing on this day.</Text>
          ) : (
            episodesOnSelectedDay.map(({ show, episodes }, index) => (
              <View key={show.id}>
                {index > 0 && <View style={styles.separator} />}
                <CalendarRow show={show} episodes={episodes} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// The month title and, on the same row, right-aligned, the Today button
// (FR-036, CRI-120). The only part of the screen that follows the scroll.
function MonthHeader({
  visibleMonth,
  selectedDate,
  todayDate,
  onToday,
}: {
  visibleMonth: VisibleMonthStore;
  selectedDate: LocalDate;
  todayDate: LocalDate;
  onToday: () => void;
}) {
  const month = useSyncExternalStore(visibleMonth.subscribe, visibleMonth.get);

  return (
    <View style={styles.header}>
      <Text style={styles.monthTitle} testID="calendar-month-title">
        {monthTitle(month.year, month.month)}
      </Text>
      {isTodayButtonShown(selectedDate, todayDate, month) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Today"
          onPress={onToday}
          style={styles.todayButton}
          hitSlop={8}
        >
          <Text style={styles.todayLabel}>Today</Text>
        </Pressable>
      )}
    </View>
  );
}

// The shared row (CRI-118): poster, title, and the episode code and title
// (PRD 5.2). Tapping it opens Show detail (FR-030, CRI-79).
function CalendarRow({ show, episodes }: ShowEpisodesToday) {
  const router = useGuardedRouter();
  const line = calendarRowLine(episodes);

  return (
    <ShowRow
      title={show.name}
      posterUri={show.image?.medium}
      style={styles.row}
      accessibilityLabel={line ? `${show.name}, ${line}` : show.name}
      onPress={() =>
        router.push({
          pathname: "/show/[id]",
          params: { id: String(show.id) },
        })
      }
      testID="calendar-row"
    >
      {line ? <ShowRowLine>{line}</ShowRowLine> : null}
    </ShowRow>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  scrollContent: {
    paddingBottom: TAB_BAR_HEIGHT + t.space4,
  },
  // Opaque, so the day list scrolls under it.
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: t.space2,
    paddingTop: t.space2,
    paddingBottom: t.space2,
    paddingHorizontal: t.contentInset,
    backgroundColor: t.bg,
  },
  monthTitle: {
    ...type.title,
    flexShrink: 1,
    color: t.ink,
  },
  // A quiet pill (design system: "every control is a pill"; quiet round
  // controls on surface-raised), so the selected day stays the only
  // accent fill on the screen.
  todayButton: {
    paddingHorizontal: t.space4,
    paddingVertical: 6,
    borderRadius: t.radiusPill,
    backgroundColor: t.surfaceRaised,
  },
  todayLabel: {
    ...type.meta,
    fontWeight: "600",
    color: t.ink,
  },
  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
  },
  weekdayLabel: {
    ...type.meta,
    flex: 1,
    textAlign: "center",
    color: t.inkSubtle,
  },
  dayList: {
    paddingTop: t.space4,
  },
  quietLine: {
    ...type.body,
    textAlign: "center",
    color: t.inkMuted,
    paddingHorizontal: t.space10,
    paddingTop: t.space6,
  },
  // Rows on surface, as in Shows.
  row: {
    backgroundColor: t.surface,
  },
  // Inset to the text column, as on iOS lists (as in Shows).
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: t.contentInset + 60 + t.space2 + 4,
    backgroundColor: t.hairline,
  },
});
