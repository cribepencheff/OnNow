// Show detail's hero (CRI-143): the Home hero slide as its reference, at
// the same height and with the same vertical layout (heroLayout), for one
// show and without the pager. The backdrop is mirrored above and below and
// blurred into the page as on Home (ImageColumn, ProgressiveBlur); over it,
// centred, the status pill (showDetailPill), the logo or title, the rating
// with the meta line, and "Open in" with the follow circle beside it. The
// Home hero itself is left as it is: this reuses its pieces, never changes
// them.

import MaskedView from "@react-native-masked-view/masked-view";
import { Image } from "expo-image";
import { useCallback } from "react";
import {
  PixelRatio,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  IMAGE_BASE,
  LARGE_BACKDROP_FALLBACK_SIZE,
  LARGE_BACKDROP_SIZE,
} from "@/api/tmdb-types";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import { useFallbackUri } from "@/hooks/useFallbackUri";
import { useFollowToggle } from "@/hooks/useFollowList";
import { openExternalUrl } from "@/hooks/useGuardedRouter";
import { useShowImages } from "@/hooks/useShowImages";
import { useStreamingService } from "@/hooks/useStreamingService";
import { heroAvailability, type HeroAvailability } from "@/logic/hero-carousel";
import {
  CONTENT_GAP,
  EPISODE_LINE_HEIGHT,
  NOTE_LINE,
  PILL_HEIGHT,
  TITLE_BLOCK_HEIGHT,
  TITLE_GAP,
  heroImageSize,
} from "@/logic/hero-layout";
import { chooseShowImage } from "@/logic/show-image";
import {
  openInAccessibilityLabel,
  streamingOnLabel,
} from "@/logic/streaming-service";
import { t, type } from "@/theme/tokens";
import { DatePill } from "./Hero/DatePill";
import { ImageColumn, useHeroLayout } from "./Hero/HeroPage";
import { FADE_GRADIENT, MIRROR_BLUR_INTENSITY } from "./Hero/HeroPager";
import { NoImage } from "./NoImage";
import { PaidSubscriptionMarker } from "./PaidSubscriptionMarker";
import { PosterFollowCircle } from "./PosterFollowCircle";
import { ProgressiveBlur, ProgressiveMask } from "./ProgressiveBlur";
import { ServiceLogo } from "./ServiceLogo";
import { ShowRating } from "./ShowRating";

// As on the Home hero (HeroPage): the blurred copies' small source and
// how strongly they blur, and the service logo in the button.
const BLURRED_COPY_SIZE = "w300";
const ANDROID_MIRROR_BLUR_RADIUS = 12;
const TOP_MIRROR_BLUR_RADIUS = 12;
const SERVICE_LOGO_SIZE = 28;

