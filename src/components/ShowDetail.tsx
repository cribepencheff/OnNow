// Show detail, PoC slice (PRD 5.5, FR-028, FR-029, FR-032, FR-033, FR-034,
// CRI-79): "is this the right show, and what is it?", from TVmaze data
// only. The same view for every entry point (FR-030); the routes in
// src/app/show and src/app/search/show only pass the show ID. Services,
// "Open in" and the territory state are MVP. Visual design comes later,
// so styling here stays minimal and functional.

import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { TvMazeCredit } from "./TvMazeCredit";
import { useFollowList } from "@/hooks/useFollowList";
import { useShow } from "@/hooks/useShow";
import { useToday } from "@/hooks/useToday";
import { plainTextSummary } from "@/logic/search-results";
import {
  allEpisodesAvailable,
  currentSeasonNumber,
  episodeDateLabel,
  episodeOfLabel,
  episodeState,
  isFinale,
  latestCard,
  nextCard,
  regularEpisodes,
  seasonTabs,
  showDetailMetaLine,
  type NextCard,
  type SeasonTab,
} from "@/logic/show-detail";
import type { LocalDate } from "@/logic/local-date";
import type {
  TvMazeEpisode,
  TvMazeSeason,
  TvMazeShowWithEmbeds,
} from "@/api/tvmaze-types";
import { accent, withLightness } from "@/theme/color";

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function ShowDetail({ showId }: { showId: number }) {
  const { data: show, isLoading } = useShow(showId);

  if (!show) {
    return (
      <Text style={styles.quietLine}>
        {isLoading ? "Loading…" : "Couldn't load this show."}
      </Text>
    );
  }

  return <ShowDetailContent show={show} />;
}

function ShowDetailContent({ show }: { show: TvMazeShowWithEmbeds }) {
  const todayDate = useToday();
  const timeZone = deviceTimeZone();

  const episodes = show._embedded.episodes;
  const seasons = show._embedded.seasons;

  const summary = plainTextSummary(show.summary);
  const latest = latestCard(episodes, seasons, timeZone, todayDate);
  const next = nextCard(show, episodes, seasons, timeZone, todayDate);
  const tabs = seasonTabs(seasons, episodes, todayDate);

  const [selectedSeason, setSelectedSeason] = useState(
    () => currentSeasonNumber(episodes, timeZone, todayDate) ?? tabs[0]?.number,
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
    >
      <Image
        source={show.image?.original ?? show.image?.medium ?? undefined}
        style={styles.heroImage}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />

      <View style={styles.section}>
        <Text style={styles.title}>{show.name}</Text>
        <Text style={styles.meta}>{showDetailMetaLine(show)}</Text>
        {allEpisodesAvailable(episodes, seasons, timeZone, todayDate) && (
          <Text style={styles.meta}>All episodes available</Text>
        )}
        <FollowAction showId={show.id} />
        {summary && <Text style={styles.summary}>{summary}</Text>}
      </View>

      <View style={styles.section} testID="show-detail-next">
        <Text style={styles.sectionLabel}>NEXT</Text>
        <NextCardView
          card={next}
          seasons={seasons}
          timeZone={timeZone}
          todayDate={todayDate}
        />
      </View>

      {latest && (
        <View style={styles.section} testID="show-detail-latest">
          <Text style={styles.sectionLabel}>LATEST</Text>
          {latest.kind === "episode" ? (
            <EpisodeCard
              episode={latest.episode}
              seasons={seasons}
              timeZone={timeZone}
              todayDate={todayDate}
            />
          ) : (
            // A season drop is one item (FR-012, CRI-81).
            <Text style={styles.nextLine}>{latest.label}</Text>
          )}
        </View>
      )}

      {tabs.length > 0 && (
        <SeasonTabs
          tabs={tabs}
          selected={selectedSeason}
          onSelect={setSelectedSeason}
        />
      )}

      <View style={styles.episodeList} testID="show-detail-episodes">
        <EpisodeList
          episodes={regularEpisodes(episodes).filter(
            (episode) => episode.season === selectedSeason,
          )}
          seasons={seasons}
          timeZone={timeZone}
          todayDate={todayDate}
        />
      </View>

      <TvMazeCredit />
    </ScrollView>
  );
}

