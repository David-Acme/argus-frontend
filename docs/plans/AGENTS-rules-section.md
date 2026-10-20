# `AGENTS.md` "MUST-FOLLOW Rules": ready-to-apply text

How to apply it:

- Everything between the two rulers below replaces the current §1–§10c,
  §12d and §13 of `frontend/AGENTS.md`.
- §11, §12, §12b, §12c, §12e and §14 stay where they are until R10 moves
  their detail into slice `CONTEXT.md` files. Rules 19, 27 and 35 below
  point to them.
- The "Commands" section gains `check:quality`, `check:tokens` and
  `check:format`.

Until a rule's gate exists, the rule is enforced by review. Its tag says when
the gate turns on: S0–S4 are the steps of "Implementation order with the
redesign" in `docs/plans/frontend-rules-final.md`, which also has each rule's
full rationale and baseline.

---

## MUST-FOLLOW Rules

Rules are **measured, not reviewed**. Each one names its gate, and every
counter is a **ratchet**:

- a committed baseline;
- a count that rises fails;
- a count that falls fails until the baseline is lowered in the same change;
- a baseline is never raised.

The baselines are:

- `scripts/lib/quality-baseline.txt`;
- `eslint-suppressions.json`;
- `scripts/lib/{bundle,layout,perf}-baseline.txt`;
- `scripts/lib/memo-exceptions.txt`.

`bun run verify` runs every gate except the layout audit, the Android
performance run and Maestro, which the integration build runs.

**Before deciding any question about an API, accessibility, a platform idiom,
wording, motion or performance, read `docs/references.md`.** Its "How to
settle a question" section says which source wins. The rules cite its keys in
`[brackets]`.

### A. How the rules work

1. **Measured, not reviewed.**
   - A rule enters this file only with its gate, or marked *reviewed* with the
     step that will measure it.
   - Every gate has a fixture test in `tests/unit/scripts/` that proves it
     fails.
   - A gate that cannot run fails.

   *Gate: `bun run verify` (S0).*

2. **Lint policy.**
   - `eslint.config.js` is the only place lint is configured. Inline
     configuration is inert (`linterOptions.noInlineConfig: true`,
     unused directives and inline configs are errors), and an
     `eslint-disable` comment is a comment (rule 3).
   - A rule is turned off **only individually**: by name, for the paths that
     need it, in `eslint.config.js`, with a row in `CONTEXT.md` › "Lint
     exceptions" (rule, paths, reason, source or measurement, date). Never
     all rules, never a preset turned off wholesale.
   - Every adopted rule is `error` (`--max-warnings 0`), including the
     `warn` rules `eslint-config-expo` sets.
   - Existing debt lives only in `eslint-suppressions.json` (ESLint bulk
     suppressions), which shrinks with `--prune-suppressions`.
   - The adopted plugins and rules are "The lint set" in
     `docs/plans/frontend-rules-final.md`:
     - `eslint-config-expo/flat`;
     - `react-hooks` 7, all 17 rules;
     - type-aware `@typescript-eslint` rules (named, not a preset);
     - `better-tailwindcss` (correctness rules);
     - `i18next/no-literal-string` in `jsx-only` mode;
     - `sonarjs/no-identical-functions`;
     - the core budget rules and selectors.

     Adding one is a rules change with its source.

   *Gate: `bun run lint`; `scripts/check-lint-policy.ts` compares every
   `off` with the exception table and fails on any `warn` (S0).*

3. **No comments in code.**
   - No comment of any kind in any tracked file: TypeScript, JSX
     `{/* */}`, Kotlin, Swift, Rust, Gradle, C++, CSS, XML, config and
     ignore files.
   - No doc blocks and no commented-out code.
   - No lint or type suppressions (`eslint-disable`, `@ts-expect-error`,
     `@ts-ignore`, `//noinspection`).
   - Rewrite the code instead (a name, a helper, a type), and put the "why"
     in `CONTEXT.md`.
   - Shebangs and generated triple-slash `<reference>` directives are not
     comments.
   - Every agent and subagent writes no comments, and a prompt that
     delegates work says so.

   *Gate: `bun run check:comments`, `--fix` removes them (in force).*

