# `AGENTS.md` "MUST-FOLLOW Rules": the approved text

How it is applied:

- Everything between the two rulers below replaces the whole "MUST-FOLLOW
  Rules" section of `frontend/AGENTS.md` (today's §1–§14) at R0, Phase 1 of
  the redesign.
- The project facts of today's sections that still hold (networking,
  persistence, local-first cache, people and privacy, onboarding and
  modules, i18n, the avatar until Estela replaces it) are folded under the
  rule they belong to, as "Today" notes. R10 later moves their detail into
  slice `CONTEXT.md` files.
- The "Commands" section gains `check:quality` and `check:format`;
  `check:tokens` joins when the generator lands (R5, S1).
- From R0 on, `AGENTS.md` is the source; this file keeps the rules text as
  approved, without the folded facts.

Each rule is tagged *measured*, with the gate that fails on it today, or
*reviewed*, with the step or phase that will measure it. S0–S4 are the steps
of "Implementation order with the redesign" in
`docs/plans/frontend-rules-final.md`, which also has each rule's full
rationale and its `09cf103` survey; R0–R10 are the plan's phases.

---

## MUST-FOLLOW Rules

Rules are **measured, not reviewed**. Each one names its gate, and every
counter is a **ratchet**:

- a committed baseline;
- a count that rises fails;
- a count that falls fails until the baseline is lowered in the same change;
- a baseline is never raised.

The baselines are:

- `scripts/lib/quality-baseline.txt` (with its `scanned-files` line) and
  `scripts/lib/memo-exceptions.txt`, read by `bun run check:quality`;
- `scripts/lib/boundaries-baseline.txt`, read by `bun run check:boundaries`;
- `eslint-suppressions.json` (ESLint bulk suppressions), read by
  `bun run lint`;
- the list of files not yet formatted, read by `bun run check:format`;
- `scripts/lib/bundle-baseline.txt`, read by `bun run check:bundle`;
- later: `scripts/lib/layout-baseline.txt` (R8) and
  `scripts/lib/perf-baseline.txt` (R9).

`bun run verify` runs comments, boundaries (with the lint policy and the
references), quality, format, `tsc`, lint, tests, the bundle probe and the
web E2E. The layout audit, the Android performance run and Maestro belong to
the integration build once they exist.

**Before deciding any question about an API, accessibility, a platform idiom,
wording, motion or performance, read `docs/references.md`.** Its "How to
settle a question" section says which source wins. The rules cite its keys in
`[brackets]`. Design values and components are settled by
`docs/plans/redesign-spec.md` and `src/shared/theme/tokens.ts`.

### A. How the rules work

1. **Measured, not reviewed.**
   - A rule enters this file only with its gate, or marked *reviewed* with the
     step that will measure it.
   - Every gate has a fixture test in `tests/unit/scripts/` that proves it
     fails.
   - A gate that cannot run fails.

   *Measured: `bun run verify`; the fixture tests in `bun run test`.*

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
     suppressions) [eslint-suppressions], which shrinks with
     `--prune-suppressions`; an unpruned suppression fails the run.
   - The adopted plugins and rules are "The lint set" in
     `docs/plans/frontend-rules-final.md`:
     - `eslint-config-expo/flat`;
     - `react-hooks` 7, all 17 rules;
     - type-aware `@typescript-eslint` rules (named, not a preset);
     - `better-tailwindcss` (correctness rules);
     - `i18next/no-literal-string` in `jsx-only` mode;
     - `sonarjs/no-identical-functions` and `no-all-duplicated-branches`;
     - the core budget rules (rule 32) and the import and syntax bans of
       rules 10, 18, 21–24, 26, 27 and 33.

     Adding one is a rules change with its source.

   *Measured: `bun run lint`; `scripts/check-lint-policy.ts` (in
   `check:boundaries`) compares every `off` with the exception table and fails
   on any `warn` or an unset `noInlineConfig`.*

3. **No comments in code.**
   - No comment of any kind in any tracked file: TypeScript, JSX
     `{/* */}`, Kotlin, Swift, Rust, Gradle, C++, CSS, XML, config and
     ignore files.
   - No doc blocks and no commented-out code.
   - No lint, type or format suppressions (`eslint-disable`,
     `@ts-expect-error`, `@ts-ignore`, `prettier-ignore`, `//noinspection`).
   - Rewrite the code instead (a name, a helper, a type), and put the "why"
     in `CONTEXT.md`.
   - Shebangs and generated triple-slash `<reference>` directives are not
     comments.
   - Every agent and subagent writes no comments, and a prompt that
     delegates work says so.

   *Measured: `bun run check:comments`; `--fix` removes them.*

