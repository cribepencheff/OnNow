// The app logo (CRI-124), drawn from the one swappable SVG in
// assets/app-logo.ts. Its colour comes from here (currentColor).

import { SvgXml } from "react-native-svg";

import { APP_LOGO_ASPECT_RATIO, APP_LOGO_SVG } from "../../assets/app-logo";

export function AppLogo({ height, color }: { height: number; color: string }) {
  return (
    <SvgXml
      xml={APP_LOGO_SVG}
      color={color}
      width={height * APP_LOGO_ASPECT_RATIO}
      height={height}
      accessibilityRole="header"
      accessibilityLabel="On Now"
      testID="app-logo"
    />
  );
}
