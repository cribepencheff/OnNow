// A followed show row in the Shows list (PRD 5.3, FR-002, FR-010, FR-035),
// in the same visual language as Search's result row: poster, title,
// Show detail's status line, and the service slot (FR-027). Tapping the row
// opens Show detail (FR-030, CRI-79). Swipe left reveals
// "Unfollow" (react-native-gesture-handler's Swipeable, Expo Go
// compatible, no dev build needed); a full swipe alone does not unfollow,
// only pressing the revealed button does. Screen reader users cannot
// swipe, so the row also exposes an "Unfollow" accessibility action
// (NFR-008).

import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { useStreamingService } from "@/hooks/useStreamingService";
import { rowServiceText } from "@/logic/streaming-service";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import { t, type } from "@/theme/tokens";

interface ShowsRowProps {
  show: TvMazeShowWithEmbeds;
  // Show detail's status line ("Airing · next ep Fri 9 Oct").
  statusLine: string;
  onUnfollow: () => void;
  onPress?: () => void;
}

const ACCESSIBILITY_ACTIONS = [{ name: "unfollow", label: "Unfollow" }];

export function ShowsRow({
  show,
  statusLine,
  onUnfollow,
  onPress,
}: ShowsRowProps) {
  const { data: providers } = useStreamingService(show, true);
  const service = rowServiceText(providers);
  const label = [show.name, statusLine, service].filter(Boolean).join(", ");

  return (
    <Swipeable
      renderRightActions={() => (
        <UnfollowAction onPress={onUnfollow} showName={show.name} />
      )}
    >
      <Pressable
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        accessibilityActions={ACCESSIBILITY_ACTIONS}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "unfollow") {
            onUnfollow();
          }
        }}
        testID="shows-row"
      >
        <Image
          source={show.image?.medium ?? undefined}
          style={styles.poster}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={1}>
            {show.name}
          </Text>
          <Text style={styles.line} numberOfLines={1}>
            {statusLine}
          </Text>
          {/* Its line is kept while TMDB answers, so the row does not grow. */}
          <Text
            style={styles.line}
            numberOfLines={1}
            testID="shows-row-service"
          >
            {service ?? ""}
          </Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

function UnfollowAction({
  onPress,
  showName,
}: {
  onPress: () => void;
  showName: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Unfollow ${showName}`}
      onPress={onPress}
      style={styles.actionContainer}
    >
      <Text style={styles.actionLabel}>Unfollow</Text>
    </Pressable>
  );
}

const POSTER_WIDTH = 60;
const POSTER_HEIGHT = 90;
const ACTION_WIDTH = 96;

const styles = StyleSheet.create({
  // Opaque, so the Unfollow action stays hidden until the swipe.
  row: {
    flexDirection: "row",
    paddingVertical: t.space2 + 4,
    paddingHorizontal: t.space4,
    gap: t.space2 + 4,
    backgroundColor: t.surface,
  },
  // No image: nothing, never a grey box (design system); the space stays
  // so titles line up.
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
  actionContainer: {
    width: ACTION_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.destructive,
  },
  actionLabel: {
    ...type.meta,
    fontWeight: "600",
    color: t.ink,
  },
});
