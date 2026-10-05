import { act, renderHook, waitFor } from "@testing-library/react-native";

import { follow, getFollowedIds, unfollow } from "@/storage/follow-list";
import { useFollowList, useFollowToggle } from "./useFollowList";
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

  // CRI-86: following is a local write, so the UI must not wait for it.
  it("shows a follow immediately, before storage has finished (CRI-86)", async () => {
    mockedGetFollowedIds.mockResolvedValue([]);
    mockedFollow.mockReturnValue(new Promise(() => {}));
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useFollowList(), {
      wrapper: wrapperWithQueryClient(client),
    });
    await waitFor(() => expect(result.current.followedIds.size).toBe(0));

    await act(async () => {
      result.current.follow(5);
    });

    // Storage never resolves here, so this can only come from the optimistic
    // update.
    await waitFor(() => expect(result.current.isFollowed(5)).toBe(true));
    expect(mockedFollow).toHaveBeenCalledWith(5);

    await unmount();
    client.unmount();
  });

  it("shows an unfollow immediately, and puts it back if storage fails (CRI-86)", async () => {
    mockedGetFollowedIds.mockResolvedValue([5]);
    let fail: (error: Error) => void = () => {};
    mockedUnfollow.mockReturnValue(
      new Promise((_, reject) => {
        fail = reject;
      }),
    );
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useFollowList(), {
      wrapper: wrapperWithQueryClient(client),
    });
    await waitFor(() => expect(result.current.isFollowed(5)).toBe(true));

    await act(async () => {
      result.current.unfollow(5).catch(() => {});
    });
    await waitFor(() => expect(result.current.isFollowed(5)).toBe(false));

    await act(async () => fail(new Error("disk full")));
    await waitFor(() => expect(result.current.isFollowed(5)).toBe(true));

    await unmount();
    client.unmount();
  });

  it("does not read storage again after a successful write", async () => {
    mockedGetFollowedIds.mockResolvedValue([]);
    mockedFollow.mockResolvedValue(undefined);
    const client = createTestQueryClient();

    const { result, unmount } = await renderHook(() => useFollowList(), {
      wrapper: wrapperWithQueryClient(client),
    });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(() => result.current.follow(5));

    await waitFor(() => expect(result.current.isFollowed(5)).toBe(true));
    expect(mockedFollow).toHaveBeenCalledWith(5);
    expect(mockedGetFollowedIds).toHaveBeenCalledTimes(1);

    await unmount();
    client.unmount();
  });
});

// CRI-86: one show's follow control changes the moment it is tapped, and
// the list follows on the next frame.
describe("useFollowToggle", () => {
  beforeEach(() => {
    mockedGetFollowedIds.mockReset().mockResolvedValue([]);
    mockedFollow.mockReset();
    mockedUnfollow.mockReset();
  });

  it("shows the new state at once, before the list or storage changes", async () => {
    let finishWrite: () => void = () => undefined;
    mockedFollow.mockReturnValue(
      new Promise<void>((resolve) => (finishWrite = resolve)),
    );
    const client = createTestQueryClient();
    const { result, unmount } = await renderHook(
      () => ({ toggle: useFollowToggle(5), list: useFollowList() }),
      { wrapper: wrapperWithQueryClient(client) },
    );
    await waitFor(() => expect(result.current.list.isLoaded).toBe(true));

    await act(() => result.current.toggle.toggle());

    expect(result.current.toggle.followed).toBe(true);

    await waitFor(() => expect(result.current.list.isFollowed(5)).toBe(true));
    expect(mockedFollow).toHaveBeenCalledWith(5);
    await act(async () => finishWrite());
    expect(result.current.toggle.followed).toBe(true);

    await unmount();
    client.unmount();
  });

  it("goes back when the write fails", async () => {
    let failWrite: () => void = () => undefined;
    mockedFollow.mockReturnValue(
      new Promise<void>(
        (_resolve, reject) => (failWrite = () => reject(new Error("full"))),
      ),
    );
    const client = createTestQueryClient();
    const { result, unmount } = await renderHook(() => useFollowToggle(5), {
      wrapper: wrapperWithQueryClient(client),
    });
    await waitFor(() => expect(mockedGetFollowedIds).toHaveBeenCalled());

    await act(() => result.current.toggle());
    expect(result.current.followed).toBe(true);
    await waitFor(() => expect(mockedFollow).toHaveBeenCalledWith(5));

    await act(async () => failWrite());

    await waitFor(() => expect(result.current.followed).toBe(false));

    await unmount();
    client.unmount();
  });
});
