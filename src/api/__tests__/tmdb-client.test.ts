import { NOT_ON_TMDB } from "@/logic/streaming-service";
import { createTmdbClient } from "../tmdb-client";
import externalIdsJayZ from "../fixtures/tmdb-external-ids-jay-z.json";
import findNeagley from "../fixtures/tmdb-find-neagley.json";
import onTheAirPage from "../fixtures/tmdb-on-the-air.json";
import recommendationsMobland from "../fixtures/tmdb-recommendations-mobland.json";
import providersNeagley from "../fixtures/tmdb-providers-neagley.json";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const NEAGLEY_EXTERNALS = {
  imdb: "tt33539520",
  thetvdb: 455064,
  name: "Neagley",
  premiered: "2026-09-16",
};
// CRI-99: TVmaze has no IMDb or TheTVDB ID for this show.
const JAY_Z = {
  imdb: null,
  thetvdb: null,
  name: "JAŸ-Z IN 8",
  premiered: "2026-09-18",
};
const JAY_Z_SEARCH = {
  results: [
    {
      id: 326440,
      name: "JAŸ-Z in 8",
      first_air_date: "2026-09-18",
      origin_country: ["US"],
    },
  ],
};
const V3_KEY = "0123456789abcdef0123456789abcdef";
const V4_TOKEN = `eyJ${"a".repeat(200)}`;
const noWait = async () => {};

// CRI-82, spike 0002: a TVmaze show is matched to TMDB through its IMDb ID
// (TheTVDB as fallback), then its watch providers for Sweden are fetched.
describe("TmdbClient (FR-014, NFR-005, CRI-82)", () => {
  it("finds the show by IMDb ID and returns its Swedish services", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(findNeagley))
      .mockResolvedValueOnce(jsonResponse(providersNeagley));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(
      client.findStreamingProviders(NEAGLEY_EXTERNALS, "SE"),
    ).resolves.toEqual([
      {
        providerId: 119,
        providerName: "Amazon Prime Video",
        logoPath: "/gMZdpavHmxFNnLpMHwVxfqeux2g.png",
      },
    ]);

    const [findUrl] = fetchFn.mock.calls[0];
    const [providersUrl] = fetchFn.mock.calls[1];
    expect(findUrl).toContain("/3/find/tt33539520?external_source=imdb_id");
    expect(providersUrl).toContain("/3/tv/273207/watch/providers");
  });

  it("sends a v3 key as a query parameter and a v4 token as a bearer header", async () => {
    const v3Fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ tv_results: [] }));
    await createTmdbClient({
      apiKey: V3_KEY,
      fetchFn: v3Fetch,
      wait: noWait,
    }).findStreamingProviders(
      { imdb: "tt1", thetvdb: null, name: "X", premiered: null },
      "SE",
    );
    expect(v3Fetch.mock.calls[0][0]).toContain(`api_key=${V3_KEY}`);

    const v4Fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ tv_results: [] }));
    await createTmdbClient({
      apiKey: V4_TOKEN,
      fetchFn: v4Fetch,
      wait: noWait,
    }).findStreamingProviders(
      { imdb: "tt1", thetvdb: null, name: "X", premiered: null },
      "SE",
    );
    expect(v4Fetch.mock.calls[0][0]).not.toContain("api_key");
    expect(v4Fetch.mock.calls[0][1].headers.Authorization).toBe(
      `Bearer ${V4_TOKEN}`,
    );
  });

  it("falls back to TheTVDB when the IMDb ID finds nothing", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ tv_results: [] }))
      .mockResolvedValueOnce(jsonResponse(findNeagley))
      .mockResolvedValueOnce(jsonResponse(providersNeagley));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await client.findStreamingProviders(NEAGLEY_EXTERNALS, "SE");

    expect(fetchFn.mock.calls[1][0]).toContain(
      "/3/find/455064?external_source=tvdb_id",
    );
  });

  it('CRI-102: is NOT_ON_TMDB, not "no services", when TMDB does not know the show', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({ tv_results: [] }));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(
      client.findStreamingProviders(NEAGLEY_EXTERNALS, "SE"),
    ).resolves.toBe(NOT_ON_TMDB);
  });

  it("CRI-99: searches by name when TVmaze has no IMDb or TheTVDB ID (JAŸ-Z IN 8)", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(JAY_Z_SEARCH))
      .mockResolvedValueOnce(jsonResponse(providersNeagley));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(client.findStreamingProviders(JAY_Z, "SE")).resolves.toEqual([
      {
        providerId: 119,
        providerName: "Amazon Prime Video",
        logoPath: "/gMZdpavHmxFNnLpMHwVxfqeux2g.png",
      },
    ]);
    expect(fetchFn.mock.calls[0][0]).toContain(
      "/3/search/tv?query=JA%C5%B8-Z%20IN%208",
    );
    expect(fetchFn.mock.calls[1][0]).toContain("/3/tv/326440/watch/providers");
  });

  it("CRI-99: does not take a search result that is not a safe match", async () => {
    const fetchFn = jest.fn().mockResolvedValueOnce(
      jsonResponse({
        results: [{ ...JAY_Z_SEARCH.results[0], first_air_date: "2026-09-10" }],
      }),
    );
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(client.findStreamingProviders(JAY_Z, "SE")).resolves.toBe(
      NOT_ON_TMDB,
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("returns null without an API key, so the app can fall back", async () => {
    const fetchFn = jest.fn();
    const client = createTmdbClient({
      apiKey: undefined,
      fetchFn,
      wait: noWait,
    });

    await expect(
      client.findStreamingProviders(NEAGLEY_EXTERNALS, "SE"),
    ).resolves.toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("NFR-005: backs off and retries when TMDB answers 429", async () => {
    const wait = jest.fn(async () => {});
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse(findNeagley))
      .mockResolvedValueOnce(jsonResponse(providersNeagley));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait });

    await client.findStreamingProviders(NEAGLEY_EXTERNALS, "SE");

    expect(wait).toHaveBeenCalledWith(1_000);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("throws on other errors, so nothing wrong is cached", async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse({}, 500));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(
      client.findStreamingProviders(NEAGLEY_EXTERNALS, "SE"),
    ).rejects.toThrow("TMDB responded with 500");
  });
});

