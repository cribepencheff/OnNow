import { act, renderHook } from "@testing-library/react-native";

import { useDebouncedValue } from "./useDebouncedValue";

// PRD 5.4, FR-024: Search waits for a short pause in typing.
describe("useDebouncedValue", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("keeps the old value until the new one has held for the delay", async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 250),
      { initialProps: { value: "Sl" } },
    );
    expect(result.current).toBe("Sl");

    await rerender({ value: "Slo" });
    await act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe("Sl");

    await rerender({ value: "Slow" });
    await act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe("Sl");

    await act(() => jest.advanceTimersByTime(50));
    expect(result.current).toBe("Slow");
  });
});
