import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useLocales } from "expo-localization";

import { FALLBACK_REGION } from "@/logic/region";
import { getStoredRegion } from "@/storage/region";
import { useRegion } from "./useRegion";
import { createTestQueryClient, wrapperWithQueryClient } from "./test-utils";

jest.mock("expo-localization", () => ({ useLocales: jest.fn() }));

const mockedUseLocales = useLocales as jest.Mock;

function phoneRegion(regionCode: string | null) {
  mockedUseLocales.mockReturnValue([{ regionCode }]);
}

describe("useRegion (FR-016, CRI-88, ADR 0014)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  async function renderRegion() {
    const client = createTestQueryClient();
    const rendered = await renderHook(() => useRegion(), {
      wrapper: wrapperWithQueryClient(client),
    });
    return { ...rendered, client };
  }

  it("uses the phone's region and stores it", async () => {
    phoneRegion("SE");
    const { result, unmount, client } = await renderRegion();

    await waitFor(() => expect(result.current.region).toBe("SE"));
    await waitFor(async () =>
      expect(await getStoredRegion()).toEqual({ code: "SE", source: "device" }),
    );

    await unmount();
    client.unmount();
  });

  it("falls back when the phone has no region", async () => {
    phoneRegion(null);
    const { result, unmount, client } = await renderRegion();

    await waitFor(() => expect(result.current.region).toBe(FALLBACK_REGION));

    await unmount();
    client.unmount();
  });

  it("keeps a manual region over the phone's, and can go back to the phone's", async () => {
    phoneRegion("SE");
    const { result, unmount, client } = await renderRegion();
    await waitFor(() => expect(result.current.region).toBe("SE"));

    await act(async () => result.current.setRegion("GB"));
    await waitFor(() => expect(result.current.region).toBe("GB"));
    expect(result.current.isManual).toBe(true);
    expect(await getStoredRegion()).toEqual({ code: "GB", source: "manual" });

    await act(async () => result.current.followDeviceRegion());
    await waitFor(() => expect(result.current.region).toBe("SE"));
    expect(result.current.isManual).toBe(false);

    await unmount();
    client.unmount();
  });

  it("follows a change of the phone's region when there is no override", async () => {
    await AsyncStorage.setItem(
      "onnow.region",
      JSON.stringify({ code: "SE", source: "device" }),
    );
    phoneRegion("NL");
    const { result, unmount, client } = await renderRegion();

    await waitFor(() => expect(result.current.region).toBe("NL"));

    await unmount();
    client.unmount();
  });
});