describe("TmdbClient.findOriginCountries (FR-028)", () => {
  it("reads the origin countries from the find result, with no extra request", async () => {
    const fetchFn = jest.fn().mockResolvedValueOnce(jsonResponse(findNeagley));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(
      client.findOriginCountries(NEAGLEY_EXTERNALS),
    ).resolves.toEqual(["US"]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("finds the origin countries through the name search too (CRI-99)", async () => {
    const fetchFn = jest.fn().mockResolvedValueOnce(jsonResponse(JAY_Z_SEARCH));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(client.findOriginCountries(JAY_Z)).resolves.toEqual(["US"]);
  });

  it("falls back to TheTVDB, and is empty when TMDB does not know the show", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ tv_results: [] }))
      .mockResolvedValueOnce(jsonResponse({ tv_results: [] }));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(
      client.findOriginCountries(NEAGLEY_EXTERNALS),
    ).resolves.toEqual([]);
    expect(fetchFn.mock.calls[1][0]).toContain("external_source=tvdb_id");
  });

  it("is null without an API key", async () => {
    const fetchFn = jest.fn();
    const client = createTmdbClient({
      apiKey: undefined,
      fetchFn,
      wait: noWait,
    });

    await expect(
      client.findOriginCountries(NEAGLEY_EXTERNALS),
    ).resolves.toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("TmdbClient.findExternalIds (CRI-103)", () => {
  it("finds JAŸ-Z IN 8 by name, then reads its IMDb and TheTVDB IDs", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(JAY_Z_SEARCH))
      .mockResolvedValueOnce(jsonResponse(externalIdsJayZ));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(client.findExternalIds(JAY_Z)).resolves.toEqual({
      imdb: "tt43619535",
      thetvdb: 479659,
    });
    expect(fetchFn.mock.calls[1][0]).toContain("/3/tv/326440/external_ids");
  });

  it("is NOT_ON_TMDB for an unknown show, null without a key", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({ tv_results: [] }));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });
    await expect(client.findExternalIds(NEAGLEY_EXTERNALS)).resolves.toBe(
      NOT_ON_TMDB,
    );

    const noKey = createTmdbClient({
      apiKey: undefined,
      fetchFn,
      wait: noWait,
    });
    await expect(noKey.findExternalIds(NEAGLEY_EXTERNALS)).resolves.toBeNull();
  });
});

describe("TmdbClient recommendations (FR-038)", () => {
  it("finds the show, then its recommendations, with its own TMDB id", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(JAY_Z_SEARCH))
      .mockResolvedValueOnce(jsonResponse(recommendationsMobland));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    const answer = await client.findRecommendations(JAY_Z);
    expect(answer).toMatchObject({ tvId: 326440 });
    expect(
      typeof answer === "object" && answer !== null && answer.results[0].name,
    ).toBe("Gangs of London");
    expect(fetchFn.mock.calls[1][0]).toContain("/3/tv/326440/recommendations");
  });

  it("is NOT_ON_TMDB for an unknown show", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({ tv_results: [] }));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(client.findRecommendations(NEAGLEY_EXTERNALS)).resolves.toBe(
      NOT_ON_TMDB,
    );
  });

  it("reads a TMDB show's external IDs by its TMDB id", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(externalIdsJayZ));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(client.externalIdsById(326440)).resolves.toEqual({
      imdb: "tt43619535",
      thetvdb: 479659,
    });
    expect(fetchFn.mock.calls[0][0]).toContain("/3/tv/326440/external_ids");
  });
});

