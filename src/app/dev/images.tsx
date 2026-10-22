// A hidden developer screen, development builds only. Lists every
// followed show with what the hero
// would show (the highest-rated backdrop, ADR 0012),
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
import { useStreamingService } from "@/hooks/useStreamingService";
import { useToday } from "@/hooks/useToday";
import {
  largestSavedQueries,
  savedCacheBreakdown,
} from "@/logic/saved-cache-breakdown";
import { sortShowsByTitle } from "@/logic/shows-list";
import { EpisodeMarkChip } from "@/components/Hero/EpisodeMarkChip";
import { OpenInSlot } from "@/components/Hero/HeroPage";
import {
  DEFAULT_PULSE_LOW,
  DEFAULT_PULSE_MS,
  DEFAULT_SKELETON_STAGGER_MS,
  SkeletonCard,
  useSkeletonRowPulse,
} from "@/components/ShowCard";
import { heroAvailability, type HeroAvailability } from "@/logic/hero-carousel";
import { openInAccessibilityLabel } from "@/logic/streaming-service";
import { IMAGE_BASE, type TmdbImage } from "@/api/tmdb-types";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import {
  QUERY_CACHE_STORAGE_KEY,
  savedCacheStorage,
} from "@/hooks/query-client";
import { useShowImages } from "@/hooks/useShowImages";
import { t, type } from "@/theme/tokens";

// The four Open-in states with synthetic inputs, not live TMDB data.
// "Lookup failed" and "unmapped service" have no live example left
// in the test set right now (Pluto TV and BritBox were just added to the
// link table), so this is the only way to see all four in one place.
// Any region works for the forced copy; the owner's is used.
const SAMPLE_REGION = "SE";

const FORCED_STATES: { label: string; availability: HeroAvailability }[] = [
  { label: "Lookup running", availability: { kind: "loading" } },
  { label: "Lookup failed", availability: { kind: "none" } },
  {
    label: "Unmapped service (Tele2 Play)",
    availability: heroAvailability(
      [{ providerId: 497, providerName: "Tele2 Play", logoPath: null }],
      false,
      false,
      null,
      SAMPLE_REGION,
    ),
  },
  {
    label: "No service in the region",
    availability: heroAvailability([], false, false, null, SAMPLE_REGION),
  },
];

// The TVmaze IDs of the test set (spike 0001) and the two extra shows from
// the PoC week log.
const TEST_SET_IDS = [
  53063, 61315, 35951, 22904, 44776, 91311, 68919, 75026, 82707, 48830, 75030,
  86175, 38052, 45039, 66840, 54198, 60213, 75632, 79390, 253, 63996,
];

