import { render, screen } from "@testing-library/react-native";

import type { TvMazeShow } from "@/api/tvmaze-types";
import { useRelatedShows } from "@/hooks/useRelatedShows";
import { RelatedRow } from "./RelatedRow";

jest.mock("@/hooks/useRelatedShows", () => ({ useRelatedShows: jest.fn() }));
jest.mock("@/hooks/useFollowList", () => ({
  useFollowToggle: () => ({ followed: false, toggle: jest.fn() }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const mocked = useRelatedShows as jest.Mock;
const SHOW = { id: 75026, name: "MobLand" } as unknown as TvMazeShow;

// CRI-143, owner 2026-11-08: Show detail's Related row.
describe("RelatedRow (CRI-143)", () => {
  it("shows TMDB's recommendations as poster cards, under Related", async () => {
    mocked.mockReturnValue({
      cards: [
        {
          tmdbId: 85021,
          tvmazeId: 46562,
          name: "Gangs of London",
          posterPath: "/gol.jpg",
        },
      ],
      isLoading: false,
    });
    await render(<RelatedRow show={SHOW} detailPathname="/show/[id]" />);
    expect(screen.getByText("Related")).toBeTruthy();
    expect(screen.getAllByTestId("related-show")).toHaveLength(1);
  });

  it("shows no row when TMDB recommends nothing", async () => {
    mocked.mockReturnValue({ cards: [], isLoading: false });
    await render(<RelatedRow show={SHOW} detailPathname="/show/[id]" />);
    expect(screen.queryByText("Related")).toBeNull();
  });
});
