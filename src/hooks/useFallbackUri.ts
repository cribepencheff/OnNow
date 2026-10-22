// An image URL with one fallback (CRI-140). The large backdrops are
// fetched at TMDB's w1920, which its image server serves but does not
// list in its documented sizes; if that ever fails, the same image is
// fetched at "original" instead. A new URL is tried first again.

import { useCallback, useState } from "react";

export function useFallbackUri(
  uri: string | undefined,
  fallbackUri: string | undefined,
): { uri: string | undefined; onError: () => boolean } {
  const [failedUri, setFailedUri] = useState<string>();
  const failed = uri !== undefined && failedUri === uri;
  // Returns whether it switched to the fallback: if not, the image has
  // finally failed.
  const onError = useCallback(() => {
    if (failed || !fallbackUri || fallbackUri === uri) {
      return false;
    }
    setFailedUri(uri);
    return true;
  }, [failed, fallbackUri, uri]);
  return { uri: failed ? fallbackUri : uri, onError };
}
