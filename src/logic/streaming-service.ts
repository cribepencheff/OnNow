// "Open in [service]" for every show that can be streamed in the user's
// region (FR-014, FR-017, ADR 0004, ADR 0014). TMDB's watch providers for
// the region (data from JustWatch, spike 0002) say which service carries
// the show. Pay-TV never counts; add-on channels open their host; any other
// streaming service without a start page opens TMDB's where-to-watch page
// (CRI-90).

import { regionNameInSentence } from "./regions";
import { serviceLink, type ServiceLink } from "./service-link";

export interface StreamingProvider {
  providerId: number;
  providerName: string;
  // TMDB's where-to-watch page for the show in this region (CRI-90).
  watchLink?: string;
}

// The parts of TMDB's responses this app reads, as returned.
interface TmdbFindResponse {
  tv_results?: { id: number }[];
}

interface TmdbProvider {
  provider_id: number;
  provider_name: string;
}

interface TmdbRegionProviders {
  link?: string;
  flatrate?: TmdbProvider[];
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}

interface TmdbProvidersResponse {
  results?: Record<string, TmdbRegionProviders>;
}

export function tmdbTvId(find: TmdbFindResponse): number | null {
  return find.tv_results?.[0]?.id ?? null;
}

// A region's services for a show: subscription ("flatrate") first, then
// free, then free with ads, each in TMDB's own order. Rent and buy are left
// out.
export function regionProviders(
  providers: TmdbProvidersResponse,
  region: string,
): StreamingProvider[] {
  const inRegion = providers.results?.[region];
  if (!inRegion) {
    return [];
  }
  return [
    ...(inRegion.flatrate ?? []),
    ...(inRegion.free ?? []),
    ...(inRegion.ads ?? []),
  ].map((provider) => ({
    providerId: provider.provider_id,
    providerName: provider.provider_name,
    ...(inRegion.link ? { watchLink: inRegion.link } : {}),
  }));
}

interface KnownService {
  service: string;
  // An https start page: iOS opens the service's app when it is installed,
  // and the website otherwise (universal links).
  startPage: string;
}

// TMDB provider IDs, with the service's own name. Start pages carry no
// country: the services send visitors to their local site. Each was checked
// to load (CRI-90); TMDB has several IDs for some services.
const PRIME_VIDEO = {
  service: "Prime Video",
  startPage: "https://www.primevideo.com",
};
const NETFLIX = { service: "Netflix", startPage: "https://www.netflix.com" };
const PARAMOUNT = {
  service: "Paramount+",
  startPage: "https://www.paramountplus.com",
};
const PEACOCK = { service: "Peacock", startPage: "https://www.peacocktv.com" };
const ITVX = { service: "ITVX", startPage: "https://www.itv.com" };
const DISCOVERY = {
  service: "discovery+",
  startPage: "https://www.discoveryplus.com",
};
const KNOWN_SERVICES: Record<number, KnownService> = {
  8: NETFLIX,
  1796: NETFLIX,
  9: PRIME_VIDEO,
  119: PRIME_VIDEO,
  613: PRIME_VIDEO,
  2100: PRIME_VIDEO,
  337: { service: "Disney+", startPage: "https://www.disneyplus.com" },
  350: { service: "Apple TV", startPage: "https://tv.apple.com" },
  1899: { service: "HBO Max", startPage: "https://www.hbomax.com" },
  1773: { service: "SkyShowtime", startPage: "https://www.skyshowtime.com" },
  76: { service: "Viaplay", startPage: "https://viaplay.com" },
  493: { service: "SVT Play", startPage: "https://www.svtplay.se" },
  1944: { service: "TV4 Play", startPage: "https://www.tv4play.se" },
  300: { service: "Pluto TV", startPage: "https://pluto.tv" },
  151: { service: "BritBox", startPage: "https://www.britbox.com" },
  223: { service: "hayu", startPage: "https://www.hayu.com" },
  11: { service: "MUBI", startPage: "https://mubi.com" },
  531: PARAMOUNT,
  2303: PARAMOUNT,
  2616: PARAMOUNT,
  // United States
  15: { service: "Hulu", startPage: "https://www.hulu.com" },
  386: PEACOCK,
  387: PEACOCK,
  43: { service: "Starz", startPage: "https://www.starz.com" },
  526: { service: "AMC+", startPage: "https://www.amcplus.com" },
  520: DISCOVERY,
  510: DISCOVERY,
  524: DISCOVERY,
  207: {
    service: "The Roku Channel",
    startPage: "https://therokuchannel.roku.com",
  },
  73: { service: "Tubi", startPage: "https://tubitv.com" },
  // United Kingdom
  39: { service: "NOW", startPage: "https://www.nowtv.com" },
  38: { service: "BBC iPlayer", startPage: "https://www.bbc.co.uk/iplayer" },
  41: ITVX,
  2300: ITVX,
  103: { service: "Channel 4", startPage: "https://www.channel4.com" },
  333: { service: "5", startPage: "https://www.channel5.com" },
};

