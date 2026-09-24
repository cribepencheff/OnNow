import {
  availabilityText,
  openInLink,
  swedishProviders,
  tmdbTvId,
} from "./swedish-service";
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

describe("swedishProviders (FR-014, CRI-82)", () => {
  it("reads Sweden's subscription services", () => {
    expect(swedishProviders(providersNeagley)).toEqual([
      { providerId: 119, providerName: "Amazon Prime Video" },
    ]);
  });

  it("lists subscription services first, then free, then with ads", () => {
    expect(
      swedishProviders(providersLudwig).map((p) => p.providerName),
    ).toEqual(["BritBox", "TV4 Play", "BritBox Amazon Channel", "SVT"]);
    expect(swedishProviders(providersHellsKitchen)).toEqual([
      { providerId: 300, providerName: "Pluto TV" },
    ]);
  });

  it("is empty when the show has no service in Sweden", () => {
    expect(swedishProviders(providersSpecialForces)).toEqual([]);
    expect(swedishProviders({ results: {} })).toEqual([]);
    expect(swedishProviders({})).toEqual([]);
  });
});

describe("openInLink (FR-014, ADR 0004, CRI-82)", () => {
  it("opens the show directly when TVmaze's official site is that Swedish service", () => {
    expect(
      openInLink(
        swedishProviders(providersSlowHorses),
        showSlowHorses.officialSite,
      ),
    ).toEqual({
      service: "Apple TV",
      url: "https://tv.apple.com/show/slow-horses/umc.cmc.2szz3fdt71tl1ulnbp8utgq5o",
    });
    expect(
      openInLink(swedishProviders(providersLegends), showLegends.officialSite),
    ).toEqual({
      service: "Netflix",
      url: "https://www.netflix.com/title/81708404",
    });
    expect(
      openInLink(swedishProviders(providersThePitt), showThePitt.officialSite),
    ).toEqual({
      service: "HBO Max",
      url: "https://www.hbomax.com/show/e6e7bad9-d48d-4434-b334-7c651ffc4bdf",
    });
  });

  it("opens the service's start page when there is no direct show link (Neagley, Prime Video)", () => {
    expect(
      openInLink(swedishProviders(providersNeagley), showNeagley.officialSite),
    ).toEqual({ service: "Prime Video", url: "https://www.primevideo.com" });
  });

  it("opens SkyShowtime for MobLand, a Paramount+ show in the US", () => {
    expect(
      openInLink(swedishProviders(providersMobLand), showMobLand.officialSite),
    ).toEqual({ service: "SkyShowtime", url: "https://www.skyshowtime.com" });
  });

  it("uses the Swedish service, not TVmaze's US one, when they differ (Killing Eve: AMC+ in the US, Netflix in Sweden)", () => {
    expect(
      openInLink(
        swedishProviders(providersKillingEve),
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

  it("skips services not in the table and takes the next known one (Ludwig: BritBox, then TV4 Play)", () => {
    expect(openInLink(swedishProviders(providersLudwig), null)).toEqual({
      service: "TV4 Play",
      url: "https://www.tv4play.se",
    });
  });

  it("gives no link when no Swedish service is in the table (Hell's Kitchen: Pluto TV)", () => {
    expect(
      openInLink(swedishProviders(providersHellsKitchen), null),
    ).toBeNull();
  });

  it("gives no link without a Swedish service, even when TVmaze has an official site (data first)", () => {
    expect(openInLink([], showSlowHorses.officialSite)).toBeNull();
    expect(
      openInLink(swedishProviders(providersSpecialForces), null),
    ).toBeNull();
  });
});

// CRI-84: when there is no button, a quiet text says what TMDB's Swedish
// data (from JustWatch) shows, and nothing more (data first).
describe("availabilityText (FR-014, CRI-84)", () => {
  it('is "Not streaming in Sweden" without a Swedish service (Special Forces)', () => {
    expect(availabilityText(swedishProviders(providersSpecialForces))).toBe(
      "Not streaming in Sweden",
    );
  });

  it('names a Swedish service that has no link as "On [service]" (Hell\'s Kitchen: Pluto TV)', () => {
    expect(availabilityText(swedishProviders(providersHellsKitchen))).toBe(
      "On Pluto TV",
    );
  });

  it("names the first service in TMDB's order when there are several", () => {
    expect(
      availabilityText([
        { providerId: 151, providerName: "BritBox" },
        { providerId: 9999, providerName: "Other" },
      ]),
    ).toBe("On BritBox");
  });
});
