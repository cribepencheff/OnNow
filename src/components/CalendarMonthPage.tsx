// One month of the Calendar grid (PRD 5.2, FR-008): week rows of seven
// day cells, today's ring, the selected fill and the day marks. Memoized,
// so scrolling the pager, which only moves the month title, never redraws
// a month (CRI-120).

import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  calendarDayCell,
  fullDateLabel,
  monthGridWeeks,
  type CalendarDayCell,
  type YearMonth,
} from "@/logic/calendar";
import type { LocalDate } from "@/logic/local-date";
import { t, type } from "@/theme/tokens";

// Shared between the weekday header row and the grid itself, so the two
// stay aligned.
export const GRID_HORIZONTAL_PADDING = t.space4;

interface MonthPageProps {
  yearMonth: YearMonth;
  weekStart: number;
  todayDate: LocalDate;
  selectedDate: LocalDate;
  episodeDates: Set<LocalDate>;
  width: number;
  onSelectDate: (date: LocalDate) => void;
}

export const CalendarMonthPage = memo(function CalendarMonthPage({
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
});

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

const styles = StyleSheet.create({
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
});