// FR-029, PoC: a bold "Follow" in the accent colour when not followed; a
// quiet "Following" status when followed, which unfollows when tapped.
// "Open in [service]" is MVP.
function FollowAction({ showId }: { showId: number }) {
  const { isFollowed, follow, unfollow } = useFollowList();

  if (isFollowed(showId)) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Following"
        accessibilityHint="Unfollows the show"
        onPress={() => unfollow(showId)}
        hitSlop={8}
        style={styles.followingStatus}
      >
        <Text style={styles.followingLabel}>✓ Following</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Follow"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        follow(showId);
      }}
      style={styles.followButton}
    >
      <Text style={styles.followLabel}>Follow</Text>
    </Pressable>
  );
}

interface EpisodeContext {
  seasons: TvMazeSeason[];
  timeZone: string;
  todayDate: LocalDate;
}

function NextCardView({
  card,
  ...context
}: { card: NextCard } & EpisodeContext) {
  if (card.kind === "episode") {
    return <EpisodeCard episode={card.episode} {...context} />;
  }
  return (
    <Text style={styles.nextLine}>
      {card.kind === "status" ? card.status : card.label}
    </Text>
  );
}

// PRD 5.5: landscape still, title, "Episode 2 of 10", relative day and a
// short summary. Never a time of day (ADR 0001).
function EpisodeCard({
  episode,
  seasons,
  timeZone,
  todayDate,
}: { episode: TvMazeEpisode } & EpisodeContext) {
  const summary = plainTextSummary(episode.summary);

  return (
    <View style={styles.episodeCard}>
      {/* Upcoming episodes usually have no still yet: show nothing
          rather than an empty box (data first). */}
      {episode.image?.medium && (
        <Image
          source={episode.image.medium}
          style={styles.still}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      )}
      <Text style={styles.episodeTitle}>{episode.name}</Text>
      <View style={styles.episodeMetaRow}>
        <Text style={styles.episodeMeta}>
          {episodeOfLabel(episode, seasons)}
        </Text>
        <Text style={styles.episodeMeta}> · </Text>
        <Text style={styles.episodeMeta}>
          {episodeDateLabel(episode, timeZone, todayDate)}
        </Text>
      </View>
      {summary && (
        <Text style={styles.episodeSummary} numberOfLines={3}>
          {summary}
        </Text>
      )}
    </View>
  );
}