export default function DevImagesScreen() {
  const { followedShows } = useFollowedEpisodes();
  const { follow } = useFollowList();
  const todayDate = useToday();
  const [following, setFollowing] = useState(false);
  // Live controls for the skeleton pulse below, so it can be tuned by eye
  // here instead of round-tripping numbers through commits; PosterRow
  // itself always uses ShowCard's own defaults, untouched by this.
  const [pulseMs, setPulseMs] = useState(DEFAULT_PULSE_MS);
  const [pulseLow, setPulseLow] = useState(DEFAULT_PULSE_LOW);
  const [staggerMs, setStaggerMs] = useState(DEFAULT_SKELETON_STAGGER_MS);
  // One clock per preview row, same as Home's own Top picks/Airing this
  // week (PosterRow, useSkeletonRowPulse each): not shared between rows,
  // since real rows aren't either. The second row's own cards then start
  // one stagger after the first row's, matching AiringThisWeekRow's
  // pulseOffsetMs.
  const firstRowClock = useSkeletonRowPulse(pulseMs);
  const secondRowClock = useSkeletonRowPulse(pulseMs);

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
              {shows.length} followed shows. What the hero shows (the
              highest-rated backdrop), logo, and the voted backdrops.
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

            <SavedCacheSize />

            {shows[0] && (
              <EpisodeMarkSamples show={shows[0].show} todayDate={todayDate} />
            )}

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

            {/* A poster row's first-load skeleton (PosterRow), held static
                here rather than crossfading into real cards, so the pulse
                is easy to sit and watch, with live controls below to tune
                it by eye. Both row shapes: without a caption line (Top
                picks) and with one (Airing this week). */}
            <View style={styles.forcedSection}>
              <Text style={styles.meta}>
                Skeleton row (pulsing, PosterRow&apos;s first load):
              </Text>
              <View style={styles.skeletonRow}>
                <SkeletonCard
                  withCaption={false}
                  clock={firstRowClock}
                  pulseMs={pulseMs}
                  pulseLow={pulseLow}
                  delayMs={0}
                />
                <SkeletonCard
                  withCaption={false}
                  clock={firstRowClock}
                  pulseMs={pulseMs}
                  pulseLow={pulseLow}
                  delayMs={staggerMs}
                />
                <SkeletonCard
                  withCaption={false}
                  clock={firstRowClock}
                  pulseMs={pulseMs}
                  pulseLow={pulseLow}
                  delayMs={2 * staggerMs}
                />
              </View>
              <Text style={styles.meta}>
                With a caption line, one stagger behind the row above:
              </Text>
              <View style={styles.skeletonRow}>
                <SkeletonCard
                  withCaption
                  clock={secondRowClock}
                  pulseMs={pulseMs}
                  pulseLow={pulseLow}
                  delayMs={staggerMs}
                />
                <SkeletonCard
                  withCaption
                  clock={secondRowClock}
                  pulseMs={pulseMs}
                  pulseLow={pulseLow}
                  delayMs={2 * staggerMs}
                />
                <SkeletonCard
                  withCaption
                  clock={secondRowClock}
                  pulseMs={pulseMs}
                  pulseLow={pulseLow}
                  delayMs={3 * staggerMs}
                />
              </View>

              <View style={styles.controls}>
                <Stepper
                  label="Pulse speed"
                  value={pulseMs}
                  format={(v) => `${v}ms`}
                  step={100}
                  min={200}
                  max={2000}
                  onChange={setPulseMs}
                />
                <Stepper
                  label="Pulse dimness"
                  value={pulseLow}
                  format={(v) => v.toFixed(1)}
                  step={0.1}
                  min={0}
                  max={0.9}
                  onChange={setPulseLow}
                />
                <Stepper
                  label="Stagger gap"
                  value={staggerMs}
                  format={(v) => `${v}ms`}
                  step={25}
                  min={0}
                  // Up to roughly a full pulse cycle (pulseMs*2): past
                  // pulseMs itself, two adjacent cards sit in opposite
                  // phase, one near peak brightness while the other's near
                  // its dimmest, the strongest possible contrast between
                  // them (owner found 250ms too close in phase to read as
                  // different at a glance).
                  max={pulseMs * 2}
                  onChange={setStaggerMs}
                />
                {(pulseMs !== DEFAULT_PULSE_MS ||
                  pulseLow !== DEFAULT_PULSE_LOW ||
                  staggerMs !== DEFAULT_SKELETON_STAGGER_MS) && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setPulseMs(DEFAULT_PULSE_MS);
                      setPulseLow(DEFAULT_PULSE_LOW);
                      setStaggerMs(DEFAULT_SKELETON_STAGGER_MS);
                    }}
                  >
                    <Text style={styles.resetLabel}>Reset to defaults</Text>
                  </Pressable>
                )}
              </View>
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
  const { data, isLoading, error } = useShowImages(show);
  const {
    data: providers,
    isLoading: providersLoading,
    isError: providersError,
    region,
  } = useStreamingService(show, true);
  const availability = heroAvailability(
    providers,
    providersLoading,
    providersError,
    show.officialSite,
    region,
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
                  ? `button · ${openInAccessibilityLabel(availability.link)}`
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

          <Backdrop
            label="Highest-rated backdrop (what the hero shows)"
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

// A -/value/+ row for one of the skeleton controls above, clamped to
// [min, max] and snapped to a fixed decimal to avoid float drift from
// repeated +/- steps on pulseLow.
function Stepper({
  label,
  value,
  step,
  min,
  max,
  format,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const move = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    onChange(Math.round(next * 100) / 100);
  };
  return (
    <View style={styles.stepper}>
      <Text style={styles.meta}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, decrease`}
          onPress={() => move(-step)}
          hitSlop={8}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperButtonLabel}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{format(value)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, increase`}
          onPress={() => move(step)}
          hitSlop={8}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperButtonLabel}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// The hero's fade into bg, as in HeroPager, under the samples.
const SAMPLE_FADE =
  "linear-gradient(to bottom, rgba(11,12,15,0.22) 0%, rgba(11,12,15,0.8) 60%, rgba(11,12,15,1) 100%)";

// The Premiere/Finale chip on a real backdrop with the hero's fade over
// it, where the chip sits, to judge its look.
// How big the query cache saved to the phone is (ADR 0017). It is kept in
// SQLite (CRI-139), which has no size limit like AsyncStorage's 6 MB on
// Android, but the whole copy is written on a change and read on a launch,
// so its size is still worth watching. Read on a tap, as a JSON string:
// its length is about its size in bytes.
function SavedCacheSize() {
  const [saved, setSaved] = useState<string | null | undefined>(undefined);
  const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={async () =>
          setSaved(await savedCacheStorage.getItem(QUERY_CACHE_STORAGE_KEY))
        }
        style={styles.followAll}
      >
        <Text style={styles.followAllLabel}>
          {saved === undefined
            ? "Saved cache: tap to measure"
            : `Saved cache: ${mb(saved?.length ?? 0)}`}
        </Text>
      </Pressable>
      {saved !== undefined && (
        // Per kind of data, largest first, then the largest entries.
        <View style={styles.cacheBreakdown}>
          {savedCacheBreakdown(saved).map(({ kind, count, bytes }) => (
            <Text key={kind} style={styles.meta}>
              {`${kind}: ${count} × · ${mb(bytes)}`}
            </Text>
          ))}
          <Text style={styles.meta}>Largest entries:</Text>
          {largestSavedQueries(saved, 5).map(({ key, bytes }) => (
            <Text key={key} style={styles.meta}>
              {`${key} · ${mb(bytes)}`}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function EpisodeMarkSamples({
  show,
  todayDate,
}: {
  show: TvMazeShowWithEmbeds;
  todayDate: string;
}) {
  const { width } = useWindowDimensions();
  const { data } = useShowImages(show);
  const backdrop = data?.highestRatedBackdrop;
  return (
    <View style={styles.forcedSection}>
      <Text style={styles.meta}>
        Premiere / Finale chip (on the hero&apos;s fade):
      </Text>
      <View style={[styles.markSamples, { width: width - 32 }]}>
        {backdrop && (
          <Image
            source={`${IMAGE_BASE}/w780${backdrop.file_path}`}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill,
            { experimental_backgroundImage: SAMPLE_FADE },
          ]}
        />
        <View style={styles.markSampleRow}>
          <Text style={styles.markSampleText}>S1E1 · Episode</Text>
          <EpisodeMarkChip mark="premiere" />
        </View>
        <View style={styles.markSampleRow}>
          <Text style={styles.markSampleText}>S1E10 · Episode</Text>
          <EpisodeMarkChip mark="finale" />
        </View>
      </View>
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
  cacheBreakdown: { gap: 2, marginTop: 8 },
  forcedSection: { gap: 16, marginTop: 4 },
  forcedRow: { gap: 4 },
  skeletonRow: { flexDirection: "row", gap: 8 },
  markSamples: {
    borderRadius: t.radiusSm,
    overflow: "hidden",
    paddingVertical: 16,
    gap: 12,
    backgroundColor: t.bg,
  },
  markSampleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: t.space2,
  },
  markSampleText: { ...type.meta, color: t.ink },
  controls: { gap: 10, marginTop: 4 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.surfaceRaised,
  },
  stepperButtonLabel: { color: t.ink, fontSize: 18, fontWeight: "600" },
  stepperValue: {
    ...type.meta,
    color: t.ink,
    minWidth: 48,
    textAlign: "center",
  },
  resetLabel: {
    ...type.meta,
    color: t.inkMuted,
    textDecorationLine: "underline",
  },
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