export function ShowDetailHero({
  show,
  width,
  pill,
  metaLine,
}: {
  show: TvMazeShowWithEmbeds;
  width: number;
  // showDetailPill's label, or null for no pill.
  pill: string | null;
  metaLine: string;
}) {
  const {
    heroHeight,
    imageTop,
    imageHeight,
    blurTop,
    topBlurHeight,
    topBlurFullTo,
    contentTop,
  } = useHeroLayout();
  const { data: images, isLoading: imagesLoading } = useShowImages(show);
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

  // The same image as the show's Home slide: the highest-rated backdrop,
  // else TVmaze's poster from the top, else "No image" (ADR 0012, CRI-100).
  // Nothing while TMDB's answer is on its way, so a poster never flashes in
  // before the backdrop.
  const shown = imagesLoading
    ? null
    : chooseShowImage(
        images?.highestRatedBackdrop,
        show.image,
        images?.posterPath,
      );
  const tmdbPath = shown?.kind === "tmdb" ? shown.path : undefined;
  const smallUri =
    shown?.kind === "tmdb"
      ? `${IMAGE_BASE}/${BLURRED_COPY_SIZE}${shown.path}`
      : shown?.kind === "poster"
        ? shown.small
        : undefined;
  // No pager here, so no parallax overscan: the column is centred in the
  // screen's width, zoomed to fit the box's height, never narrower than the
  // screen.
  const boxHeight = imageHeight - imageTop;
  const aspectRatio = shown?.kind === "tmdb" ? shown.aspectRatio : 2 / 3;
  const crop = shown?.kind === "poster" ? "top" : "center";
  const columnWidth = Math.max(width, boxHeight * aspectRatio);
  const columnLeft = (width - columnWidth) / 2;
  const imageSize = heroImageSize(columnWidth, boxHeight, PixelRatio.get());
  const sharpImage = useFallbackUri(
    shown?.kind === "poster"
      ? shown.sharp
      : tmdbPath && `${IMAGE_BASE}/${imageSize}${tmdbPath}`,
    tmdbPath && imageSize === LARGE_BACKDROP_SIZE
      ? `${IMAGE_BASE}/${LARGE_BACKDROP_FALLBACK_SIZE}${tmdbPath}`
      : undefined,
  );
  const { onError: tryFallback } = sharpImage;
  const handleError = useCallback(() => {
    tryFallback();
  }, [tryFallback]);
  const logo = images?.logo;

  return (
    <View
      style={[styles.hero, { width, height: heroHeight }]}
      testID="show-detail-hero"
    >
      {shown?.kind === "none" && (
        <NoImage
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: imageHeight,
          }}
        />
      )}
      {smallUri && (
        <View
          pointerEvents="none"
          style={[styles.column, { width, height: imageHeight }]}
          testID="show-detail-backdrop"
        >
          <ImageColumn
            uri={sharpImage.uri ?? smallUri}
            placeholder={smallUri}
            contentPosition={crop}
            width={columnWidth}
            left={columnLeft}
            imageTop={imageTop}
            boxHeight={boxHeight}
            onError={handleError}
          />
          {Platform.OS === "android" && (
            <MaskedView
              pointerEvents="none"
              style={{
                position: "absolute",
                top: blurTop,
                left: 0,
                width,
                height: heroHeight - blurTop,
              }}
              maskElement={
                <ProgressiveMask
                  fullAt={(imageHeight - blurTop) / (heroHeight - blurTop)}
                />
              }
            >
              <View style={{ position: "absolute", top: -blurTop, left: 0 }}>
                <ImageColumn
                  uri={smallUri}
                  contentPosition={crop}
                  width={columnWidth}
                  left={columnLeft}
                  imageTop={imageTop}
                  boxHeight={boxHeight}
                  blurRadius={ANDROID_MIRROR_BLUR_RADIUS}
                />
              </View>
            </MaskedView>
          )}
          <MaskedView
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width,
              height: topBlurHeight,
            }}
            maskElement={
              <ProgressiveMask
                fullAt={(topBlurHeight - topBlurFullTo) / topBlurHeight}
                strongAt="top"
              />
            }
          >
            <ImageColumn
              uri={smallUri}
              contentPosition={crop}
              width={columnWidth}
              left={columnLeft}
              imageTop={imageTop}
              boxHeight={boxHeight}
              blurRadius={TOP_MIRROR_BLUR_RADIUS}
            />
          </MaskedView>
        </View>
      )}

      {/* The Home hero's lower blur and fade into bg (HeroPager). */}
      <ProgressiveBlur
        intensity={MIRROR_BLUR_INTENSITY}
        fullAt={(imageHeight - blurTop) / (heroHeight - blurTop)}
        style={{
          position: "absolute",
          left: 0,
          width,
          top: blurTop,
          height: heroHeight - blurTop,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          width,
          top: blurTop,
          height: heroHeight - blurTop + 1,
          experimental_backgroundImage: FADE_GRADIENT,
        }}
      />

      <View
        style={[styles.content, { top: contentTop }]}
        testID="show-detail-hero-content"
      >
        {/* Reserved with or without a pill, so the title sits where it
            does on Home. */}
        <View style={styles.pillRow} testID="show-detail-pill-row">
          {pill && <DatePill label={pill} />}
        </View>
        <View style={styles.titleRoom}>
          <View style={styles.titleBlock}>
            {logo ? (
              <Image
                source={`${IMAGE_BASE}/w500${logo.file_path}`}
                style={styles.logo}
                contentFit="contain"
                contentPosition="center"
                accessibilityLabel={show.name}
                testID="show-detail-logo"
              />
            ) : (
              <Text style={styles.displayTitle} numberOfLines={2}>
                {show.name}
              </Text>
            )}
          </View>
        </View>
        {/* Where Home has the episode line: the rating and the meta line
            (FR-028, ADR 0018). */}
        <View style={styles.metaRow} testID="show-detail-meta-row">
          <ShowRating show={show} textStyle={styles.metaText} />
          {metaLine !== "" && (
            <Text style={[styles.metaText, styles.metaLine]} numberOfLines={1}>
              {metaLine}
            </Text>
          )}
        </View>
        <ActionSlot availability={availability} showId={show.id} />
      </View>
    </View>
  );
}

