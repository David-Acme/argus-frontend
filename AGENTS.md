# AGENTS.md — Argus Frontend AI Agent Instructions

> This file is read by AI coding assistants before any code generation task.
> It defines the project's architecture, conventions, and constraints.

## Project Identity

- **Argus** — AI-powered video surveillance platform mobile app (security, computer
  vision, IoT, local AI). Premium, calm, minimal design language.
- **Stack**: React Native 0.86 + Expo SDK 57, TypeScript strict, Expo Router
  (file-based routing), Tailwind CSS v4 via **Uniwind**, React Native Reusables
  (`@rn-primitives`), `react-native-mmkv` (native storage), `lucide-react-native`
  (icons, centralized), `zustand` v5 (8 stores), **WatermelonDB 0.28** (local DB,
  13 tables), `rxjs` (service observables → view-cache projections → React via `useViewCacheRows`), `zod` +
  `react-hook-form` (forms), custom i18n engine (es/en). The React Compiler is on
  (`app.config.ts` → `experiments.reactCompiler`).
- **Media/Platform**: `expo-camera` (barcode/QR + face capture, mobile),
  `expo-audio`, `react-native-svg` + `qrcode` (QR rendering y avatar
  procedural). Platform/Tauri flags centralized in
  `common.constant.ts` (`IS_WEB`, `IS_NATIVE`, `IS_ANDROID`, `IS_IOS`, `IS_TAURI`).
- **Local network**: **Nitro** module (`modules/argus-net`, Kotlin/Swift) for mobile and
  **Tauri 2 + Rust** (`src-tauri/`) for desktop; secrets with `expo-secure-store`
  (mobile) / `keyring` crate (desktop). See `CONTEXT.md` → "Secure networking".
- **Redesign** (one programme with the rules and the refactor, owner decision
  2026-10-20): the spec is `docs/plans/redesign-spec.md`, its values are
  `src/shared/theme/tokens.ts`, the performance tier is
  `src/shared/theme/effects.ts`. Its dependencies:
  `@lodev09/react-native-true-sheet` 3.11.18 (native sheets),
  `@shopify/react-native-skia` 2.14.0 (Estela on phones; Canvas 2D on web and
  Tauri), `expo-haptics`, `expo-blur`, `expo-glass-effect`, `expo-device`,
  `sonner-native` and `sonner` (toasts). No UI sound.
- **Package manager**: **bun** (`bun.lock`). Path alias `@/* → src/*`.

## MUST-FOLLOW Rules

Rules are **measured, not reviewed**. Each one names its gate, and every
counter is a **ratchet**:

- a committed baseline;
- a count that rises fails;
- a count that falls fails until the baseline is lowered in the same change;
- a baseline is never raised, unless the change adds a row to `CONTEXT.md`
  › "Re-baselines" naming it (`scripts/check-baselines.ts`).

The baselines are:

- `scripts/lib/quality-baseline.txt` (with its `scanned-files` line) and
  `scripts/lib/memo-exceptions.txt`, read by `bun run check:quality`;
- `scripts/lib/boundaries-baseline.txt` and `scripts/lib/cycle-baseline.txt`
  (the members of each cycle), read by `bun run check:boundaries`;
- `eslint-suppressions.json` (ESLint bulk suppressions), read by
  `bun run lint`;
- the list of files not yet formatted, read by `bun run check:format`;
- `scripts/lib/bundle-baseline.txt`, read by `bun run check:bundle`;
- proposed, not yet in `verify`: `scripts/lib/duplication-baseline.txt`
  (duplicated lines and clones of `src`, jscpd 4.0.5 through `bunx`,
  `.jscpd.json`), read by `bun run check:duplication`, and
  `scripts/lib/unused-baseline.txt` (knip 6.41.0 through `bunx`, `knip.json`:
  unused files, dependencies, unlisted dependencies, exports and types;
  unresolved imports are not counted, knip does not read the `.native`/`.web`
  suffixes and tsc resolves every import), read by `bun run check:unused`;
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
     - `react-hooks` 7, the 17 rules of `recommended-latest`;
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

#### Rule 3 today: the scanner

`scripts/check-comments.ts` (`bun run check:comments`) lexes every file git
tracks — TypeScript and JavaScript through the TypeScript parser, the
C-family languages through a lexer that knows nested blocks, raw strings and
Rust lifetimes — fails on any comment and on any file type it cannot classify,
and `--fix` removes what it finds. `uniwind-types.d.ts` is generated and
skipped.

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

#### Rule 6 today: the tree before the layers (R3)

Until R3 moves `core/` into `platform/` and `entities/`, the tree is:

```
src/
  app/          expo-router pages (file-based routes); native-only routes via Stack.Protected in _layout.tsx;
                every signed-in screen lives in (app)/, whose layout guards the session and mounts the nav once
  core/         infra: services, types, interfaces, stores (zustand)
  features/     one folder per domain (a vertical slice): screens/ components/ hooks/ services/;
                its index.ts is the public API, and a route file is one line re-exporting a screen
  shared/       what 2+ consumers use: components (ui/ and layout/ are the design system), constants, libs, hooks
  global.css    Uniwind/Tailwind tokens (source for styling)
```

#### Rule 6 today: the five boundary rules

`scripts/check-boundaries.ts` (`bun run check:boundaries`, part of `verify`)
reads every import under `src/` and fails on a new violation of:

1. `app/**` imports a feature only through `features/<name>/index`, and never
   `core/database` or `core/services/*`.
2. A feature imports another feature only through that feature's `index`.
3. `core/**` never imports `features/` or `shared/components`.
4. `shared/**` never imports `features/`.
5. A `shared/` module outside `components/ui` and `components/layout` has two
   or more consumers (the 2+ rule; a hooks/libs file or a components folder is
   one module).

There is no allow-list: the gate started with one (58 entries) that shrank to
zero as each domain moved into its feature folder, and was deleted.

Beside them, v2 counts import cycles (file and slice SCCs), deep imports
into another slice's internals and route files that are not one-line
re-exports against `scripts/lib/boundaries-baseline.txt`, and runs
`scripts/check-lint-policy.ts` (rule 2) and `scripts/check-references.ts`
(rule 4).

7. **One public API per slice.**
   - Every slice is reached only through its `index.ts`, which lists named
     exports.
   - No deep imports.
   - No `export *` anywhere in `src/`.

   *Measured: `check:boundaries` deep imports into another slice's internals
   (ratchet). Reviewed: `export *`, until R3 adds its lint selector.*

#### Rule 7 today: the barrels

Until R3 gives every slice its `index.ts`, the shared vocabulary lives in
barrels, and consumers import the barrel, never the file. The `export *`
lines below are the debt rule 7 ends at R3.

**Constants** (`*.constant.ts`):

- `src/shared/constants/{domain}.constant.ts` (e.g. `color.constant.ts`,
  `theme.constant.ts`, `icon.constant.ts`).
- Barrel: `src/shared/constants/index.ts` → `export * from './{domain}.constant'`.
- Consumers import from `@/shared/constants` (never the file directly).

**Types** (`*.type.ts`):

- `src/core/types/{domain}.type.ts` — aliases and unions (e.g. `ThemePreference`,
  `StoragePrimitive`, `IconName`).
- Barrel: `src/core/types/index.ts`.

**Interfaces** (`*.interface.ts`):

- `src/core/interfaces/{domain}.interface.ts` — `I*` contracts (e.g. `IStorageService`).
- Barrel: `src/core/interfaces/index.ts`.

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

#### Rule 10 today: the icon registry

