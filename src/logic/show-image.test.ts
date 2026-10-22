import { chooseShowImage } from "./show-image";

// CRI-100 (owner, 2026-10-22): the hero's and Show detail's image is
// TMDB's backdrop; without one, TVmaze's poster, then TMDB's, cropped from
// the top; without any image, none.
describe("chooseShowImage (CRI-100)", () => {
  const poster = {
    medium: "https://static.tvmaze.com/m.jpg",
    original: "https://static.tvmaze.com/o.jpg",
  };

  it("takes TMDB's backdrop first, at its own shape", () => {
    expect(
      chooseShowImage(
        { file_path: "/b.jpg", width: 3840, height: 2160 },
        poster,
      ),
    ).toEqual({ kind: "tmdb", path: "/b.jpg", aspectRatio: 3840 / 2160 });
  });

  it("assumes 16:9 for a backdrop without a size", () => {
    expect(
      chooseShowImage({ file_path: "/b.jpg", width: 0, height: 0 }, null),
    ).toMatchObject({ aspectRatio: 16 / 9 });
  });

  it("falls back to TVmaze's poster, the large one sharp and the medium one small", () => {
    expect(chooseShowImage(null, poster)).toEqual({
      kind: "poster",
      sharp: poster.original,
      small: poster.medium,
    });
  });

  it("takes TVmaze's one size for both when it has only one", () => {
    expect(
      chooseShowImage(undefined, { medium: poster.medium, original: null }),
    ).toEqual({ kind: "poster", sharp: poster.medium, small: poster.medium });
  });

  it("is none without any image (The Girl with the Dragon Tattoo, not yet out)", () => {
    expect(chooseShowImage(null, null)).toEqual({ kind: "none" });
    expect(
      chooseShowImage(undefined, { medium: null, original: null }),
    ).toEqual({ kind: "none" });
  });

  // Cecilias Unge: no TVmaze image, but TMDB has a poster.
  it("takes TMDB's poster when TVmaze has none", () => {
    expect(chooseShowImage(null, null, "/p.jpg")).toEqual({
      kind: "poster",
      sharp: "https://image.tmdb.org/t/p/w780/p.jpg",
      small: "https://image.tmdb.org/t/p/w185/p.jpg",
    });
  });

  it("prefers TVmaze's poster to TMDB's", () => {
    expect(chooseShowImage(null, poster, "/p.jpg")).toMatchObject({
      sharp: poster.original,
    });
  });
});
