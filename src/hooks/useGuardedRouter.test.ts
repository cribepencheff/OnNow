import { act, renderHook } from "@testing-library/react-native";
import * as Linking from "expo-linking";

import {
  openExternalUrl,
  releaseNavigation,
  useGuardedRouter,
} from "./useGuardedRouter";

// The lock's own timing is tested in logic/navigation-guard.test.ts.
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));
jest.mock("expo-linking", () => ({ openURL: jest.fn() }));

describe("useGuardedRouter (CRI-117)", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    (Linking.openURL as jest.Mock).mockClear();
    releaseNavigation();
  });

  async function guardedRouter() {
    const { result } = await renderHook(() => useGuardedRouter());
    return {
      push: (href: string) => result.current.push(href as "/search"),
      back: () => result.current.back(),
    };
  }

  it("a double tap on a row pushes Show detail once", async () => {
    const router = await guardedRouter();
    await act(() => {
      router.push("/show/1");
      router.push("/show/1");
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("a double tap on a back control goes back once", async () => {
    const router = await guardedRouter();
    await act(() => {
      router.back();
      router.back();
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("navigates again once the screen transition has ended", async () => {
    const router = await guardedRouter();
    await act(() => {
      router.push("/search");
      releaseNavigation();
      router.back();
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("a double tap on a link opens it once, sharing the lock", async () => {
    const router = await guardedRouter();
    await act(() => {
      openExternalUrl("https://www.tvmaze.com");
      openExternalUrl("https://www.tvmaze.com");
      router.push("/search");
    });
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