4. **Sources settle questions.**
   - Follow `docs/references.md` › "How to settle a question".
   - A decision in a `CONTEXT.md` cites a source key or a measurement.
   - A new library is adopted only with its official doc added to the
     references.

   *Measured: `scripts/check-references.ts` (in `check:boundaries`): every
   `[key]` cited in `AGENTS.md`, the `CONTEXT.md` files and `docs/plans/*.md`
   exists, every row has a URL, and a `[family-*]` matches a key. Reading the
   source is reviewed.*

5. **Every agent writes to these rules.** A prompt that delegates frontend
   work restates rules 2, 3, 20 and 32, and points to this file and
   `docs/references.md`.

   *Reviewed (always); the gates above catch the result.*

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

   *Measured: `bun run check:boundaries`, its five rules at 0. Reviewed: the
   layer matrix, per domain from R3 (S3).*

7. **One public API per slice.**
   - Every slice is reached only through its `index.ts`, which lists named
     exports.
   - No deep imports.
   - No `export *` anywhere in `src/`.

   *Measured: `check:boundaries` deep imports into another slice's internals
   (ratchet). Reviewed: `export *`, until R3 adds its lint selector.*

8. **No import cycles**, at file or slice level (type-only imports excepted).

   *Measured: `check:boundaries` file and slice SCCs (ratchet).*

9. **Routes are one line; layouts compose only.**
   - A route file re-exports one feature screen.
   - A `_layout.tsx` renders providers, gates, the navigator and
     `<AppRuntime />`. It has no effect, redirect logic or domain hook.
   - Background controllers are entries in `platform/runtime`.

   *Measured: `check:boundaries` route files under `src/app/**` that are not
   one-line re-exports (ratchet). Reviewed: the layouts, until R1 (S1).*

10. **One home for each kind of thing.** Nothing of a kind exists outside its
    home:

    | Kind | Home |
    |---|---|
    | design values | `shared/theme/tokens.ts` |
    | performance tier, reduce motion and transparency | `shared/theme/effects.ts` |
    | icons | the `ICONS` registry (the only importer of `lucide-react-native`, per-icon deep imports) |
    | user text | the `es`/`en` dictionaries |
    | error codes → words | `platform/errors` |
    | formatting | the one formatter (the only user of `date-fns`/`Intl.DateTimeFormat`) |
    | platform flags | `IS_*` in `platform/device` |
    | storage and cache keys | their `platform` module |
    | HTTP calls and schemas | the entity's `api/` |
    | domain types | `z.infer` of the schema, never written twice |
    | server-mirrored vocabularies | their contract-tested module |
    | interactive and state UI | the 26 components (rule 24) |
    | animation values | `tokens.motion`/`springs` |
    | logging | `platform/log` |

    *Measured: the lint import bans (icons, formatter); `check:quality`
    colour literals. Reviewed: `check:boundaries` `kind-home` (R3) and
    `type-written-twice` (R2).*

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

    *Measured: `sonarjs/no-identical-functions`; `check:boundaries` rule 5.
    Reviewed: jscpd, duplicate export names and knip, until R3.*

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

    *Reviewed: `check:boundaries` `slice-shape` and `file-name`, until R3.*

### C. Data, state and trust

13. **Wire data is validated, never cast.**
    - Every HTTP answer, socket frame and stored JSON is parsed by a zod
      schema at the boundary. `httpService` takes a schema and no type
      argument.
    - Types are `z.infer`.
    - Server enums are open (`.catch('unknown')`), and `unknown` is a
      rendered state.

    *Measured: `check:quality` unchecked HTTP calls; the HTTP contract test
    against `backend/scripts/fixtures/http`. Reviewed: the lint ban on a type
    argument, until R2 (0 per domain at S3).*

14. **Gates fail closed and are tri-state.**
    - Access, consent, privacy and route decisions are
      `pending | allow | deny`.
    - `pending` shows the splash or a skeleton.
    - Failed, missing or unknown is `deny` with a retry.
    - An unknown role holds nothing.

    *Reviewed until R1 (S1): a unit test per gate for loading, failed, allow
    and deny, enforced by `check:quality`; `startup.e2e.ts` at zero latency.*

