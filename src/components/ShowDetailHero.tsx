// Show detail's hero (CRI-143): the Home hero slide as its reference, at
// the same height and with the same vertical layout (heroLayout), for one
// show and without the pager. The backdrop is mirrored above and below and
// blurred into the page as on Home (ImageColumn, ProgressiveBlur); over it,
// centred, the status pill (showDetailPill), the logo or title, the rating
// with the meta line, and "Open in" with the follow button beside it. The
// Home hero itself is left as it is: this reuses its pieces, never changes
// them.

import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import {
  Animated,
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
import { useAccessibilityFlags } from "@/hooks/useAccessibilityFlags";
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
import { followHaptic } from "./followHaptic";
import { FOLLOW_CHECK_SYMBOL, FOLLOW_PLUS_SYMBOL } from "./followSymbols";
import { DatePill } from "./Hero/DatePill";
import { ImageColumn, useHeroLayout } from "./Hero/HeroPage";
import { FADE_GRADIENT, MIRROR_BLUR_INTENSITY } from "./Hero/HeroPager";
import { NoImage } from "./NoImage";
import { PaidSubscriptionMarker } from "./PaidSubscriptionMarker";
import { ProgressiveBlur, ProgressiveMask } from "./ProgressiveBlur";
import { ServiceLogo } from "./ServiceLogo";
import { ShowRating } from "./ShowRating";

// As on the Home hero (HeroPage): the blurred copies' small source and
// how strongly they blur, and the service logo in the button.
const BLURRED_COPY_SIZE = "w300";
const ANDROID_MIRROR_BLUR_RADIUS = 12;
const TOP_MIRROR_BLUR_RADIUS = 12;
const SERVICE_LOGO_SIZE = 28;
// "Open in" and the follow circle together are as wide as the logo's box
// above (owner, CRI-143; Apple TV's are 238), so the hero reads as one
// narrow column. "Open in" takes what the circle and the gap leave (176
// with the 52 circle), and keeps that width when the follow button stands
// alone. Narrower when the screen leaves less room.
const ACTION_GROUP_WIDTH = 240;
// Between "Open in" and the circle, as in Apple TV.
const ACTION_GAP = 12;

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

// Home's "Open in" slot (OpenInSlot) with the follow button beside it, a
// circle as tall as the button (owner, CRI-143). Without a button the
// follow button takes its place, with its words, and the note says where
// the show streams.
function ActionSlot({
  availability,
  showId,
}: {
  availability: HeroAvailability;
  showId: number;
}) {
  const { buttonHeight, openInMargin } = useHeroLayout();
  const capsule = { height: buttonHeight, borderRadius: buttonHeight / 2 };
  // The circle sits beside a button or its placeholder; otherwise the
  // follow button stands alone and says what it does.
  const alone = availability.kind === "none" || availability.kind === "text";

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
    <View
      style={[
        styles.actionRow,
        { marginTop: openInMargin, height: buttonHeight + NOTE_LINE },
      ]}
    >
      {/* The main button and the note under it, centred on the button
          (owner, CRI-143); the circle beside them, the two centred
          together. */}
      <View
        style={[
          styles.mainAction,
          { width: ACTION_GROUP_WIDTH - ACTION_GAP - buttonHeight },
        ]}
        testID="show-detail-main-action"
      >
        {availability.kind === "loading" && (
          <View style={[styles.buttonPlaceholder, capsule]} />
        )}
        {availability.kind === "button" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={openInAccessibilityLabel(availability.link)}
            onPress={() => openExternalUrl(availability.link.url)}
            style={[styles.button, capsule]}
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
        {alone && <FollowButton showId={showId} height={buttonHeight} alone />}
        {note && <View style={styles.note}>{note}</View>}
      </View>
      {!alone && (
        <FollowButton showId={showId} height={buttonHeight} alone={false} />
      )}
    </View>
  );
}

// FR-029: one toggle that stays in place, so an unfollow is undone by
// tapping again. Beside "Open in" a circle with a plus, or a check once
// followed, the same symbols as the poster cards' circle; alone, a capsule
// with the words as well. Light over a blur (heroSecondaryAction), followed
// or not.
function FollowButton({
  showId,
  height,
  alone,
}: {
  showId: number;
  height: number;
  alone: boolean;
}) {
  const { followed, toggle } = useFollowToggle(showId);
  const label = followed ? "Following" : "Follow";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={followed ? "Unfollows the show" : undefined}
      accessibilityState={{ selected: followed }}
      onPress={() => {
        followHaptic(!followed);
        toggle();
      }}
      style={[
        styles.followButton,
        { height, borderRadius: height / 2 },
        alone ? null : { width: height },
      ]}
      testID="show-detail-follow"
    >
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.followFill]} />
      <FollowMorph
        followed={followed}
        size={Math.round(height * FOLLOW_ICON_SHARE)}
      />
      {alone && <Text style={styles.followLabel}>{label}</Text>}
    </Pressable>
  );
}

// The follow symbol's share of the button's height, as on the poster
// cards' circle (15 in 32).
const FOLLOW_ICON_SHARE = 15 / 32;

// The poster cards' morph (PosterFollowCircle): the plus and the check
// overlaid, crossfading and scaling on the same spring, so the two never
// fall out of step. At once under Reduce Motion.
function FollowMorph({ followed, size }: { followed: boolean; size: number }) {
  const { reduceMotionEnabled } = useAccessibilityFlags();
  const [progress] = useState(() => new Animated.Value(followed ? 1 : 0));
  useEffect(() => {
    if (reduceMotionEnabled) {
      progress.setValue(followed ? 1 : 0);
      return;
    }
    Animated.spring(progress, {
      toValue: followed ? 1 : 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 260,
      mass: 0.6,
    }).start();
  }, [followed, reduceMotionEnabled, progress]);
  const icon = (
    symbol: typeof FOLLOW_PLUS_SYMBOL | typeof FOLLOW_CHECK_SYMBOL,
    shownAt: 0 | 1,
  ) => (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.morphIcon,
        {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: shownAt === 1 ? [0, 1] : [1, 0],
          }),
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: shownAt === 1 ? [0.5, 1] : [1, 0.5],
              }),
            },
          ],
        },
      ]}
    >
      <SymbolView name={symbol} tintColor={t.ink} size={size} />
    </Animated.View>
  );
  return (
    <View style={{ width: size, height: size }}>
      {icon(FOLLOW_PLUS_SYMBOL, 0)}
      {icon(FOLLOW_CHECK_SYMBOL, 1)}
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
    gap: ACTION_GAP,
  },
  mainAction: {
    flexShrink: 1,
  },
  followButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.imageControlEdge,
    // Clips the blur to the button's shape.
    overflow: "hidden",
  },
  morphIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  followFill: {
    backgroundColor: t.heroSecondaryAction,
  },
  followLabel: {
    ...type.button,
    color: t.ink,
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
