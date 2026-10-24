// Show detail, PoC slice (PRD 5.5, FR-028, FR-029, FR-032, FR-033, FR-034,
// CRI-79): "is this the right show, and what is it?", from TVmaze data
// only. The same view for every entry point (FR-030); the routes in
// src/app/show and src/app/search/show only pass the show ID. Services,
// "Open in" and the territory state are MVP. Visual design comes later,
// so styling here stays minimal and functional.

import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  TvMazeEpisode,
  TvMazeSeason,
  TvMazeShowWithEmbeds,
} from "@/api/tvmaze-types";
import { useOriginCountries } from "@/hooks/useOriginCountries";
import { useShow } from "@/hooks/useShow";
import { useToday } from "@/hooks/useToday";
import type { LocalDate } from "@/logic/local-date";
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
  showDetailPill,
  type NextCard,
  type SeasonTab,
} from "@/logic/show-detail";
import { showState, showStateLabel } from "@/logic/show-state";
import { TAB_BAR_HEIGHT } from "@/logic/tab-bar";
import { heroLayout, topScrimGradient } from "@/logic/hero-layout";
import { FloatingBackButton } from "./FloatingBackButton";
import { ShowDetailHero } from "./ShowDetailHero";
import { t, type } from "@/theme/tokens";
import { TmdbCredit } from "./TmdbCredit";
import { TvMazeCredit } from "./TvMazeCredit";

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function ShowDetail({
  showId,
  overTabBar = false,
}: {
  showId: number;
  // Inside the Search tab the tab bar stays over the bottom of the view,
  // so the content ends above it (CRI-133).
  overTabBar?: boolean;
}) {
  const { data: show, isLoading } = useShow(showId);

  return (
    <View style={styles.frame}>
      {show ? (
        <ShowDetailContent show={show} overTabBar={overTabBar} />
      ) : (
        <Text style={styles.quietLine}>
          {isLoading ? "Loading…" : "Couldn't load this show."}
        </Text>
      )}
      <FloatingHeader />
    </View>
  );
}

// Over the page, staying put while it scrolls (CRI-129, owner 2026-10-22;
// Apple TV and Instagram as references): the Home hero's dark gradient
// behind the status bar and the header's bar, so the clock and the back
// button read on bright images, and the round back button. The backdrop
// runs up under both.
function FloatingHeader() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.topScrim,
          {
            height: heroLayout(height, insets.top).topGradientHeight,
            experimental_backgroundImage: topScrimGradient(insets.top),
          },
        ]}
      />
      <FloatingBackButton />
    </>
  );
}

function ShowDetailContent({
  show,
  overTabBar,
}: {
  show: TvMazeShowWithEmbeds;
  overTabBar: boolean;
}) {
  const todayDate = useToday();
  const timeZone = deviceTimeZone();

  const episodes = show._embedded.episodes;
  const seasons = show._embedded.seasons;

  const summary = plainTextSummary(show.summary);
  const latest = latestCard(episodes, seasons, timeZone, todayDate);
  const next = nextCard(show, episodes, seasons, timeZone, todayDate);
  const tabs = seasonTabs(seasons, episodes, todayDate);
  const state = showState(show, episodes, seasons, timeZone, todayDate);
  const { width } = useWindowDimensions();
  const { data: originCountries } = useOriginCountries(show);
  const metaLine = showDetailMetaLine(show, originCountries ?? []);

  const [selectedSeason, setSelectedSeason] = useState(
    () => currentSeasonNumber(episodes, timeZone, todayDate) ?? tabs[0]?.number,
  );

  return (
    <ScrollView
      style={styles.screen}
      // As on Home: an image page, read as a whole (owner, 2026-10-22).
      showsVerticalScrollIndicator={false}
      testID="show-detail-scroll"
      contentContainerStyle={[
        styles.scrollContent,
        overTabBar && styles.scrollContentOverTabBar,
      ]}
    >
      <ShowDetailHero
        show={show}
        width={width}
        pill={showDetailPill(episodes, seasons, timeZone, todayDate)}
        metaLine={metaLine}
      />

      <View style={styles.section} testID="show-detail-section">
        <Text style={styles.meta} testID="show-detail-status">
          {showStateLabel(state, todayDate)}
        </Text>
        {allEpisodesAvailable(episodes, seasons, timeZone, todayDate) && (
          <Text style={styles.meta}>All episodes available</Text>
        )}
        {summary && <Text style={styles.summary}>{summary}</Text>}
      </View>

      {/* With nothing dated next, the status line already says it all. */}
      {next.kind !== "status" && (
        <View style={styles.section} testID="show-detail-next">
          <Text style={styles.sectionLabel}>NEXT</Text>
          <NextCardView
            card={next}
            seasons={seasons}
            timeZone={timeZone}
            todayDate={todayDate}
          />
        </View>
      )}

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
      <TmdbCredit />
    </ScrollView>
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

// The space above a section.
const SECTION_TOP = 20;

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: t.bg,
  },
  screen: {
    backgroundColor: t.bg,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  scrollContentOverTabBar: {
    paddingBottom: TAB_BAR_HEIGHT + 32,
  },
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  section: {
    paddingHorizontal: t.contentInset,
    paddingTop: SECTION_TOP,
    gap: 6,
  },
  meta: {
    ...type.meta,
    color: t.inkMuted,
  },
  summary: {
    ...type.body,
    color: t.ink,
  },
  sectionLabel: {
    ...type.label,
    color: t.inkMuted,
  },
  nextLine: {
    ...type.body,
    fontWeight: "600",
    color: t.ink,
  },
  episodeCard: {
    gap: 4,
  },
  still: {
    width: "100%",
    aspectRatio: STILL_ASPECT_RATIO,
    borderRadius: t.radiusSm,
    marginBottom: 4,
  },
  episodeTitle: {
    ...type.body,
    fontWeight: "600",
    color: t.ink,
  },
  episodeMetaRow: {
    flexDirection: "row",
  },
  episodeMeta: {
    ...type.meta,
    color: t.inkMuted,
  },
  episodeSummary: {
    ...type.meta,
    color: t.ink,
  },
  tabs: {
    paddingHorizontal: t.contentInset,
    paddingTop: 24,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: t.radiusPill,
    backgroundColor: t.surfaceRaised,
    alignItems: "center",
  },
  tabSelected: {
    backgroundColor: t.ink,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: t.ink,
  },
  tabLabelSelected: {
    color: t.bg,
  },
  tabNote: {
    fontSize: 11,
    color: t.inkMuted,
  },
  muted: {
    color: t.inkSubtle,
  },
  episodeList: {
    paddingTop: 8,
  },
  episodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: t.contentInset,
    paddingVertical: 10,
  },
  episodeToday: {
    backgroundColor: t.surface,
  },
  episodeNumber: {
    width: 24,
    ...type.body,
    fontWeight: "600",
    textAlign: "right",
    color: t.ink,
  },
  episodeRowDetails: {
    flex: 1,
    gap: 2,
  },
  episodeRowTitle: {
    ...type.body,
    color: t.ink,
  },
  episodeRowDate: {
    ...type.meta,
    color: t.inkMuted,
  },
  finaleBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: t.inkMuted,
    borderWidth: 1,
    borderColor: t.inkSubtle,
    borderRadius: t.radiusPill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  // Below the floating header.
  quietLine: {
    ...type.body,
    textAlign: "center",
    color: t.inkMuted,
    paddingHorizontal: t.space10,
    paddingTop: 120,
  },
});
