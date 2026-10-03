const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      'no-console': 'error',
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
    files: ['src/core/services/log.ts', 'scripts/**/*.{ts,mjs}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
