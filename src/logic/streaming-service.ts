// "Open in [service]" for every show that can be streamed in the user's
// region (FR-014, FR-017, ADR 0004, ADR 0014). TMDB's watch providers for
// the region (data from JustWatch, spike 0002) say which service carries
// the show; the link is the show's own page at that service when TVmaze's
// official site is on it, otherwise the service's start page. A service
// not in the table, or no service in the region, gives no link.

import { regionNameInSentence } from "./regions";
import { serviceLink, type ServiceLink } from "./service-link";

export interface StreamingProvider {
  providerId: number;
  providerName: string;
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
  }));
}

interface KnownService {
  service: string;
  // An https start page: iOS opens the service's app when it is installed,
  // and the website otherwise (universal links).
  startPage: string;
}

// TMDB provider IDs, with the service's own name. Start pages carry no
// country: the services send visitors to their local site. Services not
// listed here give no button. "Amazon Channel" variants (the same service
// sold through Prime Video) are left out on purpose, as is Tele2 Play
// (id 497): it is an operator TV bundle that requires a subscription with
// that operator, and we only link directly to streaming services. Telia
// Play is not in TMDB's Swedish provider data we have seen so far, so it
// has no entry to exclude yet.
const KNOWN_SERVICES: Record<number, KnownService> = {
  8: { service: "Netflix", startPage: "https://www.netflix.com" },
  // TMDB has two IDs for Prime Video, depending on the region.
  9: { service: "Prime Video", startPage: "https://www.primevideo.com" },
  119: { service: "Prime Video", startPage: "https://www.primevideo.com" },
  337: { service: "Disney+", startPage: "https://www.disneyplus.com" },
  350: { service: "Apple TV", startPage: "https://tv.apple.com" },
  1899: { service: "HBO Max", startPage: "https://www.hbomax.com" },
  1773: { service: "SkyShowtime", startPage: "https://www.skyshowtime.com" },
  76: { service: "Viaplay", startPage: "https://viaplay.com" },
  493: { service: "SVT Play", startPage: "https://www.svtplay.se" },
  1944: { service: "TV4 Play", startPage: "https://www.tv4play.se" },
  300: { service: "Pluto TV", startPage: "https://pluto.tv" },
  151: { service: "BritBox", startPage: "https://www.britbox.com" },
  531: { service: "Paramount+", startPage: "https://www.paramountplus.com" },
  2303: { service: "Paramount+", startPage: "https://www.paramountplus.com" },
  2616: { service: "Paramount+", startPage: "https://www.paramountplus.com" },
};

// One service per show for now (ADR 0004); the menu for several services
// (FR-015) is MVP. A known service whose direct show link TVmaze gives
// comes first, since it opens the show itself; otherwise the first known
// service in TMDB's order, at its start page.
export function openInLink(
  providers: StreamingProvider[],
  officialSite: string | null,
): ServiceLink | null {
  const known = providers
    .map((provider) => KNOWN_SERVICES[provider.providerId])
    .filter((service): service is KnownService => service !== undefined);

  const direct = serviceLink(officialSite);
  if (direct && known.some((service) => service.service === direct.service)) {
    return direct;
  }

  const first = known[0];
  return first ? { service: first.service, url: first.startPage } : null;
}

// When there is no "Open in" button, a quiet text says what TMDB's data
// for the region (from JustWatch) shows, and nothing more (data first, CRI-84): no
// service at all, or the first service TMDB lists, in TMDB's own name, when
// it is not in the link table (Pluto TV for Hell's Kitchen).
export function availabilityText(
  providers: StreamingProvider[],
  region: string,
): string {
  const first = providers[0];
  return first
    ? `On ${first.providerName}`
    : `Not streaming in ${regionNameInSentence(region)}`;
}
