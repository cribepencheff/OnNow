// A followed show row in the Shows list (PRD 5.3, FR-002, FR-010, FR-035),
// in the same visual language as Search's result row: poster, title,
// network, and a line with the next episode or status. Tapping the row
// opens Show detail (FR-030, CRI-79). Swipe left reveals
// "Unfollow" (react-native-gesture-handler's Swipeable, Expo Go
// compatible, no dev build needed); a full swipe alone does not unfollow,
// only pressing the revealed button does. Screen reader users cannot
// swipe, so the row also exposes an "Unfollow" accessibility action
// (NFR-008).

import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { nextForShow } from "@/logic/next-episode";
import { showsRowLine } from "@/logic/shows-list";
import { searchResultNetworkName } from "@/logic/search-results";
import type { LocalDate } from "@/logic/local-date";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";

interface ShowsRowProps {
  show: TvMazeShowWithEmbeds;
  timeZone: string;
  todayDate: LocalDate;
  onUnfollow: () => void;
  onPress?: () => void;
}

const ACCESSIBILITY_ACTIONS = [{ name: "unfollow", label: "Unfollow" }];

export function ShowsRow({
  show,
  timeZone,
  todayDate,
  onUnfollow,
  onPress,
}: ShowsRowProps) {
  const next = nextForShow(
    show,
    show._embedded.episodes,
    show._embedded.seasons,
    timeZone,
    todayDate,
  );
  const line = showsRowLine(next, show.status, timeZone, todayDate);
  const network = searchResultNetworkName(show);
  const label = [show.name, network, line].filter(Boolean).join(", ");

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
            {line}
          </Text>
          {network && (
            <Text style={styles.network} numberOfLines={1}>
              {network}
            </Text>
          )}
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
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
  },
  details: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  line: {
    fontSize: 13,
    fontWeight: "500",
  },
  network: {
    fontSize: 12,
    color: "#888888",
  },
  actionContainer: {
    width: ACTION_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D64545",
  },
  actionLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
