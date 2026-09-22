import { renderHook, waitFor } from "@testing-library/react-native";

import { follow, getFollowedIds, unfollow } from "@/storage/follow-list";
import { useFollowList } from "./useFollowList";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("@/storage/follow-list", () => ({
  getFollowedIds: jest.fn(),
  follow: jest.fn(),
  unfollow: jest.fn(),
}));

const mockedGetFollowedIds = getFollowedIds as jest.MockedFunction<
  typeof getFollowedIds
>;
const mockedFollow = follow as jest.MockedFunction<typeof follow>;
const mockedUnfollow = unfollow as jest.MockedFunction<typeof unfollow>;

// FR-002, FR-003, ADR 0009: the follow list read and updated through a query.
describe("useFollowList", () => {
  beforeEach(() => {
    mockedGetFollowedIds.mockReset();
    mockedFollow.mockReset();
    mockedUnfollow.mockReset();
  });

  it("reports followed shows from storage", async () => {
    mockedGetFollowedIds.mockResolvedValue([1, 2]);
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useFollowList(), {
      wrapper: wrapperWithQueryClient(client),
    });

    await waitFor(() => expect(result.current.followedIds.size).toBe(2));

    expect(result.current.isFollowed(1)).toBe(true);
    expect(result.current.isFollowed(3)).toBe(false);

    await unmount();
    client.unmount();
  });

  it("follows a show and refreshes the followed list", async () => {
    mockedGetFollowedIds.mockResolvedValueOnce([]).mockResolvedValueOnce([5]);
    mockedFollow.mockResolvedValue(undefined);
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useFollowList(), {
      wrapper: wrapperWithQueryClient(client),
    });

    await waitFor(() => expect(result.current.followedIds.size).toBe(0));

    await result.current.follow(5);

    await waitFor(() => expect(result.current.isFollowed(5)).toBe(true));
    expect(mockedFollow).toHaveBeenCalledWith(5);

    await unmount();
    client.unmount();
  });

  it("unfollows a show and refreshes the followed list", async () => {
    mockedGetFollowedIds.mockResolvedValueOnce([5]).mockResolvedValueOnce([]);
    mockedUnfollow.mockResolvedValue(undefined);
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useFollowList(), {
      wrapper: wrapperWithQueryClient(client),
    });

    await waitFor(() => expect(result.current.isFollowed(5)).toBe(true));

    await result.current.unfollow(5);

    await waitFor(() => expect(result.current.isFollowed(5)).toBe(false));
    expect(mockedUnfollow).toHaveBeenCalledWith(5);

    await unmount();
    client.unmount();
  });
});