describe("TmdbClient.findAiringOn (FR-039)", () => {
  it("asks discover for the region and one day, streaming only, no soaps, one page", async () => {
    const fetchFn = jest.fn().mockResolvedValueOnce(jsonResponse(onTheAirPage));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    const shows = await client.findAiringOn({
      region: "SE",
      timeZone: "Europe/Stockholm",
      day: "2026-10-05",
    });
    expect(shows).toHaveLength(onTheAirPage.results.length);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url] = fetchFn.mock.calls[0];
    for (const part of [
      "/3/discover/tv?",
      "watch_region=SE",
      "with_watch_monetization_types=flatrate%7Cfree%7Cads",
      "air_date.gte=2026-10-05",
      "air_date.lte=2026-10-05",
      "with_type=0%7C2%7C4",
      "without_genres=10766",
      "sort_by=popularity.desc",
      "timezone=Europe%2FStockholm",
      "page=1",
    ]) {
      expect(url).toContain(part);
    }
  });

  it("is null without a key", async () => {
    const fetchFn = jest.fn();
    const client = createTmdbClient({
      apiKey: undefined,
      fetchFn,
      wait: noWait,
    });
    await expect(
      client.findAiringOn({
        region: "SE",
        timeZone: "UTC",
        day: "2026-10-05",
      }),
    ).resolves.toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("TmdbClient.providersById (FR-038, FR-039)", () => {
  it("reads a show's services in a region by its TMDB id, with no find step", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(providersNeagley));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(client.providersById(273207, "SE")).resolves.toEqual([
      {
        providerId: 119,
        providerName: "Amazon Prime Video",
        logoPath: "/gMZdpavHmxFNnLpMHwVxfqeux2g.png",
      },
    ]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toContain("/3/tv/273207/watch/providers");
  });
});

// CRI-107: every TMDB lookup for a show (services, origin countries,
// external IDs, recommendations, images) starts from the same /find, so
// the client takes a cache for it, and one lookup serves them all.
describe("TmdbClient find cache (CRI-107)", () => {
  function mapCache() {
    const found = new Map<string, Promise<unknown>>();
    return jest.fn((show: { name: string }, find: () => Promise<unknown>) => {
      if (!found.has(show.name)) {
        found.set(show.name, find());
      }
      return found.get(show.name)!;
    });
  }

  it("asks the cache for the find step, and makes one /find for several lookups of a show", async () => {
    const fetchFn = jest.fn(async (url: string) =>
      jsonResponse(url.includes("/find/") ? findNeagley : providersNeagley),
    );
    const cachedFind = mapCache();
    const client = createTmdbClient({
      apiKey: V3_KEY,
      fetchFn: fetchFn as never,
      wait: noWait,
      cachedFind: cachedFind as never,
    });

    await client.findStreamingProviders(NEAGLEY_EXTERNALS, "SE");
    await client.findOriginCountries(NEAGLEY_EXTERNALS);

    expect(cachedFind).toHaveBeenCalledTimes(2);
    const finds = fetchFn.mock.calls.filter(([url]) => url.includes("/find/"));
    expect(finds).toHaveLength(1);
  });
});

// CRI-107: the hero's images come through the same client (and its find
// step) instead of a helper of their own.
describe("TmdbClient.findImages", () => {
  it("finds the show, then its details with its English and textless images appended, and its poster from the find", async () => {
    const images = { backdrops: [], logos: [] };
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(findNeagley))
      .mockResolvedValueOnce(
        jsonResponse({
          images,
          created_by: [
            { name: "Ryu Bo-ri", profile_path: "/ryu.jpg" },
            { name: " " },
            { name: "Yoo In-sik", profile_path: null },
          ],
          credits: {
            cast: [
              {
                name: "Kim You-jung",
                character: "Lee Ga-kyung",
                profile_path: "/kim.jpg",
              },
              { name: "Jinyoung", character: "", profile_path: null },
            ],
          },
        }),
      );
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(client.findImages(NEAGLEY_EXTERNALS)).resolves.toEqual({
      tvId: 273207,
      images,
      posterPath: "/tEPDFIa21VK0Q2YLuzhTt2xrw5W.jpg",
      // CRI-143: who created the show, from the same request.
      createdBy: [
        { name: "Ryu Bo-ri", profilePath: "/ryu.jpg" },
        { name: "Yoo In-sik", profilePath: null },
      ],
      // And its cast, from the same request.
      cast: [
        {
          name: "Kim You-jung",
          character: "Lee Ga-kyung",
          profilePath: "/kim.jpg",
        },
        { name: "Jinyoung", character: null, profilePath: null },
      ],
    });
    // One request for both, as the images alone were.
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1][0]).toContain(
      "/3/tv/273207?append_to_response=images,credits&include_image_language=en,null,xx",
    );
  });

  it("gives no creators or cast when TMDB lists none", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(findNeagley))
      .mockResolvedValueOnce(jsonResponse({ images: {} }));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });
    const answer = await client.findImages(NEAGLEY_EXTERNALS);
    expect(answer).toEqual(
      expect.objectContaining({ createdBy: [], cast: [] }),
    );
  });

  it("is NOT_ON_TMDB for an unknown show, null without a key", async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse({}));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });
    await expect(client.findImages(NEAGLEY_EXTERNALS)).resolves.toBe(
      NOT_ON_TMDB,
    );
    const noKey = createTmdbClient({
      apiKey: undefined,
      fetchFn,
      wait: noWait,
    });
    await expect(noKey.findImages(NEAGLEY_EXTERNALS)).resolves.toBeNull();
  });
});

