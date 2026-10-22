import { processColor, StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { t } from "@/theme/tokens";
import { ServiceLogo } from "./ServiceLogo";

// CRI-132: a dark ring for the hero's light "Open in" pill; CRI-115: the
// rows' ring is the Premiere/Finale chip's light edge, on the dark page.
describe("ServiceLogo", () => {
  const ring = () => screen.getByTestId("service-logo-ring");
  // react-native-svg passes a colour on as its processed number.
  const stroke = () => ring().props.stroke.payload;

  it("draws a thin dark ring by default", async () => {
    await render(<ServiceLogo logoPath="/n.png" size={30} />);
    expect(stroke()).toBe(processColor("rgba(0, 0, 0, 0.35)"));
    expect(ring().props.strokeWidth).toBe(1);
  });

  it("draws the ring it is given, such as the chip's light hairline", async () => {
    await render(
      <ServiceLogo
        logoPath="/n.png"
        size={16}
        ring={{ color: t.episodeMarkEdge, width: StyleSheet.hairlineWidth }}
      />,
    );
    expect(stroke()).toBe(processColor(t.episodeMarkEdge));
    expect(ring().props.strokeWidth).toBe(StyleSheet.hairlineWidth);
  });
});
