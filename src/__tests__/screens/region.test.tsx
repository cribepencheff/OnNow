import { fireEvent, render, screen } from "@testing-library/react-native";

import RegionScreen from "@/app/region";
import { useRegion } from "@/hooks/useRegion";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
}));
jest.mock("@/hooks/useRegion", () => ({ useRegion: jest.fn() }));

const setRegion = jest.fn();
const followDeviceRegion = jest.fn();

function mockRegion(region: string, isManual: boolean) {
  (useRegion as jest.Mock).mockReturnValue({
    region,
    detected: "SE",
    isManual,
    setRegion,
    followDeviceRegion,
  });
}

// CRI-88, ADR 0014: the phone's region first, then every TMDB region.
describe("RegionScreen (FR-016, CRI-88)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks the phone's region as selected without an override", async () => {
    mockRegion("SE", false);
    await render(<RegionScreen />);

    expect(
      screen.getByRole("button", { name: "Phone's region (Sweden)" }).props
        .accessibilityState,
    ).toEqual({ selected: true });
  });

  it("sets a manual region and goes back", async () => {
    mockRegion("SE", false);
    await render(<RegionScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Andorra" }));

    expect(setRegion).toHaveBeenCalledWith("AD");
    expect(mockBack).toHaveBeenCalled();
  });

  it("goes back to the phone's region from an override", async () => {
    mockRegion("GB", true);
    await render(<RegionScreen />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Phone's region (Sweden)" }),
    );

    expect(followDeviceRegion).toHaveBeenCalled();
    expect(setRegion).not.toHaveBeenCalled();
  });
});
