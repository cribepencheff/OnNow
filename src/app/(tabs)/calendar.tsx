// Calendar (PRD 5.2, FR-008, FR-009, FR-012, FR-036, FR-037): a month grid
// for followed series, and the selected day's episodes below, on the dark
// design system (ADR 0011, CRI-119).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import { ShowRow, ShowRowLine } from "@/components/ShowRow";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { useToday } from "@/hooks/useToday";
import { useWeekStart } from "@/hooks/useWeekStart";
import {
  addMonths,
  calendarDayCell,
  calendarRowLine,
  datesWithEpisodes,
  fullDateLabel,
  monthGridWeeks,
  monthOf,
  monthTitle,
  type CalendarDayCell,
  type YearMonth,
} from "@/logic/calendar";
import {
  findShowsWithEpisodeToday,
  type ShowEpisodesToday,
} from "@/logic/episodes-today";
import type { LocalDate } from "@/logic/local-date";
import { t, type } from "@/theme/tokens";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Shared between the weekday header row and the grid itself, so the two
// stay aligned.
const GRID_HORIZONTAL_PADDING = t.space4;

// The translucent tab bar's height: the day list and the Today button
// clear it (as in Shows).
const TAB_BAR_HEIGHT = 83;

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function sameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const todayDate = useToday();
  const weekStart = useWeekStart();
  const timeZone = deviceTimeZone();

  const { followedShows, isLoading, isRefetching, refetch } =
    useFollowedEpisodes();

  const todayMonth = useMemo(() => monthOf(todayDate), [todayDate]);
  const [visibleMonth, setVisibleMonth] = useState<YearMonth>(todayMonth);
  const [selectedDate, setSelectedDate] = useState<LocalDate>(todayDate);

  const episodeDates = useMemo(
    () => datesWithEpisodes(followedShows, timeZone),
    [followedShows, timeZone],
  );

  const episodesOnSelectedDay = useMemo(
    () => findShowsWithEpisodeToday(followedShows, timeZone, selectedDate),
    [followedShows, timeZone, selectedDate],
  );

  const awayFromToday =
    !sameMonth(visibleMonth, todayMonth) || selectedDate !== todayDate;

  const goToToday = useCallback(() => {
    setVisibleMonth(todayMonth);
    setSelectedDate(todayDate);
  }, [todayMonth, todayDate]);

  const selectDate = useCallback((date: LocalDate) => {
    setSelectedDate(date);
  }, []);

  const pagerRef = useRef<FlatList<YearMonth>>(null);
  const months = useMemo(
    () => [
      addMonths(visibleMonth, -1),
      visibleMonth,
      addMonths(visibleMonth, 1),
    ],
    [visibleMonth],
  );

  useEffect(() => {
    pagerRef.current?.scrollToIndex({ index: 1, animated: false });
  }, [visibleMonth]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      if (layoutMeasurement.width === 0) {
        return;
      }
      const index = Math.round(contentOffset.x / layoutMeasurement.width);
      if (index === 1) {
        return;
      }
      setVisibleMonth((month) => addMonths(month, index - 1));
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
            testID="calendar-refresh-control"
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={t.inkMuted}
          />
        }
      >
        <Text style={styles.monthTitle}>
          {monthTitle(visibleMonth.year, visibleMonth.month)}
        </Text>

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
          initialScrollIndex={1}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          keyExtractor={(item) => `${item.year}-${item.month}`}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          renderItem={({ item }) => (
            <MonthPage
              yearMonth={item}
              weekStart={weekStart}
              todayDate={todayDate}
              selectedDate={selectedDate}
              episodeDates={episodeDates}
              width={width}
              onSelectDate={selectDate}
            />
          )}
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

      {awayFromToday && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Today"
          onPress={goToToday}
          style={styles.todayButton}
        >
          <Text style={styles.todayLabel}>Today</Text>
        </Pressable>
      )}
    </View>
  );
}

interface MonthPageProps {
  yearMonth: YearMonth;
  weekStart: number;
  todayDate: LocalDate;
  selectedDate: LocalDate;
  episodeDates: Set<LocalDate>;
  width: number;
  onSelectDate: (date: LocalDate) => void;
}

