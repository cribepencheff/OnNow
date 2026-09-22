import { renderHook } from "@testing-library/react-native";
import { useCalendars } from "expo-localization";

import { useWeekStart } from "./useWeekStart";

jest.mock("expo-localization", () => ({
  useCalendars: jest.fn(),
}));

const mockedUseCalendars = useCalendars as jest.MockedFunction<
  typeof useCalendars
>;

function calendar(firstWeekday: number | null) {
  return [
    {
      calendar: null,
      uses24hourClock: null,
      firstWeekday,
      timeZone: null,
    },
  ] as never;
}

// PRD 5.2, 5.7: weeks start on the day the phone's locale says (Monday in
// Sweden).
describe("useWeekStart", () => {
  it("maps Sweden's Monday-first locale to 1 (Date#getDay() convention)", async () => {
    mockedUseCalendars.mockReturnValue(calendar(2)); // Weekday.MONDAY

    const { result } = await renderHook(() => useWeekStart());

    expect(result.current).toBe(1);
  });

  it("maps a Sunday-first locale to 0", async () => {
    mockedUseCalendars.mockReturnValue(calendar(1)); // Weekday.SUNDAY

    const { result } = await renderHook(() => useWeekStart());

    expect(result.current).toBe(0);
  });

  it("falls back to Sunday when the platform does not expose it", async () => {
    mockedUseCalendars.mockReturnValue(calendar(null));

    const { result } = await renderHook(() => useWeekStart());

    expect(result.current).toBe(0);
  });
});
