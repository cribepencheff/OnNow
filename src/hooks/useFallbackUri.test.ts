import { act, renderHook } from "@testing-library/react-native";

import { useFallbackUri } from "./useFallbackUri";

// CRI-140: w1920 is served by TMDB but not documented; if it ever fails,
// the same image is fetched at "original".
describe("useFallbackUri", () => {
  it("shows the URL, and the fallback once it fails", async () => {
    const { result } = await renderHook(() =>
      useFallbackUri("https://x/w1920/a.jpg", "https://x/original/a.jpg"),
    );
    expect(result.current.uri).toBe("https://x/w1920/a.jpg");
    let switched = false;
    await act(async () => {
      switched = result.current.onError();
    });
    expect(switched).toBe(true);
    expect(result.current.uri).toBe("https://x/original/a.jpg");
  });

  it("reports a failed fallback, or no fallback, as a failure", async () => {
    const { result } = await renderHook(() =>
      useFallbackUri("https://x/w1920/a.jpg", "https://x/original/a.jpg"),
    );
    await act(async () => {
      result.current.onError();
    });
    expect(result.current.onError()).toBe(false);

    const { result: plain } = await renderHook(() =>
      useFallbackUri("https://x/w300/a.jpg", undefined),
    );
    expect(plain.current.onError()).toBe(false);
  });

  it("tries a new URL first again", async () => {
    const { result, rerender } = await renderHook(
      ({ uri }: { uri: string }) =>
        useFallbackUri(uri, uri.replace("w1920", "original")),
      { initialProps: { uri: "https://x/w1920/a.jpg" } },
    );
    await act(async () => {
      result.current.onError();
    });
    await rerender({ uri: "https://x/w1920/b.jpg" });
    expect(result.current.uri).toBe("https://x/w1920/b.jpg");
  });
});