4. **Sources settle questions.**
   - Follow `docs/references.md` › "How to settle a question".
   - A decision in a `CONTEXT.md` cites a source key or a measurement.
   - A new library is adopted only with its official doc added to the
     references.

   *Gate: `scripts/check-references.ts` (every cited key exists, every row
   has a URL) (S0); reading the source is reviewed.*

5. **Every agent writes to these rules.** A prompt that delegates frontend
   work restates rules 2, 3, 20 and 32, and points to this file and
   `docs/references.md`.

   *Reviewed.*

### B. Structure and one home for everything

6. **Layers.**
   - `src/` is `app` → `features` → `widgets` → `entities` → `platform` →
     `shared`, and a unit imports only layers below it (the matrix in
     `frontend-refactor-plan.md` §3.1):
     - `app` composes;
     - features are screens;
     - widgets are entity UI used by 2+ features;
     - entities own one domain's api + schema, model and store;
     - `platform` is infrastructure without a domain;
     - `shared` is the design system plus generic code.
   - `platform` and `shared` know no domain.

   *Gate: `bun run check:boundaries` (matrix per domain from R3, S3).*

7. **One public API per slice.**
   - Every slice is reached only through its `index.ts`, which lists named
     exports.
   - No deep imports.
   - No `export *` anywhere in `src/`.

   *Gate: `check:boundaries` `deep-import`; lint `ExportAllDeclaration`
   (S0).*

8. **No import cycles**, at file or slice level (type-only imports excepted).

   *Gate: `check:boundaries --cycles` (S0).*

9. **Routes are one line; layouts compose only.**
   - A route file re-exports one feature screen.
   - A `_layout.tsx` renders providers, gates, the navigator and
     `<AppRuntime />`. It has no effect, redirect logic or domain hook.
   - Background controllers are entries in `platform/runtime`.

   *Gate: `check:boundaries` `route-shape` (S0, 0 at S1).*

10. **One home for each kind of thing.** Nothing of a kind exists outside its
    home:

    | Kind | Home |
    |---|---|
    | design values | `shared/theme/tokens.ts` |
    | icons | the `ICONS` registry (the only importer of `lucide-react-native`, per-icon deep imports) |
    | user text | the `es`/`en` dictionaries |
    | error codes → words | `platform/errors` |
    | formatting | the one formatter (the only user of `date-fns`/`Intl.DateTimeFormat`) |
    | platform flags | `IS_*` in `platform/device` |
    | storage and cache keys | their `platform` module |
    | HTTP calls and schemas | the entity's `api/` |
    | domain types | `z.infer` of the schema, never written twice |
    | server-mirrored vocabularies | their contract-tested module |
    | interactive and state UI | the 26 components |
    | animation values | `tokens.motion`/`springs` |
    | logging | `platform/log` |

    *Gate: `check:boundaries` `kind-home`; `check:quality` counters
    `type-written-twice`, `hex-literal` (S0).*

11. **No duplication; shared code is earned; no dead code.**
    - A duplicated block, helper, constant, type or component is merged into
      its home in the change that finds it.
    - Two modules never export the same name, except a `.native`/`.web`
      pair.
    - A module enters `shared/` (outside `ui`/`layout`/`theme`) or
      `widgets/` only with 2+ consumer slices.
    - An unused file, export or dependency is deleted in the change that
      makes it unused, and a replaced component is deleted with its last
      consumer.

    *Gate: `check:quality` (jscpd clones and duplicated lines, duplicate
    export names, knip unused files/exports/dependencies);
    `sonarjs/no-identical-functions`; `check:boundaries` rule 5 (S0).*

