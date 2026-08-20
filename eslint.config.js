// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      'no-console': 'warn',
      // Known false positive with Reanimated shared-value writes.
      'react-hooks/immutability': 'off',
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
