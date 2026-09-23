// "Open in [service]", keyless PoC version (FR-014, ADR 0004, CRI-80).
// The link is TVmaze's `officialSite`, which often is the show's own page
// at the service. Only services whose links were checked to land on the
// right show in Sweden get a link; every other domain gives none (data
// first: better no button than the wrong service). Opened as an https
// link, iOS opens the service's app at the show when it is installed, and
// the website otherwise (universal links).

export interface ServiceLink {
  // The service's name, from the link's domain, not from TVmaze's network
  // (network "HBO" is the service "HBO Max").
  service: string;
  url: string;
}

interface KnownService {
  service: string;
  // Matches the domain itself and its subdomains ("www.netflix.com").
  domains: string[];
}

// Prime Video is left out: TVmaze's amazon.com links do not reach the show.
const KNOWN_SERVICES: KnownService[] = [
  { service: "Apple TV", domains: ["tv.apple.com"] },
  { service: "Netflix", domains: ["netflix.com"] },
  { service: "HBO Max", domains: ["hbomax.com", "max.com"] },
];

// React Native's URL implementation does not support `hostname` or
// `pathname`, so the link is split with a regular expression instead.
const WEB_LINK = /^https?:\/\/([^/?#:]+)([^?#]*)(\?[^#]*)?(#.*)?$/i;

// HBO Max's show ID: a UUID at the end of the path.
const HBO_MAX_SHOW_ID =
  /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

export function serviceLink(officialSite: string | null): ServiceLink | null {
  const match = officialSite ? WEB_LINK.exec(officialSite.trim()) : null;
  if (!match) {
    return null;
  }

  const host = match[1].toLowerCase();
  const path = match[2];
  const query = match[3] ?? "";

  const known = KNOWN_SERVICES.find(({ domains }) =>
    domains.some((domain) => host === domain || host.endsWith(`.${domain}`)),
  );
  if (!known) {
    return null;
  }

  if (known.service === "Apple TV") {
    // "/us/show/..." ties the link to the US store; without the country
    // segment the show opens in the user's own store. The "?l=en"
    // language query makes no difference, so it is dropped too.
    return {
      service: known.service,
      url: `https://${host}${path.replace(/^\/[a-z]{2}(?=\/)/i, "")}`,
    };
  }

  if (known.service === "HBO Max") {
    // HBO Max's own site redirects its show links to "/show/<id>", and
    // some TVmaze links (Lanterns: "/lanterns/<id>") give a 404 as they
    // are. The ID is HBO's own, so nothing is guessed.
    const showId = HBO_MAX_SHOW_ID.exec(path)?.[1];
    if (showId) {
      return {
        service: known.service,
        url: `https://www.hbomax.com/show/${showId}`,
      };
    }
  }

  return { service: known.service, url: `https://${host}${path}${query}` };
}
