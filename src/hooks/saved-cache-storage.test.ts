import {
  createSavedCacheStorage,
  type KeyValueStore,
} from "./saved-cache-storage";

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & {
  values: Map<string, string>;
} {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  };
}

// CRI-139: the saved query cache moves from AsyncStorage to SQLite, and a
// copy saved by an earlier version is carried over once, not lost.
describe("createSavedCacheStorage", () => {
  it("reads and writes the new store", async () => {
    const store = memoryStore();
    const storage = createSavedCacheStorage(store, memoryStore());
    await storage.setItem("cache", "new");
    expect(await storage.getItem("cache")).toBe("new");
    await storage.removeItem("cache");
    expect(store.values.has("cache")).toBe(false);
  });

  it("carries over a copy from the old store, then removes it there", async () => {
    const store = memoryStore();
    const old = memoryStore({ cache: "saved before" });
    const storage = createSavedCacheStorage(store, old);
    expect(await storage.getItem("cache")).toBe("saved before");
    expect(store.values.get("cache")).toBe("saved before");
    expect(old.values.has("cache")).toBe(false);
  });

  it("prefers the new store, and still clears the old one", async () => {
    const store = memoryStore({ cache: "new" });
    const old = memoryStore({ cache: "old" });
    const storage = createSavedCacheStorage(store, old);
    expect(await storage.getItem("cache")).toBe("new");
    expect(old.values.has("cache")).toBe(false);
  });

  it("starts empty when the old copy cannot be read", async () => {
    const old = memoryStore();
    old.getItem = async () => {
      throw new Error("Row too big to fit into CursorWindow");
    };
    const storage = createSavedCacheStorage(memoryStore(), old);
    expect(await storage.getItem("cache")).toBeNull();
  });
});
