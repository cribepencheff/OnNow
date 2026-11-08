import * as ScreenOrientation from "expo-screen-orientation";

import { allowAnyOrientation, holdPortrait } from "./screen-orientation";

jest.mock("expo-screen-orientation", () => ({
  OrientationLock: { PORTRAIT_UP: 1 },
  lockAsync: jest.fn(() => Promise.resolve()),
  unlockAsync: jest.fn(() => Promise.resolve()),
}));

// ADR 0021: the app upright, the trailer player free to turn.
describe("screen orientation (ADR 0021)", () => {
  it("holds the app upright", () => {
    holdPortrait();
    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
  });

  it("lets it turn", () => {
    allowAnyOrientation();
    expect(ScreenOrientation.unlockAsync).toHaveBeenCalled();
  });

  it("leaves a failed lock alone", async () => {
    (ScreenOrientation.lockAsync as jest.Mock).mockReturnValueOnce(
      Promise.reject(new Error("unsupported")),
    );
    expect(() => holdPortrait()).not.toThrow();
    await Promise.resolve();
  });
});
