import {
  availabilityText,
  openInAccessibilityLabel,
  openInLink,
  regionProviders,
  tmdbOriginCountries,
  tmdbTvId,
} from "./streaming-service";
import findNeagley from "@/api/fixtures/tmdb-find-neagley.json";
import providersNeagley from "@/api/fixtures/tmdb-providers-neagley.json";
import providersMobLand from "@/api/fixtures/tmdb-providers-mobland.json";
import providersSlowHorses from "@/api/fixtures/tmdb-providers-slow-horses.json";
import providersKillingEve from "@/api/fixtures/tmdb-providers-killing-eve.json";
import providersLudwig from "@/api/fixtures/tmdb-providers-ludwig.json";
import providersLegends from "@/api/fixtures/tmdb-providers-legends.json";
import providersThePitt from "@/api/fixtures/tmdb-providers-the-pitt.json";
import providersHellsKitchen from "@/api/fixtures/tmdb-providers-hell-s-kitchen.json";
import providersSpecialForces from "@/api/fixtures/tmdb-providers-special-forces-world-s-toughest-test.json";
import providersWwhl from "@/api/fixtures/tmdb-providers-watch-what-happens-live.json";
import providersFrieren from "@/api/fixtures/tmdb-providers-frieren.json";
import showSlowHorses from "@/api/fixtures/show-slow-horses.json";
import showKillingEve from "@/api/fixtures/show-killing-eve.json";
import showLegends from "@/api/fixtures/show-legends.json";
import showThePitt from "@/api/fixtures/show-the-pitt.json";
import showNeagley from "@/api/fixtures/show-neagley.json";
import showMobLand from "@/api/fixtures/show-mobland.json";

// CRI-82, spike 0002: TMDB's watch providers for Sweden (data from
// JustWatch), recorded on 2026-09-24.
describe("tmdbTvId (spike 0002, CRI-82)", () => {
  it("takes the TV show from TMDB's /find result", () => {
    expect(tmdbTvId(findNeagley)).toBe(273207);
  });

  it("is null when TMDB finds no TV show", () => {
    expect(tmdbTvId({ tv_results: [] })).toBeNull();
    expect(tmdbTvId({})).toBeNull();
  });
});

describe("regionProviders (FR-014, CRI-82)", () => {
  it("reads Sweden's subscription services", () => {
    expect(regionProviders(providersNeagley, "SE")).toMatchObject([
      { providerId: 119, providerName: "Amazon Prime Video" },
    ]);
  });

  it("lists subscription services first, then free, then with ads", () => {
    expect(
      regionProviders(providersLudwig, "SE").map((p) => p.providerName),
    ).toEqual(["BritBox", "TV4 Play", "BritBox Amazon Channel", "SVT"]);
    expect(regionProviders(providersHellsKitchen, "SE")).toMatchObject([
      { providerId: 300, providerName: "Pluto TV" },
    ]);
  });

  it("is empty when the show has no service in Sweden", () => {
    expect(regionProviders(providersSpecialForces, "SE")).toEqual([]);
    expect(regionProviders({ results: {} }, "SE")).toEqual([]);
    expect(regionProviders({}, "SE")).toEqual([]);
  });
});

