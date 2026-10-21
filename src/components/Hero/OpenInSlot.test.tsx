import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { OpenInSlot } from "./HeroPage";

jest.mock("expo-linking", () => ({ openURL: jest.fn() }));

// CRI-90, CRI-101, ADR 0004: an add-on's extra subscription is the
// "Requires" line under the hero's button, as in Show detail.
describe("OpenInSlot (FR-014, CRI-90)", () => {
  it("names the host app, and says what it requires below the button (CRI-101)", async () => {
    await render(
      <OpenInSlot
        availability={{
          kind: "button",
          link: {
            service: "Prime Video",
            url: "https://www.primevideo.com",
            requires: "hayu",
            logoPath: null,
          },
        }}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Open in Prime Video, requires hayu subscription",
    });
    expect(button).toHaveTextContent("Open in Prime Video");
    // The line sits under the button, not inside it, as in Show detail.
    expect(screen.getByText("Requires hayu subscription")).toBeTruthy();
    expect(button).not.toHaveTextContent(/Requires/);
  });

  it("is a plain button for a service of its own", async () => {
    await render(
      <OpenInSlot
        availability={{
          kind: "button",
          link: {
            service: "Peacock",
            url: "https://www.peacocktv.com",
            logoPath: null,
          },
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Open in Peacock" }),
    ).toBeTruthy();
    // The subrow shares the slot with "Unavailable in <region>" (CRI-132).
    expect(screen.getByText("Streaming on Peacock")).toBeTruthy();
  });

  // Home layout polish: centred like everything else in the hero's block.
  it('centres "Unavailable in <region>"', async () => {
    await render(
      <OpenInSlot
        availability={{ kind: "text", label: "Unavailable in SE" }}
      />,
    );

    const note = screen.getByText("Unavailable in SE");
    expect(StyleSheet.flatten(note.props.style).textAlign).toBe("center");
  });

  it("centres the Requires line under the button", async () => {
    await render(
      <OpenInSlot
        availability={{
          kind: "button",
          link: {
            service: "Prime Video",
            url: "https://www.primevideo.com",
            requires: "hayu",
            logoPath: null,
          },
        }}
      />,
    );

    let node = screen.getByText("Requires hayu subscription").parent;
    while (node && StyleSheet.flatten(node.props.style)?.marginTop !== 8) {
      node = node.parent;
    }
    expect(StyleSheet.flatten(node?.props.style).alignItems).toBe("center");
  });

  // Owner: Apple's continuous corners on the hero's CTA, a capsule exactly
  // half its height round (52 tall at Jest's window size).
  it("draws the button as a continuous-corner capsule, half its height round", async () => {
    await render(
      <OpenInSlot
        availability={{
          kind: "button",
          link: {
            service: "Peacock",
            url: "https://www.peacocktv.com",
            logoPath: null,
          },
        }}
      />,
    );
    const style = StyleSheet.flatten(
      screen.getByRole("button", { name: "Open in Peacock" }).props.style,
    );
    expect(style.borderCurve).toBe("continuous");
    expect(style.borderRadius).toBe((style.height as number) / 2);
  });
});
