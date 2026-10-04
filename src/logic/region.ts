// The user's region (FR-016, CRI-88, ADR 0014): from the phone's locale,
// unless the user has picked one. It only decides streaming availability;
// episode dates are never shifted by it.

import { isSupportedRegion } from "./regions";

// Used when no locale gives a region TMDB has data for.
export const FALLBACK_REGION = "US";

export interface StoredRegion {
  code: string;
  source: "device" | "manual";
}

export function detectRegion(locales: { regionCode: string | null }[]): string {
  for (const locale of locales) {
    const code = locale.regionCode?.toUpperCase();
    if (code && isSupportedRegion(code)) {
      return code;
    }
  }
  return FALLBACK_REGION;
}

export function currentRegion(
  stored: StoredRegion | null,
  detected: string,
): string {
  return stored?.source === "manual" && isSupportedRegion(stored.code)
    ? stored.code
    : detected;
}