15. **One session state machine.**
    - `platform/session` owns `AppPhase` (`booting → restoring → signed-out |
      establishing → ready → ending`), with pure, tested transitions.
    - Only it starts and stops the engines and sets the credential and the
      view-cache user.
    - `ready` reloads mounted resources.

    *Reviewed until R1 (S1): `check:boundaries` `session-owner`.*

16. **A failure is never shown as a fact.**
    - A remote read is a `Resource<T>` (`loading | ready | stale | failed |
      refused`) rendered by `ResourceView`.
    - `Empty` requires the `ReadyEmpty` token only `ResourceView` produces.
    - Stale data shows its time.
    - Loading in a list is a skeleton, never a spinner.

    *Measured: lint bans `ActivityIndicator` in features. Reviewed until R1
    and S2: the `ReadyEmpty` type and `empty-outside-resource-view`.*

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

    *Reviewed until R1–R3: `check:boundaries` `store-purity`;
    `check:quality` `module-cache`, `get-state-outside-store`.*

18. **Mutations are single-flight, abandon-safe, and confirmed or undoable.**
    - Every user-started action goes through `runServiceAction`,
      `runOptimistic` or `useFormSubmit`: it is ignored while pending and
      after unmount.
    - Reversible actions act at once and offer Deshacer for 5 s.
    - Irreversible or loud ones use `Confirm`, with a named verb, before any
      spinner.
    - Only an entity's `api/` imports the HTTP service.

    *Measured: `no-restricted-imports` of the HTTP service. Reviewed: the
    helper tests for double press and unmount, until S1.*

19. **Local persistence and local-first paint.**
    - WatermelonDB and the local-first cache keep their contract: one file
      per table, snake_case columns, epoch milliseconds, the server id as
      `id`, a migration for every schema bump; screens paint from the view
      cache and never wait for WatermelonDB or an HTTP list; keyset paging.
    - The database is reached only from `platform/database`,
      `platform/sync`, the projections and each entity's `store/`.

    *Reviewed until R3: `check:boundaries` `database-access`; the startup
    trace comes with R9.*

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

    *Reviewed until S1: `tsc` (`satisfies Record<ErrorCode, …>`); the
    error-code contract test against the backend headers and the native
    sources; `check:quality` `error-message-match`; the copy test; the UI-map
    `rawErrorText` check.*

### D. Interface

21. **Design tokens have one source.**
    - `shared/theme/tokens.ts` holds every colour, space, size, radius, type
      step and type role, elevation, motion value, material value,
      breakpoint, layout width and illustration colour, with the values of
      the redesign spec §3 as the prototype renders them. Read a value from
      the file; never copy it elsewhere.
    - Colour roles carry their own text-safe value: there are no `*-strong`
      twins, and a fill that cannot carry text is named as a fill
      (`accent-fill`). Elevation is `card`, `float` or `none`; motion is the
      springs `snappy`/`gentle`/`playful` and the durations 120/200/300 ms.
    - `scripts/gen-tokens.ts` generates `global.css`'s theme (OKLCH) and the
      JS constants, and Tailwind's default palette is removed.
    - No colour literal exists outside `shared/theme`.
    - Text meets 4.5:1, and icons, borders and focus meet 3:1, in both
      themes.

    *Measured: the lint colour-literal ban; `check:quality` colour literals
    and `legacy-token-class`. Reviewed until R5 (S1): `bun run check:tokens`
    and the contrast unit test.*

22. **No arbitrary values, no raw palette, no inline sizes.**
    - No `-[…]` utilities, default-palette classes, `text-xs…9xl` or
      `rounded-[…]`.
    - No inline `style={{…}}` with a colour or a size.
    - APIs that need numbers read `tokens`.

    *Measured: `better-tailwindcss/no-restricted-classes` and correctness
    rules; the type-scale selector; `check:quality` arbitrary values and
    `style={{`.*

23. **One responsive system.**
    - The breakpoints are `compact < 600 ≤ medium < 1024 ≤ expanded < 1440 ≤
      wide`, from `tokens.breakpoints`, and drive both the CSS variants and
      `useWindowClass`.
    - Navigation is a bar, a rail or a sidebar per class, and a compact
      height keeps the bar.
    - Features never read `useWindowDimensions` or `Dimensions`.
    - Chip and action rows wrap, and a `Choice` that does not fit becomes a
      sheet list.
    - Nothing scrolls two ways at 320 px, and there is no inner page scroll
      except the week grid.

    *Measured: `no-restricted-imports`; `check:quality`
    `useWindowDimensions` in features. Reviewed until R8: the layout audit.*