12. **One interior per slice; file naming.**
    - Children:
      - a feature has `screens/`, `components/`, `hooks/`, `model/`,
        `constants/`, `stores/`, `index.ts` and `CONTEXT.md`;
      - a widget has `ui/`, `model/` and `index.ts`;
      - an entity has `api/`, `model/`, `store/` and `index.ts`.
    - A segment exists only with a file.
    - Files are kebab-case, and exports are PascalCase or camelCase.
    - The suffix families are `.constant`, `.type`, `.schema`, `.store`,
      `.projection`, `.native`, `.web` and `.ios`.
    - The only exception is `modules/*/src/{Name}.nitro.ts`: Nitrogen needs
      the spec file named like its HybridObject.

    *Gate: `check:boundaries` `slice-shape`, `file-name` (S0).*

### C. Data, state and trust

13. **Wire data is validated, never cast.**
    - Every HTTP answer, socket frame and stored JSON is parsed by a zod
      schema at the boundary. `httpService` takes a schema and no type
      argument.
    - Types are `z.infer`.
    - Server enums are open (`.catch('unknown')`), and `unknown` is a
      rendered state.

    *Gate: lint; `check:quality` `http-unchecked`; `tests/contracts/http-contract.test.ts`
    against the backend fixtures (S0, 0 per domain at S3).*

14. **Gates fail closed and are tri-state.**
    - Access, consent, privacy and route decisions are
      `pending | allow | deny`.
    - `pending` shows the splash or a skeleton.
    - Failed, missing or unknown is `deny` with a retry.
    - An unknown role holds nothing.

    *Gate: a unit test per gate for loading, failed, allow and deny,
    enforced by `check:quality`; `startup.e2e.ts` at zero latency (S1).*

15. **One session state machine.**
    - `platform/session` owns `AppPhase` (`booting → restoring → signed-out |
      establishing → ready → ending`), with pure, tested transitions.
    - Only it starts and stops the engines and sets the credential and the
      view-cache user.
    - `ready` reloads mounted resources.

    *Gate: `check:boundaries` `session-owner` (S1).*

16. **A failure is never shown as a fact.**
    - A remote read is a `Resource<T>` (`loading | ready | stale | failed |
      refused`) rendered by `ResourceView`.
    - `Empty` requires the `ReadyEmpty` token only `ResourceView` produces.
    - Stale data shows its time.
    - Loading in a list is a skeleton, never a spinner.

    *Gate: by type; `check:quality` `empty-outside-resource-view`; lint bans
    `ActivityIndicator` outside `shared/ui` (S1).*

17. **One owner per datum.**

    | Data | Owner |
    |---|---|
    | synced rows | WatermelonDB |
    | first frames | the view cache |
    | pending writes | the optimistic registry |
    | session, user, context | `AppPhase` |
    | ephemeral UI | small zustand stores in their slice, exported as hooks with atomic selectors |

    - Stores import no service and hold no server data.
    - No module-level `Map`/`Set` caches server data outside `platform`.

    *Gate: `check:boundaries` `store-purity`; `check:quality` `module-cache`,
    `get-state-outside-store` (S0).*

18. **Mutations are single-flight, abandon-safe, and confirmed or undoable.**
    - Every user-started action goes through `runServiceAction`,
      `runOptimistic` or `useFormSubmit`: it is ignored while pending and
      after unmount.
    - Reversible actions act at once and offer Deshacer for 5 s.
    - Irreversible or loud ones use `Confirm`, with a named verb, before any
      spinner.
    - Only an entity's `api/` imports `platform/http`.

    *Gate: `no-restricted-imports`; helper tests (S0/S1).*

19. **Local persistence and local-first paint.**
    - §12 (WatermelonDB) and §12b (local-first cache, pagination, granular
      sync) stay as written.
    - The database is reached only from `platform/database`,
      `platform/sync`, the projections and each entity's `store/`.

    *Gate: `check:boundaries` `database-access`; the startup trace (S0).*

