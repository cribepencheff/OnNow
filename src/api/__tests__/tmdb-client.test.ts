import { createTmdbClient } from "../tmdb-client";
import findNeagley from "../fixtures/tmdb-find-neagley.json";
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
      { providerId: 119, providerName: "Amazon Prime Video" },
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

  it('CRI-99: is null, not "no services", when TMDB does not know the show', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({ tv_results: [] }));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(
      client.findStreamingProviders(NEAGLEY_EXTERNALS, "SE"),
    ).resolves.toBeNull();
  });

  it("CRI-99: searches by name when TVmaze has no IMDb or TheTVDB ID (JAŸ-Z IN 8)", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(JAY_Z_SEARCH))
      .mockResolvedValueOnce(jsonResponse(providersNeagley));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(client.findStreamingProviders(JAY_Z, "SE")).resolves.toEqual([
      { providerId: 119, providerName: "Amazon Prime Video" },
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

    await expect(
      client.findStreamingProviders(JAY_Z, "SE"),
    ).resolves.toBeNull();
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
