import {
  requestSearchFocus,
  subscribeSearchFocus,
  takeSearchFocusRequest,
} from "./search-focus";

describe("Search focus requests (CRI-133)", () => {
  beforeEach(() => {
    takeSearchFocusRequest();
  });

  it("has no request until one is made", () => {
    expect(takeSearchFocusRequest()).toBe(false);
  });

  it("keeps a request until it is taken, once", () => {
    requestSearchFocus();
    expect(takeSearchFocusRequest()).toBe(true);
    expect(takeSearchFocusRequest()).toBe(false);
  });

  it("tells subscribers about each request, until they unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeSearchFocus(listener);

    requestSearchFocus();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    requestSearchFocus();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