20. **Errors are words the user can act on.**
    - The user never sees an error code, an HTTP status, an id or a server
      message.
    - Every backend code, client code and native code (and, with the
      backend's `reason`, every user-facing reason) maps through the one map
      in `platform/errors` to an `errors.*` key: what happened, then what to
      do, naming the object, in es and en.
    - Unknown codes get the one generic message, and on access decisions
      they are `deny`.
    - Codes go only to `log.error` and telemetry.
    - The error module picks the surface (inline field, toast with
      Reintentar, inline `Notice`, in-place failed state, full screen,
      alert), never a screen.
    - Code reads `ApiFailure.is(code)` and never the raw code or message.
    - The full specification is `docs/plans/error-messages-spec.md`.

    *Gate: `tsc` (`satisfies Record<ErrorCode, …>`); the error-code contract
    test against the backend headers and the native sources; `check:quality`
    `error-message-match`; the copy test; the UI-map `rawErrorText` check
    (S1).*

### D. Interface

21. **Design tokens have one source.**
    - `shared/theme/tokens.ts` holds every colour, space, size, radius, type
      step, elevation, motion value, breakpoint and illustration colour, with
      the values of the redesign spec §3.
    - `scripts/gen-tokens.ts` generates `global.css`'s theme (OKLCH) and the
      JS constants, and Tailwind's default palette is removed.
    - No colour literal exists outside `shared/theme`.
    - Text meets 4.5:1, and icons, borders and focus meet 3:1, in both
      themes.

    *Gate: `bun run check:tokens`; the lint colour-literal selector; the
    contrast unit test; `check:quality` `legacy-token-class` (S1).*

22. **No arbitrary values, no raw palette, no inline sizes.**
    - No `-[…]` utilities, default-palette classes, `text-xs…9xl` or
      `rounded-[…]`.
    - No inline `style={{…}}` with a colour or a size.
    - APIs that need numbers read `tokens`.

    *Gate: `better-tailwindcss/no-restricted-classes` and correctness rules;
    the `style={{` selector (S0).*

23. **One responsive system.**
    - The breakpoints are `compact < 600 ≤ medium < 1024 ≤ expanded < 1440 ≤
      wide`, from tokens, and drive both the CSS variants and
      `useWindowClass`.
    - Navigation is a bar, a rail or a sidebar per class, and a compact
      height keeps the bar.
    - Features never read `useWindowDimensions` or `Dimensions`.
    - Chip and action rows wrap, and a `Choice` that does not fit becomes a
      sheet list.
    - Nothing scrolls two ways at 320 px, and there is no inner page scroll
      except the week grid.

    *Gate: `no-restricted-imports`; the layout audit (S1).*

24. **The design system owns every interactive, state and overlay
    surface.**
    - Features compose the 26 components of the redesign spec §4:
      - `Text`, `Icon`, `Pressable`, `Screen`, `Nav`;
      - `Section`, `Row`, `Status`, `Notice`, `FeedItem`, `Chip`, `Avatar`,
        `Media`, `Check`;
      - `Button`, `Field`, `Choice`, `Switch`;
      - `Sheet`, `Confirm`, `Menu`, `Toast`, `ResourceView`;
      - `Aura`, `Presence`, `Command`.

      `Stack`, `Inline` and `Cluster` are layout helpers.
    - A new component or variant needs a spec change and a `ui-lab`
      baseline.
    - Features never import `Pressable`, `Touchable*`, `ActivityIndicator`,
      `Switch`, `Modal`, `Image`, `FlatList`, `SectionList` or `ScrollView`
      from `react-native`.
    - Overlays close on an outside tap, Esc, Back and drag, and return focus.
      A destructive confirmation and a dirty form ask first.
    - Features add no styling or animation of their own to the components.

    *Gate: `no-restricted-imports` under `features/**` and `widgets/**`; a
    component test and visual baselines per component (S2).*

25. **Accessibility is part of the type.**
    - Interactive components require a role and a label in their props.
    - **Targets:** 48 dp (44 pt minimum on iOS), 8 dp apart, and at least
      24 px on a pointer.
    - **Font scale:** 2.0 for body, meta and caption; 1.5 for hero and
      title.
    - **Settings:** Reduce Motion, Reduce Transparency, Increase Contrast and
      "Reducir efectos" are honoured.
    - **Announcements:** alerts are announced, and toasts are polite live
      regions.
    - **Focus** is visible, never obscured, and trapped and returned in
      dialogs.
    - Status is never shown by colour alone.
    - Hold gestures have tap alternatives.

    *Gate: `tsc`; axe over every UI-map state; the layout audit's
    `smallTargets`; the contrast test (S2).*

26. **Motion runs on the UI thread and respects the user.**
    - **Only what explains a change moves.** At most two continuous
      animations per screen (`Aura`, `Presence`), paused off-screen and in
      the background.
    - **The UI thread only:**
      - Reanimated worklets and CSS animations;
      - the native sheet, push and alert curves;
      - Rive's renderer.

      Never a per-frame `setState`, a timer or `requestAnimationFrame`
      driving visuals, or `Animated` from `react-native`.
    - **Animate `transform` and `opacity` only.** At most one blur layer.
    - **Values come from tokens:** the springs `snappy`/`gentle`/`playful`
      and `fast`/`base`/`slow`.
    - **Shared values** use `.get()`/`.set()`, never `.value`, and are never
      read in render.
    - **Reduce Motion:** every animation keeps `ReduceMotion.System`, every
      loop has a still form, and alert pulses stay under three flashes a
      second.
    - **The `low` tier** gets the still and solid forms of spec §7b.

    *Gate: lint (`react-hooks/immutability` on, the `Animated` and timer
    bans); `check:quality` `shared-value-dot-value`,
    `loop-without-reduce-motion`, `animated-layout-prop`,
    `timer-in-component`; the layout audit's `infiniteAnimations` (≤ 2, and 0
    under reduced motion); the Android frame budget (S0/S1).*

