/// <reference types="node" />
// Refreshes the real TVmaze fixtures used by src/api tests, for the
// 19-show test set in docs/spikes/README.md. Throttled to stay under
// TVmaze's 20 requests per 10 seconds limit (spike 0001, section 8).
//
// Run with: npm run fixtures:update

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://api.tvmaze.com";
const FIXTURES_DIR = path.join(
  import.meta.dirname,
  "..",
  "src",
  "api",
  "fixtures",
);
const REQUEST_SPACING_MS = 600;

// Name and TVmaze show id, resolved by matching search results against
// premiere year and network/web channel (ADR 0005), same method as spike
// 0001. Slugs are used as fixture file names.
const TEST_SET: { slug: string; name: string; id: number }[] = [
  { slug: "mobland", name: "MobLand", id: 75026 },
  { slug: "dark-matter", name: "Dark Matter", id: 61315 },
  { slug: "slow-horses", name: "Slow Horses", id: 45039 },
  { slug: "lanterns", name: "Lanterns", id: 44776 },
  { slug: "silo", name: "Silo", id: 38052 },
  { slug: "widows-bay", name: "Widow's Bay", id: 79390 },
  { slug: "killing-eve", name: "Killing Eve", id: 22904 },
  { slug: "legends", name: "Legends", id: 91311 },
  { slug: "the-agency", name: "The Agency", id: 66840 },
  { slug: "neagley", name: "Neagley", id: 82707 },
  { slug: "ludwig", name: "Ludwig", id: 68919 },
  {
    slug: "only-murders-in-the-building",
    name: "Only Murders in the Building",
    id: 48830,
  },
  { slug: "the-bear", name: "The Bear", id: 54198 },
  { slug: "foundation", name: "Foundation", id: 35951 },
  { slug: "paradise", name: "Paradise", id: 75030 },
  { slug: "the-pitt", name: "The Pitt", id: 75632 },
  {
    slug: "a-knight-of-the-seven-kingdoms",
    name: "A Knight of the Seven Kingdoms",
    id: 53063,
  },
  { slug: "pluribus", name: "Pluribus", id: 86175 },
  { slug: "the-diplomat", name: "The Diplomat", id: 60213 },
];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} for ${url}`);
  }
  return response.json();
}

async function writeFixture(fileName: string, data: unknown): Promise<void> {
  const filePath = path.join(FIXTURES_DIR, fileName);
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${fileName}`);
}

async function main(): Promise<void> {
  await mkdir(FIXTURES_DIR, { recursive: true });

  for (const show of TEST_SET) {
    const searchResults = await fetchJson(
      `${BASE_URL}/search/shows?q=${encodeURIComponent(show.name)}`,
    );
    await writeFixture(`search-${show.slug}.json`, searchResults);
    await wait(REQUEST_SPACING_MS);

    const showWithEmbeds = await fetchJson(
      `${BASE_URL}/shows/${show.id}?embed[]=episodes&embed[]=seasons`,
    );
    await writeFixture(`show-${show.slug}.json`, showWithEmbeds);
    await wait(REQUEST_SPACING_MS);
  }

  console.log(`Done. ${TEST_SET.length} shows, fixtures in ${FIXTURES_DIR}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
