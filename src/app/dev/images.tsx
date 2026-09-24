// PROTOTYPE (proto/home-backdrop, not for merge): a hidden developer screen,
// development builds only. Lists every followed show with the backdrop and
// logo the image rules picked, and the most voted and second most voted
// backdrops side by side, to review the "second is better" rule. Opened by
// a long press on Home's "+".

import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Stack } from "expo-router";
import { Image } from "expo-image";

import { useFollowList } from "@/hooks/useFollowList";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useToday } from "@/hooks/useToday";
import { sortShowsByTitle } from "@/logic/shows-list";
import { IMAGE_BASE, type TmdbImage } from "@/proto/images";
import { t, type } from "@/proto/tokens";
import { useShowImages } from "@/proto/useShowImages";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";

// The TVmaze IDs of the test set (spike 0001) and the two extra shows from
// the PoC week log.
const TEST_SET_IDS = [
  53063, 61315, 35951, 22904, 44776, 91311, 68919, 75026, 82707, 48830, 75030,
  86175, 38052, 45039, 66840, 54198, 60213, 75632, 79390, 253, 63996,
];

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export default function DevImagesScreen() {
  const { followedShows } = useFollowedEpisodes();
  const { follow } = useFollowList();
  const todayDate = useToday();
  const [following, setFollowing] = useState(false);

  if (!__DEV__) {
    return null;
  }

  const shows = sortShowsByTitle(followedShows);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: "Images (dev)",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <FlatList
        data={shows}
        keyExtractor={({ show }) => String(show.id)}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.meta}>
              {shows.length} followed shows. Chosen backdrop and logo per the
              rules in docs/design/design-system.md.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                setFollowing(true);
                for (const id of TEST_SET_IDS) {
                  await follow(id);
                }
                setFollowing(false);
              }}
              style={styles.followAll}
            >
              <Text style={styles.followAllLabel}>
                {following ? "Following…" : "Follow the test set (21 shows)"}
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <ShowImagesRow show={item.show} todayDate={todayDate} />
        )}
      />
    </View>
  );
}

function ShowImagesRow({
  show,
  todayDate,
}: {
  show: TvMazeShowWithEmbeds;
  todayDate: string;
}) {
  const { width } = useWindowDimensions();
  const { data, isLoading, error } = useShowImages(
    show,
    deviceTimeZone(),
    todayDate,
  );
  const half = (width - 16 * 2 - 8) / 2;

  return (
    <View style={styles.row} testID="dev-images-row">
      <Text style={styles.headline}>{show.name}</Text>
      {isLoading && <Text style={styles.meta}>Loading…</Text>}
      {error && <Text style={styles.meta}>{String(error)}</Text>}
      {data && (
        <>
          <Text style={styles.meta}>
            TMDB {data.tmdbId ?? "not found"} · airing now:{" "}
            {data.airingNow ? "yes" : "no"} · textless backdrops:{" "}
            {data.textlessCount} · English logo: {data.logo ? "yes" : "no"}
          </Text>
          <Text style={styles.meta}>
            Picked: {data.backdrop?.rule ?? "none (no textless backdrop)"}
            {data.backdrop?.newestTime
              ? ` · uploaded ${data.backdrop.newestTime}`
              : ""}
          </Text>
          {/* Stored (owner decision): the backdrop changes only on the
              local release day of a new episode or drop, not on every
              read. When and why it was last picked: */}
          <Text style={styles.meta}>
            {data.pickReason === "new-episode"
              ? `Picked for ${data.pickEpisodeCode}`
              : data.pickReason === "followed"
                ? "Picked when followed"
                : "Not picked yet"}
          </Text>

          <View style={styles.logoBox}>
            {data.logo ? (
              <Image
                source={`${IMAGE_BASE}/w500${data.logo.file_path}`}
                style={styles.logo}
                contentFit="contain"
                contentPosition="left"
                tintColor={t.ink}
              />
            ) : (
              <Text style={styles.display}>{show.name}</Text>
            )}
          </View>

          <View style={styles.pair}>
            <Backdrop
              label="Most voted"
              image={data.mostVoted}
              chosen={data.backdrop?.filePath === data.mostVoted?.file_path}
              width={half}
            />
            <Backdrop
              label="Second most voted"
              image={data.secondMostVoted}
              chosen={
                data.backdrop?.filePath === data.secondMostVoted?.file_path
              }
              width={half}
            />
          </View>
          {data.backdrop &&
            data.backdrop.filePath !== data.mostVoted?.file_path &&
            data.backdrop.filePath !== data.secondMostVoted?.file_path && (
              <Backdrop
                label="Picked (newest)"
                image={{ file_path: data.backdrop.filePath } as TmdbImage}
                chosen
                width={width - 32}
              />
            )}
        </>
      )}
    </View>
  );
}

function Backdrop({
  label,
  image,
  chosen,
  width,
}: {
  label: string;
  image: TmdbImage | null;
  chosen: boolean;
  width: number;
}) {
  return (
    <View style={{ width, gap: 4 }}>
      <Text style={[styles.meta, chosen && { color: t.accent }]}>
        {label}
        {chosen ? " · picked" : ""}
        {image?.vote_count !== undefined
          ? ` · ${image.vote_average.toFixed(1)} (${image.vote_count})`
          : ""}
      </Text>
      {image ? (
        <Image
          source={`${IMAGE_BASE}/w780${image.file_path}`}
          style={[
            styles.backdrop,
            { width, height: (width * 9) / 16 },
            chosen && styles.chosen,
          ]}
          contentFit="cover"
        />
      ) : (
        <Text style={styles.meta}>none</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  header: { padding: 16, gap: 12 },
  followAll: {
    alignSelf: "flex-start",
    backgroundColor: t.surfaceRaised,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: t.radiusPill,
  },
  followAllLabel: { color: t.ink, fontWeight: "600" },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.hairline,
  },
  headline: { ...type.headline, color: t.ink },
  meta: { ...type.meta, color: t.inkMuted },
  display: { ...type.display, color: t.ink },
  logoBox: {
    backgroundColor: t.surface,
    borderRadius: t.radiusSm,
    padding: 12,
    alignSelf: "flex-start",
  },
  logo: { width: 240, height: 88 },
  pair: { flexDirection: "row", gap: 8 },
  backdrop: { borderRadius: t.radiusSm, backgroundColor: t.surface },
  chosen: { borderWidth: 2, borderColor: t.accent },
});
