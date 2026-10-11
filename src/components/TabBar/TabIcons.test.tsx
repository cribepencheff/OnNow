import { render } from "@testing-library/react-native";

import { CalendarIcon, HomeIcon, MyShowsIcon, SearchIcon } from "./TabIcons";

// CRI-133: the active tab's icon is drawn filled, except Search's, which
// stays an outline with only the pill behind it.
describe("tab icons", () => {
  it.each([
    ["Home", HomeIcon],
    ["Calendar", CalendarIcon],
    ["My shows", MyShowsIcon],
  ])("%s is drawn differently (filled) when active", async (_name, Icon) => {
    const outline = (await render(<Icon active={false} />)).toJSON();
    const filled = (await render(<Icon active />)).toJSON();
    expect(filled).not.toEqual(outline);
  });

  it("Search stays the same outline when active", async () => {
    const outline = (await render(<SearchIcon active={false} />)).toJSON();
    const active = (await render(<SearchIcon active />)).toJSON();
    expect(active).toEqual(outline);
  });
});
