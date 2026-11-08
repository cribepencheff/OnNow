import { renderHook, waitFor } from "@testing-library/react-native";

import { tvMazeClient } from "@/api/tvmaze-client";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";
import { useShowCast } from "./useShowCast";

jest.mock("@/api/tvmaze-client", () => ({
  ...jest.requireActual("@/api/tvmaze-client"),
  tvMazeClient: { getCast: jest.fn() },
}));

const getCast = tvMazeClient.getCast as jest.Mock;

// CRI-143: Show detail's Cast row, one TVmaze request per show.
describe("useShowCast (CRI-143)", () => {
  it("gives the show's cast from TVmaze", async () => {
    const cast = [
      {
        personId: 45775,
        name: "Gary Oldman",
        imageUrl: null,
        character: "Jackson Lamb",
      },
    ];
    getCast.mockResolvedValue(cast);
    const { result, unmount } = await renderHook(() => useShowCast(45039), {
      wrapper: wrapperWithQueryClient(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.data).toEqual(cast));
    expect(getCast).toHaveBeenCalledWith(45039);
    await unmount();
  });

  it("asks nothing when not enabled (TMDB has the cast)", async () => {
    getCast.mockReset();
    const { result, unmount } = await renderHook(
      () => useShowCast(45039, false),
      { wrapper: wrapperWithQueryClient(createTestQueryClient()) },
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(getCast).not.toHaveBeenCalled();
    await unmount();
  });
});
