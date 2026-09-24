import { serviceLink } from "./service-link";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";
import showDarkMatterFixture from "@/api/fixtures/show-dark-matter.json";
import showFoundationFixture from "@/api/fixtures/show-foundation.json";
import showLegendsFixture from "@/api/fixtures/show-legends.json";
import showThePittFixture from "@/api/fixtures/show-the-pitt.json";
import showAKnightFixture from "@/api/fixtures/show-a-knight-of-the-seven-kingdoms.json";
import showLanternsFixture from "@/api/fixtures/show-lanterns.json";
import showNeagleyFixture from "@/api/fixtures/show-neagley.json";
import showKillingEveFixture from "@/api/fixtures/show-killing-eve.json";
import showTheBearFixture from "@/api/fixtures/show-the-bear.json";
import showMobLandFixture from "@/api/fixtures/show-mobland.json";
import showLudwigFixture from "@/api/fixtures/show-ludwig.json";

// CRI-80, FR-014 (keyless PoC version), ADR 0004: the link comes from
// TVmaze's officialSite, and only for services whose links land on the
// right show in Sweden. Everything else gives no link (data first: better
// no button than the wrong service).
describe("serviceLink (FR-014, CRI-80)", () => {
  it("links Apple TV, with the country segment removed so the link is not tied to the US store", () => {
    expect(serviceLink(showSlowHorsesFixture.officialSite)).toEqual({
      service: "Apple TV",
      url: "https://tv.apple.com/show/slow-horses/umc.cmc.2szz3fdt71tl1ulnbp8utgq5o",
    });
  });

  it("keeps an Apple TV link that has no country segment", () => {
    expect(serviceLink(showDarkMatterFixture.officialSite)).toEqual({
      service: "Apple TV",
      url: "https://tv.apple.com/show/dark-matter/umc.cmc.4luj45vtqpmjsvb6sc2675oeg",
    });
  });

  it("drops the language query from an Apple TV link", () => {
    expect(serviceLink(showFoundationFixture.officialSite)).toEqual({
      service: "Apple TV",
      url: "https://tv.apple.com/show/foundation/umc.cmc.5983fipzqbicvrve6jdfep4x3",
    });
  });

  it("links Netflix", () => {
    expect(serviceLink(showLegendsFixture.officialSite)).toEqual({
      service: "Netflix",
      url: "https://www.netflix.com/title/81708404",
    });
  });

  it('names HBO Max from the domain, not from TVmaze\'s network ("HBO")', () => {
    expect(showAKnightFixture.network?.name).toBe("HBO");
    expect(serviceLink(showAKnightFixture.officialSite)).toEqual({
      service: "HBO Max",
      url: "https://www.hbomax.com/show/3507a932-eace-46ea-bfe1-638ae819fa12",
    });
    expect(serviceLink(showThePittFixture.officialSite)?.service).toBe(
      "HBO Max",
    );
  });

  // HBO Max's own site redirects its show links to "/show/<id>". TVmaze's
  // link for Lanterns lacks "/shows/" and gives a 404 as it is, so HBO Max
  // links are rewritten to that form from HBO's own show ID.
  it("rewrites an HBO Max link to HBO's own /show/<id> form, which fixes Lanterns' 404", () => {
    expect(showLanternsFixture.officialSite).toBe(
      "https://www.hbomax.com/lanterns/8c11d041-6b71-4e54-8369-fdb310e063b8",
    );
    expect(serviceLink(showLanternsFixture.officialSite)).toEqual({
      service: "HBO Max",
      url: "https://www.hbomax.com/show/8c11d041-6b71-4e54-8369-fdb310e063b8",
    });
  });

  it("links HBO Max from max.com too", () => {
    expect(
      serviceLink(
        "https://play.max.com/show/8c11d041-6b71-4e54-8369-fdb310e063b8",
      ),
    ).toEqual({
      service: "HBO Max",
      url: "https://www.hbomax.com/show/8c11d041-6b71-4e54-8369-fdb310e063b8",
    });
  });

  it("keeps an HBO Max link without a show ID as it is", () => {
    expect(serviceLink("https://www.hbomax.com/originals")).toEqual({
      service: "HBO Max",
      url: "https://www.hbomax.com/originals",
    });
  });

  it("upgrades an http link to https", () => {
    expect(serviceLink("http://www.netflix.com/title/81288983")).toEqual({
      service: "Netflix",
      url: "https://www.netflix.com/title/81288983",
    });
  });

  it("gives no link for Prime Video, whose amazon.com link does not reach the show", () => {
    expect(serviceLink(showNeagleyFixture.officialSite)).toBeNull();
  });

  it("gives no link for other services (AMC+, Hulu, Paramount+, BBC)", () => {
    expect(serviceLink(showKillingEveFixture.officialSite)).toBeNull();
    expect(serviceLink(showTheBearFixture.officialSite)).toBeNull();
    expect(serviceLink(showMobLandFixture.officialSite)).toBeNull();
    expect(serviceLink(showLudwigFixture.officialSite)).toBeNull();
  });

  it("gives no link for look-alike domains", () => {
    expect(serviceLink("https://netflix.com.example.org/title/1")).toBeNull();
    expect(serviceLink("https://notnetflix.com/title/1")).toBeNull();
    expect(serviceLink("https://www.apple.com/tv-pr/shows/silo")).toBeNull();
  });

  it("gives no link when TVmaze has no official site, or it is not a web link", () => {
    expect(serviceLink(null)).toBeNull();
    expect(serviceLink("")).toBeNull();
    expect(serviceLink("netflix.com/title/1")).toBeNull();
  });
});
