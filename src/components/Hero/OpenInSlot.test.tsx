import { render, screen } from "@testing-library/react-native";

import { OpenInSlot } from "./HeroPage";

jest.mock("expo-linking", () => ({ openURL: jest.fn() }));

// CRI-90, ADR 0004: the Home hero's button keeps one fixed height, so an
// add-on's extra subscription is only a bag inside the button.
describe("OpenInSlot (FR-014, CRI-90)", () => {
  it("names the host app and shows the bag inside the button for an add-on", async () => {
    await render(
      <OpenInSlot
        availability={{
          kind: "button",
          link: {
            service: "Prime Video",
            url: "https://www.primevideo.com",
            requires: "hayu",
          },
        }}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Open in Prime Video, requires hayu subscription",
    });
    expect(button).toHaveTextContent("Open in Prime Video");
    expect(screen.queryByText(/Requires hayu/)).toBeNull();
  });

  it("is a plain button for a service of its own", async () => {
    await render(
      <OpenInSlot
        availability={{
          kind: "button",
          link: { service: "Peacock", url: "https://www.peacocktv.com" },
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Open in Peacock" }),
    ).toBeTruthy();
  });
});
