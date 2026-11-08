// Show detail's Trailers row and its player (ADR 0021, owner 2026-11-08).
// The row: the latest trailers as cards to swipe, YouTube's still with a
// play button, the video's name and the day it came out. A tap plays the
// trailer in the app, full screen, in YouTube's own player; closing it
// comes back to the row. When YouTube will not play a video here, a dialog
// offers it on YouTube instead. Which trailers, and the player page, are
// decided in logic/trailers.ts.

import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import type { TmdbVideo } from "@/api/tmdb-types";
import { openExternalUrl } from "@/hooks/useGuardedRouter";
import { localDateFromAirstamp, type LocalDate } from "@/logic/local-date";
import { formatLabelDate } from "@/logic/next-episode-label";
import {
  PLAYER_ORIGIN,
  parsePlayerMessage,
  playerMayLoad,
  trailerPlayerHtml,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from "@/logic/trailers";
import { t, type } from "@/theme/tokens";

const CARD_GAP = 12;
// As the episode row's cards: the next card shows at the edge.
const CARD_WIDTH_SHARE = 0.78;
const PLAY_SIZE = 48;
const CLOSE_SIZE = 36;

export const UNAVAILABLE_TITLE = "Playback unavailable in app";
export const UNAVAILABLE_MESSAGE =
  "This trailer can only be watched on YouTube.";

export function TrailersRow({
  trailers,
  width,
  timeZone,
  todayDate,
}: {
  trailers: TmdbVideo[];
  width: number;
  timeZone: string;
  todayDate: LocalDate;
}) {
  const [playing, setPlaying] = useState<TmdbVideo | null>(null);
  if (trailers.length === 0) {
    return null;
  }
  const cardWidth = Math.round(width * CARD_WIDTH_SHARE);

  return (
    <View style={styles.section} testID="show-detail-trailers">
      <Text style={styles.heading} accessibilityRole="header">
        Trailers
      </Text>
      <FlatList
        horizontal
        data={trailers}
        keyExtractor={(trailer) => trailer.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        snapToInterval={cardWidth + CARD_GAP}
        decelerationRate="fast"
        renderItem={({ item, index }) => (
          <TrailerCard
            trailer={item}
            width={cardWidth}
            last={index === trailers.length - 1}
            dateLabel={
              item.publishedAt
                ? formatLabelDate(
                    localDateFromAirstamp(item.publishedAt, timeZone),
                    todayDate,
                  )
                : null
            }
            onPress={() => setPlaying(item)}
          />
        )}
      />
      {playing && (
        <TrailerPlayer trailer={playing} onClose={() => setPlaying(null)} />
      )}
    </View>
  );
}

function TrailerCard({
  trailer,
  width,
  last,
  dateLabel,
  onPress,
}: {
  trailer: TmdbVideo;
  width: number;
  last: boolean;
  dateLabel: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${trailer.name}`}
      style={[styles.card, { width }, !last && { marginRight: CARD_GAP }]}
      testID="trailer-card"
    >
      <View style={styles.still}>
        <Image
          source={youtubeThumbnailUrl(trailer.key)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.play}>
          <SymbolView
            name="play.fill"
            tintColor={t.ink}
            size={20}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {trailer.name}
        </Text>
        {dateLabel && <Text style={styles.cardDate}>{dateLabel}</Text>}
      </View>
    </Pressable>
  );
}

// Full screen over the app, black, with YouTube's player and a close
// button. YouTube's own controls go full screen and turn with the phone.
export function TrailerPlayer({
  trailer,
  onClose,
}: {
  trailer: TmdbVideo;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  // Shown over the player, which closes with either button.
  function unavailable() {
    Alert.alert(UNAVAILABLE_TITLE, UNAVAILABLE_MESSAGE, [
      { text: "Cancel", style: "cancel", onPress: onClose },
      {
        text: "Open in YouTube",
        onPress: () => {
          onClose();
          openExternalUrl(youtubeWatchUrl(trailer.key));
        },
      },
    ]);
  }

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={onClose}
    >
      <View style={styles.player} testID="trailer-player">
        <WebView
          testID="trailer-webview"
          style={styles.webView}
          source={{
            html: trailerPlayerHtml(trailer.key),
            baseUrl: `${PLAYER_ORIGIN}/`,
          }}
          originWhitelist={["*"]}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          onMessage={(event) => {
            const message = parsePlayerMessage(event.nativeEvent.data);
            if (message?.type === "error") {
              unavailable();
            }
          }}
          onShouldStartLoadWithRequest={(request) => {
            if (playerMayLoad(request.url, request.isTopFrame ?? true)) {
              return true;
            }
            // A link out of the player: YouTube, outside the app.
            openExternalUrl(request.url);
            return false;
          }}
          onError={unavailable}
          onHttpError={unavailable}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={8}
          style={[styles.close, { top: insets.top + 8 }]}
        >
          <SymbolView
            name="xmark"
            tintColor={t.ink}
            size={15}
            weight="bold"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: t.space6,
  },
  // As Show detail's other headings ("About", "Season 6").
  heading: {
    ...type.headline,
    color: t.ink,
    paddingHorizontal: t.contentInset,
    marginBottom: 12,
  },
  row: {
    paddingHorizontal: t.contentInset,
  },
  card: {
    backgroundColor: t.surface,
    borderRadius: t.radiusSm,
    overflow: "hidden",
  },
  still: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: t.imageDimBackdrop,
    alignItems: "center",
    justifyContent: "center",
  },
  // A small control's material on an image, as the episode badges.
  play: {
    width: PLAY_SIZE,
    height: PLAY_SIZE,
    borderRadius: PLAY_SIZE / 2,
    backgroundColor: t.imageControlBackdrop,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    ...type.body,
    fontWeight: "600",
    color: t.ink,
  },
  cardDate: {
    ...type.meta,
    color: t.inkMuted,
  },
  player: {
    flex: 1,
    backgroundColor: t.imageDimBackdrop,
  },
  webView: {
    flex: 1,
    backgroundColor: t.imageDimBackdrop,
  },
  close: {
    position: "absolute",
    right: t.headerInset,
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    borderRadius: CLOSE_SIZE / 2,
    backgroundColor: t.imageControlBackdrop,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    alignItems: "center",
    justifyContent: "center",
  },
});
