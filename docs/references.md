# Frontend references

Every person and every agent who works on the frontend reads this file before
deciding a question it covers. Each source has a short key in square brackets.
`AGENTS.md` and `docs/plans/frontend-rules-final.md` cite these keys, so a rule
can be traced to the document that justifies it.

The list is curated. A source is here because it is the authority for a
specific question, not because it is popular. Blog posts and tutorials are not
listed. When one of them inspired a decision, the decision cites the primary
source it rests on.

Links were checked on 2026-10-20. Versions are those installed on `09cf103`:
Expo SDK 57, React Native 0.86, React 19.2, Reanimated 4.5, Expo Router 57,
TypeScript 6.0, zod 4.4, ESLint 9.39, eslint-plugin-react-hooks 7.1,
react-native-web 0.21. When a page documents a different version, read the
page for the installed version.

## How to settle a question

1. **API behaviour** (what a function, prop or config does) is settled by the
   official docs of the installed version of that library. Read the page for
   the version in `package.json`. When the docs and the library's source code
   disagree, the source code wins. Record the disagreement in the slice's
   `CONTEXT.md`.
2. **Accessibility thresholds** (contrast, target size, motion, reflow, status
   messages) are settled by WCAG 2.2 [wcag22]. It is normative, so it beats a
   design system's own number. When WCAG and Apple or Material differ, the
   stricter value wins. For touch targets, for example, the spec uses 48 dp
   (Material) on Android, 44 pt (Apple) on iOS, and never less than WCAG's
   24 px on a pointer.
3. **Platform idioms** (sheets, alerts, Back, haptics, menus) are settled by
   Apple's HIG [hig-*] on iOS and macOS, and by Material 3 [m3-*] on Android.
   On desktop (Tauri, web) the platform's own conventions apply: dialogs, Esc,
   focus, shortcuts. The redesign spec §8c turns them into Argus rules.
4. **Writing for users** (error messages, confirmations, empty states, tone)
   is settled by Nielsen Norman Group research [nng-*] and the HIG/M3 writing
   guides. Argus's own voice is in the redesign spec §12.
5. **Argus values** (colours, type steps, spacing, the 26 components, motion
   springs, the performance tier) are set by the redesign spec
   (`docs/plans/redesign-spec.md`). No external source overrides them, but
   accessibility (point 2) caps them.
6. **Code shape and architecture** are settled by this repo's rules
   (`AGENTS.md`). The rules cite [fsd-*], [react-*] and [ts-*] for their
   reasoning.
7. When two sources still conflict, write down both, pick the safer choice
   (fail closed, the more accessible option, less code), and ask the owner.

## React, React Native, Expo

