// Field names and shapes follow the TVmaze API as returned, unchanged
// (principle: data first). See docs/spikes/0001-tvmaze-data-quality.md
// for the fields this app relies on and docs/decisions/0005-data-sources.md.

export interface TvMazeImage {
  medium: string | null;
  original: string | null;
}

export interface TvMazeNetwork {
  id: number;
  name: string;
  country: {
    name: string;
    code: string;
    timezone: string;
  } | null;
  officialSite: string | null;
}

export interface TvMazeShow {
  id: number;
  url: string;
  name: string;
  type: string;
  language: string | null;
  genres: string[];
  status: string;
  runtime: number | null;
  averageRuntime: number | null;
  premiered: string | null;
  ended: string | null;
  officialSite: string | null;
  network: TvMazeNetwork | null;
  webChannel: TvMazeNetwork | null;
  image: TvMazeImage | null;
  summary: string | null;
  _links: {
    self: { href: string };
    previousepisode?: { href: string; name: string };
    nextepisode?: { href: string; name: string };
  };
}

export interface TvMazeSearchResult {
  score: number;
  show: TvMazeShow;
}

export interface TvMazeSeason {
  id: number;
  url: string;
  number: number;
  name: string;
  episodeOrder: number | null;
  premiereDate: string | null;
  endDate: string | null;
  network: TvMazeNetwork | null;
  webChannel: TvMazeNetwork | null;
  image: TvMazeImage | null;
  summary: string | null;
}

export interface TvMazeEpisode {
  id: number;
  url: string;
  name: string;
  season: number;
  number: number | null;
  type: string;
  airdate: string;
  airtime: string;
  airstamp: string;
  runtime: number | null;
  image: TvMazeImage | null;
  summary: string | null;
}

export interface TvMazeShowWithEmbeds extends TvMazeShow {
  _embedded: {
    episodes: TvMazeEpisode[];
    seasons: TvMazeSeason[];
  };
}
