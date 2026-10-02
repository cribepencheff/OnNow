// A hidden developer screen, development builds only. Lists every
// followed show with what the hero
// would show (the episode still, or the highest-rated backdrop fallback),
// its logo, and the most and second most voted textless backdrops side by
// side for reviewing the ranking. Opened by a long press on the Shows tab.

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
import { useSwedishService } from "@/hooks/useSwedishService";
import { useToday } from "@/hooks/useToday";
import { latestEpisode } from "@/logic/show-detail";
import { sortShowsByTitle } from "@/logic/shows-list";
import { OpenInSlot } from "@/components/Hero/HeroPage";
import { heroAvailability, type HeroAvailability } from "@/logic/hero-carousel";
import { IMAGE_BASE, type TmdbImage } from "@/api/tmdb-types";
import type { TvMazeEpisode, TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import { useEpisodeStill } from "@/hooks/useEpisodeStill";
import { useShowImages } from "@/hooks/useShowImages";
import { t, type } from "@/theme/tokens";

// The four Open-in states with synthetic inputs, not live TMDB data.
// "Lookup failed" and "unmapped service" have no live example left
// in the test set right now (Pluto TV and BritBox were just added to the
// link table), so this is the only way to see all four in one place.
const FORCED_STATES: { label: string; availability: HeroAvailability }[] = [
  { label: "Lookup running", availability: { kind: "loading" } },
  { label: "Lookup failed", availability: { kind: "none" } },
  {
    label: "Unmapped service (Tele2 Play)",
    availability: heroAvailability(
      [{ providerId: 497, providerName: "Tele2 Play" }],
      false,
      false,
      null,
    ),
  },
  {
    label: "No Swedish service",
    availability: heroAvailability([], false, false, null),
  },
];

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
              {shows.length} followed shows. What the hero shows (episode still
              or highest-rated backdrop), logo, and the voted backdrops.
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

            <View style={styles.forcedSection}>
              <Text style={styles.meta}>
                Forced states (synthetic inputs, same slot as Home&apos;s hero):
              </Text>
              {FORCED_STATES.map(({ label, availability }) => (
                <View key={label} style={styles.forcedRow}>
                  <Text style={styles.meta}>{label}</Text>
                  <OpenInSlot availability={availability} />
                </View>
              ))}
            </View>
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
  const {
    data: providers,
    isLoading: providersLoading,
    isError: providersError,
  } = useSwedishService(show, true);
  const availability = heroAvailability(
    providers,
    providersLoading,
    providersError,
    show.officialSite,
  );
  const half = (width - 16 * 2 - 8) / 2;
  // The episode whose still the hero would prefer for this show; the latest
  // aired regular episode is a representative one that is likely to have a
  // still (an upcoming episode often has none yet).
  const stillEpisode = latestEpisode(
    show._embedded.episodes,
    deviceTimeZone(),
    todayDate,
  );

  return (
    <View style={styles.row} testID="dev-images-row">
      <Text style={styles.headline}>{show.name}</Text>
      {isLoading && <Text style={styles.meta}>Loading…</Text>}
      {error && <Text style={styles.meta}>{String(error)}</Text>}
      {data && (
        <>
          <Text style={styles.meta}>
            TMDB {data.tmdbId ?? "not found"} · textless backdrops:{" "}
            {data.textlessCount} · English logo: {data.logo ? "yes" : "no"}
          </Text>
          {/* What Home's "Open in" slot would show for this show right
              now, one of the four states, reviewed here across the whole
              test set since Home itself only shows today's shows. */}
          <Text style={styles.meta}>
            Open in slot:{" "}
            {availability.kind === "loading"
              ? "loading…"
              : availability.kind === "none"
                ? "(nothing, lookup failed)"
                : availability.kind === "button"
                  ? `button · Open in ${availability.link.service}`
                  : `text · ${availability.label}`}
          </Text>

          <View style={styles.logoBox}>
            {data.logo ? (
              <Image
                source={`${IMAGE_BASE}/w500${data.logo.file_path}`}
                style={styles.logo}
                contentFit="contain"
                contentPosition="left"
              />
            ) : (
              <Text style={styles.display}>{show.name}</Text>
            )}
          </View>

          {/* What the hero actually shows: the episode's own still when TMDB
              has one, otherwise the highest-rated backdrop. */}
          {stillEpisode && (
            <EpisodeStillThumb
              show={show}
              episode={stillEpisode}
              todayDate={todayDate}
              width={width - 32}
            />
          )}
          <Backdrop
            label="Highest-rated backdrop (hero fallback)"
            image={data.highestRatedBackdrop}
            width={width - 32}
          />

          <View style={styles.pair}>
            <Backdrop label="Most voted" image={data.mostVoted} width={half} />
            <Backdrop
              label="Second most voted"
              image={data.secondMostVoted}
              width={half}
            />
          </View>
        </>
      )}
    </View>
  );
}

// The episode still the hero would use for a show, when TMDB has one. Its
// own component so useEpisodeStill is called unconditionally (the parent
// only renders it when there is an episode to look up).
function EpisodeStillThumb({
  show,
  episode,
  todayDate,
  width,
}: {
  show: TvMazeShowWithEmbeds;
  episode: TvMazeEpisode;
  todayDate: string;
  width: number;
}) {
  const { data: still } = useEpisodeStill(
    show,
    episode,
    deviceTimeZone(),
    todayDate,
  );
  const label = `Episode still · S${episode.season}E${episode.number} (hero prefers this)`;

  return (
    <View style={{ width, gap: 4 }}>
      <Text style={styles.meta}>
        {label}
        {still ? "" : " · none, falls back to backdrop"}
      </Text>
      {still ? (
        <Image
          source={`${IMAGE_BASE}/w780${still.filePath}`}
          style={[styles.backdrop, { width, height: (width * 9) / 16 }]}
          contentFit="cover"
        />
      ) : (
        <Text style={styles.meta}>none</Text>
      )}
    </View>
  );
}

function Backdrop({
  label,
  image,
  width,
}: {
  label: string;
  image: TmdbImage | null;
  width: number;
}) {
  return (
    <View style={{ width, gap: 4 }}>
      <Text style={styles.meta}>
        {label}
        {image?.vote_count !== undefined
          ? ` · ${image.vote_average.toFixed(1)} (${image.vote_count})`
          : ""}
      </Text>
      {image ? (
        <Image
          source={`${IMAGE_BASE}/w780${image.file_path}`}
          style={[styles.backdrop, { width, height: (width * 9) / 16 }]}
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
  forcedSection: { gap: 16, marginTop: 4 },
  forcedRow: { gap: 4 },
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
});
