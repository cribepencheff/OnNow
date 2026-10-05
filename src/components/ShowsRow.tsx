// A followed show row in the Shows list (PRD 5.3, FR-002, FR-010, FR-035),
// on the shared ShowRow, like Search's result row: poster, title,
// Show detail's status line, and the service slot (FR-027). Tapping the row
// opens Show detail (FR-030, CRI-79). Swipe left reveals
// "Unfollow" (react-native-gesture-handler's Swipeable, Expo Go
// compatible, no dev build needed); a full swipe alone does not unfollow,
// only pressing the revealed button does. Screen reader users cannot
// swipe, so the row also exposes an "Unfollow" accessibility action
// (NFR-008).

import { Pressable, StyleSheet, Text } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { ShowRow, ShowRowLine } from "./ShowRow";
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
      <ShowRow
        title={show.name}
        posterUri={show.image?.medium}
        style={styles.row}
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
        <ShowRowLine>{statusLine}</ShowRowLine>
        {/* Its line is kept while TMDB answers, so the row does not grow. */}
        <ShowRowLine testID="shows-row-service">{service ?? ""}</ShowRowLine>
      </ShowRow>
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

const ACTION_WIDTH = 96;

const styles = StyleSheet.create({
  // Opaque, so the Unfollow action stays hidden until the swipe. Stretched
  // rather than ShowRow's centred, as Shows' rows always were: centring
  // rounds the lines a pixel lower here.
  row: {
    alignItems: "stretch",
    backgroundColor: t.surface,
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
