const { defineConfig } = require('eslint/config');
const { builtinRules } = require('eslint/use-at-your-own-risk');
const expoConfig = require('eslint-config-expo/flat');
const betterTailwind = require('eslint-plugin-better-tailwindcss');
const i18next = require('eslint-plugin-i18next');
const sonarjs = require('eslint-plugin-sonarjs');

const SOURCE = 'src/**/*.{ts,tsx}';
const COMPONENTS = 'src/**/*.tsx';
const DESIGN_SYSTEM = ['src/shared/ui/**', 'src/shared/components/ui/**'];
const THEME = 'src/shared/theme/**';
const LOCALES = 'src/core/i18n/locales/**';
const GENERATED = ['uniwind-types.d.ts', 'expo-env.d.ts', '.expo/**'];

const restrictedImports = builtinRules.get('no-restricted-imports');
const restrictedSyntax = builtinRules.get('no-restricted-syntax');

const argus = {
  meta: { name: 'argus' },
  rules: {
    'date-formatter-home': restrictedImports,
    'icon-registry-home': restrictedImports,
    'no-rn-animated': restrictedImports,
    'ds-owns-primitives': restrictedImports,
    'activity-indicator-home': restrictedImports,
    'responsive-home': restrictedImports,
    'http-home': restrictedImports,
    'source-syntax': restrictedSyntax,
    'platform-os-home': restrictedSyntax,
    'intl-date-home': restrictedSyntax,
    'type-scale': restrictedSyntax,
    'no-color-literal': restrictedSyntax,
    'no-template-key': restrictedSyntax,
    'no-visual-timer': restrictedSyntax,
    'no-export-all': restrictedSyntax,
    'no-inline-size': restrictedSyntax,
    'no-http-type-argument': restrictedSyntax,
  },
};

const errorSeverity = (entry) => {
  if (entry === 'warn' || entry === 1) return 'error';
  if (Array.isArray(entry) && (entry[0] === 'warn' || entry[0] === 1))
    return ['error', ...entry.slice(1)];
  return entry;
};

const promoted = (configs) =>
  configs.map((config) =>
    config.rules
      ? {
          ...config,
          rules: Object.fromEntries(
            Object.entries(config.rules).map(([name, entry]) => [name, errorSeverity(entry)])
          ),
        }
      : config
  );

const fromReactNative = (names, message) => ({
  paths: [{ name: 'react-native', importNames: names, message }],
  patterns: [
    {
      group: ['react-native/*'],
      message: `${message} Import from 'react-native' itself, never its internals.`,
    },
  ],
});

const DATE_FORMATTER = 'src/shared/hooks/use-date-formatter/date.ts';
const PLATFORM_FLAGS = 'src/shared/constants/common.constant.ts';

const SOURCE_SYNTAX = [
  {
    selector: "ImportDeclaration[source.value='react'] > ImportNamespaceSpecifier",
    message: 'Import React APIs by name.',
  },
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.property.name=/^(setTimeout|clearTimeout|setInterval|clearInterval|requestAnimationFrame|cancelAnimationFrame)$/]:not([callee.object.name='globalThis']):not([callee.object.name='window'])",
    message:
      'A timer called as a method of another object throws "Illegal invocation" in browsers and WebKit (Hermes tolerates it): call it as a plain function or through globalThis.',
  },
];

const TEMPLATE_KEY_MESSAGE = 'A translation key is a typed literal, never built or cast (rule 27).';
const TRANSLATORS = ['[callee.name=/^tk?$/]', '[callee.property.name=/^tk?$/]'];
const KEY_BUILDERS =
  ":matches(TemplateLiteral[expressions.length>0], BinaryExpression[operator='+'], CallExpression[callee.property.name=/^(concat|join)$/])";

const TEMPLATE_KEY_SYNTAX = [
  ...TRANSLATORS.flatMap((callee) => [
    {
      selector: `CallExpression${callee} > :first-child${KEY_BUILDERS}`,
      message: TEMPLATE_KEY_MESSAGE,
    },
    {
      selector: `CallExpression${callee} > :first-child ${KEY_BUILDERS}`,
      message: TEMPLATE_KEY_MESSAGE,
    },
  ]),
  {
    selector:
      ":matches(TSAsExpression, TSTypeAssertion) > TSTypeReference.typeAnnotation[typeName.name='TranslationKey']",
    message: TEMPLATE_KEY_MESSAGE,
  },
];