27. **Text the user reads is a typed key, in Argus's voice.**
    - Every string comes from the dictionaries, with keys and parameters
      checked by `tsc` (§14).
    - Server values go through `Record<Enum | 'unknown', TranslationKey>`
      maps, never template-literal keys.
    - Plurals use `Intl.PluralRules` categories.
    - Sentences are never concatenated.
    - Dates, numbers and durations go through the formatter (the device's
      12/24 h, units in words).
    - Copy follows the redesign spec §12: tú, short, one name per thing,
      buttons that name the act, no technical words, no exclamation marks.

    *Gate: lint (template-literal `t()`, `i18next/no-literal-string`
    `jsx-only`); the glossary and banned-words test (S0).*

28. **Platform differences live in platform files.**
    - `.native`/`.web` pairs export the same names, or the behaviour is a
      `platform/*` service.
    - `IS_*` branches in features are for copy and layout only.
    - Permission and device flows go through the platform service.
    - Device nouns come from `platform/device`.
    - Desktop and mobile idioms are chosen by the components, never by a
      screen.

    *Gate: `check-platform` pair comparison; `check:quality` `is-flag-in-features`
    (S0).*

29. **Layout is audited.**
    - Every UI-map state renders at the nine viewports, at font scale 1.0,
      1.3 and 2.0, in light and dark.
    - There is no overflow, clipped or overlapping control, small target,
      truncated key fact or raw error text.

    *Gate: the layout audit and `scripts/lib/layout-baseline.txt` in the
    integration build (S2).*

### E. Performance

30. **Startup and bundle budgets.**
    - **Measure first:** cold start and the `first-frame-from-cache` and
      `ready` marks on the reference Android device (production build,
      median of 10).
    - **Nothing before the first frame** except reading the session and the
      view cache.
    - **The web entry chunk is ≤ 6.6 MB**, and `dist/` has a budget.
    - **Lazy code:** `livekit-client`, the WebCodecs player, the Rive web
      runtime, the QR scanner and face capture load on use.
    - **Dependencies:** every new dependency records its size in
      `CONTEXT.md`.

    *Gate: `bun run check:bundle` (entry and dist budgets, lazy packages
    absent from the entry); `scripts/perf/cold-start.ts` against
    `perf-baseline.txt` (S0).*

