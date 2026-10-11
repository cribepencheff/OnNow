// Search opens in typing mode (CRI-133): a tap on the Search tab, Shows'
// search field, "Search more" or "Add your first show" focuses Search's
// field and raises the keyboard. Going back to Search from a Show detail
// opened there does not. Search is a tab that stays mounted, so autoFocus
// only covers its first visit: each of these asks here instead, and Search
// takes the request when it gains focus, or at once if it is already on
// screen. Its own module, without React, like navigation-lock.ts.

let requested = false;
const listeners = new Set<() => void>();

export function requestSearchFocus(): void {
  requested = true;
  listeners.forEach((listener) => listener());
}

// Whether a focus was asked for since the last take; the request is used
// up either way.
export function takeSearchFocusRequest(): boolean {
  const wasRequested = requested;
  requested = false;
  return wasRequested;
}

// Called on each request; returns the unsubscribe.
export function subscribeSearchFocus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
