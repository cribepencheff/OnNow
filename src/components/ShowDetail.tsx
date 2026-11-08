// Show detail, PoC slice (PRD 5.5, FR-028, FR-029, FR-032, FR-033, FR-034,
// CRI-79): "is this the right show, and what is it?", from TVmaze data
// only. The same view for every entry point (FR-030); the routes in
// src/app/show and src/app/search/show only pass the show ID. Services,
// "Open in" and the territory state are MVP. Visual design comes later,
// so styling here stays minimal and functional.

import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActionSheetIOS,
  FlatList,
  Platform,
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
  episodeDateLabel,
  episodeOfLabel,
  episodeState,
  initialEpisodeIndex,
  initialSeasonNumber,
  isFinale,
  regularEpisodes,
  seasonTabs,
  showDetailMetaLine,
  showDetailPill,
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
  const tabs = seasonTabs(seasons, episodes, todayDate);
  const state = showState(show, episodes, seasons, timeZone, todayDate);
  const ended = state.kind === "ended";
  const { width } = useWindowDimensions();
  const { data: originCountries } = useOriginCountries(show);
  const metaLine = showDetailMetaLine(show, originCountries ?? []);

  const [initialSeason] = useState(
    () =>
      initialSeasonNumber(episodes, ended, timeZone, todayDate) ??
      tabs[0]?.number,
  );
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const seasonEpisodes = regularEpisodes(episodes).filter(
    (episode) => episode.season === selectedSeason,
  );
  // The row opens on the latest episode out in the season it starts on;
  // a season picked later opens on its first episode.
  const startIndex =
    selectedSeason === initialSeason
      ? initialEpisodeIndex(seasonEpisodes, ended, timeZone, todayDate)
      : 0;

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
        // The status rides in the pill when there is no news (owner,
        // 2026-11-08), so there is no status line below the hero.
        pill={showDetailPill(
          episodes,
          seasons,
          timeZone,
          todayDate,
          showStateLabel(state, todayDate),
        )}
        metaLine={metaLine}
      />

      {summary && (
        <View style={styles.section} testID="show-detail-section">
          <Summary text={summary} />
        </View>
      )}

      {tabs.length > 0 && (
        <View style={styles.episodesSection}>
          <SeasonPicker
            tabs={tabs}
            selected={selectedSeason}
            onSelect={setSelectedSeason}
          />
          <EpisodeRow
            // A new list per season, so it opens at its own start.
            key={selectedSeason}
            episodes={seasonEpisodes}
            startIndex={startIndex}
            width={width}
            seasons={seasons}
            timeZone={timeZone}
            todayDate={todayDate}
          />
        </View>
      )}

      <TvMazeCredit />
      <TmdbCredit />
    </ScrollView>
  );
}

const SUMMARY_LINES = 3;

// Three lines, with "More" for the rest (owner, 2026-11-08; Apple TV as
// the reference). The full text is laid out once, out of sight, to know
// whether it runs longer; "More" shows only when it does.
function Summary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const truncated = !expanded && lineCount > SUMMARY_LINES;

  return (
    <View>
      <Text
        style={[styles.summary, styles.measure]}
        testID="show-detail-summary-measure"
        onTextLayout={(event) => setLineCount(event.nativeEvent.lines.length)}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {text}
      </Text>
      <Text
        style={styles.summary}
        numberOfLines={expanded ? undefined : SUMMARY_LINES}
        onPress={truncated ? () => setExpanded(true) : undefined}
      >
        {text}
      </Text>
      {truncated && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded(true)}
          hitSlop={8}
          style={styles.moreButton}
        >
          <Text style={styles.more}>More</Text>
        </Pressable>
      )}
    </View>
  );
}

function seasonName(tab: SeasonTab): string {
  return tab.note
    ? `Season ${tab.number} · ${tab.note}`
    : `Season ${tab.number}`;
}

// FR-032, FR-033: the season as a heading with a menu of all seasons, as
// in Apple TV (owner, 2026-11-08). An announced season without episodes is
// listed with its premiere date or "Announced". iOS's own action sheet,
// which runs in Expo Go; Android gets its own picker when it is built.
function SeasonPicker({
  tabs,
  selected,
  onSelect,
}: {
  tabs: SeasonTab[];
  selected: number | undefined;
  onSelect: (season: number) => void;
}) {
  const current = tabs.find((tab) => tab.number === selected);
  const canPick = tabs.length > 1 && Platform.OS === "ios";

  function openPicker() {
    const options = [...tabs.map(seasonName), "Cancel"];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        userInterfaceStyle: "dark",
      },
      (index) => {
        const tab = tabs[index];
        if (tab) {
          onSelect(tab.number);
        }
      },
    );
  }

  return (
    <Pressable
      testID="show-detail-season-picker"
      accessibilityRole={canPick ? "button" : "header"}
      accessibilityLabel={current ? seasonName(current) : undefined}
      accessibilityHint={canPick ? "Choose a season" : undefined}
      disabled={!canPick}
      onPress={openPicker}
      style={styles.seasonPicker}
    >
      <Text style={styles.seasonName}>
        {current ? `Season ${current.number}` : ""}
      </Text>
      {canPick && (
        <SymbolView
          name="chevron.up.chevron.down"
          tintColor={t.inkMuted}
          size={16}
          weight="semibold"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}
      {current?.note && <Text style={styles.seasonNote}>{current.note}</Text>}
    </Pressable>
  );
}

const CARD_GAP = 12;
// How much of the card's width the screen gives it: the next card shows at
// the edge, to say the row scrolls (Apple TV).
const CARD_WIDTH_SHARE = 0.78;