function MonthPage({
  yearMonth,
  weekStart,
  todayDate,
  selectedDate,
  episodeDates,
  width,
  onSelectDate,
}: MonthPageProps) {
  // Each week is its own non-wrapping row of exactly seven flex cells, so
  // cell width or rounding can never push a day into the wrong weekday
  // column, or wrap a row to six cells instead of seven (regression: a
  // single 42-cell flexWrap list did exactly that).
  const weeks = useMemo(
    () => monthGridWeeks(yearMonth, weekStart),
    [yearMonth, weekStart],
  );

  return (
    <View
      testID={`calendar-month-page-${yearMonth.year}-${yearMonth.month}`}
      style={[styles.monthPage, { width }]}
    >
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} testID="calendar-week-row" style={styles.weekRow}>
          {week.map((date, dayIndex) => {
            if (!date) {
              return (
                <View
                  key={dayIndex}
                  testID="calendar-cell"
                  style={styles.dayCellSlot}
                />
              );
            }
            const cell = calendarDayCell(
              date,
              todayDate,
              selectedDate,
              episodeDates,
            );
            return <DayCell key={date} cell={cell} onPress={onSelectDate} />;
          })}
        </View>
      ))}
    </View>
  );
}

function DayCell({
  cell,
  onPress,
}: {
  cell: CalendarDayCell;
  onPress: (date: LocalDate) => void;
}) {
  const day = Number(cell.date.split("-")[2]);
  const label = [
    fullDateLabel(cell.date),
    cell.isToday ? "today" : null,
    cell.hasEpisodes ? "has episodes" : null,
    cell.isSelected ? "selected" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      testID="calendar-cell"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: cell.isSelected }}
      onPress={() => onPress(cell.date)}
      style={styles.dayCellSlot}
    >
      <View
        style={[
          styles.dayCircle,
          cell.isSelected && styles.dayCircleSelected,
          cell.isToday && !cell.isSelected && styles.dayCircleToday,
        ]}
      >
        <Text
          style={[
            styles.dayNumber,
            cell.isSelected && styles.dayNumberSelected,
          ]}
        >
          {day}
        </Text>
        {cell.hasEpisodes && (
          <View
            testID="calendar-day-mark"
            style={[styles.dayMark, cell.isSelected && styles.dayMarkSelected]}
          />
        )}
      </View>
    </Pressable>
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
    paddingTop: t.space2,
    paddingBottom: TAB_BAR_HEIGHT + t.space4,
  },
  monthTitle: {
    ...type.title,
    color: t.ink,
    paddingHorizontal: t.space4,
    marginBottom: t.space2,
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
  monthPage: {
    flexDirection: "column",
  },
  weekRow: {
    flexDirection: "row",
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
  },
  dayCellSlot: {
    flex: 1,
    aspectRatio: 1,
  },
  dayCircle: {
    flex: 1,
    margin: 2,
    borderRadius: t.radiusPill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayCircleSelected: {
    backgroundColor: t.accent,
  },
  dayCircleToday: {
    borderColor: t.accent,
  },
  dayNumber: {
    ...type.body,
    color: t.ink,
  },
  dayNumberSelected: {
    color: t.onAccent,
    fontWeight: "700",
  },
  // PRD 5.2: a short line under the date, in the accent colour, like the
  // follow check.
  dayMark: {
    position: "absolute",
    bottom: 6,
    width: 14,
    height: 3,
    borderRadius: t.radiusPill,
    backgroundColor: t.accent,
  },
  dayMarkSelected: {
    backgroundColor: t.onAccent,
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
    marginLeft: t.space4 + 60 + t.space2 + 4,
    backgroundColor: t.hairline,
  },
  todayButton: {
    position: "absolute",
    bottom: TAB_BAR_HEIGHT + t.space4,
    alignSelf: "center",
    backgroundColor: t.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: t.radiusPill,
  },
  todayLabel: {
    ...type.body,
    color: t.onAccent,
    fontWeight: "700",
  },
});