- **Only** `src/shared/constants/icon.constant.ts` imports `lucide-react-native`.
- To add an icon: add a per-icon deep import there
  (`import Bell from 'lucide-react-native/icons/bell'`, the file name is the
  icon's canonical kebab name) + a **kebab-case** key to `ICONS`. Never import
  from the package root: that ships the whole icon set (~3 MB of the web entry).
  `morph-icon.constant.ts` does the same with `lucide/dist/esm/icons/<name>.mjs`
  (typed by `lucide-icons.d.ts`).
- Consume **only** via `Icon` from `@/shared/components/ui/icon`:
  ```tsx
  <Icon name="shield-check" className="size-5 text-muted-foreground" />
  ```
- `IconName = keyof typeof ICONS` lives in `src/core/types/icon.type.ts`.
- **Never** import lucide directly in components or pages.

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

#### Rule 12 today: file names

**Every file is `kebab-case` — including component files.** The exported symbol
stays `PascalCase`; only the file name is kebab.

```
src/features/voice/components/avatar.tsx      → export default function Avatar()
src/shared/components/qr/qr-scan-sheet.tsx     → export function QrScanSheet()
src/shared/components/ui/native-only-animated-view.tsx
src/shared/hooks/use-window-class.ts
src/core/stores/qr-scan.store.ts
```

- Never `Avatar.tsx` (kebab-case file, PascalCase export).
- Multi-word compounds split on `-`: `qr-scan-sheet`, `use-theme-preference`,
  `qr-scan.store`.
- Suffixed families keep their suffix after the kebab name:
  `{domain}.constant.ts`, `{domain}.type.ts`, `{domain}.interface.ts`,
  `{domain}.store.ts`, `{domain}.native.ts` / `{domain}.web.ts`.
- **Only documented exception**: `modules/*/src/{Name}.nitro.ts`
  (`ArgusNet.nitro.ts`, `ArgusCamera.nitro.ts`, ...). Nitrogen requires the
  spec file name to match the HybridObject name declared in
  `nitro.json` (`autolinking.ArgusNet`, `androidCxxLibName`, `iosModuleName`) —
  renaming it breaks codegen.

#### Rule 12 today: one pattern for where code goes and how it is imported

Owner decision (2026-10-26). Every new or touched file follows this. Code written
before it is normalised in one pass when the redesign closes (the pending
list in CONTEXT.md › "Pending normalisation").

**Where a constant or a type lives: decided by who uses it (the 2+ rule).**

| Used by | Constants | Types |
|---|---|---|
| one feature | `src/features/<feature>/constants/<name>.constant.ts` | that feature's `model/` (next to the logic that needs it) |
| two or more features, or no domain at all (platform, layout, i18n, cache keys, sheets, sync) | `src/shared/constants/<domain>.constant.ts` | `src/core/types/<domain>.type.ts` |
| the server's vocabulary (enums, wire values) | its contract-tested module | `z.infer` of its schema, never written twice |

- Everything starts in its feature.
- It moves to `shared/` (or `core/types`) in the same change that gives it a second consumer feature.
- It moves back when only one consumer is left.
- A feature never keeps a loose `constants.ts`, only the `constants/` folder.
- Shared type files are named `<name>.type.ts`, never `-types.ts`.

**How to import.**

1. Inside your own feature, use the alias `@/features/<feature>/...`, never `./` or `../`. The only exception is the feature's own `index.ts` barrel.
2. Another feature is reached only through its `index.ts`: `@/features/<other>`.
3. Type-only imports are `import type { X } from '...'`, never `import { type X }`.
4. Imports sit at the top of the file (`import/first`, `import/no-duplicates`). They come in this order:
   1. external packages;
   2. `@/core/...`;
   3. `@/shared/...`;
   4. other features;
   5. your own feature.
5. Barrels list named exports; no new `export *`.
6. In a Bun test that mocks modules, the layout is: static imports, then every `mock.module`, then one `await import` block, then the tests (`argus/test-module-layout`).

**Interior of a feature.**
- A feature holds `screens/`, `components/`, `hooks/`, `model/`, `services/`, `constants/` and `stores/`, plus `index.ts`.
- A folder exists only when it holds a file.
- Pure decisions live in `model/`, with unit tests.
- A component reads data through its hook.
- A screen composes sections.

#### Responsive by height as well as width (owner decision 2026-10-26)

A screen is responsive only when it also holds on short phones: 320×568, 360×640, 375×667 and 360×740, as well as on tall ones and in phone landscape.

- **Bottom sheets** size to their content up to a cap. On a short window they open near full height with scrolling content and the footer action visible. A half-screen sheet that is mostly empty is a bug.
- **The tab bar** is at most 56 dp of chrome on short phones, and icons only below 600 dp of window height or in landscape.
- **Heroes, the Aura, Estela, the face finder, the call avatar and dialogs** scale with the window height, so the first content starts in the top 40 %.
- **Where the decisions live:** the height classes and every size decision come from `shared/theme` (tokens plus pure functions with tests). They are never ad-hoc numbers in features.
- **Gate:** the UI-map harness captures the short-phone viewports, and its layout audit fails when fixed chrome covers more than its share of the window, or when the first content starts below 40 %.

#### Local first, real time (owner decision 2026-10-26)

The app is local-first and live. This is why the sync tables exist, and every screen keeps both properties:

- **A synced table** is read from WatermelonDB or the MMKV view cache. The screen paints instantly, offline too, with no spinner and no skeleton.
- **The live stream:** the screen subscribes to the local observables, so a `/sync` Add, Delete or Log diff (a change made by Argus, by another member or on another device) shows at once without a reload. A row Argus changed carries «por Argus» where the data says so.
- **HTTP-only data** (episodes, presence, settings…) re-reads on the `ResourceChanged` frame for its `(domain, scope)`. It shows a skeleton only before its first answer.
- **Tests:** two-device e2e specs prove it per domain. A change made on device A, or by Argus through the fake backend, reaches device B live.

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

#### Rule 19 today: local persistence (WatermelonDB)

The paths are today's (`core/`); R3 restates them for `platform/database`,
`platform/sync` and the entity stores.

**The database is reached ONLY from `src/core/services/*.service.ts`.** There is
no `DatabaseProvider` and no `useDatabase`: a hook or a screen that imports
`@/core/database` is a bug.

```
core/database  ←  core/services/*.service.ts  ←  view-cache projections  ←  shared/hooks/use-cached-rows  ←  UI
```

- **`src/core/database/`** — WatermelonDB 0.28, platform-split like every other
  service: `database.native.ts` (`SQLiteAdapter`, `jsi: true`) /
  `database.web.ts` (`LokiJSAdapter`, `useWebWorker: false`) + `index.ts`.
  The barrel exports `database`, the models and the typed
  `collection('zone') → Collection<ZoneModel>` accessor.
- **DB typing** (`TableName`, `ModelOf`, `ModelMap`) lives in
  `src/core/types/database.type.ts` (imports are `type`-only → no runtime cycle);
  the table-level enums and JSON shapes (`UserRole`, `ZonePoint`, ...) are there too.
- **One file per table**: `tables/{domain}.table.ts` holds the `tableSchema` AND
  the `Model` together — the column names and the decorator arguments must match
  exactly, and a mismatch only fails at runtime. `tables/index.ts` is the single
  registry from which `appSchema` and `modelClasses` are derived (adding a table =
  1 file + 1 line, never registered per platform). `tables/sanitizers.ts` holds the
  shared `@json` sanitizers.
- **Column naming is snake_case, models expose camelCase.** `created_at` /
  `updated_at` are snake_case by hard requirement (see below), so mixing casings
  would mean remembering an exception in every `Q.where`.
- **`Model.prepareUpdate()` touches `columnName('updated_at')` whenever the model
  exposes an `updatedAt` property**, and `RawRecord._setRaw` destructures the
  column schema with no guard → `TypeError` if that column is not declared.
  `notification` has no `updated_at`, so `NotificationModel` MUST NOT declare
  `updatedAt`. The validator additionally forces `created_at`/`updated_at` to be
  `number` and NOT optional → `0` is the "no value" sentinel.
- **`id` is the server id stringified** (`sanitizedRaw` honours `dirtyRaw.id`), so
  there are no `_id` / `local_id` / `version` columns and FKs are plain indexed
  `string` columns that `@immutableRelation` resolves natively.
- **No `deleted_at` / `is_deleted`**: a server-side delete removes the local row.
- **Timestamp columns store epoch MILLISECONDS** (the backend sends seconds); the
  `× 1000` conversion belongs to the sync mapper.
- **`camera.password` is never persisted.**
- **JSON columns** (`capabilities`, `config`, `points`, `file_paths`, `data`) use `@json`
  with the shared sanitizers in `tables/sanitizers.ts` (fail-safe to `[]`/`{}`); hot
  columns (`capabilities`, `points`) pass `{ memo: true }` to skip re-parsing on reads.
- Relations point at `camera` / `project` only. Toward `user`, expose the raw id:
  role filtering can leave that row absent locally and `Relation.fetch()` throws.
- **`DatabaseService<K>`** (`core/services/database.service.ts`) is the base class.
  Query primitives are **`protected`** so `Clause` never crosses the service
  boundary; the public surface of a service is domain-named.
- **`query.observe()` does NOT re-emit when a field changes** on a record already
  in the result set — only on enter/leave. Lists that render fields must use
  `observeManyWithColumns`.
- Watermelon reaches React only through the view cache: the coordinator's
  projections subscribe, and screens read `useViewCacheRows` /
  `useViewCacheValue` (`shared/hooks/use-cached-rows.ts`, `useSyncExternalStore`).
  No `@nozbe/with-observables` (HOC, and the source of the React 19 peer conflict).
- Build config: `babel.config.js` needs `@babel/plugin-proposal-decorators`
  (`version: 'legacy'`) + `class-properties`/`private-methods`/
  `private-property-in-object` in `loose: true`. **These four MUST stay inside the
  `overrides` entry scoped to `src/`** — never move them back to the top-level
  `plugins` array. Top-level `plugins` run before the presets, so a global
  `class-properties` with `loose: true` reaches `node_modules` and rewrites
  Flow's type-only class fields (`+NONE: 0;`) into plain assignments before
  `flow-strip-types` can erase them. React Native's `Event.js` declares
  `NONE`/`CAPTURING_PHASE`/`AT_TARGET`/`BUBBLING_PHASE` that way *and* defines them
  as non-writable on `Event.prototype`, so `new Event(...)` then throws
  `Cannot assign to read-only property 'NONE'` in strict mode.
  `tsconfig.json` needs
  `experimentalDecorators` and **`useDefineForClassFields: false`** (otherwise TS
  emits instance fields that shadow the prototype getters the decorators install).
  Never add `react-native-worklets/plugin` by hand — the preset does it and runs
  after these plugins.
- `migrations.ts` is wired from v1 while empty: bumping `SCHEMA_VERSION` without
  `migrations` passed to the adapter **wipes the local database**.
- Adding WatermelonDB changed native deps → **the dev-client must be rebuilt**.
  `jsi: true` falls back to the async bridge with a warning if unavailable.

#### Rule 19 today: local-first cache, pagination and granular synchronization

Argus paints an authorized local view synchronously. **MMKV is the first-frame
source for a view; WatermelonDB is the durable synchronized projection used to
maintain that cache and to execute local filters.** A screen must neither wait
for Watermelon nor make an HTTP list request just because it mounted.

- UI routes import neither `@/core/database` nor service observables. They read
  `useViewCacheRows` / `useViewCacheValue` from
  `shared/hooks/use-cached-rows.ts`; the only React state retained by that hook
  is an MMKV revision, never a JS array mirror. Do not use legacy
  `useCachedRows` in new view code.
- `viewCacheService` owns serialized MMKV values. Keys are namespaced as
  `view.cache.v2.<userId>.<viewKey>[.<scope>]`; `setUserId` and `clear` are a
  session boundary, so one account cannot paint another account's snapshot.
  `view-cache-memory.ts` must not be reintroduced. A write whose serialized
  content is identical to what is stored is skipped (no write, no notify), so
  a view keeps its reference and does not re-render.
- `ViewCacheCoordinatorService` is the **only** owner of the Watermelon
  subscriptions that feed views. `sessionService` starts it once the user is
  established/restored and stops it before local projection/cache cleanup. It
  is a **projection registry**: each projection in
  `core/services/view-cache/*.projection.ts` names its own sources and a pure
  `project(values, ctx) → ViewWrite[]` (unit-tested in
  `tests/unit/view-cache-projections.test.ts`); the session's Watermelon
  observables are shared (`shareReplay`) so two projections reading one table
  open one query. A projection with `tracked` keys removes the scopes it no
  longer writes (a deleted project's task list). A screen may request a
  semantic scope (currently the calendar month), but may not subscribe to a
  model itself.
- Cache pages are semantic, not an unbounded dump: ordinary list pages have
  `VIEW_CACHE_PAGE_SIZE = 40`; agenda day/week/month reads the requested date
  range from its active calendar cache, and a month cache covers the 42-day
  visible grid for any week start (from six days before the 1st to 42 days after). The active month and its two neighbours are cached, so paging
  one month paints instantly; older months are dropped. One `camera.list`
  snapshot carries every camera with its zones and stream resolution (list,
  dashboard and detail read it). The people search filters the cached
  directory in memory (`filterPeople`), never a query per keystroke.
- **Long lists page; they never show their end early.** A list that can grow
  renders through `InfiniteList` (`shared/components/ui/infinite-list.tsx`)
  with the state from `useInfiniteList` (`shared/hooks/use-infinite-list.ts`).
  Its source is one of three. A local keyset view
  (`DatabaseService.observeKeysetPage`/`nextKeysetWindow`, the sort column
  plus `id`, a cursor-held window, never offset/skip) served as a coordinator
  paged view (`watchPages`/`extendPages`/`releasePages`, read with
  `usePagedView`). A server cursor feed (`RemoteFeed` in
  `core/services/paging/`, read with `useRemoteFeed`). Or rows already in
  memory (virtualization only). The footer shows skeletons while more may
  exist, an error with retry, and the end only when the source is exhausted.
  A list inside a panel fills it with a definite zero basis or takes `maxHeight`
  on a phone; rows recycle only when stateless. Small bounded lists
  (environments, household users, settings, presets) are not paged. See
  CONTEXT.md "Lists that end only when the data does".
- The coordinator writes base snapshots whenever Watermelon changes and keeps
  the default cache fresh before navigation. A next-midnight refresh rebuilds
  date-derived dashboard/day snapshots.
- Initial normal sync is a full projection bootstrap; subsequent `Synchronize`
  pages use **`createdAt` only** for newly created rows and deletions. Field
  updates/revocations flow through global `audit_log` and user-scoped
  `user_audit_log`, whose cursors are monotonic `{ lastId, watermarkId }`.
  Fetch audit pages with `afterId/endId`, apply only each
  `changes[field].current` to Watermelon, and persist the cursor only after the
  page is applied. A missing audit target triggers a context recovery.
- The projection records whom it was built for (`ProjectionOwnerStore`,
  user id + role, in WatermelonDB's own `localStorage` so it vanishes with
  the rows). It is written when a sync completes and forgotten before any
  wipe, together with the cursors; InitialInfo pages incrementally only
  when it matches the server's user and role, and otherwise wipes and
  bootstraps (another account's leftovers, a WatermelonDB reset, a resync
  killed halfway).
- Remote mutations may show loading only on the initiating control via
  `<Button loading>`; they must not replace a cached screen with a full-screen
  spinner.
- Data that only the server answers (settings, guard, camera device status
  and capabilities) is read with `useRemoteResource({ cacheKey, scope?, load,
  enabled?, resources? })` (`shared/hooks/use-remote-resource.ts`): it paints the
  last answer from the view cache, refetches on focus, ignores stale answers, and
  `mutate` updates the cache optimistically. `load` must be stable (a
  module-level arrow or a `useCallback`), and so must `resources`: it declares
  the `ResourceMatch` pairs (`{ domain, scope?, id? }`) the answer depends on,
  and the hook reloads when a `ResourceChanged` frame matches one of them —
  coalesced at the source, one reload in flight, one follow-up at most; a pair
  without a scope matches the whole domain, and a pair with an `id` answers
  only a notice that names that id or names none at all (a scope-wide notice,
  such as a purge, reloads every reader of the pair). Every enabled mounted
  hook, resources or none, also reloads when the socket reconnects after a
  disconnect, which is the catch-up for the frames a device missed; a first
  connect reloads nothing. `useRemoteFeed` takes the same resources as its
  fourth argument. A
  server action goes through
  `runServiceAction({ confirm?, call, success?, errorTitle? })`
  (`shared/libs/service-action.ts`: confirm, call, error or success toast,
  result or `null`); `useServiceAction()` adds the `pending` flag for the
  control that started it. Never hand-write a generation ref, a
  `let active = true` effect or a confirm → call → toast block. Detail routes must not redirect merely because their cache has not
  been populated yet.
- **Optimistic UI for synced rows.** A mutation on a row the sync delivers
  (event, task, project, user, invitation, notification) shows its result at
  once and reconciles with the synced row. `runOptimistic({ intents, call,
  confirm?, undo?, success?, errorTitle? })` (`shared/libs/optimistic-action.ts`)
  registers entity-level intents (`{ table, kind: create | update | delete,
  recordId?, values }`, `values` in the HTTP body's shape) in the in-memory
  `optimisticRegistry` (`shared/libs/optimistic.ts`), runs the call, confirms
  with the server id from `info.id` or rolls back and toasts the refusal (a
  retryable refusal carries a Retry action). `undo` defers the call behind an
  Undo toast (deletes of events and tasks); destructive or security-relevant
  actions keep `confirm`. Views read `useOptimisticRows(rows, lenses,
  compare?)` (`shared/hooks/use-optimistic-rows.ts`) over their view-cache rows;
  a **lens** (`defineLens`) belongs to the feature that owns the view and maps
  the entity intent onto its row shape (`recordIdOf`, `patch`, `create`,
  `prepend`). The registry knows no feature. A create is keyed by the server id
  once confirmed, so the sync `Add` never shows a second row; a confirmed
  intent leaves only on evidence (its patch is a no-op on the synced row, or
  the created id is present), in per-record order, or after 60 s; a user change
  clears it. Pending creates render dimmed and refuse actions
  (`isPendingRecordId`). Forms pass `optimistic` to `useFormSubmit`: the dialog
  closes on valid input and the save runs behind the overlay.

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

#### Rule 21 today: the legacy colour classes

- `src/shared/constants/color.constant.ts` — **canonical HEX of today's UI**
  (JS/native/React Navigation). `src/shared/theme/tokens.ts` already holds the
  redesign's roles; the old palette stays until S3 rebuilds its last
  consumer, and `legacy-token-class` counts its class names down to 0.
- `src/global.css` — OKLCH tokens for Tailwind/Uniwind. **MUST mirror
  color.constant.ts** — keep both in sync manually until `gen-tokens.ts`
  generates the theme block (R5, S1).
- Today's semantic tokens (the legacy names): `background`, `surface`, `surface-secondary`, `card`,
  `card-secondary`, `border`, `border-subtle`, `divider`, `foreground`,
  `foreground-secondary`, `muted-foreground`, `placeholder`, `success`, `warning`,
  `error`, `info`, `interactive`, `interactive-hover`, `interactive-pressed`,
  `accent`, `accent-hover`, `accent-soft`, `disabled`, `overlay`,
  `foreground-on-interactive`.
- shadcn-compatible aliases exist in `global.css` (`primary→interactive`,
  `destructive→error`, `muted→surface-secondary`, `ring→accent`, ...) so React
  Native Reusables components keep working out of the box.
- Prefer semantic classes (`bg-surface-secondary`, `text-foreground-secondary`)
  over ad-hoc colors. **No hardcoded hex in components.**
- **Text and icons meet WCAG AA (4.5:1) on `background` and `card`.** Status
  and accent colors are fills; their text/icon twins are `error-strong`,
  `warning-strong`, `accent-strong` (`text-error-strong`, never `text-error`).
  `success`, `foreground-secondary`, `muted-foreground` and `placeholder` are
  already text-safe in both themes. The redesign's roles in `tokens.ts` have
  no twins: the role is the text-safe value and a pure fill is named as a
  fill (rule 21). Do not add a new strong twin.

#### Rule 21 today: theme preference

- `ThemePreference = 'system' | 'light' | 'dark'` in `core/types/theme.type.ts`.
- `src/shared/hooks/use-theme-preference.ts` → `getThemePreference()` /
  `setThemePreference()` (persists to storage + `Uniwind.setTheme`).
- `src/app/_layout.tsx` applies the persisted preference on mount.
- React Navigation colors via `NAV_THEME` / `BG_COLORS` in
  `src/shared/components/layout/navigation-theme.ts` (HEX from `color.constant.ts`).
- **Native system bars**: `SystemBars` from `react-native-edge-to-edge` (official
  Expo-supported API) is used **directly** in `_layout.tsx` — **no wrapper
  component**: `<SystemBars style={isDark ? 'light' : 'dark'} />`. It replaces
  the deprecated `expo-status-bar`/`expo-navigation-bar` APIs in edge-to-edge
  apps, handling the status bar (notification bar) + Android navigation-bar
  buttons. Config plugin in `app.config.ts` (`parentTheme: "Default"`,
  `enforceNavigationBarContrast: false` for a fully transparent button nav bar
  that follows the app background). NOTE: plugin options require a development
  build (not Expo Go).

22. **No arbitrary values, no raw palette, no inline sizes.**
    - No `-[…]` utilities, default-palette classes, `text-xs…9xl` or
      `rounded-[…]`.
    - No inline `style={{…}}` with a colour or a size.
    - APIs that need numbers read `tokens`.

    *Measured: `better-tailwindcss/no-restricted-classes` and correctness
    rules; the type-scale selector; `check:quality` arbitrary values and
    `style={{`.*

#### Rule 22 today: the legacy type scale

- **Type scale.** `Text` variants are the scale: `display` (32/38),
  `title` (24/30), `headline` (20/26), `subhead` (17/24), `body` (15/22),
  `label` (14/20 medium), `caption` (13/18 muted), `micro` (11/14 muted).
  Today's components use them instead of `text-[Npx]`; today's `Text` caps OS
  font scaling at 1.6x (rule 25 replaces it with each step's `maxScale`) so layouts survive the largest accessibility sizes. The legacy
  `h1–h4`/`muted`/`lead`/`large` variants are gone, and lint rejects a raw
  `text-xs…text-9xl` or `text-[Npx]` in a `className` outside
  `src/shared/components/ui/` (the primitives that implement the scale).
- The new `Text` steps (`hero` … `caption`) and roles read `tokens.type` and
  `tokens.typeRoles`; the selector accepts them and still bans the raw scale.

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

#### Rule 23 today: responsive product rules for the current components

- The UI is warm, calm, modern and simple: follow intrinsic content on compact
  screens; never reserve large empty cards merely to match a desktop column.
  Use minimum heights only where a section needs a stable visual footprint
  (for example dashboard camera/tasks), then let the layout collapse naturally
  when there is no content.
- Mobile uses sheets and touch-first actions. Tablet uses contextual/anchored
  menus for long-press actions; desktop/web uses pointer menus. Dialogs for
  detail/confirmation stay deliberately narrow, not full-width on a tablet.
- Adapt every changed screen for phone, portrait/landscape tablet, laptop and
  desktop. Prefer Uniwind/Tailwind v4 classes; use React Native `StyleSheet`
  only for APIs that require it. Respect reduced motion and keep navigation
  natural per platform.
- Side-by-side columns end on the same line: the last panel of the shorter
  column takes `flex-1`, and only while the columns are side by side
  (`isWide`); stacked on a phone, a stretched section would split the
  screen. Dialogs and sheets render beside `AppScreen`, never as its
  children: its body lays children out with a gap, so a closed dialog adds
  an invisible one.
- Dialogs scroll through `AdaptiveDialog` itself (`OverlayBody`: full-width
  body, ring-safe gutter, sticky header and actions); never wrap a dialog's
  content in another vertical scroll view, and pass `onSubmit` to a form
  dialog so Enter submits on web.
- Fills that mark something on a card use `surface-secondary` (it sits
  below the card in light and above it in dark); a card nested in a card
  adds `dark:bg-card-secondary`, because dark mode cannot show the shadow
  that separates them in light.

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

#### Rule 25 today: the current buttons' touch targets

- **Touch targets.** Buttons are at least 44pt tall on touch platforms
  (`default` 44, `lg` 48, `icon` 44; `sm` 40 plus hit slop) and compact on
  web/desktop where a pointer is precise.

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

#### Rule 26 today: the current avatar, until `Presence` (Estela) replaces it

`Presence` (Estela, R-D28, spec §8b) replaces `welcome-mascot/*` and
`features/voice/components/avatar.tsx` at S3. Until then the voice avatar is:

- A **procedural 2D bubble head** rendered with **react-native-svg** on every
  platform (native and web/Tauri, no CanvasKit). There is no platform-split
  loader (`avatar-loader.{native,web}.tsx` does not exist): the barrel
  `src/features/voice/components/avatar.tsx` is one file for both.
- **Pure geometry without React**: `src/features/voice/model/avatar-geometry.ts`
  (`computeFaceGeometry(size)`); consumers memoize it with `useMemo` (only
  `size` changes the paths; the rest of the motion is transform/opacity).
- **Presets per state**: `src/features/voice/constants/avatar.ts`
  (`AVATAR_STATE_PARAMS: Record<AvatarState, AvatarExpression>`: eyeOpen,
  pupilX/Y, browTilt/raise, headTilt, headBob, sparkle, driftSpeed) +
  `AVATAR_PALETTE` (light/dark) + transition and blink timings.
- **Types in `src/core/types/avatar.type.ts`** (`AvatarState`,
  `AvatarExpression`); state in `src/features/voice/stores/avatar.store.ts`
  (`useAvatarStore`, which replaced `orb.store`).
- **Expression → shared values** with `withTiming` (900 ms; 380 ms while
  speaking). Per-frame life runs in `useFrameCallback` (a worklet): Poisson
  blinks (2.6–5.4 s, `AVATAR_BLINK_*`), slow micro-saccades, head drift (the
  product of two sines), the speaking bounce (`headBob`). Everything is applied
  through `animatedProps` (`Animated.createAnimatedComponent(G/Ellipse/Circle/Line)`
  from react-native-svg), so there are **zero React re-renders per frame**.
- **The eyelid is a skin ellipse with an animated `ry`** over the eye (white,
  pupil, highlight); the pupil follows the gaze (`pupilX/Y + saccade`), and the
  brows rotate on their inner pivot (`browTilt`).
- **Reduce motion**: drift, bob and saccades are 0 and blinks are spaced out
  (about +6 s); the face stays still but alive.
- Integration: `welcome/voice` (voice states → `AvatarState`) and the greeting
  (`welcome/index`). The `idle/listening/thinking/speaking/error` states map to
  expressions; the face never deforms with the audio (no lip-sync: "speaking"
  is a head bounce and brighter eyes).

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

#### Rule 27 today: the i18n engine (no external library)

- **Dictionaries**: `src/core/locales/{locale}/` — one folder per locale;
  namespaces are **folders named like the routes** (`common/`, `screens/home/`,
  `screens/qr/`, `screens/not-found/`), each with an `index.ts` (route-folder
  convention). Default locale is `es`. `en` is forced to the same shape by
  `localeDictionaries satisfies Record<LanguageCode, I18nSchema>` in
  `locales/all.ts` — a key added in `es` but missing in `en` fails tsc. That
  module imports both dictionaries and is for tests and scripts only.
- **Only the default dictionary is in the entry chunk.** `es` (the default
  and the fallback of every missing key) loads eagerly; `en` is the lazy
  `english` chunk, loaded by `loadDictionary('en')`. Until it arrives,
  `dictionaryOf('en')` is the boot dictionary: English `common` and
  `screens.welcome` (all the splash reads) over `es`. `SessionGate` holds the
  splash until both the session and the active dictionary are ready, and
  `useLocaleStore.setLanguage` switches the language only once its dictionary
  is loaded (a later choice wins), so no frame shows a key or the other
  language. The locale data lives in `core/locales`, a slice of its own, so
  the store and the engine both read it without a cycle.
- **Typed keys**: `TranslationKey` (public in `core/types/i18n.type.ts`, derived
  in `core/locales/schema.ts` from the `es` literal) is the flattened union
  of all dotted paths — a wrong key is a tsc error. Keys are **kebab-case**
  (`screens.qr.detected-description`, `common.open-settings`).
- **Interpolation**: `{name}` placeholders; params are typed per key via
  template-literal types (`t('screens.home.welcome', { name })`). Keys without
  placeholders **reject** params and keys with them **require** them
  (`TranslationParamsRest` rest-tuple).
- **React**: `useTranslation()` from `shared/hooks/use-translation.ts` returns
  `{ t, language, preference }`; it subscribes to `useLocaleStore`, so every
  consumer re-renders on language change (100% real-time). `t` is rebuilt only
  when the resolved language changes.
- **Non-React**: `t()` / `setLanguage()` / `getLanguage()` from `@/core/i18n`
  read the current language from the store (`getState()`) — same typing,
  call-time freshness for `.ts` code (services, hooks, constants).
- **Store**: `core/stores/locale.store.ts` — `preference: 'system' | 'es' | 'en'`
  persisted under `app.language` via `storageService` (like `app.theme`). The
  stored preference **wins**; `system` resolves the device locale by **prefix**
  (`es-*` → `es`, `en-*` → `en` via `expo-localization`), fallback `es`. Sync
  init at module load (MMKV/localStorage are sync) — no layout effect needed;
  the resolved language is known before the first render, its dictionary is
  awaited by `SessionGate` behind the splash.
- **Missing keys/params**: dev-only `log.error` + fallback to the default
  locale → the key's last segment as words (`readableKey`) as last resort,
  never the dotted key. Never crashes.
- **Copy held by stores carries keys, never rendered text** (`QR_SCAN_PURPOSES`,
  `QrScanConfig`): translate at render time, so the store stays language-agnostic.
- `app.config.ts` native plugin strings (`cameraPermission`) are NOT runtime-translatable.

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

#### Rule 28 today: the platform-split services

- `src/core/services/{domain}/`:
  - `{domain}.native.ts` — native implementation (e.g. MMKV)
  - `{domain}.web.ts` — web implementation (e.g. localStorage)
  - `index.ts` — typed barrel: `export const storageService: IStorageService = ...`
- Resolution: Metro picks the platform file at runtime; TS resolves via
  `moduleSuffixes: ['.native', '.web', '']` in `tsconfig.json`. **No `// @ts-ignore` needed.**
- Consumers import **only the barrel**: `import { storageService } from '@/core/services/storage'`.
- **The `core/services/` root holds ONLY `*.service.ts` files.** Domain helpers,
  registries and pure logic live inside their domain folder next to an
  `index.ts` barrel (e.g. `http/http-auth.ts`, `net/net-persistence.ts`,
  `invite/invitation-resolution.ts`) — never loose at the root.

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

#### Rule 32 today: the golden rule of file and component order

File order (mandatory):

```
1. Imports
2. Types (named props types for every component)
3. Component declarations (incl. cva variant configs)
```

Inside every component (mandatory):

```
1. hooks / useState / variables / useMemo
2. functions / callbacks
3. useEffect / useLayoutEffect
4. render
```

- Props types are declared as **named types** in the Types section (no inline
  prop typing on the component signature).
- Forward type references are valid in TS (`type X = VariantProps<typeof cvaConst>`
  may precede the const).

33. **Formatting and small conventions.**
    - Prettier with `prettier-plugin-tailwindcss` formats everything.
    - `console` only in the log module.
    - Dates only through the formatter.
    - Timers are never called as methods.
    - React APIs are imported by name.
    - Imports sit at the top of the file, one declaration per module
      (`import/first`, `import/no-duplicates`). A dynamic `import()` in
      `src/` is only for lazy, platform-only or heavy code (rule 30), through
      one memoised loader per module and file.
    - Platform flags come from their home, never `Platform.OS` or
      `__TAURI_INTERNALS__`.
    - Official Expo APIs are used directly (for example `SystemBars`).
    - TypeScript is strict with `noUncheckedIndexedAccess`, and `tsc
      --noEmit` has 0 errors.

    *Measured: `bun run check:format` (a ratchet: a file not on the
    unformatted list must be formatted, and the list only shrinks; the one
    formatting commit waits for the open branches, D4); the lint selectors;
    `tsc`.*

#### Rule 33 today: the general constraints

- TypeScript strict with `noUncheckedIndexedAccess`. Run `bunx tsc --noEmit` before committing — **0 errors**.
- Barrel imports only (`@/shared/constants`, `@/core/types`, `@/core/interfaces`) until R3 (rule 7).
- No unused imports (`bun run lint` must be clean).
- Keep design language premium/calm: warm neutrals, grafito actions + arena accent,
  soft shadows. Today's radius scale (sm 6 / md 10 / lg 12 / xl 14 / 2xl 16 /
  3xl 20 / 4xl 24, `global.css` `@theme`, never a literal `rounded-[Npx]`; see
  CONTEXT.md "Calmer corners") serves today's components; the redesign's
  components read the named radius roles of `tokens.radius`.
- **React imports**: runtime imports are **named** (`useState`, `useEffect`,
  `useContext`, `createContext`, `type ReactNode`) — **never** `import * as React`.
  The `React.` namespace is allowed only in **type positions** (e.g.
  `React.ComponentProps`, `React.RefAttributes`) as a UMD global.
- **Official Expo/native APIs are used directly, without wrapper components**
  (e.g. `SystemBars` from `react-native-edge-to-edge`).
- **Platform/Tauri branching**: use the constants from `common.constant.ts`
  (`IS_WEB`, `IS_NATIVE`, `IS_ANDROID`, `IS_IOS`, `IS_TAURI`) — **never** hand-rolled
  checks (`Platform.OS === 'web'`, `'__TAURI_INTERNALS__' in window`). `Platform.select`
  stays allowed only for per-platform CSS classes. `react-hooks/immutability` is
  **off in `eslint.config.js`** — a known false positive with Reanimated shared-value
  `.value` writes, recorded in `CONTEXT.md` › "Lint exceptions". It comes back
  at S1 after the `.get()`/`.set()` codemod (rule 26); never an inline switch.

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

#### Rule 34 today: logging, tests and the bundle probe

- `console` is allowed only in `src/core/services/log.ts` (`log.error`,
  `log.debug`; debug prints only in `__DEV__`) and in `scripts/`; the lint
  rule `no-console` is an error everywhere else.
- Pure logic is unit-tested with `bun test` under `tests/unit/`
  (`bun run test` type-checks the tests with `tests/tsconfig.json`, then runs
  them). `tests/setup.ts` stubs what the constants barrel pulls in
  (`react-native`'s `Platform`, the lucide icons read from
  `icon.constant.ts`, `window`). A fix to pure logic lands with its test.
- A test file is laid out as static imports, the state its mocks read, every
  `mock.module(...)`, one block of `const { ... } = await import('...')`, then
  the tests; a dynamic import inside a function is only a `mock.module`
  factory (`argus/test-module-layout`, CONTEXT.md › "Imports and the test
  module layout"). `bun run lint` covers `tests/`.
- A test that asserts a time budget is a bench. It lives under `tests/bench/`, is
  run by `bun run test:bench` in the integration build, and stays out of
  `bun run verify`, which must stay deterministic on a busy machine. `verify` keeps
  the same case under a loose sanity bound instead.
- Every unit headed for the desktop is accepted only after its exported web
  bundle renders in a real browser: `bun run check:bundle`
  (`scripts/probe-web-bundle.ts`) exports `dist/` through `web:build`, serves
  it with the CSP read from `src-tauri/tauri.conf.json`, loads `/` in
  `/usr/bin/chromium` through playwright-core, and fails when the root never
  renders, when it shows expo-router's error boundary, or when a console
  error or page error fires that the allowlist does not name (the allowlist
  is empty). Its byte budgets come from `scripts/lib/bundle-baseline.txt`
  (rule 30). Bun and Hermes do not check `this` on timers; chromium and
  WebKit do, which is how `clock.setTimeout(...)` as a method painted on
  Android and stopped the desktop at the error boundary (`e0e2abd`).
- `bun run verify` runs every gate: comments, boundaries (with the lint policy
  and the references), quality, format, typecheck, lint, tests, the bundle
  probe (render plus byte budgets) and the web E2E.

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

#### Rule 35 today: the networking layer (Nitro + Tauri + secure-storage)

One JS API with two native backends. The app **never** talks to the backend from the
WebView: mobile → **Nitro** module, desktop → **Tauri (Rust)** commands.

- **`src/core/services/net/`** → `IArgusNetService`
  (`discover / pair / request / isPaired / instance / unpair`). `net.native.ts` calls
  the Nitro module; `net.web.ts` calls `invoke('argus_*')`; `net-persistence.ts` stores
  the pairing in secure-storage (shared). Consumers only import the barrel
  `@/core/services/net`.
- **One host, many services.** The backend has no gateway: every service
  terminates TLS on its own port and announces one `_argus-route._tcp` mDNS
  instance per leading path segment (TXT `path`, `https`). `discover()` browses
  that type for a settle window and returns the whole route table; the pairing
  stores it (`net.routes`, segment → port). Every URL is built with
  `serviceUrl(instance, path)` from `net/net-routes.ts`: the discovered port
  for the path's leading segment, else `ARGUS_DEFAULT_ROUTE_PORTS`, else the
  pairing port. Never concatenate `instance.port` by hand. Away from home the
  same call answers the service's device name,
  `https://<service>--<home-id>.argus-tunnel.lynk.page<path>`, when the
  instance's `route` is `relay` and it carries a usable `remote` profile
  (`net/net-route-choice.ts`, `ARGUS_ROUTE_SERVICES`; CONTEXT.md "Local-first
  route choice"). That profile comes from the sync context's `remote`, and
  `netService.rememberRemote` keeps it. The route comes from the probes
  (`net/net-route-probe.ts`): a failed connect (`refreshAddress`) and a
  return to the foreground choose between the LAN and the relay, and the
  LAN wins whenever it answers. A server mDNS cannot
  see (another subnet, a network that drops multicast, the Android emulator at
  `10.0.2.2`) is paired by its address on the pairing screen and uses the
  default ports.
- **Pairing never sends the code.** The client posts a random `nonce` and
  `HMAC-SHA256(code, "argus-pair-client|" + nonce)`; the server answers the CA
  with `serverProof = HMAC-SHA256(code, "argus-pair-server|" + nonce + "|" +
  caFingerprint)`, which the client checks before trusting the CA (all three
  platforms). The code is upper-cased as the HMAC key.
- **Signed-out entry** asks identity `GET /pairing/status` (`{paired,
  hasOwner}`): owner enrolment only when the server answers that it has no
  owner; an unanswered probe shows `ServerUnreachable` with retry, never
  enrolment.
- **Session refresh has three outcomes** (`SessionRefreshOutcome`):
  `refreshed`, `rejected` (401/403 — the only case that ends the session) and
  `unavailable` (429, 503, network, malformed answer — the session is kept and
  the caller retries later). The classification is `readRefreshResponse`
  (`core/services/http/refresh-response.ts`), unit-tested. Every request
  carries the `SessionCredential` it was sent with (token + session
  version); `settledRefresh` answers a 401 for a token that already rotated
  with `refreshed` (retry with the current one) and a 401 from a previous
  session with `unavailable`, so only a 401 for the current token rotates
  or clears. `clearSession` is single-flight and always clears the store
  and tokens, even when the local wipe fails. A refusal without an envelope
  is named after its status (`readEnvelope`, `http/http-envelope.ts`:
  `BAD_GATEWAY`, `SERVICE_UNAVAILABLE`, `TIMEOUT`, ...); `INVALID_RESPONSE`
  is only a 2xx that is not an envelope.
- **`src/core/services/secure-storage/`** → `ISecureStorageService` **async**
  (`getStringAsync/setStringAsync/deleteAsync/hasAsync`). Native = `expo-secure-store`;
  web = Tauri command + `keyring` crate; in a plain browser it
  refuses (reads return `null`, writes throw `SECURE_STORAGE_UNAVAILABLE`), never `localStorage`. Keys **separate**
  per value (~2 KB limit on iOS).
- **Nitro module `modules/argus-net/`**: the spec `src/ArgusNet.nitro.ts` is the
  **source of truth**; after changing the spec, run `bunx nitrogen` (generates
  `nitrogen/generated/`, gitignored). Implement `HybridArgusNet.kt` / `.swift` against
  the generated signatures. Rules:
  - **No deprecated APIs**: subclass `RequestBody` (`stringBody`/`streamBody`,
    streaming from disk) instead of `RequestBody.create`/`MediaType.parse` (deprecation
    is an ERROR in OkHttp 4.12); use API 30+ NsdManager overloads (`hostAddresses`,
    `resolveService`+Executor) with a guarded fallback.
  - **Cache** the TLS client/session (OkHttp by config fingerprint; URLSession by
    CA; reqwest by CA) — never recreate per request. `configure()` is **idempotent**:
    only invalidates the cache if the config changed. In JS, `net.native.ts` skips
    `configure` and `configureRemote` when the config is already applied (key
    `caPem|host|ip|homeId|domain`); `net-persistence.ts`
    caches the bound instance in memory (invalidated in `savePairing`/`clearInstance`)
    to avoid re-reading secure-storage on every request.
  - **Verify the pairing (all 3 platforms)**: the `serverProof` must match the
    received `caFingerprint`, and that fingerprint must be `SHA-256(DER)` of the
    received `caPem` (uppercase hex). Either mismatch → `FINGERPRINT_MISMATCH`.
  - **Structured errors**: natives throw `IllegalStateException`/`NSError`/
    `Err(String)` with the format **`CODE|human message`** (`INVALID_PAIRING_CODE`,
    `FINGERPRINT_MISMATCH`, `CERT_NOT_TRUSTED`, `HOST_NOT_ALLOWED`, `PAIRING_REQUIRED`,
    `NETWORK_ERROR`, ...). `toNetError()` parses the prefix; context fallbacks:
    `pair` → `NETWORK_ERROR`, `discover`/`request` → their codes.
  - iOS: resolve Bonjour with a single-resume guard; NetServiceBrowser requires `@MainActor`.
  - Multipart: the backend field for login is `image`.
- **Desktop `src-tauri/`**: Rust in `src/net/` (`discover`/`pair`/`http`/`secure`),
  commands `argus_*`. The WebView runs under a real CSP (`tauri.conf.json`:
  scripts and connections only from the app itself and the IPC origin) with
  `withGlobalTauri: false`; the JS reaches Rust through `@tauri-apps/api/core`
  only. The WebView never hands Rust the trust material: `argus_request`
  takes the request and `argus_socket_open` the URL and headers; Rust reads
  the CA, host and IP from the keyring (`src-tauri/src/net/trust.rs`, cached
  in memory and dropped only when a trust key changes). Rust also **writes**
  them: `net.caPem`, `net.caFingerprint`, `net.host` and `net.ip`
  (`TRUST_KEYS`) are pinned by `argus_pair` once the proofs and the QR's
  expected fingerprint check out, and `net.ip` moves only through
  `argus_relocate(url, ip)` after the candidate answered under the pinned CA;
  `argus_secure_set` refuses them (the WebView may read and delete them, and
  writes only `WEBVIEW_KEYS`). A unit test keeps the two lists equal to
  `NET_STORAGE_KEYS`. `argus_request`'s reqwest client trusts **only** the
  pinned CA (`tls_built_in_root_certs(false)`), is https-only, follows no
  redirect, and times out (10 s connect, 30 s read); its errors are
  `CODE|message` like the mobile modules (`CERT_NOT_TRUSTED` from rustls in
  the source chain, `TIMEOUT`, `NETWORK_ERROR`). The desktop socket closes a
  peer silent for 45 s and bounds its send queue (512 frames). `frontendDist = ../dist` (`bun run web:build`). Verify with
  `cargo check` (requires `webkit2gtk-4.1` on Linux). The WebView's native
  context menu is refused by the `argus-context-menu` plugin
  (`src-tauri/src/context_menu.rs`). `argus_request` uses a
  **pinned DNS resolver** (`reqwest::dns::Resolve`): `argus.local` → the discovery IP,
  same as Android's custom `Dns` (`.local` does not always resolve).
- **WebSocket (shipped)**: always native — RN's JS `WebSocket` does not trust
  the CA. `ArgusSocket` HybridObject in `modules/argus-net` (OkHttp /
  `URLSessionWebSocketTask` over the pinned CA session) and Tauri commands
  `argus_socket_open/send_text/send_binary/close` (raw Tauri Channel for
  inbound frames — no base64). Consumed through
  `netService.openSocket()`. **Two sockets**: the sync engine owns `/sync`
  (sync + emits + voice PCM), and the camera live view opens
  `/media` (argus-camera) through `cameraMediaService` and pumps fMP4 fragments
  into the native `argus-camera` player. `http.service.ts` is the HTTP
  wrapper; there is no separate websocket wrapper.
- **Nitro modules are split by domain** (`modules/argus-net`, `modules/argus-mic`,
  `modules/argus-face`, `modules/argus-camera`), each with its own spec + nitrogen + Kotlin/Swift. They are
  registered in `android/settings.gradle` with explicit includes (autolinking does
  not pick up the symlinked local packages reliably) and linked by
  `scripts/link-argus-modules.mjs`. `argus-face` detects faces by **file URI**
  (`detectFaces(jpegUri)` → `FaceFrame { luminance, faces }`, normalized 0..1,
  top-left origin) — MLKit on Android (GMS), Vision on iOS.
- **Client identity on every request**: `User-Agent: Argus/1 (<platform>)`,
  `X-Argus-Client: <platform>/<version>` and `X-Argus-Device` (percent-encoded
  name) on every HTTP request and socket upgrade, byte-identical across
  transports because the backend binds a session to the agent string.
  Mobile adds them in `net.native.ts` (`net/client-identity.ts`), the desktop
  in Rust (`src-tauri/src/net/identity.rs`); the desktop says `desktop`.
- **Cross-device login (desktop QR)**: `POST /auth/device-login` creates a
  short-lived challenge bound to the DESKTOP device hash; the mobile approves it
  (`POST .../approve`, JWT) and the backend issues a session bound to that hash;
  the desktop polls `GET /auth/device-login/{id}` for the tokens (single use).
  The desktop also proves it drew the QR: `createDeviceLogin` sends
  `pollHash` (SHA-256 of a random proof kept in memory, `core/services/device-login`)
  and the poll presents the proof in `X-Argus-Login-Proof`, so someone who
  photographs the QR cannot collect the session.
  `auth.service.ts` exposes `createDeviceLogin/approveDeviceLogin/pollDeviceLogin`;
  the QR JSON is built/parsed by `features/auth/model/login-qr.ts` and rendered with the
  `QrCode` component (`qrcode` + react-native-svg). The desktop never uses the
  camera: pairing is a manual code, login is the QR.
- **Register with an existing face**: `POST /auth/register` no longer 409s on a
  duplicate face — it issues a session for the matched user and sets
  `alreadyRegistered` in the response (owner → admin session; anyone else → the
  client informs them "ya estás registrado" and continues).

36. **Contracts with the backend.**
    - `role-access`, `capability`, `modules`, notification kinds, error codes
      and reasons mirror the backend headers.
    - HTTP schemas mirror `backend/scripts/fixtures/http`.
    - A backend contract change lands with its frontend change.

    *Measured: `bun run test` → `tests/contracts/*` and the contract tests in
    `tests/unit/`. Reviewed until S1: the error-code contract.*

#### Rule 36 today: people, invitations and portrait privacy

- Roles shape the local projection, not merely the buttons: Owner sees
  `/users` (users + invitation metadata); Guard sees `/people` (directory only);
  both open a person at `/people/[id]`; Resident/Guest see their own profile only. Reuse `peopleAccessOf(view)` from
  `shared/libs/capabilities.ts` instead of scattering role checks.
- **One question, one hook: `useCapabilities()`** (`shared/hooks/use-capabilities.ts`).
  What a person may use now is the backend's `capabilitiesFor(role, activeModules)`
  list, which arrives in the live context (below); every screen asks it
  (`has(CAPABILITY.cameraView)`, `moduleActive(id)`, `can(table, permission)`,
  `guard`, `people`, `cameraActions`) and never reads a role or a module list
  itself. The pure side is `shared/libs/capabilities.ts` (`accessView`,
  `tableAllowed`, `isRoleOffered`, `offModuleOfRole`) and the vocabulary is
  `shared/constants/capability.constant.ts`, pinned by
  `tests/unit/capability-contract.test.ts` to the backend's
  `packages/lib/auth/src/auth/capability.hxx`. Before any context exists only
  the core is shown (`coreCapabilities(role)`); a role whose module is off
  (`roleActive: false`) gets the baseline only, and a role this build does not
  know gets nothing and is never defaulted to Guest. The server stays the
  authority: the app only hides.
- Every role manages its own sessions from `/profile` ("Sesiones y
  dispositivos", `features/sessions`); `/settings` is the Owner's alone. The
  Owner also sees each user's sessions in that person's detail
  (`/people/[id]`), closes them and turns accounts off or back on. `sessionAccessForRole` mirrors the backend's
  `kSessionAccess`, owner rows included (`manageOthers`).
- Which role may open which screen is one table, `shared/libs/route-access.ts`
  (`routeFallback(path, view)`): the `(app)` layout redirects with it and the
  nav hides the tabs it refuses. A screen never checks its own role. A role
  whose module is off reaches only Inicio (the calm inactive-role screen,
  `features/access`: the alerts raised for the person (`safety.respond`),
  panic, the module request, profile and sign-out,
  each by its baseline capability) and the profile. `/call` follows
  `calls.join` for that role, so the call an alert rings can be answered.
- The HTTP DTOs the app reads have zod schemas in `core/contracts/http.contract.ts`,
  each tied to its TypeScript type with `satisfies z.ZodType<T>`;
  `tests/unit/http-contract.test.ts` validates every recorded backend response
  in `backend/scripts/fixtures/http/*.json` (the envelope for all, the schema
  for each route in `HTTP_CONTRACTS`), so a backend shape change fails here.
- `shared/libs/role-access.ts` mirrors the backend's `kTableAccess`
  (`backend/packages/lib/auth/src/auth/role-access.hxx`) table by table;
  `tests/unit/role-access-contract.test.ts` parses the header and fails on any
  drift, so a backend permission change lands here in the same change.
- The personal `/profile` and the directory preview use the neutral `user`
  icon. Do **not** cache, persist, preload or render a user portrait in a list,
  profile, MMKV, WatermelonDB or global store.
- A Guard can explicitly select a person and request a portrait verification.
  `portraitPreviewService` obtains/consumes a one-use server capability; the
  resulting data URI lives only in that open dialog's React state and is cleared
  when it closes or a newer request wins. Do not add image caching.
- Owner invitation QRs are single use: the Owner picks the role only (no
  capacity, no expiry; the server sets a hidden lifetime), and the preview
  follows the invitation live (waiting, used, closed, lapsed). They contain
  the opaque token plus pinned local server identity. Between scanning and enrolment the token lives in memory only
  (`features/auth/model/invite-slot.ts`, ten minutes), never in a route param. The QR preview itself is single-display: dismissing or unmounting
  revokes its invitation. Do not persist its token or reconstruct it from
  invitation metadata.
- `AuthContextChanged` from `/sync` updates the signed-in role and requests a
  resync without treating a role change as logout. A deactivated account is the
  only case that must end the session.

#### Rule 36 today: onboarding flows and modules

- **A flow is data.** `features/auth/model/onboarding-flow.ts` declares each
  flow as steps `{ id, screen, label, when, counted }`: Owner `pair →
  privacy → face → name → modules → module-privacy → permissions → meet →
  ready`, invited `invitation → privacy → face → name → permissions → meet →
  ready`. Screens never hard-code the next route or a step count: they ask
  `useOnboardingNext().next(flow, step, moduleSignals?)` and render
  `<OnboardingTop place={{ flow, step }} />`, whose dots count only the
  `counted` steps and hide when a platform sees fewer than two (the desktop
  only pairs). The flow travels in the route as `mode`
  (`owner-enroll`/`invite-enroll`, privacy and face) or `flow` (the rest);
  `flowOf` reads either. A new step is one entry in `ONBOARDING_FLOWS` and a
  screen. Every onboarding screen is drawn in `OnboardingFrame` (full screen
  on a phone, one centred 480 card on the Aura from tablet width).
- **Modules and the user's context come from the socket.**
  `core/services/context/` (`ContextEngine`) reads the context of
  `InitialInfo` (`{userId, role, roleActive, capabilities, roles, modules,
  ownerCatalog?}`) and the additive `ContextUpdate` (operation 13), caches it
  per user (`app.context`, kept across a context resync) and hands the modules
  to `core/services/modules/` (`ModuleEngine`: the catalog in the view cache
  `modules.catalog`, `ModuleUpdate` (12) progress frames, the actions over HTTP
  (`modules.service.ts`, zod in `core/contracts/modules.contract.ts`), pure
  merges in `module-state.ts`). There is no `GET /modules` call, focus refetch
  or poll: an offline device paints the cached context and reconciles on the
  next frame. Names, summaries and the intro of a module arrive per language
  and are resolved with the app language (`module-text.ts`). UI reads
  `useCapabilities` (gating) and `useModuleCatalog` (the Owner's cards).
  `startAccess` in `session.service.ts` starts both engines before the view
  cache coordinator, and the coordinator reads nothing from the tables of a
  module that is off (`ModuleSourceGate`, kept locally, pulled again when the
  module returns).
- **Gating.** `MODULE_APP_ROUTES` names each module's screens and
  `routeFallback(path, view)` sends a disabled module's screens home; nav tabs,
  compose actions, home sections, the profile (panic always; duress and codes
  with surveillance), call triggers, privacy signals, the Owner's settings
  groups and the notification kinds ask the same question. Before the first
  context only the core shows. `MODULE_API_PREFIXES` mirrors the backend's
  `kModuleRoutes` (`tests/unit/modules-contract.test.ts`); a 403
  `MODULE_DISABLED` from any request is reported by `http-refusal.ts`, the
  engine marks that module off and refetches, and the toast reads
  `common.errors.module-disabled`. Synced data of a disabled module stays in
  WatermelonDB.
- `features/modules` holds the UI: the welcome step (`ModulesStepScreen`,
  composed by `features/auth`'s `OnboardingModulesScreen`), Settings ›
  Modules (`/settings/modules`, `ModulesScreen`), the settings summary card,
  the home progress chip and getting-started checklist, and the global
  `ModuleNotices`. Wording of sizes, speed, ETA, verdicts and failure reasons
  is pure (`model/module-text.ts`), unit-tested.
- **Lifecycle.** A module is `not_installed`, `active`, `disabled` or
  `uninstalled_data_kept`; `model/module-lifecycle.ts` decides the wording,
  the buttons (Activar, Desactivar, Desinstalar, Reinstalar, Borrar mis
  datos, and pause/resume/cancel/retry while a job runs), the refusals
  checked before asking (core, a module another one needs, a running job)
  and the uninstall mode: no data → one `confirm`; data → `UninstallDialog`
  with what `GET /modules/{id}/data` reports and "Conservar mis datos" by
  default; purging needs the module name typed. The uninstall is sent
  without a PIN; a 403 `PIN_REQUIRED` opens the shared PIN prompt
  (`askCurrentPin` from `features/safety`) and retries with `{pin}`,
  `PIN_INVALID` says so and asks again, `PIN_LOCKED` explains the wait
  (`pinStep`). Jobs carry `kind` (`install`, `uninstall`, `purge`) and
  Reintentar repeats that kind (`retryBody`). Every role receives
  `dataPurgedAt` (owner catalog, brief list, module or enabled-set frames),
  so every device purges. When a
  module's `dataPurgedAt` is newer than the stamp this device stored
  (`app.modules.purged.<userId>`), the engine drops that module's synced
  tables (`MODULE_SYNC_TABLES`) through `synchronizeService.dropTables`,
  which forgets their cursors and pulls them again; the stamp is stored
  only after the drop succeeded.
- **Impact before disabling or uninstalling.** Both read
  `GET /modules/{id}/impact?action=` first (`DisableDialog`, and the
  `UninstallDialog` in its `simple`/`choose`/`erase` modes with
  `ImpactSummary`): what stops, who holds a role of the module, the pending
  invitations that will be revoked and what data stays. An uninstall with role
  holders asks for a new role for each (`reassign`, from the roles the server
  offers) and a 409 `MODULE_ROLES_HELD` reopens the preview. An older server
  without the route falls back to the plain confirmation.
- **Requests, roles and reasons.** A non-Owner asks the Owner for a module
  (`POST /modules/{id}/request`, once a day per module: profile and the
  inactive-role screen) and the Owner's `module_request` notification carries
  an Activate action. Role pickers show the roles of an off module with a
  hint (disabled for invitations, selectable and listed last for a role
  change). An invitation closed because its module went off says so to the
  inviter (`revokedReason`/`revokedModule`, local migration 9) and, as a 410
  `INVITATION_MODULE_DISABLED`, to the invitee, whose invitation screen
  explains it. The list form of `errors` is read by `readEnvelope`
  (`IApiError.list`).
- **Welcome.** The Owner consents (core signals only) before the face, and
  after the modules answers for the signals of the modules chosen
  (`module-privacy`, dropped from the flow and its count when none has
  signals). The name is asked after the face, the first moment a session
  exists for `PATCH /auth/me`.
- **Reminders and the activity.** Reminders are Argus's server-side memory: the
  app stores and lists none, asks Argus for them, and calls `/reminder` only to
  snooze or complete the one a call names. The Owner's `features/activity`
  (`GET /sync/activity`, keyset paging, filters) is a slice of its own.


## Commands

```bash
bun run dev            # expo start -c
bun run android        # expo start -c --android
bun run ios            # expo start -c --ios
bun run web            # expo start -c --web
bun run lint           # ESLint, every rule an error, --max-warnings 0, eslint-suppressions.json (rule 2)
bunx tsc --noEmit      # typecheck (must be 0 errors)
bun run test           # unit tests (tests/unit, bun test)
bun run test:bench     # timing benches (tests/bench); the integration build runs them, verify does not
bun run check:comments # rule 3 gate; --fix removes comments
bun run check:boundaries # rules 6-9, 11 + lint policy (rule 2) + references (rule 4), against boundaries-baseline.txt
bun run check:quality  # the counters of quality-baseline.txt and memo-exceptions.txt
bun run check:format   # Prettier ratchet over the list of unformatted files (rule 33)
bun run check:bundle   # exports the bundle, serves it under the Tauri CSP, loads it in chromium, checks bundle-baseline.txt
bun run check:duplication # jscpd ratchet over src against duplication-baseline.txt (proposed)
bun run check:unused   # knip ratchet against unused-baseline.txt (proposed)
bun run test:e2e:run   # web E2E against the exported dist/
bun run verify         # comments + boundaries + quality + format + typecheck + lint + tests + bundle + E2E
bun run web:build      # expo export --platform web → dist/ (for Tauri)
bun run desktop:dev    # tauri dev (Linux requires webkit2gtk-4.1)
bun run desktop:build  # tauri build
bun run clean          # rm -rf .expo node_modules

# Dependencies (use bun; versions compatible with SDK 57)
bunx expo install <package>   # installs the version pinned by Expo
bunx expo install --fix       # align known versions
bunx expo-doctor              # 20/20 health checks

# Nitro modules (regenerate after changing a spec)
for m in argus-net argus-mic argus-face argus-camera; do (cd "modules/$m" && bunx nitrogen); done

# Native Android (validate Kotlin/C++/APK)
export JAVA_HOME=$HOME/.jdks/current && export ANDROID_HOME=$HOME/Android/Sdk
cd android && ./gradlew app:assembleDebug -x lint -x test   # or: bunx expo run:android

# Desktop Rust
cd src-tauri && cargo check
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/shared/theme/tokens.ts` | The redesign's design values (rule 21): colour roles, Aura, elevation, illustration, type steps and roles, space, radius, size, motion, material, breakpoints, layout |
| `src/shared/theme/effects.ts` | `perfTier` (`low`/`mid`/`high`), `useEffects`, reduce motion and transparency (rule 26) |
| `docs/references.md` | The sources the rules cite as `[key]` (rule 4) |
| `docs/plans/frontend-rules-final.md` | Each rule's rationale, survey, gate, phase and the implementation order |
| `docs/plans/redesign-spec.md` | The redesign: tokens (§3), the 26 components (§4), patterns, motion, Estela (§8b), screens |
| `scripts/lib/quality-baseline.txt` · `boundaries-baseline.txt` · `cycle-baseline.txt` · `bundle-baseline.txt` · `memo-exceptions.txt` · `eslint-suppressions.json` | The ratchet baselines |
| `src/shared/constants/color.constant.ts` | Today's color palette (HEX), legacy until S3 |
| `src/shared/constants/common.constant.ts` | Platform/Tauri flags (`IS_WEB`, `IS_TAURI`, ...) |
| `src/shared/constants/icon.constant.ts` | Centralized icon registry (lucide only here) |
| `src/shared/constants/theme.constant.ts` | `THEME_STORAGE_KEY`, `THEME_OPTIONS`, `THEME_ICONS` |
| `src/shared/constants/net.constant.ts` | `ARGUS_HOST`, `ARGUS_DEFAULT_PORT`, `NET_STORAGE_KEYS`, timeouts |
| `src/shared/constants/index.ts` | Constants barrel |
| `src/core/types/net.type.ts` | Network types (`NetDiscovery`, `NetPairing`, `NetHttpRequest`, ...) |
| `src/core/types/database.type.ts` | DB types: `TableName`/`ModelOf`/`ModelMap` + enums & JSON shapes |
| `src/core/types/index.ts` | Types barrel (`IconName`, `ThemePreference`, `StoragePrimitive`, ...) |
| `src/core/interfaces/net.interface.ts` | `IArgusNetService` |
| `src/core/interfaces/secure-storage.interface.ts` | `ISecureStorageService` (async) |
| `src/core/interfaces/index.ts` | Interfaces barrel (`IStorageService`, `IArgusNetService`, ...) |
| `src/core/services/storage/` | Platform-split storage (MMKV / localStorage) |
| `src/core/services/secure-storage/` | Secrets (expo-secure-store / keyring) |
| `src/core/services/net/` | `IArgusNetService` (native→Nitro, web→Tauri, `net-persistence`) |
| `src/core/services/http/` (`http.service.ts` + `http-auth.ts`) | HTTP wrapper sobre `netService`: `IServiceResponse`, refresh 401 single-flight, multipart (`payload` + archivos); `http-auth.ts` registra los hooks de credenciales y rompe el ciclo con `session.service` |
| `src/core/services/auth.service.ts` | Auth API: `login` (multipart `image`), `register`, `serverStatus` (`/pairing/status`), `status`, `logout` |
| `src/core/services/session.service.ts` | Ciclo de sesión: establish/refresh/updateUser/clear, cola serializada sobre secure-storage; inicia/detiene el coordinador de cache local |
| `src/core/services/view-cache.service.ts` | Valores serializados MMKV/localStorage por usuario + señal de revisión; no mantiene filas en memoria JS |
| `src/core/services/view-cache-coordinator.service.ts` | Registro de proyecciones: único suscriptor Watermelon, comparte las fuentes de la sesión y refresca derivados diarios |
| `src/core/services/view-cache/` | Proyecciones puras por dominio (`*.projection.ts`), `projection.ts` (`ViewProjection`, `applyWrites`, `startProjection`) |
| `src/core/interfaces/{view-cache,audit-log}.interface.ts` | Contratos de snapshots de vista y payloads de auditoría; siempre importar desde el barrel de interfaces |
| `src/core/types/{view-cache,audit-log}.type.ts` | Uniones y tipos auxiliares de cache/auditoría; siempre importar desde el barrel de tipos |
| `src/core/types/sync.type.ts` | `SYNC_TABLE_KEYS` (13 tablas) + cursores normales `createdAt` y de auditoría `{lastId, watermarkId}` por usuario |
| `src/features/voice/` | Voice feature: `services/voice` (`voiceService`: mic PCM over the sync socket on every platform with `voiceCallSupported()`, TTS playback, action results, mute, resume after a lost socket), call screen with action chips and an in-call camera card, call pill (mounted everywhere), `useCall`, `useCallBridge` (camera names + situation note, actions run in order), avatar; web audio worklets in `public/voice/` |
| `src/features/voice/services/rtc/` | WebRTC call (`IRealtimeCall`): LiveKit React Native (native), `livekit-client` (browser), the Rust client through `argus_rtc_*` (Tauri); `PinnedWebSocket` routes the LiveKit signalling over the pinned `ArgusSocket`; `rtc-token.ts` asks argus-sync for the room token |
| `src-tauri/src/rtc/` | Desktop call in Rust: LiveKit SDK with `PlatformAudio` (WebRTC ADM + AEC/NS/AGC), pinned signalling transport, events on a Tauri `Channel` |
| `src/core/services/invite/` | Invitaciones: `create` (Owner), `accept` pre-CA over a request pinned to the QR's CA fingerprint and host (`requestPinned`) |
| `src/core/stores/auth.store.ts` | Sesión (zustand, auto-bootstrap al importarse; tokens secure-storage, user storageService) |
| `src/core/services/context/` · `src/core/contracts/context.contract.ts` | The live user context: `ContextEngine` reads `InitialInfo.context` and `ContextUpdate` (13), caches it per user and feeds the module catalog and the view-cache gate |
| `src/shared/libs/capabilities.ts` · `src/shared/hooks/use-capabilities.ts` · `src/shared/constants/capability.constant.ts` | `useCapabilities()` and its pure side: the server's capability list, the active modules, roles of off modules, table permissions |
| `src/core/services/modules/` · `src/core/contracts/modules.contract.ts` | Selectable modules: HTTP actions + zod, pure merges, `ModuleEngine` (the catalog from the context, `/sync` op 12 progress, no `GET /modules`), impact and request calls, route/API → module maps |
| `src/features/modules/` | Modules UI: welcome step with intros, Settings › Modules (impact, uninstall with reassignment), requests, the Owner's Activate action, summary card, home progress chip and getting-started checklist, transition toasts |
| `src/features/access/` | The calm screen of an inactive role (Inicio when `roleActive` is false) |
| `src/features/activity/` | The Owner's activity history |
| `src/core/services/sync/` | Sync autónomo: bootstrap/altas/bajas (`createdAt`) + parches `audit_log`/`user_audit_log` por id (`audit-log-*`), mappers, DB utils y socket platform-split |
| `modules/argus-net/` | Nitro module: `ArgusNet` (HTTP) + `ArgusSocket` (WebSocket nativo); `pin` on a request trusts only a chain that leads to the given CA fingerprint and names the given host |
| `src/core/database/` | WatermelonDB: adapters (`native`/`web`), `schema`, `migrations`, typed `collection()` |
| `src/core/database/tables/` | One file per table: `tableSchema` + `Model` + the `TABLES` registry |
| `src/core/services/database.service.ts` | `DatabaseService<K>` base class (protected query primitives) |
| `src/core/services/{domain}.service.ts` | Data services — the only code that reads the database |
| `src/core/services/paging/` · `src/core/services/view-cache/paged-view.ts` | Paging: keyset clauses (`keysetThrough`/`keysetAfter`), `RemoteFeed` for server cursors, and the coordinator's per-scope windows |
| `src/shared/hooks/use-infinite-list.ts` · `src/shared/components/ui/infinite-list.tsx` | `useInfiniteList`/`usePagedView`/`useRemoteFeed` and the LegendList-based `InfiniteList` (skeleton, retry, end only when exhausted, fill or `maxHeight`) |
| `src/shared/hooks/use-cached-rows.ts` | Lectura síncrona de snapshots MMKV por revisión (`useViewCacheRows` / `useViewCacheValue`) |
| `src/shared/libs/optimistic.ts` · `optimistic-action.ts` · `src/shared/hooks/use-optimistic-rows.ts` | Optimistic UI: the intent registry and its pure merge/settle functions, `runOptimistic` (confirm, undo, rollback, retry toast) and the hook that overlays intents on view-cache rows through feature lenses |
| `src/shared/constants/database.constant.ts` | `DATABASE_NAME`, `SCHEMA_VERSION` |
| `modules/argus-mic/` | Nitro module de voz: `ArgusMic` (PCM s16le streaming) |
| `modules/argus-face/` | Nitro module de visión: `ArgusFace` (MLKit/Vision, detección por URI + luminancia) |
| `modules/argus-camera/` | Nitro view `ArgusCameraView`: decoder nativo del feed `/media` (ExoPlayer/Media3 en Android, `AVSampleBufferDisplayLayer` en iOS) con `bufferedBytes()` para el credit-window |
| `src/features/cameras/services/camera-media.service.ts` | Socket `/media` (argus-camera): subscribe/ack/unsubscribe, framing `0xA7`, reconexión con backoff y ack guiado por el decoder |
| `src/features/cameras/components/camera-live-view.*` | Vista en vivo de la cámara: nativa en móvil, WebCodecs+canvas en desktop/web (placeholder si el webview no soporta WebCodecs) |
| `src-tauri/` | Desktop (Tauri 2 + Rust: `mdns-sd`, `reqwest/rustls`, `keyring`) |
| `src/shared/components/ui/` | Design system: `Text`, `Button`, `IconButton`, `Icon`, inputs and forms, dialogs/sheets/menus, `Panel`, `SectionHeader`, `EmptyState` (page/panel/inline), `ListRow`, `InfiniteList`, `FilterChips`, `StatusBadge`, `Switch`/`ToggleRow`, `TimelineItem`, `ConfirmDialog`, `Toaster` |
| `src/app/welcome/` | Onboarding routes (nested Stack with fade), one-line re-exports of `features/auth` screens: `index` (the welcome hero), `pairing/`, `invitation/`, `privacy/`, `face/`, `modules/`, `module-privacy/`, `voice/` (the last six mobile-only); order and step counts come from `features/auth/model/onboarding-flow.ts` |
| `src/app/login/index.tsx` | Desktop cross-device login QR (`features/auth` `LoginScreen`) |
| `src/app/approve/index.tsx` | Mobile: scan another device's QR and approve its session (`features/auth`) |
| `src/app/qr/index.tsx` | QR scan route (`features/qr`; native-only, web → redirect to `/`) |
| `src/app/(app)/_layout.tsx` | Signed-in group: `EntryGate` (session guard + entry resolver with the branded splash) around `AppShell` (nav rail mounted once) and the group's Stack |
| `src/app/(app)/index.tsx` | Home dashboard |
| `src/app/(app)/agenda/` · `projects/` · `cameras/` · `people/` · `users/` · `profile/` · `security/` · `settings/` | Tabs principales: calendario mes/semana/día, proyectos+tareas, cámaras (+`[id]`: PTZ/zonas/talk), directorio Guard, gestión Owner + QR invitación, perfil |
| `src/features/home/` | Home dashboard: camera grid/tile, project grid, today's agenda, summary, and the notifications (Novedades + bell popover) as threads by `threadKey`, styled by urgency; opening the bell reads every unread notification of the user, a tap in Novedades reads its thread (`model/notification-threads.ts`, unit-tested) |
| `src/features/settings/` | Configuración (owner-only), two persisted modes: Sencillo (first-run banner, connection notice, Perfil, basic keys) and Avanzado (`components/technical/`: every key with type, unit, range, factory value, apply mode, pending restart, its service's `.toml` path, search/filters, reset to factory, export/import; pure logic in `model/settings-catalog.ts`, unit-tested); every owner's catalog from argus-settings; TTS engine/variant/voice settings as an option list with bundled voice previews (`constants/tts-preview-clips.{web,native}.ts`, Ogg/Opus vs M4A/AAC), install states and on-demand install (`model/tts-preview.ts`, unit-tested); the "Perfil" section on top (`components/profile/`, `hooks/use-settings-profiles.ts`, `model/settings-profiles.ts`): server profiles with the hardware recommendation, a per-service preview and an optimistic apply that rolls back refused keys |
| `src/shared/components/layout/` | App chrome and screen layout: `AppShell`, `AppScreen`, `ScreenHeader`, `NavRail`, `BottomNav`/`GlobalBottomNav`, `ComposeFab`, `CenteredScreen`, `OfflineBanner` |
| `src/features/home/components/activity/` | `ActivityCard` + `MosaicChart` (the home dashboard; cameras read `/camera/overview` instead) |
| `src/features/auth/components/session-gate.tsx` | Auth bootstrap y puerta de UI autenticada; no observa ni “prime” Watermelon |
| `src/features/auth/` | Welcome, pairing, face login/enrolment, invitation, onboarding call, desktop login QR, approve; `useFaceCapture` + `useFaceGuide`; the face detector service (`services/face-detector`, native MLKit/Vision, web stub returns `null`) |
| `src/features/qr/` | QR scanner: `useQrScanner` (permission, detection, hand-back to the scan store) + the screen and its components |
| `src/shared/constants/qr.constant.ts` | `QR_SCAN_PURPOSES`, `QR_SCAN_FEEDBACK`, scan timings |
| `src/shared/constants/morph-icon.constant.ts` | `MORPH_ICONS` — registro de iconos animables (datos `lucide` para morphicons) |
| `src/shared/components/ui/morph-icon/` | Icono animado (morphicons): `index.tsx` + `morph-icon.{native,web}.tsx`; en nativo morphs por `setNativeProps`; en web `morph-icon-driver.ts` pinta cada frame con el `d` por estado de React, `reducedMotion="user"`, ref `morphTo`/`set` |
| `src/core/types/qr.type.ts` | `QrScanPurpose`, `QrScanStatus`, `QrScanFeedback`, `QrScanConfig` |
| `src/shared/hooks/use-reduce-motion.ts` | OS "reduce motion" setting, live |
| `src/core/stores/` | Zustand stores (barrel): `auth`, `locale`, `onboarding`, `navigation`, `qr-scan`, `toast`, `confirm` (the avatar store lives in `features/voice/stores`) |
| `src/core/i18n/` | Custom i18n engine (barrel: `t`/`setLanguage`/`getLanguage`, `translate`, `locales/`) |
| `src/core/locales/schema.ts` | `I18nSchema`/`TranslationKey`/`TranslateFn` derivation from the `es` dictionary |
| `src/core/types/i18n.type.ts` | i18n public types (barrel surface) |
| `src/core/stores/locale.store.ts` | `useLocaleStore` — language preference/state, `app.language` |
| `src/shared/hooks/use-translation.ts` | `useTranslation()` reactive hook (real-time) |
| `src/shared/constants/i18n.constant.ts` | `I18N_STORAGE_KEY`, `I18N_DEFAULT_LANGUAGE`, `SUPPORTED_LANGUAGES`, `LANGUAGE_OPTIONS` |
| `src/features/voice/constants/avatar.ts` | `AVATAR_STATE_PARAMS`, `AVATAR_PALETTE`, blink/transition times (until `Presence` replaces the avatar) |
| `src/shared/hooks/use-theme-preference.ts` | Theme preference get/set |
| `src/shared/components/layout/navigation-theme.ts` | `NAV_THEME` + `BG_COLORS` (React Navigation) |
| `src/global.css` | OKLCH tokens + aliases + base/utilities (generated from `tokens.ts` from R5) |
| `app.config.ts` | Expo config (replaces `app.json`). `ARGUS_GOOGLE_SERVICES_FILE` sets `android.googleServicesFile`; unset, the Android build has no Firebase and push is off, with a `process.emitWarning` at prebuild. The file is never copied into the repository |
| `plugins/with-argus-backup-rules.ts` | Android Auto Backup rules, listed **before** `expo-secure-store` so its mod overwrites the library's: excludes the keystore-keyed stores (`SecureStore` shared preferences, `argus_push_keyset_prefs`) and backs up the pairing's own MMKV instance only (`mmkv/argus-instance` + `.crc`), never the shared `argus-storage` that holds the view caches (`CONTEXT.md`, "A session lost to the keystore is recovered cleanly") |
| `src/app/+native-intent.ts` | Deep-link allow-list: signed-in screens and `/cameras/<id>` pass (query and hash dropped), anything else goes to `/` |
| `src/app/_layout.tsx` | Root layout: theme init, `SystemBars`, `SessionGate`, guards native-only, Stack con crossfade (`fade`) + overlays globales (nav, confirm, toaster) |
| `CONTEXT.md` | Full project history and decisions, and the "Lint exceptions" table (rule 2) |
