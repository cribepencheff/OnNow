// PROTOTYPE (proto/home-backdrop, not for merge): Home, direction B, per
// docs/design/design-system.md. Measurements are for a 390 × 844 screen and
// scale with the screen height here.

import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import * as Linking from "expo-linking";

import { useSwedishService } from "@/hooks/useSwedishService";
import { homeCardMetaLine } from "@/logic/home";
import { serviceLink } from "@/logic/service-link";
import { openInLink } from "@/logic/swedish-service";
import type { ShowEpisodesToday } from "@/logic/episodes-today";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import { IMAGE_BASE } from "./images";
import { t, type } from "./tokens";
import { useShowImages } from "./useShowImages";

const REF_HEIGHT = 844;

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function HeroPager({
  shows,
  badgeFor,
  todayDate,
}: {
  shows: ShowEpisodesToday[];
  badgeFor: (pageIndex: number) => string;
  todayDate: string;
}) {
  const { width } = useWindowDimensions();
  const [pageIndex, setPageIndex] = useState(0);

  return (
    <FlatList
      testID="home-pager"
      data={shows}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => String(item.show.id)}
      onMomentumScrollEnd={(event) => {
        const { contentOffset, layoutMeasurement } = event.nativeEvent;
        if (layoutMeasurement.width > 0) {
          setPageIndex(Math.round(contentOffset.x / layoutMeasurement.width));
        }
      }}
      renderItem={({ item, index }) => (
        <HeroPage
          item={item}
          width={width}
          badge={badgeFor(index)}
          pageIndex={pageIndex}
          pageCount={shows.length}
          todayDate={todayDate}
        />
      )}
    />
  );
}

function HeroPage({
  item,
  width,
  badge,
  pageIndex,
  pageCount,
  todayDate,
}: {
  item: ShowEpisodesToday;
  width: number;
  badge: string;
  pageIndex: number;
  pageCount: number;
  todayDate: string;
}) {
  const { height } = useWindowDimensions();
  const scale = height / REF_HEIGHT;
  const show = item.show as TvMazeShowWithEmbeds;
  const { data: images } = useShowImages(show, deviceTimeZone(), todayDate);
  const { data: providers, isError } = useSwedishService(show, true);
  const link = providers
    ? openInLink(providers, show.officialSite)
    : providers === null || isError
      ? serviceLink(show.officialSite)
      : null;

  const backdropPath = images?.backdrop?.filePath;
  const logo = images?.logo;

  return (
    <View style={{ width, height, backgroundColor: t.bg }}>
      {backdropPath && (
        <Image
          source={`${IMAGE_BASE}/w1280${backdropPath}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height: 580 * scale,
          }}
          contentFit="cover"
          contentPosition="center"
          accessibilityIgnoresInvertColors
        />
      )}
      {/* Fade from 280 to 580: transparent bg, 75% bg at the middle, solid bg. */}
      <View
        style={{
          position: "absolute",
          left: 0,
          width,
          top: 280 * scale,
          height: 301 * scale,
          experimental_backgroundImage:
            "linear-gradient(to bottom, rgba(11,12,15,0) 0%, rgba(11,12,15,0.75) 50%, rgba(11,12,15,1) 100%)",
        }}
      />

      <View style={[styles.content, { top: 452 * scale }]}>
        <Text style={styles.badge}>{badge}</Text>
        {logo ? (
          <Image
            source={`${IMAGE_BASE}/w500${logo.file_path}`}
            style={styles.logo}
            contentFit="contain"
            contentPosition="left"
            tintColor={t.ink}
            accessibilityLabel={show.name}
          />
        ) : (
          <Text style={styles.displayTitle} numberOfLines={2}>
            {show.name}
          </Text>
        )}
        <Text style={styles.meta} numberOfLines={1}>
          {homeCardMetaLine(show, item.episodes)}
        </Text>
        {link && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open in ${link.service}`}
            onPress={() => Linking.openURL(link.url)}
            style={styles.button}
          >
            <Text style={styles.buttonLabel}>Open in {link.service}</Text>
          </Pressable>
        )}
        {pageCount > 1 && (
          <View style={styles.dots}>
            {Array.from({ length: pageCount }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === pageIndex ? t.ink : t.hairline },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    position: "absolute",
    left: 24,
    right: 24,
    gap: 8,
  },
  badge: {
    ...type.label,
    color: t.inkMuted,
    textTransform: "uppercase",
  },
  logo: {
    width: 240,
    height: 88,
  },
  displayTitle: {
    ...type.display,
    color: t.ink,
  },
  meta: {
    ...type.meta,
    color: t.inkMuted,
  },
  button: {
    marginTop: 8, // 8 gap + 8 = 16 down from the meta line
    height: 52,
    borderRadius: t.radiusPill,
    backgroundColor: t.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    color: t.bg,
    fontSize: 16,
    fontWeight: "600",
  },
  dots: {
    marginTop: 8, // 8 gap + 8 = 16 below the button
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
