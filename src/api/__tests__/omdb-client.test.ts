import { createOmdbClient, OmdbResponseError } from "../omdb-client";
import omdbMobland from "../fixtures/omdb-mobland.json";
import omdbNeagley from "../fixtures/omdb-neagley.json";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("OmdbClient (CRI-87, ADR 0013)", () => {
  it("looks up the rating by IMDb ID", async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(omdbMobland));
    const client = createOmdbClient({ apiKey: "key", fetchFn });

    await expect(client.findImdbRating("tt31510819")).resolves.toEqual({
      rating: "8.3",
    });
    expect(fetchFn.mock.calls[0][0]).toBe(
      "https://www.omdbapi.com/?i=tt31510819&apikey=key",
    );
  });

  it('returns no rating for "N/A"', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(omdbNeagley));
    const client = createOmdbClient({ apiKey: "key", fetchFn });

    await expect(client.findImdbRating("tt33539520")).resolves.toEqual({
      rating: null,
    });
  });

  it("returns null without calling OMDb when there is no key", async () => {
    const fetchFn = jest.fn();
    const client = createOmdbClient({ apiKey: undefined, fetchFn });

    await expect(client.findImdbRating("tt31510819")).resolves.toBeNull();
    await expect(
      createOmdbClient({ apiKey: "", fetchFn }).findImdbRating("tt1"),
    ).resolves.toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("throws on a bad key or a used-up daily limit (401)", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { Response: "False", Error: "Request limit reached!" },
          401,
        ),
      );
    const client = createOmdbClient({ apiKey: "key", fetchFn });

    await expect(client.findImdbRating("tt31510819")).rejects.toBeInstanceOf(
      OmdbResponseError,
    );
  });
});