const VISUAL_TIMER_MESSAGE =
  'Drive visuals with Reanimated on the UI thread, never a JS timer (rule 26).';
const VISUAL_TIMERS = '/^(setInterval|requestAnimationFrame)$/';

const VISUAL_TIMER_SYNTAX = [
  `CallExpression[callee.name=${VISUAL_TIMERS}]`,
  `MemberExpression[property.name=${VISUAL_TIMERS}]`,
  `MemberExpression[computed=true][property.value=${VISUAL_TIMERS}]`,
  `VariableDeclarator[init.name=${VISUAL_TIMERS}]`,
  `:matches(CallExpression, NewExpression) > Identifier.arguments[name=${VISUAL_TIMERS}]`,
].map((selector) => ({ selector, message: VISUAL_TIMER_MESSAGE }));

const TYPE_SCALE_MESSAGE =
  'Use a Text step (hero, title, headline, body, meta, caption) or a type role from tokens.';

const TYPE_SCALE_SYNTAX = [
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/\\btext-(xs|sm|base|lg|xl|[2-9]xl)\\b/]",
    message: TYPE_SCALE_MESSAGE,
  },
  {
    selector: "JSXAttribute[name.name='className'] Literal[value=/\\btext-\\[\\d+px\\]/]",
    message: TYPE_SCALE_MESSAGE,
  },
];

const COLOR_PATTERN = '/#[0-9a-fA-F]{3,8}\\b|\\b(rgba?|hsla?|oklch)\\(/';
const COLOR_MESSAGE =
  'Colours live in src/shared/theme/tokens.ts: read a colour role, never a literal.';

const SIZE_KEYS =
  '/^(color|backgroundColor|borderColor|tintColor|shadowColor|width|height|minWidth|minHeight|maxWidth|maxHeight|margin|marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical|padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical|top|left|right|bottom|gap|rowGap|columnGap|fontSize|lineHeight|letterSpacing|borderRadius|borderWidth)$/';

const TAILWIND_PALETTE =
  '^(.*:)?-?(bg|text|border|border-[trblxy]|ring|ring-offset|outline|fill|stroke|divide|placeholder|shadow|from|via|to|decoration|caret|accent)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(-\\d+)?(\\/\\d+)?$';

