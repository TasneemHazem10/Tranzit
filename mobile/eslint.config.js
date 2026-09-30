// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Reanimated shared values are mutable by design; `foo.value = ...` is the
    // supported API, not a React state mutation. The `refs` and
    // `set-state-in-effect` rules also false-positive on Reanimated + Gesture
    // Handler patterns (shared values are refs, count-ups update text from
    // `runOnJS`), so they are disabled app-wide.
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
