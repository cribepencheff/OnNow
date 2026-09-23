// Calendar (PRD 5.2, FR-008, FR-009, FR-012, FR-036, FR-037): a month grid
// for followed series, and the selected day's episodes below. Visual design
// comes later, so styling here stays minimal and functional.

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
import { Image } from "expo-image";

import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
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
import { accent } from "@/theme/color";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Shared between the weekday header row and the grid itself, so the two
// stay aligned.
const GRID_HORIZONTAL_PADDING = 16;

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
            episodesOnSelectedDay.map(({ show, episodes }) => (
              <CalendarRow key={show.id} show={show} episodes={episodes} />
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
            style={[styles.dayMark, cell.isSelected && styles.dayMarkSelected]}
          />
        )}
      </View>
    </Pressable>
  );
}

function CalendarRow({ show, episodes }: ShowEpisodesToday) {
  const line = calendarRowLine(episodes);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={line ? `${show.name}, ${line}` : show.name}
      testID="calendar-row"
    >
      <Image
        source={show.image?.medium ?? undefined}
        style={styles.poster}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.rowDetails}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {show.name}
        </Text>
        {line ? (
          <Text style={styles.rowLine} numberOfLines={1}>
            {line}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#888888",
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
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayCircleSelected: {
    backgroundColor: accent,
  },
  dayCircleToday: {
    borderColor: accent,
  },
  dayNumber: {
    fontSize: 14,
  },
  dayNumberSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dayMark: {
    position: "absolute",
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: accent,
  },
  dayMarkSelected: {
    backgroundColor: "#FFFFFF",
  },
  dayList: {
    paddingTop: 16,
  },
  quietLine: {
    textAlign: "center",
    color: "#666666",
    fontSize: 15,
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
  },
  rowDetails: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  rowLine: {
    fontSize: 13,
    color: "#666666",
  },
  todayButton: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    backgroundColor: accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  todayLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
