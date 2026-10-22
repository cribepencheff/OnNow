// The one show row behind Search, Shows and Calendar (CRI-118, PRD 5.2,
// 5.3, 5.4: "the same visual language"): poster, title, the lines each
// view passes in as ShowRowLine children, and an optional slot on the
// right (Search's follow circle). The row is one button for screen
// readers, with the label and actions the view gives it (NFR-008).

import type { ReactNode } from "react";
import { Image } from "expo-image";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { t, type } from "@/theme/tokens";
import { NoImage } from "./NoImage";
import { ServiceLogo } from "./ServiceLogo";

interface ShowRowProps {
  title: string;
  posterUri?: string | null;
  // The poster is still being looked up (useListPoster): an empty space,
  // not the "no image" symbol yet.
  posterPending?: boolean;
  // Lines about the show, right under the title (owner, 2026-10-22): the
  // show first. Nothing, and no gap, without one.
  summary?: string | null;
  // How many lines the summary takes: 2, or 3 in Search, where its row has
  // room for them beside the bigger poster.
  summaryLines?: number;
  // Right under the title, before the summary (a Search row's status
  // line; owner, 2026-10-22).
  subtitle?: ReactNode;
  // Over the poster's top left (a Search row's follow circle; owner,
  // 2026-10-22).
  posterAccessory?: ReactNode;
  // The bigger poster (a Search row's, LARGE_POSTER).
  largePoster?: boolean;
  children?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  accessibilityActions?: readonly AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  // For example Shows' opaque surface, which hides its swipe action.
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ShowRow({
  title,
  posterUri,
  posterPending = false,
  summary,
  summaryLines = 2,
  subtitle,
  posterAccessory,
  largePoster = false,
  children,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityActions,
  onAccessibilityAction,
  style,
  testID,
}: ShowRowProps) {
  return (
    <Pressable
      style={[styles.row, style]}
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
    >
      <View>
        {posterUri ? (
          <Image
            source={posterUri}
            style={[styles.poster, largePoster && LARGE_POSTER]}
            testID={testID && `${testID}-poster`}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : posterPending ? (
          <View
            style={[styles.poster, largePoster && LARGE_POSTER]}
            testID="poster-pending"
          />
        ) : (
          // No image: the still surface with the "no image" symbol
          // (CRI-100); the title beside it names the show.
          <NoImage icon style={[styles.poster, largePoster && LARGE_POSTER]} />
        )}
        {posterAccessory ? (
          <View
            style={styles.posterAccessory}
            testID={testID && `${testID}-poster-accessory`}
          >
            {posterAccessory}
          </View>
        ) : null}
      </View>
      <View style={styles.details} testID={testID && `${testID}-details`}>
        <View style={styles.titleRow} testID={testID && `${testID}-title-row`}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {subtitle}
        {summary ? (
          <Text
            style={styles.summary}
            numberOfLines={summaryLines}
            testID="show-row-summary"
          >
            {summary}
          </Text>
        ) : null}
        {children}
      </View>
      {trailing}
    </Pressable>
  );
}

// A meta line under the title. An empty line keeps its height, so a row
// does not grow when a lookup answers.
export function ShowRowLine({
  children,
  testID,
  style,
}: {
  children: ReactNode;
  testID?: string;
  // For example a Search row's status line, in ink.
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[styles.line, style]} numberOfLines={1} testID={testID}>
      {children}
    </Text>
  );
}

// The service line (Shows, Search; CRI-115): each service's logo, small,
// before the service text, so a service you have is seen at a glance; the
// text gives the detail and is what screen readers read. At the bottom of
// the row (owner, 2026-10-22). Without logos ("Unavailable" in Shows, or
// before TMDB answers), the text alone. The line keeps its height either
// way.
const SERVICE_LOGO_SIZE = 16;
const UNAVAILABLE_DOT_SIZE = 8;
// The Premiere/Finale chip's light hairline (owner), on the dark page.
const SERVICE_LOGO_RING = {
  color: t.episodeMarkEdge,
  width: StyleSheet.hairlineWidth,
};

export function ShowRowServiceLine({
  logos,
  text,
  unavailable = false,
  testID,
}: {
  logos: { name: string; logoPath: string }[];
  text: string;
  // "Unavailable": a yellow dot in the logos' place, a warning that the
  // show cannot be watched (owner, 2026-10-22).
  unavailable?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.serviceLine} testID={testID}>
      {unavailable && (
        <View
          style={styles.unavailableDot}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="service-unavailable-dot"
        />
      )}
      {logos.length > 0 && (
        <View
          style={styles.serviceLogos}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {logos.map(({ name, logoPath }) => (
            <View key={name} testID="service-logo">
              <ServiceLogo
                logoPath={logoPath}
                size={SERVICE_LOGO_SIZE}
                ring={SERVICE_LOGO_RING}
              />
            </View>
          ))}
        </View>
      )}
      <Text style={styles.serviceText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

// The row's title, a touch smaller than headline (20/25).
export const ROW_TITLE_SIZE = 17;
const ROW_TITLE_LINE_HEIGHT = 22;

const POSTER_WIDTH = 60;
const POSTER_HEIGHT = 90;
// A Search row's poster (owner, 2026-10-22): bigger, balancing its taller
// row (summary, year and genres, status, services); 2:3, as posters are.
export const LARGE_POSTER = { width: 96, height: 144 };
export const POSTER_ACCESSORY_INSET = 6;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: t.space2 + 4,
    paddingHorizontal: t.contentInset,
    gap: t.space2 + 4,
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: t.radiusSm,
  },
  details: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  // Smaller than headline (owner, CRI-115), in its weight.
  title: {
    flexShrink: 1,
    ...type.headline,
    fontSize: ROW_TITLE_SIZE,
    lineHeight: ROW_TITLE_LINE_HEIGHT,
    color: t.ink,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  // Muted, as the lines under it (owner).
  summary: {
    ...type.meta,
    color: t.inkMuted,
  },
  line: {
    ...type.meta,
    minHeight: type.meta.lineHeight,
    color: t.inkMuted,
  },
  // At the bottom, with some room above it (owner): where to watch, apart
  // from the lines about the show.
  serviceLine: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: type.meta.lineHeight,
    marginTop: 8,
    gap: 6,
  },
  // At the poster's top left (owner, 2026-10-22), a little closer to the
  // corner than on the poster cards: the poster is smaller.
  posterAccessory: {
    position: "absolute",
    top: POSTER_ACCESSORY_INSET,
    left: POSTER_ACCESSORY_INSET,
  },
  // The size of the Premiere/Finale chip's dot, a touch larger for a line
  // of its own.
  unavailableDot: {
    width: UNAVAILABLE_DOT_SIZE,
    height: UNAVAILABLE_DOT_SIZE,
    borderRadius: UNAVAILABLE_DOT_SIZE / 2,
    backgroundColor: t.serviceUnavailable,
  },
  serviceLogos: {
    flexDirection: "row",
    gap: 4,
  },
  // The app's smallest size (label's), in the line's regular weight, in
  // ink (owner): the logos carry the glance, the text the detail.
  serviceText: {
    fontSize: type.label.fontSize,
    lineHeight: type.label.lineHeight,
    fontWeight: type.meta.fontWeight,
    color: t.ink,
    flexShrink: 1,
  },
});
