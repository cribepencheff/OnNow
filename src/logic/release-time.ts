// When an episode is released, as the airstamp the rest of the app reads
// (ADR 0006). TVmaze gives streaming episodes no airtime and fills the
// airstamp with a placeholder time, so a release in the US evening lands
// a day early in Europe. Disney+ releases its series at 6 p.m. Pacific on
// the airdate (ADR 0020), so its episodes without an airtime get that
// time. Every other episode keeps TVmaze's airstamp.
//
// Applied when a show is read (the show queries' `select`), not when it
// is fetched: the saved show cache keeps TVmaze's answer as it came, so
// a change here needs no new cache key and no refetch of every show.

import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";

export const DISNEY_PLUS_WEB_CHANNEL_ID = 287;

const DISNEY_PLUS_RELEASE_HOUR = 18;
const DISNEY_PLUS_TIME_ZONE = "America/Los_Angeles";
// Pacific standard time is UTC−8; daylight time is an hour less.
const PACIFIC_STANDARD_OFFSET_HOURS = 8;
const HOUR_MS = 60 * 60 * 1000;

const pacificHour = new Intl.DateTimeFormat("en-US", {
  timeZone: DISNEY_PLUS_TIME_ZONE,
  hour: "numeric",
  hourCycle: "h23",
});

export interface ReleaseFields {
  airdate: string;
  airtime: string;
  airstamp: string;
}

export function releaseAirstamp(
  episode: ReleaseFields,
  webChannelId: number | null,
): string {
  const [year, month, day] = episode.airdate.split("-").map(Number);
  if (
    webChannelId !== DISNEY_PLUS_WEB_CHANNEL_ID ||
    episode.airtime !== "" ||
    !year ||
    !month ||
    !day
  ) {
    return episode.airstamp;
  }
  let release = Date.UTC(
    year,
    month - 1,
    day,
    DISNEY_PLUS_RELEASE_HOUR + PACIFIC_STANDARD_OFFSET_HOURS,
  );
  if (Number(pacificHour.format(release)) !== DISNEY_PLUS_RELEASE_HOUR) {
    release -= HOUR_MS;
  }
  return new Date(release).toISOString();
}

export function withReleaseTimes(
  show: TvMazeShowWithEmbeds,
): TvMazeShowWithEmbeds {
  const webChannelId = show.webChannel?.id ?? null;
  if (webChannelId !== DISNEY_PLUS_WEB_CHANNEL_ID) {
    return show;
  }
  return {
    ...show,
    _embedded: {
      ...show._embedded,
      episodes: show._embedded.episodes.map((episode) => ({
        ...episode,
        airstamp: releaseAirstamp(episode, webChannelId),
      })),
    },
  };
}