| Key | Source | It is the authority for |
|---|---|---|
| [react-rules] | [Rules of React](https://react.dev/reference/rules) | purity, hooks at top level, immutable props and state; what the compiler assumes |
| [react-effects] | [You might not need an effect](https://react.dev/learn/you-might-not-need-an-effect) | when an effect is wrong (derived state, event logic, chains of effects) |
| [react-pure] | [Keeping components pure](https://react.dev/learn/keeping-components-pure) | render without side effects |
| [react-state] | [Choosing the state structure](https://react.dev/learn/choosing-the-state-structure) | no redundant or duplicated state; one source per datum |
| [react-compiler] | [React Compiler introduction](https://react.dev/learn/react-compiler/introduction) | memoization policy: rely on the compiler for new code; `useMemo`/`useCallback` only as an escape hatch (for example, an effect dependency); existing manual memoization is removed only with tests |
| [react-compiler-adopt] | [Incremental adoption](https://react.dev/learn/react-compiler/incremental-adoption) | how the compiler skips code it cannot compile and how to find it |
| [react-memo] | [memo](https://react.dev/reference/react/memo) | what `memo` does and why it is rarely needed under the compiler |
| [react-hooks-lint] | [eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks) | the 17 rules of `recommended` (rules of hooks, exhaustive deps and the compiler's diagnostics: `immutability`, `purity`, `refs`, `set-state-in-effect`, `static-components`, …) |
| [expo-compiler] | [Expo: React Compiler](https://docs.expo.dev/guides/react-compiler/) | how the compiler is enabled in Expo (`experiments.reactCompiler`) |
| [expo-eslint] | [Expo: Using ESLint and Prettier](https://docs.expo.dev/guides/using-eslint/) | the base config (`eslint-config-expo/flat`) and `expo lint` |
| [expo-router] | [Expo Router core concepts](https://docs.expo.dev/router/basics/core-concepts/) | routes are files under `app/`; layouts; why a route stays a one-line re-export |
| [expo-auth] | [Expo Router authentication](https://docs.expo.dev/router/advanced/authentication/) | protected routes and redirect patterns (the base for fail-closed gates) |
| [expo-modals] | [Expo Router modals](https://docs.expo.dev/router/advanced/modals/) | route-level sheets (`formSheet`, detents) |
| [expo-async-routes] | [Expo Router async routes](https://docs.expo.dev/router/reference/async-routes/) | lazy route bundles: opt-in on SDK 57, stable on web from SDK 58, development-only on native |
| [expo-atlas] | [Analyzing bundles](https://docs.expo.dev/guides/analyzing-bundles/) | how to see what fills the web bundle (Expo Atlas) |
| [expo-image] | [expo-image](https://docs.expo.dev/versions/latest/sdk/image/) | image caching, placeholders, transitions and `recyclingKey` in lists |
| [expo-haptics] | [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) | the haptic kinds; Android haptics without the vibrate permission |
| [expo-localization] | [expo-localization](https://docs.expo.dev/versions/latest/sdk/localization/) | device locale, region and 12/24-hour clock |
| [expo-unit] | [Expo unit testing](https://docs.expo.dev/develop/unit-testing/) | the supported component-test path (jest-expo), our fallback runner |
| [expo-router-test] | [Expo Router testing](https://docs.expo.dev/router/reference/testing/) | `renderRouter` for navigation tests |
| [expo-e2e] | [E2E tests on EAS (Maestro)](https://docs.expo.dev/build-reference/e2e-tests/) | Maestro flows for Expo apps |
| [rn-perf] | [React Native performance overview](https://reactnative.dev/docs/performance) | the 16.67 ms frame budget, JS thread versus UI thread, profiling only in release builds, `console` in release, list alternatives (FlashList, Legend List) |
| [rn-flatlist] | [Optimizing FlatList configuration](https://reactnative.dev/docs/optimizing-flatlist-configuration) | virtualization terms and why stable item layout matters |
| [rn-a11y] | [React Native accessibility](https://reactnative.dev/docs/accessibility) | `accessibilityLabel`/`aria-*`, `role`, live regions and states on native |
| [rn-a11yinfo] | [AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo) | reduce motion, reduce transparency, bold text, high-contrast text on each OS |
| [rn-text] | [Text](https://reactnative.dev/docs/text) | `allowFontScaling` and `maxFontSizeMultiplier` |
| [rn-perf-api] | [performance](https://reactnative.dev/docs/global-performance), [PerformanceMark](https://reactnative.dev/docs/global-PerformanceMark), [RN 0.83 release](https://reactnative.dev/blog/2025/12/10/react-native-0.83) | `performance.mark`/`measure` and `PerformanceObserver` on React Native, for the startup marks |
| [rngh-pressable] | [RNGH Pressable](https://docs.swmansion.com/react-native-gesture-handler/docs/components/pressable) | press feedback that runs on the UI thread and cancels when a parent scrolls |
| [hermes-intl] | [Hermes Intl APIs](https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md) | which `Intl` APIs exist on Hermes per OS (date, number, plural formatting) |

## Animation and lists

| Key | Source | It is the authority for |
|---|---|---|
| [rea-perf] | [Reanimated performance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance) | animate `transform`/`opacity`, never layout props; at most about 100 simultaneously animated views on low-end Android; read shared values only in worklets; measure in release builds |
| [rea-a11y] | [Reanimated accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility) | `ReduceMotion.System` (the default), `useReducedMotion`, and what happens to springs, timings and layout animations under reduce motion |
| [rea-sv] | [useSharedValue](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue) | `get()`/`set()` instead of `.value` when the React Compiler is on; never read a shared value during render |
| [rea-css] | [Reanimated CSS animations](https://docs.swmansion.com/react-native-reanimated/docs/css-animations/animation-name/) | declarative loops (skeleton shimmer) that run on the UI thread and on web |
| [legend-list] | [Legend List v3 API](https://legendapp.com/open-source/list/v3/api/) | the installed virtualized list (`@legendapp/list`) under `InfiniteList` |
| [flashlist] | [FlashList](https://shopify.github.io/flash-list/) | the alternative virtualized list; read before changing list libraries |

## Native mechanics and Estela

The redesign's dependencies (spec §8, §8b), at the versions in `package.json`.

| Key | Source | It is the authority for |
|---|---|---|
| [true-sheet] | [React Native True Sheet](https://sheet.lodev09.com/), [keyboard guide](https://sheet.lodev09.com/guides/keyboard), [repo](https://github.com/lodev09/react-native-true-sheet) | the native sheet behind `Sheet` on phones (3.11.18): detents, `header`/`footer`, `scrollable`, the keyboard clamp |
| [skia-atlas] | [React Native Skia: Atlas](https://wcandillon.github.io/react-native-skia/docs/shapes/atlas) | Estela's one-draw sprite atlas on iOS and Android (`@shopify/react-native-skia` 2.14.0) |
| [skia-reanimated] | [React Native Skia: Animations](https://wcandillon.github.io/react-native-skia/docs/animations/animations) | driving Skia from Reanimated shared values on the UI thread |
| [canvas-2d] | [MDN: CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) | Estela's renderer on web and Tauri (no CanvasKit, no wasm) |
| [expo-blur] | [expo-blur](https://docs.expo.dev/versions/latest/sdk/blur-view/) | the glass material on Android 12+ (`BlurTargetView`) |
| [expo-glass] | [expo-glass-effect](https://docs.expo.dev/versions/latest/sdk/glass-effect/) | the native glass material on iOS 26 |
| [expo-device] | [expo-device](https://docs.expo.dev/versions/latest/sdk/device/) | `totalMemory` and the hardware profile that picks the `perfTier` |
| [sonner-native] | [sonner-native](https://github.com/gunnartorfis/sonner-native) | `Toast` on iOS and Android: action buttons for Deshacer and Reintentar |
| [sonner] | [Sonner](https://sonner.emilkowal.ski/) | `Toast` on web and Tauri, the same API shape |

## Language, types, validation

| Key | Source | It is the authority for |
|---|---|---|
| [ts-config] | [TSConfig reference](https://www.typescriptlang.org/tsconfig/) | `strict`, `noUncheckedIndexedAccess`, `moduleSuffixes` |
| [ts-narrowing] | [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) | discriminated unions and exhaustive `switch` with `never` (`Resource<T>`, `AppPhase`, gate verdicts) |
| [tseslint-configs] | [typescript-eslint shared configs](https://typescript-eslint.io/users/configs/) | what each preset contains; we adopt named rules, not a preset |
| [tseslint-typed] | [Typed linting](https://typescript-eslint.io/getting-started/typed-linting/) | `projectService` setup for type-aware rules |
| [tseslint-rules] | [no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/), [switch-exhaustiveness-check](https://typescript-eslint.io/rules/switch-exhaustiveness-check/), [no-unsafe-assignment](https://typescript-eslint.io/rules/no-unsafe-assignment/), [no-deprecated](https://typescript-eslint.io/rules/no-deprecated/) | the type-aware rules the lint gate adopts |
| [zod] | [zod basics](https://zod.dev/basics), [API](https://zod.dev/api), [error customization](https://zod.dev/error-customization) | parsing at the boundary, `z.infer` as the type source, `.catch` for open enums, form error messages as keys |

## Architecture

| Key | Source | It is the authority for |
|---|---|---|
| [fsd-overview] | [Feature-Sliced Design overview](https://feature-sliced.design/docs/get-started/overview) | the layer idea behind `app`/`features`/`widgets`/`entities`/`platform`/`shared` |
| [fsd-layers] | [FSD layers](https://feature-sliced.design/docs/reference/layers) | the import direction: a layer imports only layers below it |
| [fsd-public-api] | [FSD public API](https://feature-sliced.design/docs/reference/public-api) | one `index.ts` per slice, no deep imports, why `export *` hides ownership |
| [fsd-slices] | [FSD slices and segments](https://feature-sliced.design/docs/reference/slices-segments) | a slice's interior (`ui`, `model`, `api`) and naming |
| [dtcg] | [Design Tokens Format Module 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) | the token vocabulary (color, dimension, duration, cubic-bezier), and the export format if a design tool is adopted |
| [tailwind-theme] | [Tailwind v4 theme variables](https://tailwindcss.com/docs/theme) | `@theme`, `--color-*: initial` to remove the default palette |
| [uniwind] | [Uniwind docs](https://docs.uniwind.dev/), [themes](https://docs.uniwind.dev/theming/custom-themes) | how Tailwind v4 classes and themes reach React Native |

## Lint, format and gates

| Key | Source | It is the authority for |
|---|---|---|
| [eslint-config] | [ESLint configuration files](https://eslint.org/docs/latest/use/configure/configuration-files) | flat config, per-path `files`/`ignores`, `linterOptions.noInlineConfig`, `reportUnusedDisableDirectives`, `reportUnusedInlineConfigs` |
| [eslint-rules-config] | [Configure rules](https://eslint.org/docs/latest/use/configure/rules) | rule severities, and turning one rule off for one path |
| [eslint-suppressions] | [Bulk suppressions](https://eslint.org/docs/latest/use/suppressions) | `eslint-suppressions.json`, `--suppress-all`, `--suppress-rule`, `--prune-suppressions`; a fixed suppression makes ESLint exit non-zero until it is pruned |
| [eslint-versions] | [ESLint version support](https://eslint.org/version-support/) | v9 reached end of life on 2026-08-06; v10 is current |
| [eslint-core-rules] | [complexity](https://eslint.org/docs/latest/rules/complexity), [max-lines-per-function](https://eslint.org/docs/latest/rules/max-lines-per-function), [no-restricted-syntax](https://eslint.org/docs/latest/rules/no-restricted-syntax), [no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports) | the budget rules and the selector/import bans |
| [better-tailwind] | [eslint-plugin-better-tailwindcss](https://github.com/schoero/eslint-plugin-better-tailwindcss), [no-restricted-classes](https://github.com/schoero/eslint-plugin-better-tailwindcss/blob/main/docs/rules/no-restricted-classes.md) | unknown, conflicting, duplicate and restricted classes; `entryPoint` for a Tailwind v4 CSS config |
| [i18next-lint] | [eslint-plugin-i18next](https://github.com/edvardchen/eslint-plugin-i18next) | `no-literal-string` in `jsx-only` mode (JSX text and attributes) |
| [sonarjs] | [SonarJS](https://github.com/SonarSource/SonarJS), [S4144 identical functions](https://sonarsource.github.io/rspec/#/rspec/S4144/javascript) | the duplicated-function rule of the redundancy gate |
| [prettier] | [Prettier rationale](https://prettier.io/docs/rationale), [prettier-plugin-tailwindcss](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) | formatting and class order are a tool's job, never a review comment |
| [jscpd] | [jscpd](https://github.com/kucherenko/jscpd) | copy-paste detection (clones, duplicated lines, threshold) |
| [knip] | [knip](https://knip.dev/) | unused files, exports and dependencies |

## Design and platform idioms

| Key | Source | It is the authority for |
|---|---|---|
| [hig-alerts] | [HIG: Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts) | when an alert is justified, button titles that name the act, destructive style |
| [hig-writing] | [HIG: Writing](https://developer.apple.com/design/human-interface-guidelines/writing) | plain, specific, friendly UI text |
| [hig-motion] | [HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | purposeful motion, and honouring Reduce Motion |
| [hig-feedback] | [HIG: Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) | status and error feedback in context |
| [hig-a11y] | [HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | 44 pt targets, Dynamic Type, Reduce Transparency |
| [m3-snackbar] | [M3: Snackbar](https://m3.material.io/components/snackbar/guidelines) | brief, non-blocking messages with at most one action |
| [m3-dialogs] | [M3: Dialogs](https://m3.material.io/components/dialogs/guidelines) | when a dialog interrupts, and confirmation dialogs |
| [m3-progress] | [M3: Progress indicators](https://m3.material.io/components/progress-indicators/guidelines) | loading feedback |
| [m3-motion] | [M3: Motion](https://m3.material.io/styles/motion/overview), [easing and duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs) | duration and easing as tokens |
| [m3-a11y] | [M3: Accessible design](https://m3.material.io/foundations/accessible-design/overview) | 48 dp targets, contrast, focus |
| [m3-writing] | [M3: UX writing best practices](https://m3.material.io/foundations/content-design/style-guide/ux-writing-best-practices) | concise, scannable, action-led text |
| [android-a11y] | [Android: Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/apps) | 48 dp targets and labels on Android |
| [android-launch] | [Android: App startup time](https://developer.android.com/topic/performance/vitals/launch-time) | cold, warm and hot start; how to measure time to initial display |
| [android-rendering] | [Android: Slow rendering](https://developer.android.com/topic/performance/rendering) | janky frames and frame-time measurement |
| [apg-dialog] | [WAI-ARIA APG: modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | focus trap and return, Esc, labelled dialogs on web and desktop |

## Accessibility

| Key | Source | It is the authority for |
|---|---|---|
| [wcag22] | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | the normative success criteria; level AA is Argus's floor |
| [wcag-contrast] | [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | 4.5:1 for text |
| [wcag-non-text] | [1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | 3:1 for icons, control borders and focus rings |
| [wcag-resize] | [1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) | text up to 200% (the 2.0 font-scale cap) |
| [wcag-reflow] | [1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | no two-direction scrolling at 320 px |
| [wcag-target] | [2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | the 24 px floor |
| [wcag-pause] | [2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | ambient animation longer than 5 s must stop or be stoppable (the Aura, the mascot) |
| [wcag-flash] | [2.3.1 Three Flashes](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) | the alert pulse never flashes more than three times a second |
| [wcag-motion] | [2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | motion triggered by interaction can be turned off (AAA, adopted) |
| [wcag-focus] | [2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | sticky bars and toasts never hide focus |
| [wcag-error-id] | [3.3.1 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html) | an error is identified and described in text |
| [wcag-error-sugg] | [3.3.3 Error Suggestion](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html) | a known fix is suggested |
| [wcag-status] | [4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | toasts and notices are announced without moving focus |
| [axe] | [axe-core](https://github.com/dequelabs/axe-core), [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing) | the automated accessibility scan of the web build |

## Language and formatting

| Key | Source | It is the authority for |
|---|---|---|
| [mf2] | [Unicode MessageFormat 2](https://messageformat.unicode.org/), [TR35 MessageFormat](https://unicode.org/reports/tr35/tr35-messageFormat.html) | placeholders and selectors (plural, select) in translated messages |
| [icu-messages] | [ICU message formatting](https://unicode-org.github.io/icu/userguide/format_parse/messages/) | why sentences are never built by concatenating fragments |
| [cldr-plurals] | [CLDR plural rules](https://cldr.unicode.org/index/cldr-spec/plural-rules) | the plural categories per language (es and en: `one`, `other`; es also `many` for large numbers) |
| [mdn-plural] | [Intl.PluralRules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules) | choosing the plural form at runtime |

## User experience writing and errors

| Key | Source | It is the authority for |
|---|---|---|
| [nng-errors] | [NN/g: Error-message guidelines](https://www.nngroup.com/articles/error-message-guidelines/) | the twelve guidelines: near the source, visible and redundant, prominence by impact, not premature; human-readable with codes kept for diagnostics, precise, constructive, no blame; prevent likely errors, keep the user's input, reduce correction effort, educate briefly |
| [nng-hostile] | [NN/g: Hostile patterns in error messages](https://www.nngroup.com/articles/hostile-error-messages/) | what makes an error message hostile (codes, blame, vagueness) |
| [nng-forms] | [NN/g: Errors in forms](https://www.nngroup.com/articles/errors-forms-design-guidelines/) | inline field errors, when to validate |
| [nng-indicators] | [NN/g: Indicators, validations and notifications](https://www.nngroup.com/articles/indicators-validations-notifications/) | choosing inline, toast or modal by context and severity |
| [nng-confirm] | [NN/g: Confirmation dialogs](https://www.nngroup.com/articles/confirmation-dialog/) | confirm only the consequential; prefer undo |
| [nng-empty] | [NN/g: Empty states](https://www.nngroup.com/articles/empty-state-interface-design/) | an empty state teaches and offers the first action |
| [nng-skeleton] | [NN/g: Skeleton screens](https://www.nngroup.com/articles/skeleton-screens/) | skeletons for full-page loads, not spinners in lists |
| [nng-response] | [NN/g: Response time limits](https://www.nngroup.com/articles/response-times-3-important-limits/) | 0.1 s, 1 s and 10 s: when feedback must appear |
| [nng-anim] | [NN/g: Animation duration](https://www.nngroup.com/articles/animation-duration/) | UI transitions of roughly 100–400 ms |
| [nng-disclosure] | [NN/g: Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | one primary thing per screen, the rest one step away |
| [ms-errors] | [Microsoft: Error messages](https://learn.microsoft.com/en-us/windows/win32/uxguide/mess-error) | the long-standing desktop guidance: say what happened, why, and what to do; never show codes as the message |

## Testing

| Key | Source | It is the authority for |
|---|---|---|
| [tl-principles] | [Testing Library guiding principles](https://testing-library.com/docs/guiding-principles) | test what the user sees, not implementation details |
| [tl-queries] | [Query priority](https://testing-library.com/docs/queries/about/#priority) | query by role and label first (which also tests accessibility) |
| [rntl] | [React Native Testing Library](https://callstack.github.io/react-native-testing-library/) | component tests for native if the bun + happy-dom runner falls short |
| [maestro] | [Maestro docs](https://docs.maestro.dev/), [first flow](https://docs.maestro.dev/getting-started/writing-your-first-flow) | the Android smoke flows |

## Performance on the web build

| Key | Source | It is the authority for |
|---|---|---|
| [web-vitals] | [Web Vitals](https://web.dev/articles/vitals) | load and interaction metrics for the desktop (WebKitGTK) build |
| [web-rail] | [RAIL model](https://web.dev/articles/rail) | the 100 ms response and 16 ms frame targets on web |
