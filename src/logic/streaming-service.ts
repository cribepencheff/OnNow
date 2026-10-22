// "Open in [service]" for every show that can be streamed in the user's
// region (FR-014, FR-017, ADR 0004, ADR 0014). TMDB's watch providers for
// the region (data from JustWatch, spike 0002) say which service carries
// the show. Pay-TV never counts; add-on channels open their host. Services
// without a start page get no button, only text (CRI-90).

import { regionNameInSentence } from "./regions";
import { serviceLink, type ServiceLink } from "./service-link";

export interface StreamingProvider {
  providerId: number;
  providerName: string;
  // TMDB's own icon for the service (CRI-132), null when TMDB has none.
  logoPath: string | null;
}

// TMDB has no show to match (CRI-99): unknown, so nothing is shown. Not the
// same as "no services", which says "Unavailable in Sweden" (CRI-102).
export const NOT_ON_TMDB = "not-on-tmdb";
export type ProviderAnswer = StreamingProvider[] | typeof NOT_ON_TMDB;

// The parts of TMDB's responses this app reads, as returned.
export interface TmdbFindResponse {
  tv_results?: {
    id: number;
    origin_country?: string[];
    // TMDB's main poster, in any language (CRI-100).
    poster_path?: string | null;
  }[];
}

interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
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

// The show's origin countries as ISO codes, as TMDB gives them.
export function tmdbOriginCountries(find: TmdbFindResponse): string[] {
  return find.tv_results?.[0]?.origin_country ?? [];
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
    logoPath: provider.logo_path ?? null,
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
  // Behind a Cloudflare bot check: verified as Crunchyroll's own domain,
  // not by an automated page load (CRI-90).
  283: { service: "Crunchyroll", startPage: "https://www.crunchyroll.com" },
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
  // name: the channel itself ("Crunchyroll"); host: where it opens.
  for (const { suffix, host } of HOSTS) {
    if (suffix.test(provider.providerName)) {
      const channel = provider.providerName.replace(suffix, "");
      const name = CHANNEL_NAMES[channel.toLowerCase()] ?? channel;
      return { name, host };
    }
  }
  return null;
}

function isStreaming(provider: StreamingProvider): boolean {
  return !PAY_TV.has(provider.providerId);
}

// At least one streaming service, add-on channels included; pay-TV never
// counts (the same rule as "Open in", FR-038, FR-039).
export function hasStreamingService(providers: StreamingProvider[]): boolean {
  return providers.some(isStreaming);
}

// One service per show for now (ADR 0004); the menu for several services
// (FR-015) is MVP. In order: the show's own page when TVmaze's official
// site is on a known service, then a known service's start page, then an
// add-on channel's host (CRI-90). Within each, TMDB's order. Anything else
// gives no button: it would not open the service itself.
export function openInLink(
  providers: StreamingProvider[],
  officialSite: string | null,
): ServiceLink | null {
  const streaming = providers.filter(isStreaming);
  const known = streaming
    .map((provider) => {
      const service = KNOWN_SERVICES[provider.providerId];
      return service ? { ...service, logoPath: provider.logoPath } : undefined;
    })
    .filter(
      (service): service is KnownService & { logoPath: string | null } =>
        service !== undefined,
    );

  const direct = serviceLink(officialSite);
  if (direct && known.some((service) => service.service === direct.service)) {
    const logoPath =
      known.find((service) => service.service === direct.service)?.logoPath ??
      null;
    return { ...direct, logoPath };
  }
  if (known[0]) {
    return {
      service: known[0].service,
      url: known[0].startPage,
      logoPath: known[0].logoPath,
    };
  }

  for (const provider of streaming) {
    const channel = addOnChannel(provider);
    if (channel) {
      // The channel's own logo (e.g. "Hayu Amazon Channel"), not the host
      // app's, so no logo is shown rather than the wrong one (data first).
      return {
        service: channel.host.service,
        url: channel.host.startPage,
        requires: channel.name,
        logoPath: null,
      };
    }
  }
  return null;
}

