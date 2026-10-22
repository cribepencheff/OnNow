import { Animated, PixelRatio, StyleSheet } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";
import { useShowImages } from "@/hooks/useShowImages";
import { IMAGE_TOP_MARGIN } from "@/logic/hero-layout";
import { HeroPage } from "./HeroPage";

// Where the sharp image starts with Jest's zero safe-area inset.
const IMAGE_TOP = IMAGE_TOP_MARGIN;

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/hooks/useShowImages", () => ({ useShowImages: jest.fn() }));

const mockedImages = useShowImages as jest.Mock;

const show = { id: 92764, name: "JAŸ-Z IN 8" } as TvMazeShow;
const episode = { season: 1, number: 1 } as TvMazeEpisode;

async function renderPage(
  onBackdropLoad: jest.Mock,
  nearby = true,
  pageShow: TvMazeShow = show,
) {
  await render(
    <HeroPage
      item={{
        show: pageShow,
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
      nearby={nearby}
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
    // The first failure tries the fallback size (CRI-140); the second is
    // final.
    const fail = () =>
      fireEvent(screen.getByTestId("hero-backdrop-image"), "error", {
        nativeEvent: { error: "404" },
      });
    await fail();
    await fail();
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
    // Jest's safe-area inset is 0: the image starts at the margin.
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

// CRI-136: every slide stays mounted, but only the settled one and its
// neighbours draw the sharp image; the small copy stands in until then.
describe("HeroPage sharp image only when nearby (CRI-136)", () => {
  beforeEach(() => {
    mockedImages.mockReturnValue({
      data: { highestRatedBackdrop: { file_path: "/backdrop.jpg" } },
      isLoading: false,
    });
  });

  it("draws the sharp image nearby, over the small copy", async () => {
    await renderPage(jest.fn());
    const sharp = screen.getByTestId("hero-backdrop-image");
    expect(JSON.stringify(sharp.props.source)).not.toContain("/w300/");
    expect(JSON.stringify(sharp.props.placeholder)).toContain(
      "/w300/backdrop.jpg",
    );
  });

  it("draws only the small copy further away, and is not ready", async () => {
    const onBackdropLoad = jest.fn();
    await renderPage(onBackdropLoad, false);
    const image = screen.getByTestId("hero-backdrop-image");
    expect(JSON.stringify(image.props.source)).toContain("/w300/backdrop.jpg");
    await fireEvent(image, "load", { nativeEvent: {} });
    expect(onBackdropLoad).not.toHaveBeenCalled();
  });
});

// CRI-140: the hero fetches w1920, and falls back to "original" if that
// undocumented size fails, before it counts as ready.
describe("HeroPage w1920 with an original fallback (CRI-140)", () => {
  beforeEach(() => {
    // Today's phones: the largest size (heroImageSize).
    jest.spyOn(PixelRatio, "get").mockReturnValue(3);
    mockedImages.mockReturnValue({
      data: { highestRatedBackdrop: { file_path: "/backdrop.jpg" } },
      isLoading: false,
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const sharp = () => screen.getByTestId("hero-backdrop-image");

  it("draws w1920, and original once w1920 fails", async () => {
    const onBackdropLoad = jest.fn();
    await renderPage(onBackdropLoad);
    expect(JSON.stringify(sharp().props.source)).toContain(
      "/w1920/backdrop.jpg",
    );

    await fireEvent(sharp(), "error", { nativeEvent: { error: "404" } });
    expect(JSON.stringify(sharp().props.source)).toContain(
      "/original/backdrop.jpg",
    );
    expect(onBackdropLoad).not.toHaveBeenCalled();

    await fireEvent(sharp(), "error", { nativeEvent: { error: "404" } });
    expect(onBackdropLoad).toHaveBeenCalledWith(3);
  });
});

// CRI-100: without a TMDB backdrop, TVmaze's poster, cropped from the top;
// without any image, the still placeholder, without words.
describe("HeroPage image fallback (CRI-100)", () => {
  beforeEach(() => {
    mockedImages.mockReturnValue({
      data: { highestRatedBackdrop: null },
      isLoading: false,
    });
  });

  const newlyweds = {
    id: 91789,
    name: "Newlyweds",
    image: {
      medium: "https://static.tvmaze.com/m.jpg",
      original: "https://static.tvmaze.com/o.jpg",
    },
  } as TvMazeShow;

  it("draws TVmaze's poster, from the top, when TMDB has no backdrop (Newlyweds)", async () => {
    await renderPage(jest.fn(), true, newlyweds);
    const image = screen.getByTestId("hero-backdrop-image");
    expect(JSON.stringify(image.props.source)).toContain(
      "static.tvmaze.com/o.jpg",
    );
    expect(JSON.stringify(image.props.placeholder)).toContain(
      "static.tvmaze.com/m.jpg",
    );
    expect(image.props.contentPosition).not.toEqual({
      top: "50%",
      left: "50%",
    });
    expect(screen.queryByTestId("no-image")).toBeNull();
  });

  it("draws the still placeholder, without words, without any image, and is ready at once", async () => {
    const onBackdropLoad = jest.fn();
    await renderPage(onBackdropLoad, true, {
      ...show,
      image: null,
    } as TvMazeShow);
    expect(screen.getByTestId("no-image")).toBeTruthy();
    expect(screen.queryByText("No image")).toBeNull();
    expect(screen.queryByTestId("hero-backdrop-image")).toBeNull();
    expect(onBackdropLoad).toHaveBeenCalledWith(3);
  });

  it("chooses nothing while TMDB's answer is on its way, so no poster flashes in", async () => {
    mockedImages.mockReturnValue({ data: undefined, isLoading: true });
    await renderPage(jest.fn(), true, newlyweds);
    expect(screen.queryByTestId("hero-backdrop-image")).toBeNull();
    expect(screen.queryByTestId("no-image")).toBeNull();
  });
});
