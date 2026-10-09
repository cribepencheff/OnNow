import { Animated, StyleSheet } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";
import { useShowImages } from "@/hooks/useShowImages";
import { HEADER_BAR_HEIGHT } from "@/logic/header";
import { IMAGE_TOP_MARGIN } from "@/logic/hero-layout";
import { HeroPage } from "./HeroPage";

// Where the sharp image starts with Jest's zero safe-area inset.
const IMAGE_TOP = HEADER_BAR_HEIGHT + IMAGE_TOP_MARGIN;

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/hooks/useShowImages", () => ({ useShowImages: jest.fn() }));

const mockedImages = useShowImages as jest.Mock;

const show = { id: 92764, name: "JAŸ-Z IN 8" } as TvMazeShow;
const episode = { season: 1, number: 1 } as TvMazeEpisode;

async function renderPage(onBackdropLoad: jest.Mock) {
  await render(
    <HeroPage
      item={{
        show,
        episodes: [episode],
        localDate: "2026-10-04",
        endDate: "2026-10-04",
      }}
      index={3}
      width={390}
      todayDate="2026-10-04"
      scrollX={new Animated.Value(0)}
      reduceMotionEnabled={false}
      pullDistance={
        new Animated.Value(
          0,
        ) as unknown as Animated.AnimatedInterpolation<number>
      }
      onBackdropLoad={onBackdropLoad}
    />,
  );
}

// The pager's auto-advance waits until a slide is ready (CRI-94): a slide
// without an image, or whose image fails, must not hold it forever.
describe("HeroPage backdrop readiness (CRI-94)", () => {
  it("is ready at once when the lookups are done and there is no image (JAŸ-Z IN 8)", async () => {
    mockedImages.mockReturnValue({ data: undefined, isLoading: false });
    const onBackdropLoad = jest.fn();
    await renderPage(onBackdropLoad);

    expect(onBackdropLoad).toHaveBeenCalledWith(3);
  });

  it("waits while the image lookups are still running", async () => {
    mockedImages.mockReturnValue({ data: undefined, isLoading: true });
    const onBackdropLoad = jest.fn();
    await renderPage(onBackdropLoad);

    expect(onBackdropLoad).not.toHaveBeenCalled();
  });

  it("waits for an image to load, and counts a failed load as ready", async () => {
    mockedImages.mockReturnValue({
      data: { highestRatedBackdrop: { file_path: "/backdrop.jpg" } },
      isLoading: false,
    });
    const onBackdropLoad = jest.fn();
    await renderPage(onBackdropLoad);

    expect(onBackdropLoad).not.toHaveBeenCalled();
    await fireEvent(screen.getByTestId("hero-backdrop-image"), "error", {
      nativeEvent: { error: "404" },
    });
    expect(onBackdropLoad).toHaveBeenCalledWith(3);
  });
});

// CRI-124, round 3: the sharp image fills the hero's upper part; under it
// the same image, mirrored, for the progressive blur to soften.
describe("HeroPage mirror (CRI-124)", () => {
  beforeEach(() => {
    mockedImages.mockReturnValue({
      data: { highestRatedBackdrop: { file_path: "/backdrop.jpg" } },
      isLoading: false,
    });
  });

  it("draws the image again, flipped, right under the sharp one", async () => {
    await renderPage(jest.fn());
    const sharp = screen.getByTestId("hero-backdrop-image");
    const mirror = screen.getByTestId("hero-backdrop-mirror");
    expect(mirror.props.source).toEqual(sharp.props.source);
    expect(StyleSheet.flatten(mirror.props.style).transform).toEqual([
      { scaleY: -1 },
    ]);
    const sharpHeight = StyleSheet.flatten(sharp.props.style).height;
    const mirrorBox = StyleSheet.flatten(
      screen.getByTestId("hero-backdrop-mirror-box").props.style,
    );
    // Jest's safe-area inset is 0: the image starts under the header row.
    expect(mirrorBox.top).toBe(IMAGE_TOP + sharpHeight);
  });

  // The top edge, mirrored upwards: its bottom edge meets the image's top.
  it("draws the image flipped again, right above the sharp one", async () => {
    await renderPage(jest.fn());
    const sharp = screen.getByTestId("hero-backdrop-image");
    const top = screen.getByTestId("hero-backdrop-top-mirror");
    expect(top.props.source).toEqual(sharp.props.source);
    expect(StyleSheet.flatten(top.props.style).transform).toEqual([
      { scaleY: -1 },
    ]);
    const sharpHeight = StyleSheet.flatten(sharp.props.style).height;
    const topBox = StyleSheet.flatten(
      screen.getByTestId("hero-backdrop-top-mirror-box").props.style,
    );
    expect(topBox.top).toBe(IMAGE_TOP - sharpHeight);
  });
});
