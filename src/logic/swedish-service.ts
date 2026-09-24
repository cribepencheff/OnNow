// "Open in [service]" for every show that can be streamed in Sweden
// (FR-014, ADR 0004, CRI-82). TMDB's watch providers for Sweden (data from
// JustWatch, spike 0002) say which service carries the show; the link is
// the show's own page at that service when TVmaze's official site is on
// it, otherwise the service's start page. A service not in the table, or
// no Swedish service at all, gives no link (data first).

import { serviceLink, type ServiceLink } from "./service-link";

export interface SwedishProvider {
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

// Sweden's services for a show: subscription ("flatrate") first, then free,
// then free with ads, each in TMDB's own order. Rent and buy are left out.
export function swedishProviders(
  providers: TmdbProvidersResponse,
): SwedishProvider[] {
  const sweden = providers.results?.SE;
  if (!sweden) {
    return [];
  }
  return [
    ...(sweden.flatrate ?? []),
    ...(sweden.free ?? []),
    ...(sweden.ads ?? []),
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

// TMDB provider IDs for Sweden, with the service's own name. Services not
// listed here give no button. "Amazon Channel" variants (the same service
// sold through Prime Video) are left out on purpose.
const KNOWN_SERVICES: Record<number, KnownService> = {
  8: { service: "Netflix", startPage: "https://www.netflix.com" },
  119: { service: "Prime Video", startPage: "https://www.primevideo.com" },
  337: { service: "Disney+", startPage: "https://www.disneyplus.com" },
  350: { service: "Apple TV", startPage: "https://tv.apple.com" },
  1899: { service: "HBO Max", startPage: "https://www.hbomax.com" },
  1773: { service: "SkyShowtime", startPage: "https://www.skyshowtime.com" },
  76: { service: "Viaplay", startPage: "https://viaplay.se" },
  493: { service: "SVT Play", startPage: "https://www.svtplay.se" },
  1944: { service: "TV4 Play", startPage: "https://www.tv4play.se" },
};

// One service per show for now (ADR 0004); the menu for several services
// (FR-015) is MVP. A known service whose direct show link TVmaze gives
// comes first, since it opens the show itself; otherwise the first known
// service in TMDB's order, at its start page.
export function openInLink(
  providers: SwedishProvider[],
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
