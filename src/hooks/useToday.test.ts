import { renderHook } from "@testing-library/react-native";

import { useToday } from "./useToday";

// FR-004, ADR 0001: "today" is the user's local date in their own time zone.
describe("useToday", () => {
  const originalDateTimeFormat = Intl.DateTimeFormat;

  afterEach(() => {
    Intl.DateTimeFormat = originalDateTimeFormat;
    jest.useRealTimers();
  });

  it("returns today's date in the device time zone", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-14T23:30:00Z"));
    Intl.DateTimeFormat = ((...args: unknown[]) => {
      const format = new originalDateTimeFormat(
        ...(args as ConstructorParameters<typeof Intl.DateTimeFormat>),
      );
      return {
        ...format,
        resolvedOptions: () => ({
          ...format.resolvedOptions(),
          timeZone: "Asia/Tokyo",
        }),
      };
    }) as typeof Intl.DateTimeFormat;

    const { result, unmount } = await renderHook(() => useToday());

    // 2026-03-14T23:30:00Z is 2026-03-15 in Asia/Tokyo (UTC+9).
    expect(result.current).toBe("2026-03-15");

    await unmount();
  });
});
