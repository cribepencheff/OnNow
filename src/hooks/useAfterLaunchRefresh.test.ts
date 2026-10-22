import { AppState, type AppStateStatus } from "react-native";
import { act, renderHook } from "@testing-library/react-native";

import { useAfterLaunchRefresh } from "./useAfterLaunchRefresh";

// Home's hero settles when the background refresh it opened with is done,
// so it does not keep last time's slides; later refreshes do not move it.
describe("useAfterLaunchRefresh", () => {
  let onAppState: (status: AppStateStatus) => void = () => {};
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_, l) => {
      onAppState = l as (status: AppStateStatus) => void;
      return { remove: jest.fn() } as never;
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function setup() {
    const onDone = jest.fn();
    const hook = renderHook(
      ({ refetching }: { refetching: boolean }) =>
        useAfterLaunchRefresh(refetching, onDone),
      { initialProps: { refetching: false } },
    );
    return { onDone, hook };
  }

  it("calls back once the refresh right after a launch is done", async () => {
    const { onDone, hook } = setup();
    const { rerender } = await hook;
    await rerender({ refetching: true });
    expect(onDone).not.toHaveBeenCalled();
    await rerender({ refetching: false });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("ignores a refresh that starts long after the launch", async () => {
    const { onDone, hook } = setup();
    const { rerender } = await hook;
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    await rerender({ refetching: true });
    await rerender({ refetching: false });
    expect(onDone).not.toHaveBeenCalled();

    // Not just silent: the same refresh right after coming back counts.
    await act(async () => {
      onAppState("active");
    });
    await rerender({ refetching: true });
    await rerender({ refetching: false });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("calls back for the refresh right after coming back to the app", async () => {
    const { onDone, hook } = setup();
    const { rerender } = await hook;
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    await act(async () => {
      onAppState("active");
    });
    await rerender({ refetching: true });
    await rerender({ refetching: false });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
