// Where the saved query cache is kept on the phone (ADR 0017, CRI-139):
// SQLite (expo-sqlite's key-value store), not AsyncStorage. The cache is
// saved as one entry of several MB; on Android, AsyncStorage holds about
// 6 MB in all and may fail to read back an entry over about 2 MB, while
// expo-sqlite has neither limit. It works in Expo Go.
//
// Versions before CRI-139 saved the cache in AsyncStorage: the first read
// carries that copy over, so an update does not open on an empty cache,
// and removes it there.

export type KeyValueStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export function createSavedCacheStorage(
  store: KeyValueStore,
  oldStore: KeyValueStore,
): KeyValueStore {
  return {
    getItem: async (key) => {
      const saved = await store.getItem(key);
      const old = await oldStore.getItem(key).catch(() => null);
      if (old !== null) {
        await oldStore.removeItem(key).catch(() => {});
      }
      if (saved !== null || old === null) {
        return saved;
      }
      await store.setItem(key, old);
      return old;
    },
    setItem: (key, value) => store.setItem(key, value),
    removeItem: (key) => store.removeItem(key),
  };
}