module.exports = defineConfig([
  promoted(expoConfig),
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
    plugins: { argus, sonarjs },
    rules: {
      'no-console': 'error',
      eqeqeq: 'error',
      'react-hooks/immutability': 'off',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-all-duplicated-branches': 'error',
    },
  },
  {
    files: [SOURCE, 'scripts/**/*.{ts,mjs}'],
    ignores: [LOCALES, ...GENERATED],
    rules: {
      complexity: ['error', 15],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true }],
      'max-lines': ['error', { max: 300, skipBlankLines: true }],
      'max-statements': ['error', 30],
      'max-depth': ['error', 3],
      'max-params': ['error', 3],
    },
  },
  {
    files: [SOURCE],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: false },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/no-deprecated': 'error',
      'argus/no-rn-animated': [
        'error',
        fromReactNative(['Animated'], 'Animate with Reanimated on the UI thread (rule 26).'),
      ],
      'argus/no-export-all': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: 'Export each public name explicitly (rule 7).',
        },
      ],
      'argus/no-template-key': ['error', ...TEMPLATE_KEY_SYNTAX],
      'argus/no-http-type-argument': [
        'error',
        {
          selector: "CallExpression[callee.object.name='httpService'][typeArguments]",
          message: 'Validate the response with its schema instead of asserting a type (rule 13).',
        },
      ],
    },
  },
  {
    files: [SOURCE],
    rules: {
      'argus/source-syntax': ['error', ...SOURCE_SYNTAX],
    },
  },
  {
    files: [SOURCE],
    ignores: [PLATFORM_FLAGS],
    rules: {
      'argus/platform-os-home': [
        'error',
        {
          selector: "MemberExpression[object.name='Platform'][property.name='OS']",
          message: 'Use IS_WEB, IS_NATIVE, IS_ANDROID, IS_IOS or IS_TAURI from @/shared/constants.',
        },
      ],
    },
  },
  {
    files: [SOURCE],
    ignores: [DATE_FORMATTER],
    rules: {
      'argus/intl-date-home': [
        'error',
        {
          selector:
            "NewExpression[callee.object.name='Intl'][callee.property.name='DateTimeFormat']",
          message: 'Use the centralized date formatter instead.',
        },
      ],
      'argus/date-formatter-home': [
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
    },
  },
  {
    files: [SOURCE],
    ignores: ['src/shared/constants/icon.constant.ts', 'src/shared/components/ui/icon.tsx'],
    rules: {
      'argus/icon-registry-home': [
        'error',
        {
          patterns: [
            {
              group: ['lucide-react-native', 'lucide-react-native/*'],
              message: 'Icons come from the ICONS registry (rule 10).',
            },
          ],
        },
      ],
    },
  },
  {
    files: [SOURCE],
    ignores: [THEME],
    rules: {
      'argus/no-color-literal': [
        'error',
        { selector: `Literal[value=${COLOR_PATTERN}]`, message: COLOR_MESSAGE },
        { selector: `TemplateElement[value.raw=${COLOR_PATTERN}]`, message: COLOR_MESSAGE },
      ],
    },
  },
  {
    files: [SOURCE],
    ignores: ['src/shared/**'],
    rules: {
      'argus/responsive-home': [
        'error',
        fromReactNative(
          ['useWindowDimensions', 'Dimensions'],
          'Read the window class from src/shared (rule 23).'
        ),
      ],
    },
  },
  {
    files: [SOURCE],
    ignores: DESIGN_SYSTEM,
    rules: {
      'argus/activity-indicator-home': [
        'error',
        fromReactNative(['ActivityIndicator'], 'Loading is drawn by the design system (rule 16).'),
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/widgets/**/*.{ts,tsx}'],
    rules: {
      'argus/ds-owns-primitives': [
        'error',
        fromReactNative(
          [
            'Pressable',
            'TouchableOpacity',
            'TouchableHighlight',
            'TouchableWithoutFeedback',
            'Switch',
            'Modal',
            'Image',
            'FlatList',
            'SectionList',
            'ScrollView',
          ],
          'Use the design system component from src/shared/ui (rule 24).'
        ),
      ],
    },
  },
  {
    files: [COMPONENTS, 'src/**/use-*.ts', 'src/**/hooks/**/*.ts'],
    rules: {
      'argus/http-home': [
        'error',
        {
          patterns: [
            {
              group: ['@/core/services/http', '@/core/services/http/*', '**/http.service'],
              message: 'Components and hooks reach the server through their entity api (rule 18).',
            },
          ],
        },
      ],
    },
  },
  {
    files: [COMPONENTS],
    ignores: DESIGN_SYSTEM,
    plugins: { i18next },
    rules: {
      'argus/type-scale': ['error', ...TYPE_SCALE_SYNTAX],
      'argus/no-visual-timer': ['error', ...VISUAL_TIMER_SYNTAX],
      'i18next/no-literal-string': ['error', { mode: 'jsx-only' }],
    },
  },
  {
    files: [COMPONENTS],
    rules: {
      'argus/no-inline-size': [
        'error',
        {
          selector: `JSXAttribute[name.name='style'] Property[key.name=${SIZE_KEYS}][value.type=/^(Literal|UnaryExpression|TemplateLiteral)$/]`,
          message: 'A colour or a size in a style is read from tokens (rule 22).',
        },
      ],
    },
  },
  {
    files: [SOURCE],
    plugins: { 'better-tailwindcss': betterTailwind },
    settings: { 'better-tailwindcss': { entryPoint: 'src/global.css' } },
    rules: {
      'better-tailwindcss/no-restricted-classes': [
        'error',
        {
          restrict: [
            {
              pattern: '\\[',
              message: 'Arbitrary values are not allowed: use a token class (rule 22).',
            },
            {
              pattern: TAILWIND_PALETTE,
              message: 'The default palette is not allowed: use a colour role (rule 22).',
            },
            {
              pattern: '^(.*:)?text-(xs|sm|base|lg|xl|[2-9]xl)$',
              message: TYPE_SCALE_MESSAGE,
            },
          ],
        },
      ],
      'better-tailwindcss/no-unknown-classes': 'error',
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/no-duplicate-classes': 'error',
      'better-tailwindcss/no-deprecated-classes': 'error',
      'better-tailwindcss/no-unnecessary-whitespace': 'error',
    },
  },
  {
    files: ['src/app/ui-lab.tsx', 'src/features/ui-lab/**/*.tsx'],
    rules: {
      'i18next/no-literal-string': 'off',
    },
  },
  {
    files: ['src/core/services/log.ts', 'scripts/**/*.{ts,mjs}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/**', 'android/**', 'ios/**', 'src-tauri/target/**', 'src-tauri/gen/**'],
  },
]);
