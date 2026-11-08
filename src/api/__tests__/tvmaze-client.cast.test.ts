import { createTvMazeClient } from "../tvmaze-client";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function client(fetchFn: jest.Mock) {
  return createTvMazeClient({ fetchFn, now: () => 0, wait: async () => {} });
}

// CRI-143: Show detail's Cast row, from TVmaze's /shows/{id}/cast.
describe("TvMazeClient.getCast (CRI-143)", () => {
  it("reads the cast in TVmaze's order, trimmed to name, portrait and character", async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse([
        {
          person: {
            id: 45775,
            name: "Gary Oldman",
            image: { medium: "medium.jpg", original: "original.jpg" },
          },
          character: { id: 674958, name: "Jackson Lamb" },
        },
        {
          person: { id: 2, name: "No Portrait", image: null },
          character: null,
        },
      ]),
    );

    await expect(client(fetchFn).getCast(45039)).resolves.toEqual([
      {
        personId: 45775,
        name: "Gary Oldman",
        imageUrl: "medium.jpg",
        character: "Jackson Lamb",
      },
      { personId: 2, name: "No Portrait", imageUrl: null, character: null },
    ]);
    expect(fetchFn.mock.calls[0][0]).toContain("/shows/45039/cast");
  });
});
