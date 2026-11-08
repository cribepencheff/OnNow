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
  Modal,
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
  TvMazeShow,
  TvMazeShowWithEmbeds,
} from "@/api/tvmaze-types";
import { useOriginCountries } from "@/hooks/useOriginCountries";
import { useTmdbSeason } from "@/hooks/useTmdbSeason";
import { useShow } from "@/hooks/useShow";
import { useShowImages } from "@/hooks/useShowImages";
import { useToday } from "@/hooks/useToday";
import type { TmdbSeasonEpisode } from "@/api/tmdb-types";
import { episodeImage, showBackdropImage } from "@/logic/episode-image";
import { episodeSummary } from "@/logic/tmdb-episode";
import type { LocalDate } from "@/logic/local-date";
import { plainTextParagraphs, plainTextSummary } from "@/logic/search-results";
import {
  aboutFacts,
  announcedSeasonDateLabel,
  episodeBadgeLabel,
  episodeDateLabel,
  episodeMark,
  episodeOfLabel,
  episodeState,
  initialEpisodeIndex,
  initialSeasonNumber,
  regularEpisodes,
  seasonTabs,
  showDetailMetaLine,
  showDetailPill,
  type AboutFact,
  type SeasonTab,
} from "@/logic/show-detail";
import { showState, showStateLabel } from "@/logic/show-state";
import { TAB_BAR_HEIGHT } from "@/logic/tab-bar";
import { heroLayout, topScrimGradient } from "@/logic/hero-layout";
import { FloatingBackButton } from "./FloatingBackButton";
import { PillButton } from "./PillButton";
import { ShowCast } from "./ShowCast";
import { EPISODE_MARK_LABELS, EpisodeMarkDot } from "./Hero/EpisodeMarkChip";
import { ShowDetailHero } from "./ShowDetailHero";
import { ShowRating } from "./ShowRating";
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
  // CRI-143: TMDB's episodes for the season shown (stills and overviews),
  // and the show's backdrop
  // (the hero's, already fetched) for a card with no still anywhere.
  const { data: tmdbEpisodes } = useTmdbSeason(show, selectedSeason);
  const { data: showImages } = useShowImages(show);
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
        <About
          show={show}
          text={summary}
          fullText={plainTextParagraphs(show.summary) ?? summary}
          genres={show.genres ?? []}
          facts={aboutFacts(show, originCountries ?? [])}
        />
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
            seasonNumber={selectedSeason}
            episodes={seasonEpisodes}
            startIndex={startIndex}
            width={width}
            seasons={seasons}
            timeZone={timeZone}
            todayDate={todayDate}
            tmdbEpisodes={tmdbEpisodes ?? []}
            backdropPath={showImages?.highestRatedBackdrop?.file_path ?? null}
          />
        </View>
      )}

      {/* After the episodes (owner, 2026-11-08), as in Apple TV. */}
      <ShowCast showId={show.id} />

      <TvMazeCredit />
      <TmdbCredit />
    </ScrollView>
  );
}

const SUMMARY_LINES = 3;

