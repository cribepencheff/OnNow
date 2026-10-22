import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { NoImage } from "./NoImage";
import { t } from "@/theme/tokens";

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

  // Owner: dimmed, and with the poster cards' hairline edge.
  it("dims the symbol and gives a small poster the cards' hairline edge", async () => {
    await render(<NoImage icon />);
    expect(
      StyleSheet.flatten(screen.getByTestId("no-image-icon").props.style)
        .opacity,
    ).toBeLessThan(1);
    const surface = StyleSheet.flatten(
      screen.getByTestId("no-image").props.style,
    );
    expect(surface.borderWidth).toBe(StyleSheet.hairlineWidth);
    expect(surface.borderColor).toBe(t.imageControlEdge);
  });

  it("is a still gradient, not a skeleton", async () => {
    await render(<NoImage />);
    const surface = StyleSheet.flatten(
      screen.getByTestId("no-image").props.style,
    );
    expect(surface.experimental_backgroundImage).toContain("linear-gradient");
  });
});
