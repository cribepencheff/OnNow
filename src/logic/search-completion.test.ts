import suggestions from "@/api/fixtures/tmdb-search-suggest.json";
import maffiablod from "@/api/fixtures/tmdb-search-maffiablod.json";
import {
  completeLastWord,
  knownAsLine,
  matchingTranslation,
  needsCompletion,
  translatedCandidate,
} from "./search-completion";

// Real TMDB search answers for half-typed queries (2026-10-23).
const titles = (query: keyof typeof suggestions) => suggestions[query];

// CRI-142: TVmaze's search matches whole words only, so a half-typed last
// word is completed from TMDB's titles before searching TVmaze.
describe("completeLastWord (CRI-142)", () => {
  it.each([
    ["slow h", "slow Horses"],
    ["slow hor", "slow Horses"],
    ["chicag", "Chicago"],
    ["severan", "Severance"],
  ] as const)("completes %p to %p", (query, completed) => {
    expect(completeLastWord(query, titles(query))).toBe(completed);
  });

  // TMDB names some shows in English; the original title has the word.
  it("completes from the original title (Cecilias Unge, Bäst i test)", () => {
    expect(completeLastWord("cecilias un", titles("cecilias un"))).toBe(
      "cecilias unge",
    );
    expect(completeLastWord("bäst i t", titles("bäst i t"))).toBe(
      "bäst i test",
    );
  });

  it("leaves a query alone when no title word starts with its last word", () => {
    expect(completeLastWord("sl", titles("sl"))).toBe("sl");
  });

  it("leaves a word alone that already is a whole title word", () => {
    expect(completeLastWord("the be", titles("the be"))).toBe("the be");
    expect(
      completeLastWord("slow", [{ name: "Slow Horses", original_name: null }]),
    ).toBe("slow");
  });

  it("prefers a title with the query's earlier words", () => {
    expect(
      completeLastWord("slow h", [
        { name: "Heroes", original_name: "Heroes" },
        { name: "Slow Horses", original_name: "Slow Horses" },
      ]),
    ).toBe("slow Horses");
  });

  it("matches without accents or case, and keeps the title's spelling", () => {
    expect(
      completeLastWord("pokemon c", [
        { name: "Pokémon Concierge", original_name: null },
      ]),
    ).toBe("pokemon Concierge");
  });
});

describe("needsCompletion (CRI-142)", () => {
  it("is true while the last word is being typed", () => {
    expect(needsCompletion("slow h")).toBe(true);
    expect(needsCompletion("chicag")).toBe(true);
  });

  it("is false after a space or with nothing typed", () => {
    expect(needsCompletion("slow ")).toBe(false);
    expect(needsCompletion("")).toBe(false);
    expect(needsCompletion("   ")).toBe(false);
  });
});

// Owner, 2026-10-23: "Maffiablod" is This City Is Ours' Swedish title.
// TVmaze knows only the original; TMDB finds it by its translations.
describe("translatedCandidate", () => {
  it("is TMDB's top show when none of its titles has the query's words", () => {
    expect(translatedCandidate("maffiablod", maffiablod.search)).toEqual({
      id: 255570,
      originalName: "This City Is Ours",
    });
  });

  it("is none when the top show's own title has them", () => {
    expect(
      translatedCandidate("slow h", [
        { id: 1, name: "Slow Horses", original_name: "Slow Horses" },
      ]),
    ).toBeNull();
    expect(
      translatedCandidate("cecilias unge", [
        { id: 2, name: "Cecilias boy", original_name: "Cecilias unge" },
      ]),
    ).toBeNull();
  });

  it("is none without an answer", () => {
    expect(translatedCandidate("maffiablod", [])).toBeNull();
  });
});

describe("matchingTranslation", () => {
  it("finds the translation the query matches, with its language", () => {
    expect(matchingTranslation("maffiablod", maffiablod.translations)).toEqual({
      name: "Maffiablod",
      language: "Swedish",
    });
    expect(matchingTranslation("maffiabl", maffiablod.translations)).toEqual({
      name: "Maffiablod",
      language: "Swedish",
    });
  });

  it("is none when no translation matches", () => {
    expect(matchingTranslation("the bear", maffiablod.translations)).toBeNull();
  });
});

describe("knownAsLine", () => {
  it('says the title and its language ("Maffiablod in Swedish")', () => {
    expect(knownAsLine({ name: "Maffiablod", language: "Swedish" })).toBe(
      "Maffiablod in Swedish",
    );
  });
});