24. **The design system owns every interactive, state and overlay
    surface.**
    - Features compose the 26 components of the redesign spec §4, the one
      list (the spec holds the variants):
      - `Text`, `Icon`, `Pressable` (`PressableSurface`), `Screen`, `Nav`;
      - `Section`, `Row`, `Status`, `Notice`, `FeedItem`, `Chip`, `Avatar`,
        `Media`, `Check`;
      - `Button` (with `iconOnly`), `Field`, `Choice`, `Switch`;
      - `Sheet`, `Confirm`, `Menu`, `Toast`, `ResourceView`;
      - `Aura`, `Presence` (Estela), `Command`.

      `Stack`, `Inline` and `Cluster` are layout helpers, not among the 26.
    - A new component or variant needs a spec change and a `ui-lab`
      baseline.
    - Features never import `Pressable`, `Touchable*`, `ActivityIndicator`,
      `Switch`, `Modal`, `Image`, `FlatList`, `SectionList`, `ScrollView` or
      `Animated` from `react-native`.
    - Overlays close on an outside tap, Esc, Back and drag, and return focus.
      A destructive confirmation and a dirty form ask first.
    - Features add no styling or animation of their own to the components.

    *Measured: `no-restricted-imports` under `features/**`; `check:quality`
    raw `Pressable` in features and `untested-component-or-screen`. Reviewed
    until S2: a component test and visual baselines per component.*

25. **Accessibility is part of the type.**
    - Interactive components require a role and a label in their props.
    - **Targets:** 48 dp (44 pt minimum on iOS), 8 dp apart, and at least
      24 px on a pointer.
    - **Font scale:** 2.0 for body, meta and caption; 1.5 for hero and
      title. `Text` reads each step's and role's `maxScale` from tokens.
    - **Settings:** Reduce Motion, Reduce Transparency, Increase Contrast and
      "Reducir efectos" are honoured.
    - **Announcements:** alerts are announced, and toasts are polite live
      regions.
    - **Focus** is visible, never obscured, and trapped and returned in
      dialogs.
    - Status is never shown by colour alone.
    - Hold gestures have tap alternatives.

    *Reviewed until S2 and R8: `tsc` required props; axe over every UI-map
    state; the layout audit's `smallTargets`; the contrast test.*

26. **Motion runs on the UI thread and respects the user.**
    - **Only what explains a change moves.** At most two continuous
      animations per screen (`Aura`, `Presence`), paused off-screen and in
      the background.
    - **The UI thread only:**
      - Reanimated worklets and CSS animations;
      - the native sheet, push and alert curves;
      - Estela: Skia v2 Atlas driven by Reanimated on phones
        [skia-atlas] [skia-reanimated], plain Canvas 2D on web and Tauri
        [canvas-2d], both inside `shared/ui`.

      Never a per-frame `setState`, a timer or `requestAnimationFrame`
      driving visuals outside `shared/ui`, or `Animated` from
      `react-native`.
    - **Animate `transform` and `opacity` only.** At most one blur layer.
    - **Values come from tokens:** the springs `snappy`/`gentle`/`playful`
      and `fast`/`base`/`slow`.
    - **Shared values** use `.get()`/`.set()`, never `.value`, and are never
      read in render.
    - **Reduce Motion:** every animation keeps `ReduceMotion.System`, every
      loop has a still form, and alert pulses stay under three flashes a
      second.
    - **The performance tier** `perfTier` is `low`, `mid` or `high`, from
      `shared/theme/effects.ts` (`useEffects`); `low` gets the still and
      solid forms of spec §7b and §8b.
    - **No UI sound** (deferred by the owner): animation and haptics carry
      every moment [expo-haptics].

    *Measured: the lint `Animated` and timer bans; `check:quality`
    `shared-value-dot-value`, `loop-without-reduce-motion`,
    `animated-layout-prop`, `timer-in-component`. Reviewed:
    `react-hooks/immutability` back on (S1), the layout audit's
    `infiniteAnimations` (R8), the Android frame budget (R9).*

27. **Text the user reads is a typed key, in Argus's voice.**
    - Every string comes from the dictionaries, with keys and parameters
      checked by `tsc`.
    - Server values go through `Record<Enum | 'unknown', TranslationKey>`
      maps, never template-literal keys.
    - Plurals use `Intl.PluralRules` categories.
    - Sentences are never concatenated.
    - Dates, numbers and durations go through the formatter (the device's
      12/24 h, units in words).
    - Copy follows the redesign spec §12: tú, short, one name per thing,
      buttons that name the act, no technical words, no exclamation marks.

    *Measured: lint (template-literal `t()`, `i18next/no-literal-string`
    `jsx-only`); `check:quality` template-literal `t()`; `tsc`. Reviewed:
    plurals (S1), the glossary and banned-words test (S3).*

