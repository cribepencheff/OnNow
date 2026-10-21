import { act, renderHook } from "@testing-library/react-native";

import { useHeldValue } from "./useHeldValue";

const isFirst = (held: number[]) => held.length === 0;

// Home holds the hero's slides until a tapped card's follow circle is done.
describe("useHeldValue", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("shows a change only after the delay", async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: number[] }) => useHeldValue(value, 700, isFirst),
      { initialProps: { value: [1, 2] } },
    );

    await rerender({ value: [1, 2, 3] });
    await act(() => jest.advanceTimersByTime(600));
    expect(result.current).toEqual([1, 2]);

    await act(() => jest.advanceTimersByTime(100));
    expect(result.current).toEqual([1, 2, 3]);
  });

  it("shows an urgent change at once", async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: number[] }) => useHeldValue(value, 700, isFirst),
      { initialProps: { value: [] as number[] } },
    );

    await rerender({ value: [1] });
    expect(result.current).toEqual([1]);
  });

  it("shows only the latest of several changes within the delay", async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: number[] }) => useHeldValue(value, 700, isFirst),
      { initialProps: { value: [1] } },
    );

    await rerender({ value: [1, 2] });
    await act(() => jest.advanceTimersByTime(400));
    await rerender({ value: [1, 2, 3] });
    await act(() => jest.advanceTimersByTime(400));
    expect(result.current).toEqual([1]);

    await act(() => jest.advanceTimersByTime(300));
    expect(result.current).toEqual([1, 2, 3]);
  });
});