describe("openInLink (FR-014, ADR 0004, CRI-82)", () => {
  it("opens the show directly when TVmaze's official site is that Swedish service", () => {
    expect(
      openInLink(
        regionProviders(providersSlowHorses, "SE"),
        showSlowHorses.officialSite,
      ),
    ).toEqual({
      service: "Apple TV",
      url: "https://tv.apple.com/show/slow-horses/umc.cmc.2szz3fdt71tl1ulnbp8utgq5o",
    });
    expect(
      openInLink(
        regionProviders(providersLegends, "SE"),
        showLegends.officialSite,
      ),
    ).toEqual({
      service: "Netflix",
      url: "https://www.netflix.com/title/81708404",
    });
    expect(
      openInLink(
        regionProviders(providersThePitt, "SE"),
        showThePitt.officialSite,
      ),
    ).toEqual({
      service: "HBO Max",
      url: "https://www.hbomax.com/show/e6e7bad9-d48d-4434-b334-7c651ffc4bdf",
    });
  });

  it("opens the service's start page when there is no direct show link (Neagley, Prime Video)", () => {
    expect(
      openInLink(
        regionProviders(providersNeagley, "SE"),
        showNeagley.officialSite,
      ),
    ).toEqual({ service: "Prime Video", url: "https://www.primevideo.com" });
  });

  it("opens SkyShowtime for MobLand, a Paramount+ show in the US", () => {
    expect(
      openInLink(
        regionProviders(providersMobLand, "SE"),
        showMobLand.officialSite,
      ),
    ).toEqual({ service: "SkyShowtime", url: "https://www.skyshowtime.com" });
  });

  it("uses the Swedish service, not TVmaze's US one, when they differ (Killing Eve: AMC+ in the US, Netflix in Sweden)", () => {
    expect(
      openInLink(
        regionProviders(providersKillingEve, "SE"),
        showKillingEve.officialSite,
      ),
    ).toEqual({ service: "Netflix", url: "https://www.netflix.com" });
  });

  it("prefers a service with a direct show link over one listed before it", () => {
    const providers = [
      { providerId: 8, providerName: "Netflix" },
      { providerId: 350, providerName: "Apple TV" },
    ];
    expect(openInLink(providers, showSlowHorses.officialSite)?.service).toBe(
      "Apple TV",
    );
  });

  it("opens the first known service in TMDB's order (Ludwig: BritBox)", () => {
    expect(openInLink(regionProviders(providersLudwig, "SE"), null)).toEqual({
      service: "BritBox",
      url: "https://www.britbox.com",
    });
  });

  it("opens the service's start page for Pluto TV (Hell's Kitchen)", () => {
    expect(
      openInLink(regionProviders(providersHellsKitchen, "SE"), null),
    ).toEqual({
      service: "Pluto TV",
      url: "https://pluto.tv",
    });
  });

  it("skips an operator bundle and takes the next known one", () => {
    const providers = [
      { providerId: 497, providerName: "Tele2 Play" },
      { providerId: 1944, providerName: "TV4 Play" },
    ];
    expect(openInLink(providers, null)).toEqual({
      service: "TV4 Play",
      url: "https://www.tv4play.se",
    });
  });

  it("gives no link for an operator bundle alone (Tele2 Play, CRI-90)", () => {
    expect(
      openInLink([{ providerId: 497, providerName: "Tele2 Play" }], null),
    ).toBeNull();
  });

  it("gives no link without a Swedish service, even when TVmaze has an official site (data first)", () => {
    expect(openInLink([], showSlowHorses.officialSite)).toBeNull();
    expect(
      openInLink(regionProviders(providersSpecialForces, "SE"), null),
    ).toBeNull();
  });
});

// CRI-84: when there is no button, a quiet text says what TMDB's Swedish
// data (from JustWatch) shows, and nothing more (data first).
describe("availabilityText (FR-014, CRI-84)", () => {
  it('is "Unavailable" without a Swedish service (Special Forces)', () => {
    expect(
      availabilityText(regionProviders(providersSpecialForces, "SE")),
    ).toBe("Unavailable");
  });

  it('names a Swedish service that has no link as "On [service]" (Hell\'s Kitchen: Pluto TV)', () => {
    expect(availabilityText(regionProviders(providersHellsKitchen, "SE"))).toBe(
      "On Pluto TV",
    );
  });

  it("names every service in TMDB's order when there are several (CRI-90)", () => {
    expect(
      availabilityText([
        { providerId: 151, providerName: "BritBox" },
        { providerId: 9999, providerName: "Other" },
      ]),
    ).toBe("On BritBox, Other");
  });
});

// CRI-88, ADR 0014: the same show reads differently per region, from the
// same recorded TMDB response (MobLand).
describe("streaming services per region (FR-017, CRI-88)", () => {
  const mobland = showMobLand as unknown as { officialSite: string | null };

  it("reads each region's own services", () => {
    expect(regionProviders(providersMobLand, "SE")[0].providerName).toBe(
      "SkyShowtime",
    );
    expect(regionProviders(providersMobLand, "US")[1].providerName).toBe(
      "Paramount Plus Premium",
    );
    expect(regionProviders(providersMobLand, "GB")[0].providerName).toBe(
      "Amazon Prime Video",
    );
  });

  it("is empty for a region TMDB has no data for", () => {
    expect(regionProviders(providersMobLand, "AQ")).toEqual([]);
  });

  it("opens the region's service (SE: SkyShowtime, US: Paramount+, GB: Prime Video)", () => {
    const linkIn = (region: string) =>
      openInLink(
        regionProviders(providersMobLand, region),
        mobland.officialSite,
      );
    expect(linkIn("SE")?.service).toBe("SkyShowtime");
    expect(linkIn("US")).toEqual({
      service: "Paramount+",
      url: "https://www.paramountplus.com",
    });
    expect(linkIn("GB")).toEqual({
      service: "Prime Video",
      url: "https://www.primevideo.com",
    });
  });

  it('says "Unavailable in <region>" with a region, plain "Unavailable" without (CRI-97)', () => {
    expect(availabilityText([], "SE")).toBe("Unavailable in Sweden");
    expect(availabilityText([], "US")).toBe("Unavailable in the United States");
    expect(availabilityText([], "GB")).toBe(
      "Unavailable in the United Kingdom",
    );
    expect(availabilityText([])).toBe("Unavailable");
  });
});

