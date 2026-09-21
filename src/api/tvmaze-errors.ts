export class TvMazeNetworkError extends Error {
  constructor(cause: unknown) {
    super("Failed to reach TVmaze");
    this.name = "TvMazeNetworkError";
    this.cause = cause;
  }
}

export class TvMazeResponseError extends Error {
  readonly status: number;

  constructor(status: number, url: string) {
    super(`TVmaze responded with ${status} for ${url}`);
    this.name = "TvMazeResponseError";
    this.status = status;
  }
}
