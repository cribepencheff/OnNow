import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook } from "@testing-library/react-native";

import {
  HERO_W1920_STORAGE_KEY,
  loadHeroW1920,
  setHeroW1920,
  useHeroW1920,
} from "./useHeroW1920";

// CRI-140: a dev switch draws the hero at TMDB's w1920 instead of
// "original", saved so it holds over a cold start.
describe("useHeroW1920", () => {
  afterEach(async () => {
    await act(async () => setHeroW1920(false));
  });

  it("is off when never set", async () => {
    const { result } = await renderHook(() => useHeroW1920());
    expect(result.current).toBe(false);
  });

  it("turns on, for every reader, and is saved", async () => {
    const { result } = await renderHook(() => useHeroW1920());
    await act(async () => setHeroW1920(true));
    expect(result.current).toBe(true);
    expect(await AsyncStorage.getItem(HERO_W1920_STORAGE_KEY)).toBe("true");
  });

  it("reads the saved choice on a launch", async () => {
    await AsyncStorage.setItem(HERO_W1920_STORAGE_KEY, "true");
    const { result } = await renderHook(() => useHeroW1920());
    await act(async () => loadHeroW1920());
    expect(result.current).toBe(true);
  });
});
