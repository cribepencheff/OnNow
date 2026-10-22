jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// The app reads safe-area insets (Home's pull-to-refresh indicator); at
// runtime React Navigation provides them, but tests render screens without a
// SafeAreaProvider, so useSafeAreaInsets would throw. The library's own mock
// returns zero insets in that case.
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

// Reanimated (Home's poster dimming, CRI-124) runs worklets on the UI
// thread, which tests do not have; both libraries ship their own mocks.
jest.mock("react-native-worklets", () =>
  require("react-native-worklets/lib/module/mock"),
);
jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

// The saved query cache's SQLite key-value store (CRI-139) is native;
// tests keep it in memory.
jest.mock("expo-sqlite/kv-store", () => {
  const values = new Map<string, string>();
  const Storage = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  };
  return { __esModule: true, default: Storage, AsyncStorage: Storage };
});