// Pay-TV, operator bundles and network apps that need a TV provider login.
// They are never offered as a streaming service: no button, no text.
const PAY_TV = new Set([
  257, // fuboTV
  2528, // YouTube TV
  2383, // Philo
  1809, // Sling TV
  467, // DIRECTV GO
  486, // Spectrum On Demand
  29, // Sky Go
  497, // Tele2 Play
  553, // Telia Play
  1961, // Allente
  365, // Bravo TV
  123, // FXNow
  80, // AMC
  156, // A&E
  157, // Lifetime
]);

// Add-on channels sold inside another service, as TMDB names them
// ("Hayu Amazon Channel"): the channel opens in the host's app.
const HOSTS: { suffix: RegExp; host: KnownService }[] = [
  { suffix: / Amazon Channel$/i, host: PRIME_VIDEO },
  { suffix: / Apple TV channel$/i, host: KNOWN_SERVICES[350] },
  { suffix: / Roku Premium Channel$/i, host: KNOWN_SERVICES[207] },
];

// The channel by its own name where we know it ("Hayu" is "hayu").
const CHANNEL_NAMES: Record<string, string> = Object.fromEntries(
  Object.values(KNOWN_SERVICES).map((known) => [
    known.service.toLowerCase(),
    known.service,
  ]),
);

function addOnChannel(
  provider: StreamingProvider,
): { name: string; host: KnownService } | null {
  for (const { suffix, host } of HOSTS) {
    if (suffix.test(provider.providerName)) {
      const channel = provider.providerName.replace(suffix, "");
      const name = CHANNEL_NAMES[channel.toLowerCase()] ?? channel;
      return { name: `${name} via ${host.service}`, host };
    }
  }
  return null;
}

function isStreaming(provider: StreamingProvider): boolean {
  return !PAY_TV.has(provider.providerId);
}

// One service per show for now (ADR 0004); the menu for several services
// (FR-015) is MVP. In order: the show's own page when TVmaze's official
// site is on a known service, then a known service's start page, then an
// add-on channel's host, then TMDB's where-to-watch page (CRI-90). Within
// each, TMDB's order.
export function openInLink(
  providers: StreamingProvider[],
  officialSite: string | null,
): ServiceLink | null {
  const streaming = providers.filter(isStreaming);
  const known = streaming
    .map((provider) => KNOWN_SERVICES[provider.providerId])
    .filter((service): service is KnownService => service !== undefined);

  const direct = serviceLink(officialSite);
  if (direct && known.some((service) => service.service === direct.service)) {
    return direct;
  }
  if (known[0]) {
    return { service: known[0].service, url: known[0].startPage };
  }

  for (const provider of streaming) {
    const channel = addOnChannel(provider);
    if (channel) {
      return { service: channel.name, url: channel.host.startPage };
    }
  }

  const other = streaming.find((provider) => provider.watchLink);
  return other?.watchLink
    ? { service: other.providerName, url: other.watchLink, viaTmdb: true }
    : null;
}

// The button's words: the service, or TMDB's page when that is where it
// goes (CRI-90).
export function openInLabel(link: ServiceLink): string {
  return link.viaTmdb ? "Where to watch" : `Open in ${link.service}`;
}

// When there is no "Open in" button, a quiet text says what TMDB's data
// for the region (from JustWatch) shows, and nothing more (data first, CRI-84): no
// service at all, or the first service TMDB lists, in TMDB's own name, when
// it is not in the link table (Pluto TV for Hell's Kitchen).
export function availabilityText(
  providers: StreamingProvider[],
  region: string,
): string {
  const first = providers.find(isStreaming);
  if (!first) {
    return `Not streaming in ${regionNameInSentence(region)}`;
  }
  return `On ${addOnChannel(first)?.name ?? first.providerName}`;
}