// Home's "Open in" slot (OpenInSlot) with the follow circle beside the
// button, as tall as it (owner, CRI-143). Without a button the circle
// stands alone, centred, and the note says where the show streams.
function ActionSlot({
  availability,
  showId,
}: {
  availability: HeroAvailability;
  showId: number;
}) {
  const { buttonHeight, openInMargin } = useHeroLayout();
  const { followed, toggle } = useFollowToggle(showId);
  const capsule = { height: buttonHeight, borderRadius: buttonHeight / 2 };

  const note =
    availability.kind === "button" ? (
      availability.link.requires ? (
        <PaidSubscriptionMarker
          channel={availability.link.requires}
          color={t.inkMuted}
          textStyle={styles.availabilityNote}
        />
      ) : (
        <Text style={styles.streamingOnNote} numberOfLines={1}>
          {streamingOnLabel(availability.link.service)}
        </Text>
      )
    ) : availability.kind === "text" ? (
      <Text
        style={styles.availabilityNote}
        numberOfLines={1}
        testID="show-detail-availability"
      >
        {availability.label}
      </Text>
    ) : null;

  return (
    <View style={{ marginTop: openInMargin, height: buttonHeight + NOTE_LINE }}>
      <View style={styles.actionRow}>
        {availability.kind === "loading" && (
          <View style={[styles.buttonPlaceholder, styles.grow, capsule]} />
        )}
        {availability.kind === "button" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={openInAccessibilityLabel(availability.link)}
            onPress={() => openExternalUrl(availability.link.url)}
            style={[styles.button, styles.grow, capsule]}
            testID="show-detail-open-in"
          >
            {availability.link.logoPath ? (
              <>
                <Text style={styles.buttonLabel}>Open in</Text>
                <ServiceLogo
                  logoPath={availability.link.logoPath}
                  size={SERVICE_LOGO_SIZE}
                />
              </>
            ) : (
              <Text style={styles.buttonLabel}>
                Open in {availability.link.service}
              </Text>
            )}
          </Pressable>
        )}
        <PosterFollowCircle
          followed={followed}
          onPress={toggle}
          size={buttonHeight}
          testID="show-detail-follow"
        />
      </View>
      {note && <View style={styles.note}>{note}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  // Clips the column, which can be wider than the screen.
  hero: {
    overflow: "hidden",
  },
  column: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  content: {
    position: "absolute",
    left: t.contentInset,
    right: t.contentInset,
    gap: CONTENT_GAP,
  },
  pillRow: {
    height: PILL_HEIGHT,
    flexDirection: "row",
    justifyContent: "center",
  },
  titleRoom: {
    marginVertical: TITLE_GAP - CONTENT_GAP,
  },
  titleBlock: {
    height: TITLE_BLOCK_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 240,
    maxWidth: "100%",
    height: 88,
  },
  displayTitle: {
    ...type.display,
    fontSize: 40,
    lineHeight: 44,
    color: t.ink,
    textAlign: "center",
  },
  // One line, centred, as Home's episode line: the rating first, then the
  // meta line, which gives way with an ellipsis.
  metaRow: {
    height: EPISODE_LINE_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.space2,
  },
  metaText: {
    ...type.meta,
    color: t.ink,
  },
  metaLine: {
    flexShrink: 1,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: t.space2,
  },
  grow: {
    flex: 1,
  },
  note: {
    marginTop: 8,
    alignItems: "center",
  },
  button: {
    flexDirection: "row",
    gap: 8,
    borderCurve: "continuous",
    backgroundColor: t.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    ...type.button,
    color: t.bg,
  },
  buttonPlaceholder: {
    borderCurve: "continuous",
    backgroundColor: t.surfaceRaised,
  },
  availabilityNote: {
    ...type.meta,
    color: t.inkMuted,
    textAlign: "center",
  },
  streamingOnNote: {
    ...type.meta,
    fontSize: 12,
    lineHeight: 16,
    color: t.inkMuted,
    textAlign: "center",
  },
});
