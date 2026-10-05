// A stand-in for @/hooks/useFollowList in component tests: every hook in
// that module built on one `useFollowList` (a jest.fn the test sets up, or
// a fixed implementation), so a test asserts on its follow and unfollow
// whichever hook the component uses. The next-frame step runs at once.
//
//   jest.mock("@/hooks/useFollowList", () =>
//     jest.requireActual("@/hooks/test-follow-list-mock").followListMock(),
//   );

type FollowList = {
  isFollowed: (showId: number) => boolean;
  follow: (showId: number) => unknown;
  unfollow: (showId: number) => unknown;
};

export function followListMock(useFollowList: () => FollowList = jest.fn()) {
  function useFollowActions() {
    const list = useFollowList();
    return {
      follow: (showId: number) => Promise.resolve(list.follow(showId)),
      unfollow: (showId: number) => Promise.resolve(list.unfollow(showId)),
    };
  }
  return {
    useFollowList,
    useFollowActions,
    useFollowToggle: (showId: number) => {
      const list = useFollowList();
      const followed = list.isFollowed(showId);
      return {
        followed,
        toggle: () => (followed ? list.unfollow(showId) : list.follow(showId)),
      };
    },
    afterThisFrame: (work: () => void) => work(),
  };
}
