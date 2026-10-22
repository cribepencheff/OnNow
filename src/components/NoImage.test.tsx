import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { NoImage } from "./NoImage";

// CRI-100 (owner, 2026-10-22): a show with no image anywhere gets a still,
// dark surface, unlike a skeleton's pulse; a small poster also shows the
// "no image" symbol, a large surface nothing more.
describe("NoImage (CRI-100)", () => {
  it("is only the surface on a large area", async () => {
    await render(<NoImage />);
    expect(screen.getByTestId("no-image")).toBeTruthy();
    expect(screen.queryByTestId("no-image-icon")).toBeNull();
  });

  it("shows the photo.slash symbol on a small poster", async () => {
    await render(<NoImage icon />);
    expect(screen.getByTestId("no-image-icon").props.name).toBe("photo.slash");
  });

  it("is a still gradient, not a skeleton", async () => {
    await render(<NoImage />);
    const surface = StyleSheet.flatten(
      screen.getByTestId("no-image").props.style,
    );
    expect(surface.experimental_backgroundImage).toContain("linear-gradient");
  });
});
