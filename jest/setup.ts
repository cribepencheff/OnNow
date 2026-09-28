jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// The app reads safe-area insets (Home's pull-to-refresh indicator); at
// runtime React Navigation provides them, but tests render screens without a
// SafeAreaProvider, so useSafeAreaInsets would throw. The library's own mock
// returns zero insets in that case.
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);
