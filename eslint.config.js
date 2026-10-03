const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const SOURCE_SYNTAX = [
  {
    selector: "NewExpression[callee.object.name='Intl'][callee.property.name='DateTimeFormat']",
    message: 'Use the centralized date formatter instead.',
  },
  {
    selector: "MemberExpression[object.name='Platform'][property.name='OS']",
    message: 'Use IS_WEB, IS_NATIVE, IS_ANDROID, IS_IOS or IS_TAURI from @/shared/constants.',
  },
  {
    selector: "ImportDeclaration[source.value='react'] > ImportNamespaceSpecifier",
    message: 'Import React APIs by name.',
  },
];

const TYPE_SCALE_SYNTAX = [
  {
    selector: "JSXAttribute[name.name='className'] Literal[value=/\\btext-(xs|sm|base|lg|xl|[2-9]xl)\\b/]",
    message: 'Use a Text variant or the text-micro/caption/body/subhead/display tokens.',
  },
  {
    selector: "JSXAttribute[name.name='className'] Literal[value=/\\btext-\\[\\d+px\\]/]",
    message: 'Use a Text variant or the text-micro/caption/body/subhead/display tokens.',
  },
];

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
    ignores: ['src/shared/libs/date.ts', 'src/shared/constants/common.constant.ts'],
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
      'no-restricted-syntax': ['error', ...SOURCE_SYNTAX],
    },
  },
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/shared/components/ui/**'],
    rules: {
      'no-restricted-syntax': ['error', ...SOURCE_SYNTAX, ...TYPE_SCALE_SYNTAX],
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
