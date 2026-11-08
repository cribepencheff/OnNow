// Who Show detail's Cast & Crew row shows, in order (CRI-143, owner
// 2026-11-08): the cast from TMDB, whose portraits are current, else
// TVmaze's when TMDB lists none (or there is no key); then the show's
// creators from TMDB as "Creator". A missing portrait or character stays
// missing (data first).

import {
  IMAGE_BASE,
  type TmdbCastMember,
  type TmdbCreator,
} from "@/api/tmdb-types";
import type { TvMazeCastMember } from "@/api/tvmaze-types";

export interface CastRowPerson {
  key: string;
  name: string;
  imageUrl: string | null;
  // The character, "Creator", or null.
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
): CastRowPerson[] {
  const cast: CastRowPerson[] =
    tmdbCast.length > 0
      ? tmdbCast.map((member, index) => ({
          key: `tmdb-${index}-${member.name}`,
          name: member.name,
          imageUrl: profileUrl(member.profilePath),
          role: member.character,
        }))
      : tvmazeCast.map((member, index) => ({
          key: `tvmaze-${index}-${member.personId}`,
          name: member.name,
          imageUrl: member.imageUrl,
          role: member.character,
        }));
  return [
    ...cast,
    ...creators.map((creator, index) => ({
      key: `creator-${index}-${creator.name}`,
      name: creator.name,
      imageUrl: profileUrl(creator.profilePath),
      role: "Creator",
    })),
  ];
}
