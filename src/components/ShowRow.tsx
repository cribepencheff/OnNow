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
  // Two lines about the show, right under the title (owner, 2026-10-22):
  // the show first. Nothing, and no gap, without one.
  summary?: string | null;
  // After the title, on its line (a Search row's IMDb rating).
  titleAccessory?: ReactNode;
  // Right under the title, before the summary: where to watch
  // (ShowRowServiceLine; owner, 2026-10-22).
  subtitle?: ReactNode;
  // Over the poster's top right, as on the poster cards (a Search row's
  // follow circle; owner, 2026-10-22).
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
  titleAccessory,
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
          {titleAccessory}
        </View>
        {subtitle}
        {summary ? (
          <Text
            style={styles.summary}
            numberOfLines={2}
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
}: {
  children: ReactNode;
  testID?: string;
}) {
  return (
    <Text style={styles.line} numberOfLines={1} testID={testID}>
      {children}
    </Text>
  );
}

// The service line (Shows, Search; CRI-115): each service's logo, small,
// before the service text, so a service you have is seen at a glance; the
// text gives the detail and is what screen readers read. Right under the
// title (ShowRow's subtitle), in ink, at the summary's size (owner,
// 2026-10-22). Without logos ("Unavailable", or before TMDB answers), the
// text alone. The line keeps its height either way.
const SERVICE_LOGO_SIZE = 16;
// The Premiere/Finale chip's light hairline (owner), on the dark page.
const SERVICE_LOGO_RING = {
  color: t.episodeMarkEdge,
  width: StyleSheet.hairlineWidth,
};

export function ShowRowServiceLine({
  logos,
  text,
  testID,
}: {
  logos: { name: string; logoPath: string }[];
  text: string;
  testID?: string;
}) {
  return (
    <View style={styles.serviceLine} testID={testID}>
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
  serviceLine: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: type.meta.lineHeight,
    gap: 6,
  },
  // Near the poster's corner, a little closer than on the poster cards
  // (owner, 2026-10-22): the poster is smaller.
  posterAccessory: {
    position: "absolute",
    top: POSTER_ACCESSORY_INSET,
    right: POSTER_ACCESSORY_INSET,
  },
  serviceLogos: {
    flexDirection: "row",
    gap: 4,
  },
  // The summary's size, in ink (owner): right under the title, where to
  // watch reads first.
  serviceText: {
    ...type.meta,
    color: t.ink,
    flexShrink: 1,
  },
});
