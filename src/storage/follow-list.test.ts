import AsyncStorage from "@react-native-async-storage/async-storage";

import { follow, getFollowedIds, isFollowed, unfollow } from "./follow-list";

// FR-003: the follow list is stored on the device and survives a restart.
describe("follow list storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("has no followed shows before anything is followed", async () => {
    expect(await getFollowedIds()).toEqual([]);
  });

  it("follows a show (FR-002)", async () => {
    await follow(1);

    expect(await getFollowedIds()).toEqual([1]);
    expect(await isFollowed(1)).toBe(true);
  });

  it("follows multiple shows, preserving order", async () => {
    await follow(1);
    await follow(2);
    await follow(3);

    expect(await getFollowedIds()).toEqual([1, 2, 3]);
  });

  it("does not duplicate a show that is already followed", async () => {
    await follow(1);
    await follow(1);

    expect(await getFollowedIds()).toEqual([1]);
  });

  it("unfollows a show (FR-002)", async () => {
    await follow(1);
    await follow(2);

    await unfollow(1);

    expect(await getFollowedIds()).toEqual([2]);
    expect(await isFollowed(1)).toBe(false);
  });

  it("does nothing when unfollowing a show that is not followed", async () => {
    await follow(1);

    await unfollow(2);

    expect(await getFollowedIds()).toEqual([1]);
  });

  it("survives being read again from storage, simulating an app restart (FR-003)", async () => {
    await follow(1);
    await follow(2);

    // A fresh read from AsyncStorage, as would happen after an app restart.
    expect(await getFollowedIds()).toEqual([1, 2]);
    expect(await isFollowed(2)).toBe(true);
  });

  it("does not resurrect a show when several unfollows race, as when unfollowing several shows quickly in Search", async () => {
    await follow(1);
    await follow(2);
    await follow(3);

    // Each unfollow reads the current list, then writes the filtered
    // result. Fired without awaiting between them (unlike the sequential
    // `unfollow(1); unfollow(2);` above), a later call can read the list
    // before an earlier call's write has landed, and overwrite it with a
    // stale snapshot that still has the earlier show in it.
    await Promise.all([unfollow(1), unfollow(2), unfollow(3)]);

    expect(await getFollowedIds()).toEqual([]);
  });
});