31. **Rendering budgets.**
    - **Frames:** scrolling Inicio stays ≤ 1% janky and p90 ≤ 16.7 ms on the
      reference device, judged on release builds only.
    - **Lists:** growable lists use the shared list (`InfiniteList` on Legend
      List), never a `.map()` in a `ScrollView`.
    - **Images:** they go through the one image component.
    - **Effects:** no effect derives state or chains another effect.
    - **Memoization:** with the React Compiler on, new code has no `useMemo`,
      `useCallback` or `memo`. The exceptions are an effect dependency, a
      library's identity requirement, or a measured gain, each listed in
      `scripts/lib/memo-exceptions.txt`. Existing memoization is removed only
      with component tests.
    - **Logging:** `console` only in `platform/log`, and debug output only in
      `__DEV__`.

    *Gate: `check:quality` `manual-memo`; the `react-hooks` compiler rules;
    `scripts/perf/frames.ts` (S0).*

### F. Code shape, tests and contracts

32. **Size and complexity budgets.**

    | Measure | Budget |
    |---|---|
    | complexity | 15 |
    | lines per function | 80 |
    | lines per file (i18n and generated files excepted) | 300 |
    | statements | 30 |
    | depth | 3 |
    | parameters | 3; 4+ become one object |
    | props per component | 10; beyond that, slots or composition |

    - A screen lays out sections, a section owns its hook, and decisions are
      pure `model/` functions with tests.
    - **File order:** imports, then types (a named props type for every
      component), then components.
    - **Order inside a component:** hooks, then functions, then effects,
      then render.

    *Gate: ESLint at `error` with the debt in the suppressions file;
    `check:quality` `props-over-10` (S0).*

33. **Formatting and small conventions.**
    - Prettier with `prettier-plugin-tailwindcss` formats everything.
    - `console` only in `platform/log`.
    - Dates only through the formatter.
    - Timers are never called as methods.
    - React APIs are imported by name.
    - Platform flags come from their home, never `Platform.OS` or
      `__TAURI_INTERNALS__`.
    - Official Expo APIs are used directly (for example `SystemBars`).
    - TypeScript is strict with `noUncheckedIndexedAccess`, and `tsc
      --noEmit` has 0 errors.

    *Gate: `bun run check:format`; the lint selectors; `tsc` (S0).*

34. **Tests at the level the behaviour lives.**

    | Behaviour | Test |
    |---|---|
    | logic | unit |
    | every component and screen | a component test, by role and label (bun + happy-dom + react-native-web) |
    | navigation | `renderRouter` |
    | contracts | fixtures |
    | flows | web E2E on Chromium and WebKit, plus a Maestro smoke set on Android |

    - A fix lands with a test at the lowest level that reproduces it.
    - No test reads source text.
    - A time budget is a bench under `tests/bench/`, outside `verify`.

    *Gate: `check:quality` `source-text-test`,
    `untested-component-or-screen`, coverage per slice that only rises (S0;
    the harness exists before the first component, S2).*

35. **Networking and secure storage.**
    - §11 stays as written.
    - Native `CODE|message` errors are mapped by rule 20 and never shown.
    - The CSP changes only by an owner decision recorded in `CONTEXT.md`.

    *Gate: the `net` tests, `cargo check`, `check:bundle` under the CSP (in
    force).*

36. **Contracts with the backend.**
    - `role-access`, `capability`, `modules`, notification kinds, error codes
      and reasons mirror the backend headers.
    - HTTP schemas mirror `backend/scripts/fixtures/http`.
    - A backend contract change lands with its frontend change.

    *Gate: `bun run test` → `tests/contracts/*` (in force; errors from S1).*

---
