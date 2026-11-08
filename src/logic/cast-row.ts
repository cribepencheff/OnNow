// Who Show detail's Cast & Crew row shows, in order (CRI-143, owner
// 2026-11-08; Apple TV as the reference: eight actors, then producers,
// nineteen for Slow Horses):
// - The cast: TMDB's, whose portraits are current, else TVmaze's when TMDB
//   lists none (or there is no key); the first eight, in the source's
//   order, which puts the main cast first.
// - Then the crew: TMDB's creators, then the key jobs in KEY_CREW_JOBS'
//   order. Someone with several jobs shows once, with all of them.
// - Nineteen people in all.
// A missing portrait or character stays missing (data first); the view
// draws initials where there is no portrait.

import {
  IMAGE_BASE,
  type TmdbCastMember,
  type TmdbCreator,
  type TmdbCrewMember,
} from "@/api/tmdb-types";
import type { TvMazeCastMember } from "@/api/tvmaze-types";

export const CAST_MAX = 8;
export const ROW_MAX = 19;

// The crew jobs shown, in this order: who made the show, then whose book
// it is, then who directs and writes it, then who produces it. TMDB's own
// job names, shown as TMDB names them.
export const KEY_CREW_JOBS = [
  "Book",
  "Novel",
  "Director",
  "Writer",
  "Executive Producer",
  "Producer",
];

const CREATOR = "Creator";

export interface CastRowPerson {
  key: string;
  name: string;
  imageUrl: string | null;
  // The character, the jobs ("Creator", "Writer, Director"), or null.
  role: string | null;
}

const PROFILE_SIZE = "w185";

function profileUrl(path: string | null): string | null {
  return path ? `${IMAGE_BASE}/${PROFILE_SIZE}${path}` : null;
}

export function castRowPeople(
  tmdbCast: TmdbCastMember[],
  tvmazeCast: TvMazeCastMember[],
  creators: TmdbCreator[],
  crew: TmdbCrewMember[],
): CastRowPerson[] {
  const cast: CastRowPerson[] = (
    tmdbCast.length > 0
      ? tmdbCast.map((member, index) => ({
          key: `cast-${index}-${member.name}`,
          name: member.name,
          imageUrl: profileUrl(member.profilePath),
          role: member.character,
        }))
      : tvmazeCast.map((member, index) => ({
          key: `cast-${index}-${member.personId}`,
          name: member.name,
          imageUrl: member.imageUrl,
          role: member.character,
        }))
  ).slice(0, CAST_MAX);

  // The crew by person, keeping the first portrait found and every job,
  // in KEY_CREW_JOBS' order after "Creator".
  const byName = new Map<
    string,
    { name: string; jobs: string[]; profilePath: string | null }
  >();
  const add = (name: string, job: string, profilePath: string | null) => {
    const person = byName.get(name) ?? { name, jobs: [], profilePath: null };
    if (!person.jobs.includes(job)) {
      person.jobs.push(job);
    }
    person.profilePath ??= profilePath;
    byName.set(name, person);
  };
  creators.forEach((creator) =>
    add(creator.name, CREATOR, creator.profilePath),
  );
  const rank = (job: string) =>
    job === CREATOR ? -1 : KEY_CREW_JOBS.indexOf(job);
  [...crew]
    .sort((a, b) => rank(a.job) - rank(b.job))
    .forEach((member) => add(member.name, member.job, member.profilePath));

  const crewPeople: CastRowPerson[] = [...byName.values()]
    .sort((a, b) => rank(a.jobs[0]) - rank(b.jobs[0]))
    .map((person, index) => ({
      key: `crew-${index}-${person.name}`,
      name: person.name,
      imageUrl: profileUrl(person.profilePath),
      role: [...person.jobs].sort((a, b) => rank(a) - rank(b)).join(", "),
    }));

  return [...cast, ...crewPeople].slice(0, ROW_MAX);
}

// A circle's initials for a person without a portrait (owner, 2026-11-08,
// as Apple TV): the first letters of the first and last name.
export function personInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "";
  }
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}
