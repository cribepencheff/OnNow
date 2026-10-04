# 0014. User region from the device, with a manual override

Status: Accepted (CRI-88)

## Context
Streaming availability depends on the country. The PoC hardcoded Sweden
("SE") for TMDB's watch providers, the "Open in" button and the copy
("Not streaming in Sweden"). Sweden is the owner's region, not a product
constant: the app must work wherever TMDB has watch provider data. FR-016
asks for a territory setting that defaults to the phone's region.

Comparable apps do the same. Next Episode and PlayPilot detect the country
automatically and let the user change it in their settings.

## Decision
- **Detect from the device.** The region is the region code of the
  phone's first locale that has one (`expo-localization`), as long as TMDB
  has watch provider data for it.
- **Fallback.** When no locale gives a supported region, the region is
  `US`, TMDB's largest market.
- **Supported regions** are TMDB's watch provider regions
  (`/watch/providers/regions`, 139 on 2026-10-04). The list is kept as a
  snapshot in `src/logic/regions.ts`, with TMDB's English names. It is used
  for the copy and for the picker, so there is no runtime request.
- **Persist.** The region and where it came from (`device` or `manual`) are
  stored in plain AsyncStorage (`onnow.region`), so a future widget can
  read it (NFR-006). Without an override, the stored region follows the
  device when the phone's region changes.
- **Manual override.** The user can pick any supported region, or go back
  to the phone's. An override stays until the user changes it. A stored
  override that is no longer supported is ignored.
- **Everything territory-related takes the region as a parameter:**
  - TMDB watch providers (`regionProviders(response, region)`)
  - the provider cache, keyed per show and region
  - "Open in"
  - the availability copy ("Not streaming in the United Kingdom")

## What the region does not change
- **Episode dates** stay the original release dates from TVmaze. They are
  shown as the local day in the user's time zone (ADR 0001, ADR 0006).
  The region never shifts a date, and does not decide whether an episode
  is "today".
- **Language and copy** stay English (ADR 0003).
- **The first day of the week** still comes from the phone's locale.

## Consequences
- **Start pages.** The service start pages no longer carry a country
  (`pluto.tv`, `britbox.com`, `viaplay.com`). Checked from Sweden: the
  services send visitors to their local site. This is by the visitor's
  location, not by the region set in the app.
- **Provider IDs.** TMDB uses different IDs for the same service in
  different regions: Prime Video is 119 in Sweden and 9 in the United
  Kingdom. The link table now has both, plus Paramount+. Other services,
  common outside Sweden (Hulu, Peacock, Now TV and others), give no button
  until they are added.
- **Cache migration.** Cached services from the PoC (`onnow.swedishService.*`)
  are no longer read. Each followed show is looked up again once, under
  its region.
- **Season availability.** The MVP has no "Not in [country] yet" label
  (ADR 0015). When per-episode availability comes after the MVP (spike
  0003), it takes the same region.