// CRI-142: TMDB's titles for a half-typed query, to complete its last word.
describe("TmdbClient.suggestTitles", () => {
  it("asks TMDB's search and gives each title and original title", async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse({
        results: [
          { name: "Cecilias boy", original_name: "Cecilias unge", id: 1 },
        ],
      }),
    );
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });
    await expect(client.suggestTitles("cecilias un")).resolves.toEqual([
      { id: 1, name: "Cecilias boy", original_name: "Cecilias unge" },
    ]);
    expect(fetchFn.mock.calls[0][0]).toContain(
      "/3/search/tv?query=cecilias%20un",
    );
  });

  it("is null without a key", async () => {
    const fetchFn = jest.fn();
    const client = createTmdbClient({
      apiKey: undefined,
      fetchFn,
      wait: noWait,
    });
    await expect(client.suggestTitles("slow h")).resolves.toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

// Owner, 2026-10-23: a show's translated titles, for the row's "Maffiablod
// in Swedish".
describe("TmdbClient.findTranslations", () => {
  it("gives each translation's title and its language's English name", async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse({
        translations: [
          {
            iso_639_1: "sv",
            iso_3166_1: "SE",
            english_name: "Swedish",
            data: { name: "Maffiablod" },
          },
          { iso_639_1: "de", english_name: "German", data: {} },
        ],
      }),
    );
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });
    await expect(client.findTranslations(255570)).resolves.toEqual([
      { english_name: "Swedish", name: "Maffiablod" },
      { english_name: "German", name: "" },
    ]);
    expect(fetchFn.mock.calls[0][0]).toContain("/3/tv/255570/translations");
  });
});

// CRI-143: episode stills come from TMDB first, a season at a time.
describe("TmdbClient.findSeasonEpisodes (CRI-143)", () => {
  const FIND = { tv_results: [{ id: 248890 }] };

  it("reads a season's episodes, trimmed to number, date, still and overview", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(FIND))
      .mockResolvedValueOnce(
        jsonResponse({
          episodes: [
            {
              episode_number: 9,
              air_date: "2026-11-07",
              still_path: "/9.jpg",
              overview: " A secret comes out. ",
            },
            {
              episode_number: 11,
              air_date: "2026-11-14",
              still_path: null,
              overview: "",
            },
          ],
        }),
      );
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(
      client.findSeasonEpisodes(NEAGLEY_EXTERNALS, 1),
    ).resolves.toEqual([
      {
        episodeNumber: 9,
        airDate: "2026-11-07",
        stillPath: "/9.jpg",
        overview: "A secret comes out.",
      },
      {
        episodeNumber: 11,
        airDate: "2026-11-14",
        stillPath: null,
        overview: null,
      },
    ]);
    expect(fetchFn.mock.calls[1][0]).toContain("/3/tv/248890/season/1");
  });

  it("is [] for a season TMDB does not have", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(FIND))
      .mockResolvedValueOnce(jsonResponse({}, 404));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });
    await expect(
      client.findSeasonEpisodes(NEAGLEY_EXTERNALS, 9),
    ).resolves.toEqual([]);
  });

  it("is NOT_ON_TMDB for an unknown show, null without a key", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({ tv_results: [] }));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });
    await expect(client.findSeasonEpisodes(NEAGLEY_EXTERNALS, 1)).resolves.toBe(
      NOT_ON_TMDB,
    );
    const noKey = createTmdbClient({
      apiKey: undefined,
      fetchFn,
      wait: noWait,
    });
    await expect(
      noKey.findSeasonEpisodes(NEAGLEY_EXTERNALS, 1),
    ).resolves.toBeNull();
  });
});
