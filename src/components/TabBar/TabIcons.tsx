// The tab bar's icons (CRI-133), Instagram style: soft, rounded white
// outlines of even weight (round caps and joins), drawn on a 24 viewBox
// with the tabBarIconStroke and shown at tabBarIconSize. The active tab's
// icon is drawn filled, except Search's, which stays an outline (a filled
// magnifier reads as a lollipop). The app's other icons are SF Symbols; these are
// drawn so the four share one stroke and the active ones can fill.

import { useId } from "react";
import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import Svg, { Circle, G, Line, Mask, Path, Rect } from "react-native-svg";

import { FOLLOW_CHECK_SYMBOL } from "@/components/followSymbols";
import { t } from "@/theme/tokens";

interface TabIconProps {
  active: boolean;
}

// The outline's stroke, shared by all four icons.
const stroke = {
  stroke: t.ink,
  strokeWidth: t.tabBarIconStroke,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

// An ID for a mask, unique to this icon on screen and safe in url(#…).
function useMaskId(): string {
  return `tab-icon-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

function TabSvg({ children }: { children: React.ReactNode }) {
  return (
    <Svg width={t.tabBarIconSize} height={t.tabBarIconSize} viewBox="0 0 24 24">
      {children}
    </Svg>
  );
}

// A house with no roof overhang: the roof's base is the body's width. A
// small door notch at the bottom centre, part of the outline, so it stays
// open when the house is filled.
export function HomeIcon({ active }: TabIconProps) {
  return (
    <TabSvg>
      <Path
        d="M4 10 L12 3.5 L20 10 V18 A2 2 0 0 1 18 20 H14 V16.5 A2 2 0 0 0 10 16.5 V20 H6 A2 2 0 0 1 4 18 Z"
        fill={active ? t.ink : "none"}
        {...stroke}
      />
    </TabSvg>
  );
}

// A rounded square with two short nubs on top and a header line near the
// top. Active fills only the header band down to that line, rounded top
// corners and a flat bottom edge (a mask on the same rounded rect), not
// the whole body.
export function CalendarIcon({ active }: TabIconProps) {
  const maskId = useMaskId();
  return (
    <TabSvg>
      {active && (
        <Mask id={maskId}>
          <Rect x="0" y="0" width="24" height="24" fill="#000" />
          <Rect x="3" y="4.5" width="18" height="5" fill="#fff" />
        </Mask>
      )}
      {active && (
        <Rect
          x="3"
          y="4.5"
          width="18"
          height="16.5"
          rx="4"
          fill={t.ink}
          mask={`url(#${maskId})`}
        />
      )}
      <Rect
        x="3"
        y="4.5"
        width="18"
        height="16.5"
        rx="4"
        fill="none"
        {...stroke}
      />
      <Line x1="3" y1="9.5" x2="21" y2="9.5" {...stroke} />
      <Line x1="8" y1="2.5" x2="8" y2="6.5" {...stroke} />
      <Line x1="16" y1="2.5" x2="16" y2="6.5" {...stroke} />
    </TabSvg>
  );
}

// A library/cabinet shape, Apple TV style: a squircle with a thin top lid
// (a header line, like Calendar's) over a card sitting in the body, the
// follow controls' own check in it (FOLLOW_CHECK_SYMBOL) in place of a
// play triangle. Filled, the lid and the card are cut out of the fill, as
// Calendar's header line is; the card then draws its own outline so it
// still reads as a card, not a hole.
export function MyShowsIcon({ active }: TabIconProps) {
  const maskId = useMaskId();
  return (
    <View style={styles.box}>
      <TabSvg>
        {active && (
          <Mask id={maskId}>
            <Rect x="0" y="0" width="24" height="24" fill="#fff" />
            <Line x1="3" y1="7.5" x2="21" y2="7.5" {...stroke} stroke="#000" />
            <Rect x="6" y="10" width="12" height="8" rx="2" fill="#000" />
          </Mask>
        )}
        <Rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="6"
          fill={active ? t.ink : "none"}
          mask={active ? `url(#${maskId})` : undefined}
          {...stroke}
        />
        {!active && <Line x1="3" y1="7.5" x2="21" y2="7.5" {...stroke} />}
        <Rect
          x="6"
          y="10"
          width="12"
          height="8"
          rx="2"
          fill="none"
          {...stroke}
        />
      </TabSvg>
      <View style={[StyleSheet.absoluteFill, styles.center, styles.cardCenter]}>
        <SymbolView
          name={FOLLOW_CHECK_SYMBOL}
          tintColor={active ? t.bg : t.ink}
          // About half the card, at the outline's weight.
          size={Math.round(t.tabBarIconSize * 0.26)}
          weight="bold"
        />
      </View>
    </View>
  );
}

// A magnifier with a large circle and a short handle, so it reads soft.
// Shifted to sit centred in the 24 box like the other three. Always an
// outline: active, only the pill behind it marks it (the one exception to
// "active is filled").
export function SearchIcon(_props: TabIconProps) {
  return (
    <TabSvg>
      <G translate="1.25, 1.25">
        <Circle cx="10" cy="10" r="7.5" fill="none" {...stroke} />
        <Line x1="15.3" y1="15.3" x2="19" y2="19" {...stroke} />
      </G>
    </TabSvg>
  );
}

const styles = StyleSheet.create({
  box: {
    width: t.tabBarIconSize,
    height: t.tabBarIconSize,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  // The card sits lower than the icon's own centre (6-18, 10-18 of 24):
  // 2 below centre, scaled to the icon's drawn size.
  cardCenter: {
    transform: [{ translateY: (2 / 24) * t.tabBarIconSize }],
  },
});
