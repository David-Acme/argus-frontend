// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

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
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/libs/date.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['date-fns', 'date-fns/*'],
              message: 'Use the centralized date formatter instead.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "NewExpression[callee.object.name='Intl'][callee.property.name='DateTimeFormat']",
          message: 'Use the centralized date formatter instead.',
        },
      ],
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