// CRI-90: "Open in" across regions, on Watch What Happens Live (Bravo in the
// US): pay-TV is never a streaming service, add-on channels open their host,
// and services without a start page are named in text, without a button.
describe("Open in coverage across regions (FR-014, FR-017, CRI-90)", () => {
  it("opens hayu through Prime Video in Sweden (an add-on channel)", () => {
    expect(openInLink(regionProviders(providersWwhl, "SE"), null)).toEqual({
      service: "Prime Video",
      url: "https://www.primevideo.com",
      requires: "hayu",
    });
  });

  it("skips fuboTV and opens Peacock in the US", () => {
    expect(openInLink(regionProviders(providersWwhl, "US"), null)).toEqual({
      service: "Peacock",
      url: "https://www.peacocktv.com",
    });
  });

  it("skips Sky Go and opens hayu through Prime Video in the UK", () => {
    expect(openInLink(regionProviders(providersWwhl, "GB"), null)).toEqual({
      service: "Prime Video",
      url: "https://www.primevideo.com",
      requires: "hayu",
    });
  });

  it("never counts pay-TV or operator bundles, for the link or the text", () => {
    const payTv = [
      { providerId: 257, providerName: "fuboTV" },
      { providerId: 29, providerName: "Sky Go" },
      { providerId: 553, providerName: "Telia Play" },
      { providerId: 365, providerName: "Bravo TV" },
    ];
    expect(openInLink(payTv, null)).toBeNull();
    expect(availabilityText(payTv)).toBe("Unavailable");
  });

  it("prefers a real service with a start page over an add-on channel", () => {
    expect(
      openInLink(
        [
          { providerId: 296, providerName: "Hayu Amazon Channel" },
          { providerId: 1899, providerName: "HBO Max" },
        ],
        null,
      ),
    ).toEqual({ service: "HBO Max", url: "https://www.hbomax.com" });
  });

  it("opens Apple TV and Roku add-on channels through their hosts", () => {
    expect(
      openInLink(
        [{ providerId: 1854, providerName: "AMC Plus Apple TV channel" }],
        null,
      ),
    ).toEqual({
      service: "Apple TV",
      url: "https://tv.apple.com",
      requires: "AMC Plus",
    });
    expect(
      openInLink(
        [{ providerId: 633, providerName: "Paramount+ Roku Premium Channel" }],
        null,
      ),
    ).toEqual({
      service: "The Roku Channel",
      url: "https://therokuchannel.roku.com",
      requires: "Paramount+",
    });
  });

  it("gives no button for services without a start page, and names them all", () => {
    const providers = [
      { providerId: 464, providerName: "Kocowa" },
      { providerId: 430, providerName: "HiDive" },
      { providerId: 257, providerName: "fuboTV" },
      { providerId: 464, providerName: "Kocowa" },
    ];
    expect(openInLink(providers, null)).toBeNull();
    expect(availabilityText(providers)).toBe("On Kocowa, HiDive");
  });

  it("opens Crunchyroll itself for Frieren in Sweden, not its Amazon add-on", () => {
    expect(openInLink(regionProviders(providersFrieren, "SE"), null)).toEqual({
      service: "Crunchyroll",
      url: "https://www.crunchyroll.com",
    });
  });

  it("labels an add-on button with the app that opens and the subscription it needs", () => {
    expect(
      openInAccessibilityLabel({
        service: "Prime Video",
        url: "https://www.primevideo.com",
        requires: "hayu",
      }),
    ).toBe("Open in Prime Video, requires hayu subscription");
    expect(
      openInAccessibilityLabel({
        service: "Peacock",
        url: "https://www.peacocktv.com",
      }),
    ).toBe("Open in Peacock");
  });

  it("names an add-on channel via its host in the text", () => {
    expect(
      availabilityText([
        { providerId: 296, providerName: "Hayu Amazon Channel" },
      ]),
    ).toBe("On hayu via Prime Video");
  });
});

describe("tmdbOriginCountries (FR-028)", () => {
  it("reads the origin countries from a real TMDB find result (Neagley)", () => {
    expect(tmdbOriginCountries(findNeagley)).toEqual(["US"]);
    expect(
      tmdbOriginCountries({
        tv_results: [{ id: 247718, origin_country: ["GB", "US"] }],
      }),
    ).toEqual(["GB", "US"]);
  });

  it("is empty when TMDB does not know the show", () => {
    expect(tmdbOriginCountries({ tv_results: [] })).toEqual([]);
  });
});