28. **Platform differences live in platform files.**
    - `.native`/`.web` pairs export the same names, or the behaviour is a
      `platform/*` service.
    - `IS_*` branches in features are for copy and layout only.
    - Permission and device flows go through the platform service.
    - Device nouns come from `platform/device`.
    - Desktop and mobile idioms are chosen by the components, never by a
      screen.

    *Measured: `check:quality` `IS_*` branches in features and
    `Platform.select`. Reviewed until R3: the pair comparison.*

29. **Layout is audited.**
    - Every UI-map state renders at the nine viewports, at font scale 1.0,
      1.3 and 2.0, in light and dark.
    - There is no overflow, clipped or overlapping control, small target,
      truncated key fact or raw error text.

    *Reviewed until R8 (merged at S2): the layout audit and
    `scripts/lib/layout-baseline.txt` in the integration build.*

### E. Performance

30. **Startup and bundle budgets.**
    - **Measure first:** cold start and the `first-frame-from-cache` and
      `ready` marks on the reference Android device (production build,
      median of 10).
    - **Nothing before the first frame** except reading the session and the
      view cache. `Presence` shows its still frame until its renderer
      starts after the first frame.
    - **The web entry chunk is ≤ 6.6 MB**, and `dist/` has a budget.
    - **Lazy code:** `livekit-client`, the WebCodecs player, the QR scanner
      and face capture load on use. Skia's CanvasKit never ships on web.
    - **Dependencies:** every new dependency records its size in
      `CONTEXT.md` (the redesign's: TrueSheet 3.11.18, Skia 2.14.0,
      expo-haptics, expo-blur, expo-glass-effect, expo-device, sonner-native,
      sonner).

    *Measured: `bun run check:bundle` (render under the Tauri CSP, entry and
    `dist/` bytes against `bundle-baseline.txt`, lazy packages absent from
    the entry). Reviewed until R9: `scripts/perf/cold-start.ts` against
    `perf-baseline.txt`.*

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
    - **Logging:** `console` only in the log module, and debug output only
      in `__DEV__`.

    *Measured: `check:quality` manual memo; the `react-hooks` compiler rules;
    `no-console`. Reviewed until R9: `scripts/perf/frames.ts`.*

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

    *Measured: ESLint at `error` with the debt in the suppressions file;
    `check:quality` `props-over-10`.*

33. **Formatting and small conventions.**
    - Prettier with `prettier-plugin-tailwindcss` formats everything.
    - `console` only in the log module.
    - Dates only through the formatter.
    - Timers are never called as methods.
    - React APIs are imported by name.
    - Platform flags come from their home, never `Platform.OS` or
      `__TAURI_INTERNALS__`.
    - Official Expo APIs are used directly (for example `SystemBars`).
    - TypeScript is strict with `noUncheckedIndexedAccess`, and `tsc
      --noEmit` has 0 errors.

    *Measured: `bun run check:format` (a ratchet: a file not on the
    unformatted list must be formatted, and the list only shrinks; the one
    formatting commit waits for the open branches, D4); the lint selectors;
    `tsc`.*

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

    *Measured: `bun run test`; `bun run test:e2e:run`; `check:quality`
    source-text tests and `untested-component-or-screen`. Reviewed until R8:
    coverage per slice, WebKit and Maestro.*

35. **Networking and secure storage.**
    - One JS API over Nitro and Tauri, no `fetch` from the WebView,
      `serviceUrl` for every URL, pairing proofs, Rust-owned trust keys and
      a strict CSP.
    - Native `CODE|message` errors are mapped by rule 20 and never shown.
    - The CSP does not change for the redesign: Estela draws with Canvas 2D
      on desktop (R-D18 withdrawn). Any CSP change is an owner decision
      recorded in `CONTEXT.md`.

    *Measured: the `net` tests, `cargo check`, `check:bundle` under the
    CSP.*

36. **Contracts with the backend.**
    - `role-access`, `capability`, `modules`, notification kinds, error codes
      and reasons mirror the backend headers.
    - HTTP schemas mirror `backend/scripts/fixtures/http`.
    - A backend contract change lands with its frontend change.

    *Measured: `bun run test` → `tests/contracts/*` and the contract tests in
    `tests/unit/`. Reviewed until S1: the error-code contract.*

---