function SeasonTabs({
  tabs,
  selected,
  onSelect,
}: {
  tabs: SeasonTab[];
  selected: number | undefined;
  onSelect: (season: number) => void;
}) {
  // The preselected season can be far to the right (season 6 of 8), so the
  // strip scrolls to it once, when it is first laid out.
  const scrollRef = useRef<ScrollView>(null);
  const scrolledToSelected = useRef(false);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabs}
      accessibilityRole="tablist"
    >
      {tabs.map((tab) => {
        const isSelected = tab.number === selected;
        const name = `Season ${tab.number}`;
        return (
          <Pressable
            key={tab.number}
            accessibilityRole="tab"
            accessibilityLabel={tab.note ? `${name}, ${tab.note}` : name}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(tab.number)}
            onLayout={(event) => {
              if (isSelected && !scrolledToSelected.current) {
                scrolledToSelected.current = true;
                scrollRef.current?.scrollTo({
                  x: Math.max(0, event.nativeEvent.layout.x - 16),
                  animated: false,
                });
              }
            }}
            style={[styles.tab, isSelected && styles.tabSelected]}
          >
            <Text
              style={[
                styles.tabLabel,
                tab.announced && styles.muted,
                isSelected && styles.tabLabelSelected,
              ]}
            >
              {name}
            </Text>
            {tab.note && (
              <Text style={[styles.tabNote, styles.muted]}>{tab.note}</Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// FR-032: aired in the normal style, today with a quiet highlight (a
// status, not an action), upcoming muted with its date or "TBA", and a
// "Finale" badge on a season's last episode. Specials are never listed
// (FR-037).
function EpisodeList({
  episodes,
  seasons,
  timeZone,
  todayDate,
}: { episodes: TvMazeEpisode[] } & EpisodeContext) {
  if (episodes.length === 0) {
    return <Text style={styles.quietLine}>No episodes yet.</Text>;
  }

  return episodes.map((episode) => {
    const state = episodeState(episode, timeZone, todayDate);
    const muted = state === "upcoming";
    const dateLabel = episodeDateLabel(episode, timeZone, todayDate);
    const finale = isFinale(episode, seasons);

    return (
      <View
        key={episode.id}
        testID={`episode-${state}`}
        accessible
        accessibilityLabel={[
          `Episode ${episode.number}`,
          episode.name,
          dateLabel,
          finale ? "Finale" : null,
        ]
          .filter(Boolean)
          .join(", ")}
        style={[styles.episodeRow, state === "today" && styles.episodeToday]}
      >
        <Text style={[styles.episodeNumber, muted && styles.muted]}>
          {episode.number}
        </Text>
        <View style={styles.episodeRowDetails}>
          <Text
            style={[styles.episodeRowTitle, muted && styles.muted]}
            numberOfLines={1}
          >
            {episode.name}
          </Text>
          <Text style={[styles.episodeRowDate, muted && styles.muted]}>
            {dateLabel}
          </Text>
        </View>
        {finale && <Text style={styles.finaleBadge}>Finale</Text>}
      </View>
    );
  });
}

const STILL_ASPECT_RATIO = 16 / 9;
const MUTED = "#999999";

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroImage: {
    width: "100%",
    aspectRatio: 4 / 5,
    backgroundColor: "#E0E0E0",
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  meta: {
    fontSize: 15,
    color: "#666666",
  },
  summary: {
    fontSize: 15,
    color: "#333333",
    lineHeight: 21,
  },
  followButton: {
    alignSelf: "flex-start",
    backgroundColor: accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    marginVertical: 8,
  },
  followLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  followingStatus: {
    alignSelf: "flex-start",
    paddingVertical: 12,
    marginVertical: 8,
  },
  followingLabel: {
    color: "#666666",
    fontWeight: "600",
    fontSize: 15,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#666666",
  },
  nextLine: {
    fontSize: 17,
    fontWeight: "600",
  },
  episodeCard: {
    gap: 4,
  },
  still: {
    width: "100%",
    aspectRatio: STILL_ASPECT_RATIO,
    borderRadius: 10,
    backgroundColor: "#E0E0E0",
    marginBottom: 4,
  },
  episodeTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  episodeMetaRow: {
    flexDirection: "row",
  },
  episodeMeta: {
    fontSize: 14,
    color: "#666666",
  },
  episodeSummary: {
    fontSize: 14,
    color: "#333333",
  },
  tabs: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  tabSelected: {
    backgroundColor: "#333333",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabLabelSelected: {
    color: "#FFFFFF",
  },
  tabNote: {
    fontSize: 11,
  },
  muted: {
    color: MUTED,
  },
  episodeList: {
    paddingTop: 8,
  },
  episodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  episodeToday: {
    backgroundColor: withLightness(accent, 94),
  },
  episodeNumber: {
    width: 24,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
  },
  episodeRowDetails: {
    flex: 1,
    gap: 2,
  },
  episodeRowTitle: {
    fontSize: 15,
  },
  episodeRowDate: {
    fontSize: 13,
    color: "#666666",
  },
  finaleBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666666",
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  quietLine: {
    textAlign: "center",
    color: "#666666",
    fontSize: 15,
    paddingHorizontal: 32,
    paddingTop: 24,
  },
});