// "About": the summary in a dark grey panel, three lines, with "More"
// opening the whole text in a sheet (owner, 2026-11-08; Apple TV as the
// reference). The full text is laid out once, out of sight, to know
// whether it runs longer; "More" shows only when it does.
function About({
  show,
  text,
  fullText,
  genres,
  facts,
}: {
  show: TvMazeShow;
  text: string;
  // The whole text with TVmaze's paragraphs kept, for the sheet.
  fullText: string;
  genres: string[];
  facts: AboutFact[];
}) {
  const [open, setOpen] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const truncated = lineCount > SUMMARY_LINES;

  return (
    <View style={styles.section} testID="show-detail-section">
      <Text style={styles.sectionHeading} accessibilityRole="header">
        About
      </Text>
      <Pressable
        testID="show-detail-about"
        style={styles.aboutPanel}
        disabled={!truncated}
        onPress={() => setOpen(true)}
        accessibilityHint={truncated ? "Shows the whole summary" : undefined}
      >
        <View>
          <Text
            style={[styles.summary, styles.measure]}
            testID="show-detail-summary-measure"
            onTextLayout={(event) =>
              setLineCount(event.nativeEvent.lines.length)
            }
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {text}
          </Text>
          <Text style={styles.summary} numberOfLines={SUMMARY_LINES}>
            {text}
          </Text>
        </View>
        {truncated && (
          // The pill of Home's "Search more" (owner, 2026-11-08).
          <View style={styles.moreSlot}>
            <PillButton label="More" onPress={() => setOpen(true)} />
          </View>
        )}
      </Pressable>
      <AboutSheet
        visible={open}
        show={show}
        text={fullText}
        genres={genres}
        facts={facts}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

// iOS's own page sheet, which can be swiped down, with a close button:
// the title, every genre (the hero's meta line shows three), the whole
// summary and the show's facts (aboutFacts), as in Apple TV.
function AboutSheet({
  visible,
  show,
  text,
  genres,
  facts,
  onClose,
}: {
  visible: boolean;
  show: TvMazeShow;
  text: string;
  genres: string[];
  facts: AboutFact[];
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet} testID="show-detail-about-sheet">
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle} accessibilityRole="header">
            {show.name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={8}
            style={styles.sheetClose}
          >
            <SymbolView
              name="xmark"
              tintColor={t.ink}
              size={14}
              weight="bold"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.sheetContent}>
          {/* TMDB's rating first, then every genre (owner, 2026-11-08). */}
          <View style={styles.sheetMetaRow} testID="show-detail-about-meta">
            <ShowRating show={show} />
            {genres.length > 0 && (
              <Text style={styles.sheetGenres}>{genres.join(", ")}</Text>
            )}
          </View>
          <Text style={styles.summary}>{text}</Text>
          {facts.length > 0 && (
            <View style={styles.facts} testID="show-detail-about-facts">
              <Text style={styles.sectionHeading} accessibilityRole="header">
                Information
              </Text>
              {facts.map((fact) => (
                <View
                  key={fact.label}
                  style={styles.fact}
                  accessible
                  accessibilityLabel={`${fact.label}, ${fact.value}`}
                >
                  <Text style={styles.factLabel}>{fact.label}</Text>
                  <Text style={styles.factValue}>{fact.value}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
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
    </Pressable>
  );
}

const CARD_GAP = 12;
// An episode card's line when neither TVmaze nor TMDB has a summary.
export const NO_OVERVIEW = "No overview available.";
// How much of the card's width the screen gives it: the next card shows at
// the edge, to say the row scrolls (Apple TV).
const CARD_WIDTH_SHARE = 0.78;

// FR-032, PRD 5.5: the season's episodes as cards to swipe through, in
// place of the latest and next cards (owner, 2026-11-08). Each card shows
// its own relative day, so the latest one out and the next one need no
// label of their own; upcoming episodes are muted. Never a time of day
// (ADR 0001). Specials are never listed (FR-037).
function EpisodeRow({
  seasonNumber,
  episodes,
  startIndex,
  width,
  ...context
}: {
  seasonNumber: number | undefined;
  episodes: TvMazeEpisode[];
  startIndex: number;
  width: number;
} & EpisodeContext) {
  const cardWidth = Math.round(width * CARD_WIDTH_SHARE);
  const interval = cardWidth + CARD_GAP;

  if (episodes.length === 0) {
    // An announced season TVmaze lists no episodes for (FR-033): one card
    // in an episode card's shape, so it reads as a season coming, as a
    // listed "TBA" episode does (owner, 2026-11-08).
    return seasonNumber !== undefined ? (
      <View style={styles.episodeRow}>
        <AnnouncedSeasonCard
          seasonNumber={seasonNumber}
          width={cardWidth}
          {...context}
        />
      </View>
    ) : null;
  }

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

// The card for an announced season without episodes: the show's backdrop,
// dimmed as everything upcoming is, an "Announced" badge, "Season 3", "No
// episodes yet." and the premiere day or "TBA".
function AnnouncedSeasonCard({
  seasonNumber,
  width,
  seasons,
  todayDate,
  backdropPath,
}: { seasonNumber: number; width: number } & EpisodeContext) {
  const image = showBackdropImage(backdropPath);
  const dateLabel = announcedSeasonDateLabel(
    seasons.find((season) => season.number === seasonNumber),
    todayDate,
  );
  const title = `Season ${seasonNumber}`;

  return (
    <View
      testID="announced-season-card"
      accessible
      accessibilityLabel={`${title}, Announced, No episodes yet, ${dateLabel}`}
      style={[styles.card, { width }]}
    >
      <View
        style={[styles.still, image && styles.stillBehindImage]}
        testID="episode-image-frame"
      >
        {image && (
          <Image
            source={image.uri}
            style={[StyleSheet.absoluteFill, styles.stillMuted]}
            contentFit="cover"
            accessibilityIgnoresInvertColors
            testID="episode-show-image"
          />
        )}
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Announced</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardText}>
        <Text style={[styles.cardTitle, styles.muted]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.cardSummary, styles.muted]} numberOfLines={3}>
          No episodes yet.
        </Text>
        <Text style={[styles.cardDate, styles.muted]}>{dateLabel}</Text>
      </View>
    </View>
  );
}

interface EpisodeContext {
  seasons: TvMazeSeason[];
  timeZone: string;
  todayDate: LocalDate;
  tmdbEpisodes: TmdbSeasonEpisode[];
  backdropPath: string | null;
}

// PRD 5.5: landscape still with the episode's number ("E3") in its
// corner, and "Finale" on a season's last episode; then title, a short
// summary and the relative day. "Episode 2 of 10" is the card's spoken
// label.
function EpisodeCard({
  episode,
  width,
  last,
  seasons,
  timeZone,
  todayDate,
  tmdbEpisodes,
  backdropPath,
}: { episode: TvMazeEpisode; width: number; last: boolean } & EpisodeContext) {
  const state = episodeState(episode, timeZone, todayDate);
  const muted = state === "upcoming";
  const dateLabel = episodeDateLabel(episode, timeZone, todayDate);
  const mark = episodeMark(episode, seasons);
  const summary = episodeSummary(episode, tmdbEpisodes);
  const image = episodeImage(episode, tmdbEpisodes, backdropPath);
  const badge = episodeBadgeLabel(episode);

  return (
    <View
      testID={`episode-${state}`}
      accessible
      accessibilityLabel={[
        episodeOfLabel(episode, seasons),
        episode.name,
        dateLabel,
        mark ? EPISODE_MARK_LABELS[mark] : null,
      ]
        .filter(Boolean)
        .join(", ")}
      style={[styles.card, { width }, !last && { marginRight: CARD_GAP }]}
    >
      {/* The episode's still, else the show's backdrop (episodeImage);
          with neither, an empty frame keeps the cards in line, with
          nothing made up in it (data first). Only an upcoming episode is
          dimmed, as a hint that it is coming (owner, 2026-11-08). */}
      <View
        style={[styles.still, image && styles.stillBehindImage]}
        testID="episode-image-frame"
      >
        {image && (
          <Image
            source={image.uri}
            testID={image.showImage ? "episode-show-image" : "episode-still"}
            style={[StyleSheet.absoluteFill, muted && styles.stillMuted]}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        )}
        {/* The episode's number in the corner, as in PlayPilot, and
            Premiere or Finale beside it with the dot of Home's chip
            (owner, 2026-11-08). Never dimmed. */}
        {(badge || mark) && (
          <View style={styles.badges}>
            {badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>{badge}</Text>
              </View>
            )}
            {mark && (
              <View style={styles.badge} testID={`episode-mark-${mark}`}>
                <EpisodeMarkDot mark={mark} />
                <Text style={styles.badgeLabel}>
                  {EPISODE_MARK_LABELS[mark]}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
      <View style={styles.cardText}>
        <Text
          style={[styles.cardTitle, muted && styles.muted]}
          numberOfLines={1}
        >
          {episode.name}
        </Text>
        {/* Without a summary from TVmaze or TMDB, a quiet line says so
            rather than leaving a gap (owner, 2026-11-08). */}
        <Text
          style={[styles.cardSummary, (muted || !summary) && styles.muted]}
          numberOfLines={3}
          testID={summary ? undefined : "episode-no-overview"}
        >
          {summary ?? NO_OVERVIEW}
        </Text>
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

const SHEET_CLOSE_SIZE = 30;

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
  // The heading over a section, as the season's ("About", "Season 6").
  sectionHeading: {
    ...type.headline,
    color: t.ink,
    marginBottom: 12,
  },
  aboutPanel: {
    backgroundColor: t.surface,
    borderRadius: t.radiusSm,
    padding: t.space4,
  },
  // Under the text, at the panel's right edge, as "Search more" ends its
  // row.
  moreSlot: {
    alignItems: "flex-end",
    marginTop: 8,
  },
  sheet: {
    flex: 1,
    backgroundColor: t.surface,
  },
  // The close button stays in the top corner when a long title wraps
  // (owner, 2026-11-08).
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: t.contentInset,
    paddingTop: t.space6,
    paddingBottom: 12,
  },
  sheetTitle: {
    ...type.headline,
    color: t.ink,
    flex: 1,
    // Centres the first line (25) on the 30 high button.
    paddingTop: (SHEET_CLOSE_SIZE - type.headline.lineHeight) / 2,
  },
  sheetClose: {
    width: SHEET_CLOSE_SIZE,
    height: SHEET_CLOSE_SIZE,
    borderRadius: SHEET_CLOSE_SIZE / 2,
    backgroundColor: t.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetContent: {
    paddingHorizontal: t.contentInset,
    paddingBottom: t.space10,
    gap: 12,
  },
  sheetMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  sheetGenres: {
    ...type.meta,
    color: t.inkMuted,
  },
  facts: {
    paddingTop: t.space6,
  },
  fact: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.hairline,
    gap: 2,
  },
  factLabel: {
    ...type.meta,
    color: t.inkMuted,
  },
  factValue: {
    ...type.body,
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
  episodeRow: {
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
  // Behind an image, black, so a dimmed image darkens rather than greys
  // (owner, 2026-11-08).
  stillBehindImage: {
    backgroundColor: t.imageDimBackdrop,
  },
  // An upcoming episode's image, whatever it is: darker than the rest,
  // as a hint that it is coming (owner, 2026-11-08).
  stillMuted: {
    opacity: 0.5,
  },
  cardText: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  // Over the image's top left corner.
  badges: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    gap: 6,
  },
  // A small control's material on an image (image-control-backdrop), so
  // it reads on light and busy stills.
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: t.imageControlBackdrop,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeLabel: {
    ...type.label,
    color: t.ink,
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
  // Below the floating header.
  quietLine: {
    ...type.body,
    textAlign: "center",
    color: t.inkMuted,
    paddingHorizontal: t.space10,
    paddingTop: 120,
  },
});
