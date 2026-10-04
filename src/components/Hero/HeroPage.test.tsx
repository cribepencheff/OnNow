import { Animated } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";
import { useEpisodeStill } from "@/hooks/useEpisodeStill";
import { useShowImages } from "@/hooks/useShowImages";
import { HeroPage } from "./HeroPage";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/hooks/useShowImages", () => ({ useShowImages: jest.fn() }));
jest.mock("@/hooks/useEpisodeStill", () => ({ useEpisodeStill: jest.fn() }));

const mockedImages = useShowImages as jest.Mock;
const mockedStill = useEpisodeStill as jest.Mock;

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
  beforeEach(() => {
    mockedStill.mockReturnValue({ data: undefined, isLoading: false });
  });

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
