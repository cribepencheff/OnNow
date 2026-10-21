import { act, renderHook } from "@testing-library/react-native";

import { useSettledValue } from "./useSettledValue";

const firstOnes = (settled: number[], next: number[]) =>
  settled.length === 0 && next.length > 0;

// Home settles the hero's slides with it (heroPagerSlides).
describe("useSettledValue", () => {
  function setup(value: number[], epoch = "day 1") {
    return renderHook(
      ({ value, epoch }: { value: number[]; epoch: string }) =>
        useSettledValue(value, epoch, firstOnes),
      { initialProps: { value, epoch } },
    );
  }

  it("keeps the settled value until settle()", async () => {
    const { result, rerender } = await setup([1, 2]);
    await rerender({ value: [1, 2, 3], epoch: "day 1" });
    expect(result.current.value).toEqual([1, 2]);

    await act(() => result.current.settle());
    expect(result.current.value).toEqual([1, 2, 3]);
  });

  it("takes the value at once when the epoch changes", async () => {
    const { result, rerender } = await setup([1, 2]);
    await rerender({ value: [3], epoch: "day 2" });
    expect(result.current.value).toEqual([3]);
  });

  it("takes the value at once when the settled one is urgent to replace", async () => {
    const { result, rerender } = await setup([]);
    await rerender({ value: [1], epoch: "day 1" });
    expect(result.current.value).toEqual([1]);
  });

  // The bug the owner hit: a new empty value every render, replacing an
  // empty settled one, rendered again without end.
  it("settles once for a value that is a new object every render", async () => {
    let renders = 0;
    const { result } = await renderHook(() => {
      renders += 1;
      return useSettledValue([] as number[], "day 1", firstOnes);
    });
    expect(result.current.value).toEqual([]);
    expect(renders).toBeLessThan(5);
  });

  it("does not take a later change after a settle with nothing new", async () => {
    const { result, rerender } = await setup([1]);
    await act(() => result.current.settle());
    await rerender({ value: [1, 2], epoch: "day 1" });
    expect(result.current.value).toEqual([1]);
  });
});