// The button's accessibility label: the app that opens, and the extra
// subscription an add-on channel needs (CRI-90).
export function openInAccessibilityLabel(link: ServiceLink): string {
  return link.requires
    ? `Open in ${link.service}, requires ${link.requires} subscription`
    : `Open in ${link.service}`;
}

// The button's subrow for a direct service (CRI-132): the add-on channel's
// own "requires X subscription" marker takes this slot instead (CRI-90,
// CRI-101).
export function streamingOnLabel(service: string): string {
  return `Streaming on ${service}`;
}

// When there is no "Open in" button, a quiet text says what TMDB's data
// for the region (from JustWatch) shows, and nothing more (data first,
// CRI-84): every streaming service it lists, in TMDB's order and names
// ("On Crunchyroll, HIDIVE"), or for none "Unavailable in Sweden" with a
// region (hero, Show detail), plain "Unavailable" without (rows, CRI-97).
// Pay-TV never counts. An add-on channel ("Hayu Amazon Channel") reads as
// its own service ("hayu"), and is left out when TMDB also lists that
// service directly ("Apple TV" and "Apple TV Amazon Channel" read "On
// Apple TV").
// The services a show is on, each once, in TMDB's order: the names
// availabilityText reads, with each one's logo (CRI-115). A service's own
// listing gives its name and logo, also for its channel variant.
function availableServices(
  providers: StreamingProvider[],
): { name: string; logoPath: string | null }[] {
  const entries = providers.filter(isStreaming).map((provider) => {
    const channel = addOnChannel(provider);
    return {
      name: channel ? channel.name : provider.providerName,
      direct: !channel,
      logoPath: provider.logoPath,
    };
  });
  const direct = new Map(
    entries
      .filter((entry) => entry.direct)
      .map((entry) => [entry.name.toLowerCase(), entry]),
  );
  const seen = new Set<string>();
  const services: { name: string; logoPath: string | null }[] = [];
  for (const entry of entries) {
    const own = direct.get(entry.name.toLowerCase()) ?? entry;
    if (!seen.has(own.name)) {
      seen.add(own.name);
      services.push({ name: own.name, logoPath: own.logoPath });
    }
  }
  return services;
}

export function availabilityText(
  providers: StreamingProvider[],
  region?: string,
): string {
  const unique = availableServices(providers).map(({ name }) => name);
  if (unique.length > 0) {
    return `On ${unique.join(", ")}`;
  }
  return region
    ? `Unavailable in ${regionNameInSentence(region)}`
    : "Unavailable";
}

// The service slot on Shows and Search rows (FR-027): the services, or plain
// "Unavailable" without the region (CRI-97). Nothing when TMDB does not know
// the show (CRI-102), without a TMDB key, or before it answers.
export function rowServiceText(
  answer: ProviderAnswer | null | undefined,
): string | null {
  return Array.isArray(answer) ? availabilityText(answer) : null;
}

// Whether TMDB answered with no streaming service for the show: the row's
// "Unavailable" (CRI-97), marked with a yellow dot in the logos' place
// (owner, 2026-10-22). Not when TMDB does not know the show, or before it
// answers.
export function rowIsUnavailable(
  answer: ProviderAnswer | null | undefined,
): boolean {
  return Array.isArray(answer) && availableServices(answer).length === 0;
}

// The most service logos a row shows before its text (CRI-115).
const ROW_SERVICE_LOGOS = 4;

// A row's services as logos before its text (CRI-115, owner 2026-10-22):
// so a service you have is seen at a glance, the text giving the detail.
// Every service with a TMDB logo, in the text's order, up to four; none
// for "Unavailable" or when TMDB does not know the show.
export function rowServiceLogos(
  answer: ProviderAnswer | null | undefined,
): { name: string; logoPath: string }[] {
  if (!Array.isArray(answer)) {
    return [];
  }
  return availableServices(answer)
    .filter(
      (service): service is { name: string; logoPath: string } =>
        service.logoPath !== null,
    )
    .slice(0, ROW_SERVICE_LOGOS);
}
