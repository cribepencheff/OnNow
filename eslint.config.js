// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ["dist/*"],
  },
  // CRI-117: every navigation goes through the shared guard, so a double
  // tap opens a screen or a link only once.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "expo-router",
              importNames: ["useRouter", "router", "Link"],
              message: "Navigate with useGuardedRouter (CRI-117).",
            },
            {
              name: "expo-linking",
              message: "Open links with openExternalUrl (CRI-117).",
            },
            {
              name: "react-native",
              importNames: ["Linking"],
              message: "Open links with openExternalUrl (CRI-117).",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/hooks/useGuardedRouter.ts",
      "**/*.test.ts",
      "**/*.test.tsx",
      "jest/**",
    ],
    rules: { "no-restricted-imports": "off" },
  },
]);
