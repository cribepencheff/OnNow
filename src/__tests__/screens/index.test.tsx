import { render, screen } from "@testing-library/react-native";

import HomeScreen from "@/app/(tabs)/index";

describe("HomeScreen", () => {
  it("renders the Home label", async () => {
    await render(<HomeScreen />);
    expect(screen.getByText("Home")).toBeTruthy();
  });
});
