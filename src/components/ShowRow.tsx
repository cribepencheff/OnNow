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

interface ShowRowProps {
  title: string;
  posterUri?: string | null;
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
      {posterUri ? (
        <Image
          source={posterUri}
          style={styles.poster}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        // No image: the still surface, too small for the words (CRI-100);
        // the title beside it names the show.
        <NoImage label={false} style={styles.poster} />
      )}
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
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

const POSTER_WIDTH = 60;
const POSTER_HEIGHT = 90;

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
  title: {
    ...type.headline,
    color: t.ink,
  },
  line: {
    ...type.meta,
    minHeight: type.meta.lineHeight,
    color: t.inkMuted,
  },
});
