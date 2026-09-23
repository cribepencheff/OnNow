// Calendar (PRD 5.2, FR-008, FR-009, FR-012, FR-036, FR-037): a month grid
// for followed series, and the selected day's episodes below. Visual design
// comes later, so styling here stays minimal and functional, matching the
// look and behaviour of the grid this replaces.
//
// The month grid itself is react-native-calendars (ADR 0010): a proven
// library, not our own flex layout, after a hand-rolled grid wrapped to six
// columns instead of seven on some screen widths (CRI-67). CalendarList in
// horizontal + pagingEnabled mode gives a real sliding transition between
// months (Calendar's enableSwipeMonths only swaps the month with no
// transition), with staticHeader rendering one title/weekday row that stays
// put while months scroll behind it. We keep our own day rendering
// (dayComponent) so "today" and "selected" stay driven by our own
// useToday()/selectedDate, never the library's own device-clock check
// (ADR 0001), and the day list, marking data and "Today" button are ours.

import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { CalendarList, type DateData } from "react-native-calendars";

import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useToday } from "@/hooks/useToday";
import { useWeekStart } from "@/hooks/useWeekStart";
import {
  calendarDayCell,
  calendarRowLine,
  datesWithEpisodes,
  fullDateLabel,
  monthOf,
  monthTitle,
  type YearMonth,
} from "@/logic/calendar";
import {
  findShowsWithEpisodeToday,
  type ShowEpisodesToday,
} from "@/logic/episodes-today";
import type { LocalDate } from "@/logic/local-date";
import { accent } from "@/theme/color";

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function sameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

function monthKey({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

// The grid's background must match the screen, never a library default
// (CRI-76 review: a white block was showing on the app's grey background).
const calendarTheme = {
  calendarBackground: "transparent",
};

export default function CalendarScreen() {
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

  const handleMonthChange = useCallback((date: DateData) => {
    setVisibleMonth({ year: date.year, month: date.month });
  }, []);

  const renderDay = useCallback(
    (dayProps: {
      date?: DateData;
      state?: string;
      onPress?: (date?: DateData) => void;
    }) => (
      <DayCell
        {...dayProps}
        todayDate={todayDate}
        selectedDate={selectedDate}
        episodeDates={episodeDates}
      />
    ),
    [todayDate, selectedDate, episodeDates],
  );

  const renderHeader = useCallback(
    () => (
      <Text style={styles.monthTitle}>
        {monthTitle(visibleMonth.year, visibleMonth.month)}
      </Text>
    ),
    [visibleMonth],
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
        <CalendarList
          testID="calendar-grid"
          current={monthKey(visibleMonth)}
          firstDay={weekStart}
          horizontal
          pagingEnabled
          staticHeader
          hideArrows
          hideExtraDays={false}
          showSixWeeks
          renderHeader={renderHeader}
          dayComponent={renderDay}
          onDayPress={(date) => selectDate(date.dateString)}
          onMonthChange={handleMonthChange}
          theme={calendarTheme}
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

interface DayCellProps {
  date?: DateData;
  state?: string;
  onPress?: (date?: DateData) => void;
  todayDate: LocalDate;
  selectedDate: LocalDate;
  episodeDates: Set<LocalDate>;
}

function DayCell({
  date,
  state,
  onPress,
  todayDate,
  selectedDate,
  episodeDates,
}: DayCellProps) {
  // Days from the previous or next month: react-native-calendars marks
  // these 'disabled' (we set no minDate/maxDate/disabledByWeekDays, so this
  // is the only way that state occurs). Left blank rather than shown faded,
  // to avoid ambiguous tap-to-navigate-months semantics (REVIEW decision,
  // unchanged from CRI-67).
  if (!date || state === "disabled") {
    return <View style={styles.dayCellSlot} />;
  }

  const cell = calendarDayCell(
    date.dateString,
    todayDate,
    selectedDate,
    episodeDates,
  );
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: cell.isSelected }}
      onPress={() => onPress?.(date)}
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
          {date.day}
        </Text>
      </View>
      {/* Reserved whether or not this day has episodes, so every row's
          height matches regardless of marking (no layout jitter). Sits
          below the circle, never overlapping the date number. */}
      <View style={styles.dayMarkSlot}>
        {cell.hasEpisodes && <View style={styles.dayMark} />}
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
    marginBottom: 8,
  },
  dayCellSlot: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  dayMarkSlot: {
    height: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dayMark: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: accent,
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
