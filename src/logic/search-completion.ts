// Query auto-completion for Search (CRI-142, owner 2026-10-23). TVmaze's
// search matches whole words only, and Search runs while typing, so a
// half-typed last word finds nothing or the wrong shows ("slow h": none).
// TMDB's search takes a partial last word, so its titles complete the word
// ("h" → "Horses"), and TVmaze is then searched with the whole word. The
// results stay TVmaze's; TMDB only improves the query.

export interface SuggestedTitle {
  // TMDB's id, for its translations (translatedCandidate).
  id?: number;
  name: string;
  // The title in its own language ("Cecilias unge" for "Cecilias boy").
  original_name: string | null;
}

// A last word still being typed: something typed, and no space after it.
export function needsCompletion(query: string): boolean {
  return query.trim().length > 0 && !/\s$/.test(query);
}

// Case and accents aside: "Pokémon" matches "pokemon".
function fold(word: string): string {
  return word.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function wordsOf(title: string): string[] {
  return title.split(/[^\p{L}\p{N}']+/u).filter(Boolean);
}

// The query with its last word completed from the first title that has a
// word starting with it: original titles before translated ones, and
// titles with the query's earlier words first. Unchanged when the last
// word is already a whole word of that title, or no title word starts with
// it. Only the completed word takes the title's spelling.
export function completeLastWord(
  query: string,
  titles: readonly SuggestedTitle[],
): string {
  if (!needsCompletion(query)) {
    return query;
  }
  const words = query.trim().split(/\s+/);
  const last = fold(words[words.length - 1]);
  const earlier = words.slice(0, -1).map(fold);
  const candidates = titles.flatMap((title) =>
    title.original_name ? [title.original_name, title.name] : [title.name],
  );
  const hasEarlier = (title: string) => {
    const titleWords = wordsOf(title).map(fold);
    return earlier.every((word) => titleWords.includes(word));
  };
  const ordered = [
    ...candidates.filter(hasEarlier),
    ...candidates.filter((title) => !hasEarlier(title)),
  ];
  for (const title of ordered) {
    const titleWords = wordsOf(title);
    if (titleWords.some((word) => fold(word) === last)) {
      return query;
    }
    const completion = titleWords.find((word) => fold(word).startsWith(last));
    if (completion) {
      return [...words.slice(0, -1), completion].join(" ");
    }
  }
  return query;
}

// The query's words found in a title: each whole, the last also as the
// start of a word (still being typed).
function hasQueryWords(query: string, title: string): boolean {
  const words = query.trim().split(/\s+/).map(fold);
  const titleWords = wordsOf(title).map(fold);
  return words.every((word, index) =>
    index === words.length - 1
      ? titleWords.some((titleWord) => titleWord.startsWith(word))
      : titleWords.includes(word),
  );
}

// A show TMDB found by a translated title (owner, 2026-10-23): its top
// result when neither its name nor its original title has the query's
// words ("maffiablod" finds This City Is Ours by its Swedish title). TVmaze
// knows only the original, so Search also looks that up.
export function translatedCandidate(
  query: string,
  titles: readonly SuggestedTitle[],
): { id: number; originalName: string } | null {
  const top = titles[0];
  if (!top || top.id === undefined) {
    return null;
  }
  const own = [top.name, top.original_name].filter((title): title is string =>
    Boolean(title),
  );
  if (own.some((title) => hasQueryWords(query, title))) {
    return null;
  }
  return { id: top.id, originalName: top.original_name ?? top.name };
}

export interface TmdbTranslation {
  // The language's English name ("Swedish").
  english_name: string;
  name: string;
}

// The translation the query matched, with its language: the row says why
// a show with another title is there.
export function matchingTranslation(
  query: string,
  translations: readonly TmdbTranslation[],
): { name: string; language: string } | null {
  const match = translations.find(
    (translation) =>
      translation.name !== "" && hasQueryWords(query, translation.name),
  );
  return match ? { name: match.name, language: match.english_name } : null;
}

// "Maffiablod in Swedish".
export function knownAsLine(match: { name: string; language: string }): string {
  return `${match.name} in ${match.language}`;
}
