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

const NEAGLEY_EXTERNALS = { imdb: "tt33539520", thetvdb: 455064 };
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
      client.findSwedishProviders(NEAGLEY_EXTERNALS),
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
    }).findSwedishProviders({ imdb: "tt1", thetvdb: null });
    expect(v3Fetch.mock.calls[0][0]).toContain(`api_key=${V3_KEY}`);

    const v4Fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ tv_results: [] }));
    await createTmdbClient({
      apiKey: V4_TOKEN,
      fetchFn: v4Fetch,
      wait: noWait,
    }).findSwedishProviders({ imdb: "tt1", thetvdb: null });
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

    await client.findSwedishProviders(NEAGLEY_EXTERNALS);

    expect(fetchFn.mock.calls[1][0]).toContain(
      "/3/find/455064?external_source=tvdb_id",
    );
  });

  it("returns no services when the show is not on TMDB or has no external IDs", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({ tv_results: [] }));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(
      client.findSwedishProviders(NEAGLEY_EXTERNALS),
    ).resolves.toEqual([]);
    await expect(
      client.findSwedishProviders({ imdb: null, thetvdb: null }),
    ).resolves.toEqual([]);
  });

  it("returns null without an API key, so the app can fall back", async () => {
    const fetchFn = jest.fn();
    const client = createTmdbClient({
      apiKey: undefined,
      fetchFn,
      wait: noWait,
    });

    await expect(
      client.findSwedishProviders(NEAGLEY_EXTERNALS),
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

    await client.findSwedishProviders(NEAGLEY_EXTERNALS);

    expect(wait).toHaveBeenCalledWith(1_000);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("throws on other errors, so nothing wrong is cached", async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse({}, 500));
    const client = createTmdbClient({ apiKey: V3_KEY, fetchFn, wait: noWait });

    await expect(
      client.findSwedishProviders(NEAGLEY_EXTERNALS),
    ).rejects.toThrow("TMDB responded with 500");
  });
});