// FR-032, PRD 5.5: the season's episodes as cards to swipe through, in
// place of the latest and next cards (owner, 2026-11-08). Each card shows
// its own relative day, so the latest one out and the next one need no
// label of their own; upcoming episodes are muted. Never a time of day
// (ADR 0001). Specials are never listed (FR-037).
function EpisodeRow({
  episodes,
  startIndex,
  width,
  ...context
}: {
  episodes: TvMazeEpisode[];
  startIndex: number;
  width: number;
} & EpisodeContext) {
  if (episodes.length === 0) {
    return <Text style={styles.noEpisodes}>No episodes yet.</Text>;
  }

  const cardWidth = Math.round(width * CARD_WIDTH_SHARE);
  const interval = cardWidth + CARD_GAP;

  return (
    <FlatList
      horizontal
      testID="show-detail-episodes"
      data={episodes}
      keyExtractor={(episode) => String(episode.id)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.episodeRow}
      snapToInterval={interval}
      decelerationRate="fast"
      initialScrollIndex={startIndex}
      getItemLayout={(_, index) => ({
        length: interval,
        offset: interval * index,
        index,
      })}
      renderItem={({ item, index }) => (
        <EpisodeCard
          episode={item}
          width={cardWidth}
          last={index === episodes.length - 1}
          {...context}
        />
      )}
    />
  );
}

interface EpisodeContext {
  seasons: TvMazeSeason[];
  timeZone: string;
  todayDate: LocalDate;
}

// PRD 5.5: landscape still, "Episode 2 of 10", title, a short summary and
// the relative day, with "Finale" on a season's last episode.
function EpisodeCard({
  episode,
  width,
  last,
  seasons,
  timeZone,
  todayDate,
}: { episode: TvMazeEpisode; width: number; last: boolean } & EpisodeContext) {
  const state = episodeState(episode, timeZone, todayDate);
  const muted = state === "upcoming";
  const dateLabel = episodeDateLabel(episode, timeZone, todayDate);
  const finale = isFinale(episode, seasons);
  const summary = plainTextSummary(episode.summary);

  return (
    <View
      testID={`episode-${state}`}
      accessible
      accessibilityLabel={[
        episodeOfLabel(episode, seasons),
        episode.name,
        dateLabel,
        finale ? "Finale" : null,
      ]
        .filter(Boolean)
        .join(", ")}
      style={[styles.card, { width }, !last && { marginRight: CARD_GAP }]}
    >
      {/* Upcoming episodes usually have no still yet: an empty frame keeps
          the cards in line, with nothing made up in it (data first). */}
      <View style={styles.still}>
        {episode.image?.medium && (
          <Image
            source={episode.image.original ?? episode.image.medium}
            style={[StyleSheet.absoluteFill, muted && styles.stillMuted]}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        )}
      </View>
      <View style={styles.cardText}>
        <View style={styles.eyebrowRow}>
          <Text style={styles.eyebrow}>{episodeOfLabel(episode, seasons)}</Text>
          {finale && <Text style={styles.finaleBadge}>Finale</Text>}
        </View>
        <Text
          style={[styles.cardTitle, muted && styles.muted]}
          numberOfLines={1}
        >
          {episode.name}
        </Text>
        {summary && (
          <Text
            style={[styles.cardSummary, muted && styles.muted]}
            numberOfLines={3}
          >
            {summary}
          </Text>
        )}
        <Text
          style={[
            styles.cardDate,
            state === "today" && styles.cardDateToday,
            muted && styles.muted,
          ]}
        >
          {dateLabel}
        </Text>
      </View>
    </View>
  );
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
  },
  summary: {
    ...type.body,
    color: t.ink,
  },
  // The full summary, laid out out of sight to count its lines.
  measure: {
    position: "absolute",
    left: 0,
    right: 0,
    opacity: 0,
  },
  moreButton: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  more: {
    ...type.meta,
    fontWeight: "600",
    color: t.ink,
  },
  episodesSection: {
    paddingTop: t.space6,
  },
  seasonPicker: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: t.contentInset,
    paddingBottom: 12,
  },
  seasonName: {
    ...type.headline,
    color: t.ink,
  },
  seasonNote: {
    ...type.meta,
    color: t.inkMuted,
    marginLeft: 4,
  },
  episodeRow: {
    paddingHorizontal: t.contentInset,
  },
  noEpisodes: {
    ...type.body,
    color: t.inkMuted,
    paddingHorizontal: t.contentInset,
  },
  card: {
    backgroundColor: t.surface,
    borderRadius: t.radiusSm,
    overflow: "hidden",
  },
  still: {
    width: "100%",
    aspectRatio: STILL_ASPECT_RATIO,
    backgroundColor: t.surfaceRaised,
  },
  stillMuted: {
    opacity: 0.5,
  },
  cardText: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eyebrow: {
    ...type.label,
    textTransform: "uppercase",
    color: t.inkMuted,
  },
  cardTitle: {
    ...type.body,
    fontWeight: "600",
    color: t.ink,
  },
  cardSummary: {
    ...type.meta,
    color: t.inkMuted,
  },
  // At the foot of the card, so the days line up across the row.
  cardDate: {
    ...type.meta,
    color: t.inkMuted,
    marginTop: "auto",
    paddingTop: 4,
  },
  cardDateToday: {
    color: t.ink,
    fontWeight: "600",
  },
  muted: {
    color: t.inkSubtle,
  },
  finaleBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: t.inkMuted,
    borderWidth: 1,
    borderColor: t.inkSubtle,
    borderRadius: t.radiusPill,
    paddingHorizontal: 6,
    paddingVertical: 1,
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
