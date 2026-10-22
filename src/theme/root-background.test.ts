import * as SystemUI from "expo-system-ui";

import appConfig from "../../app.json";
import { setRootBackground } from "./root-background";
import { t } from "./tokens";

jest.mock("expo-system-ui", () => ({
  setBackgroundColorAsync: jest.fn(() => Promise.resolve()),
}));

// The root view shows behind the screens while one slides over another
// (back from Show detail); white, it showed as a white line at the edge.
describe("root background", () => {
  it("is the page's background in the app config", () => {
    expect(appConfig.expo.backgroundColor).toBe(t.bg);
  });

  it("is set to the page's background at launch, also in Expo Go", async () => {
    await setRootBackground();
    expect(SystemUI.setBackgroundColorAsync).toHaveBeenCalledWith(t.bg);
  });
});
