import { StyleSheet, Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  ROW_TITLE_SIZE,
  ShowRow,
  ShowRowLine,
  ShowRowServiceLine,
} from "./ShowRow";
import { type } from "@/theme/tokens";

// CRI-118: the one row behind Search, Shows and Calendar (PRD 5.2, 5.3,
// 5.4: "the same visual language").
describe("ShowRow", () => {
  it("shows the title, its lines and the trailing slot", async () => {
    await render(
      <ShowRow
        title="Slow Horses"
        posterUri="https://static.tvmaze.com/poster.jpg"
        accessibilityLabel="Slow Horses"
        trailing={<Text>circle</Text>}
        testID="row"
      >
        <ShowRowLine>S6E2 · Hello Goodbye</ShowRowLine>
      </ShowRow>,
    );

    expect(screen.getByText("Slow Horses")).toBeTruthy();
    expect(screen.getByText("S6E2 · Hello Goodbye")).toBeTruthy();
    expect(screen.getByText("circle")).toBeTruthy();
  });

  // Home layout polish: Shows and Search rows at the content inset.
  it("is inset by the content inset, 24", async () => {
    await render(
      <ShowRow
        title="Slow Horses"
        posterUri="https://static.tvmaze.com/poster.jpg"
        accessibilityLabel="Slow Horses"
        testID="row"
      >
        <ShowRowLine>S6E2 · Hello Goodbye</ShowRowLine>
      </ShowRow>,
    );
    let node = screen.getByText("Slow Horses").parent;
    while (
      node &&
      StyleSheet.flatten(node.props.style)?.paddingHorizontal === undefined
    ) {
      node = node.parent;
    }
    expect(StyleSheet.flatten(node?.props.style).paddingHorizontal).toBe(24);
  });

  it("is one button for screen readers, with the label it is given (NFR-008)", async () => {
    const onPress = jest.fn();
    await render(
      <ShowRow
        title="Slow Horses"
        accessibilityLabel="Slow Horses, S6E2 · Hello Goodbye"
        onPress={onPress}
        testID="row"
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Slow Horses, S6E2 · Hello Goodbye" }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps an empty line's height, so the row does not grow when it fills in", async () => {
    await render(<ShowRowLine testID="line">{""}</ShowRowLine>);

    expect(screen.getByTestId("line")).toHaveStyle({
      minHeight: type.meta.lineHeight,
    });
  });

  // CRI-100: a show with no image gets the still surface with the "no
  // image" symbol; the title beside it names the show.
  it("CRI-100: shows the no-image surface and symbol for a show with no poster", async () => {
    await render(
      <ShowRow
        title="The Girl with the Dragon Tattoo"
        accessibilityLabel="x"
      />,
    );
    expect(screen.getByTestId("no-image")).toBeTruthy();
    expect(screen.getByTestId("no-image-icon")).toBeTruthy();
  });

  it("CRI-100: leaves the space empty while the poster is looked up", async () => {
    await render(
      <ShowRow title="Cecilias Unge" posterPending accessibilityLabel="x" />,
    );
    expect(screen.getByTestId("poster-pending")).toBeTruthy();
    expect(screen.queryByTestId("no-image")).toBeNull();
  });

  it("CRI-100: shows the poster, not the surface, when there is one", async () => {
    await render(
      <ShowRow
        title="Slow Horses"
        posterUri="https://static.tvmaze.com/poster.jpg"
        accessibilityLabel="x"
      />,
    );
    expect(screen.queryByTestId("no-image")).toBeNull();
  });

  // CRI-115: the services as small logos before the text, so a service
  // you have is seen at a glance; screen readers get the text.
  it("CRI-115: shows each service's logo before the service text", async () => {
    await render(
      <ShowRowServiceLine
        logos={[
          { name: "Netflix", logoPath: "/netflix.png" },
          { name: "Viaplay", logoPath: "/viaplay.png" },
        ]}
        text="On Netflix, Viaplay"
        testID="service"
      />,
    );
    expect(screen.getByText("On Netflix, Viaplay")).toBeTruthy();
    expect(
      screen.getAllByTestId("service-logo", { includeHiddenElements: true }),
    ).toHaveLength(2);
    expect(screen.queryAllByTestId("service-logo")).toHaveLength(0);
  });

  // Owner: the text beside the logos at the app's smallest size, in the
  // line's regular weight.
  it("CRI-115: sets the service text at the smallest size, regular weight", async () => {
    await render(
      <ShowRowServiceLine logos={[]} text="On Netflix" testID="service" />,
    );
    const text = StyleSheet.flatten(screen.getByText("On Netflix").props.style);
    expect(text.fontSize).toBe(type.label.fontSize);
    expect(text.fontWeight).toBe(type.meta.fontWeight);
  });

  it("CRI-115: shows the text alone without logos, and keeps the line's height", async () => {
    await render(
      <ShowRowServiceLine logos={[]} text="Unavailable" testID="service" />,
    );
    expect(screen.getByText("Unavailable")).toBeTruthy();
    expect(
      screen.queryAllByTestId("service-logo", { includeHiddenElements: true }),
    ).toHaveLength(0);
    expect(
      StyleSheet.flatten(screen.getByTestId("service").props.style).minHeight,
    ).toBe(type.meta.lineHeight);
  });

  // Owner, CRI-115: the title a touch smaller than headline, and some room
  // above the service line, setting it apart from the lines above.
  it("sets the title a touch smaller than headline, and room above the service line", async () => {
    await render(
      <ShowRow title="Slow Horses" accessibilityLabel="x">
        <ShowRowServiceLine logos={[]} text="On Apple TV" testID="service" />
      </ShowRow>,
    );
    const title = StyleSheet.flatten(
      screen.getByText("Slow Horses").props.style,
    );
    expect(title.fontSize).toBe(ROW_TITLE_SIZE);
    expect(ROW_TITLE_SIZE).toBeLessThan(type.headline.fontSize);
    expect(
      StyleSheet.flatten(screen.getByTestId("service").props.style).marginTop,
    ).toBeGreaterThan(0);
  });
});
