# Frontend rules: proposal

Status: proposal, 2026-10-20. It is not in `AGENTS.md` yet. It replaces the
"MUST-FOLLOW Rules" section of `frontend/AGENTS.md` once phase R0 of
`frontend-refactor-plan.md` has landed the gates.

Shape: the backend's (`backend/AGENTS.md`). Each rule is numbered and says
what it requires, why, and **how it is measured**. A rule marked
**measured** fails `bun run verify` when it is broken. A rule marked
**reviewed** has no gate yet, and a code review checks it.

Every counter-based gate is a **ratchet**:

- The current count is recorded in a committed baseline.
- A count that rises fails.
- A count that drops fails until the baseline is lowered in the same change,
  so a fix cannot be undone silently.

There are two baseline files, in the same style as the backend's
`scripts/lib/tidy-baseline.txt`:

- `scripts/lib/quality-baseline.txt` (`metric count` per line, read by
  `scripts/check-quality.ts`).
- `eslint-suppressions.json`, ESLint's bulk suppressions (ESLint ≥ 9.24; 9.39
  is installed). It is written by `eslint --suppress-all` and shrunk with
  `--prune-suppressions`.

The baseline numbers below were measured on `09cf103`.

Rules kept as they are today are marked *(kept)*. Rules that change an
existing one are marked *(revised)*.

---

## Structure

### F1. Layers and the direction of imports *(revised)*

`src/` has six layers: `app`, `features`, `widgets`, `entities`, `platform`
and `shared`. A unit imports only the layers below it, following the matrix in
`frontend-refactor-plan.md` §3.1:

- `app` composes.
- `features` are screen-level capabilities.
- `widgets` are entity UI reused by 2+ features.
- `entities` own one domain's data (api + schema, model, local store,
  projection, optimistic lens).
- `platform` is infrastructure with no domain.
- `shared` is the design system plus generic hooks and libraries.

Nothing in `platform` or `shared` knows a domain.

*Why:* `core/` today mixes infrastructure with 13 domain services and their
56 type files, 25 interfaces and 19 contracts. A domain change touches 4–5
folders, and the global barrels hide who owns what.

*Gate (measured):* `scripts/check-boundaries.ts` v2 replaces its rules 1–4
with the layer matrix. **Baseline:** 0 today for the current four rules. The
matrix starts once R3 creates the layers.

### F2. Public API per slice; no deep imports *(revised)*

Every slice (`features/x`, `widgets/x`, `entities/x`, `platform/x`) is
reached only through its `index.ts`. An index lists named exports. `export *`
is not allowed.

*Why:* 71 imports go around a service's barrel into 33 internal files, so an
internal rename breaks distant code.

*Gate (measured):* `check-boundaries` rule `deep-import`. **Baseline:** 71
edges → 0. A lint selector `ExportAllDeclaration` covers `index.ts` files.

### F3. No import cycles

No cycle at the file level and no cycle between slices.

*Why:* `features/{voice,response,security,cameras}` form one strongly
connected component of 21 files. Startup order and testability both depend
on the graph being a DAG.

*Gate (measured):* `check-boundaries --cycles` runs Tarjan SCCs over runtime
edges, with type-only imports excluded. **Baseline:** 1 file SCC (21 files)
and 1 slice SCC (4 slices) → 0.

### F4. Routes are one line; layouts compose only *(revised)*

A route file under `src/app/` is one re-export of a feature screen
(`export { XScreen as default } from '@/features/x'`). A `_layout.tsx` renders
providers, gates, the Stack and `<AppRuntime />`. It holds no effect, no
redirect logic and no domain hook. Background controllers (push
registration, call push, beacons, tamper keeper, call lock) are entries in
`platform/runtime`, each with the phase it starts in and the capability it
needs.

*Why:* the root layout carries call-lock logic, and `(app)/_layout.tsx`
starts 4 controllers as hooks, so the order of process-wide work is hidden in
JSX.

*Gate (measured):* `check-boundaries` rule `route-shape`. A non-layout route
file has exactly one statement, an export. A layout imports no hook outside
`expo-router`, `uniwind` and `platform/runtime`. **Baseline:** 6 hook calls in
the two layouts → 0.

### F5. `shared/` is earned by 2+ consumers *(kept)*

A `shared` module outside `ui/`, `layout/` and `theme/` has two or more
consumer slices. A slice that is used by one consumer lives in that consumer.
The same 2+ rule creates a widget: entity UI used by a single feature stays
in that feature.

*Gate (measured):* `check-boundaries` rule 5. **Baseline:** 0.

### F6. One interior per slice

A feature contains only `screens/`, `components/`, `hooks/`, `model/`,
`constants/` and `stores/`, plus `index.ts` and `CONTEXT.md`. An entity
contains only `api/`, `model/`, `store/` and `index.ts`. Every one of these
is a folder, never `constants.ts` beside `constants/`. A folder with nothing
in it does not exist.

*Why:* 5 of 25 features use a `constants.ts` file and the rest a folder.
`services/` appears in 13 features while their data services live in `core/`.

*Gate (measured):* `check-boundaries` rule `slice-shape`, an allow-list of
child names per layer. **Baseline:** 5 → 0.

### F7. File naming *(kept)*

Files use kebab-case, exports use PascalCase or camelCase, and the suffix
families are `.constant`, `.type`, `.store`, `.native`, `.web` and
`.projection`. Nitro specs are the only exception.

*Gate (measured):* a new `check-boundaries` rule `file-name` with the
regex `^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z]+)*\.(ts|tsx)$`. **Baseline:** to be
measured at R0.

---

## Data and state

### F8. Wire data is validated, never cast

Every HTTP answer, socket frame and stored JSON is parsed with a zod schema
at the boundary:

- `httpService` takes a schema and has no type parameter.
- Domain types are `z.infer` of the schema, never written a second time.
- A server enum is open: `z.enum([...]).catch('unknown')`. The UI renders
  `unknown` as a known state, never as a key.

*Why:* 164 HTTP call sites, of which 85 run no schema (69 in 22 files with no
validation at all, plus 16 generic casts elsewhere). The raw key
`screens.security.episodes.subject.household` reached the screen through
`httpService.get<GuardEpisodePage>`: the type said the value could not
exist. There are 80 types written twice (`satisfies z.ZodType<T>`).

*Gate (measured):*

- A lint selector bans a type argument on `httpService.*` calls.
- `check-quality` counts `httpService` calls whose argument list has no
  schema. **Baseline:** 85 → 0.
- `satisfies z.ZodType` count, **baseline** 80 → 0.
- `tests/unit/http-contract.test.ts` validates every route an entity calls
  against `backend/scripts/fixtures/http`. Its route list is generated from
  the entities' `api/` modules, so a new call without a fixture fails.

### F9. Gates fail closed and are tri-state

A component or function that decides access, consent, privacy or a route
returns `pending | allow | deny`:

- `pending` renders the splash or a skeleton, never the protected children.
- A failed or missing answer is `deny`, with a retry surface.

No gate renders its children on `!data`.

*Why:* `PrivacyGate` runs `if (!me || !needsConsent(me)) return children;`,
and the consent screen never showed when the start-up answer was lost (web
finding 1). A cold deep link was refused before the context arrived (finding
2). An Unknown role got the compose button (finding 27).

*Gate (measured):*

- Each gate has a unit test for the four inputs (loading, failed, allow,
  deny). `check-quality` lists the gate modules (`*-gate.tsx`,
  `route-access.ts`, `capabilities.ts`) and fails when a gate has no test
  file.
- The web E2E `startup.e2e.ts` runs the fake server at zero latency.

### F10. One session state machine owns the session lifecycle

`platform/session` holds `AppPhase`
(`booting → restoring → signed-out | establishing → ready → ending`).
Transitions are pure and unit-tested. Only this module calls:

- `viewCacheService.setUserId`;
- the context and module engines' `start`/`stop`;
- the view-cache coordinator's `start`/`stop`;
- device-credential setters.

Entering `ready` signals every mounted remote resource to reload.

*Why:* `establish`, `restore` and `performClear` mutate eight singletons in
hand-written orders. Answers fetched at start-up were thrown away.

*Gate (measured):* `check-boundaries` rule `session-owner`. Calls to the
listed functions outside `platform/session` fail. **Baseline:** measured at
R0 (today `session.service.ts` plus the engines) → only `platform/session`.

### F11. A failure is never shown as a fact

A remote read is a `Resource<T>` (`loading | ready | stale | failed |
refused`) and renders through `ResourceView`. `EmptyState` takes a
`ReadyEmpty` token that only `ResourceView` produces, so an empty state for
a failed or loading read does not compile. "Stale" (cached data whose last
reload failed) is shown as such.

*Why:* there are about 14 findings of this kind, for example "Sin sesiones
abiertas" after a failure, "No receivers yet" while loading, and "Tus datos
se conservan" with purge selected. Today `useRemoteResource` reports `ready`
for stale data, and the app has 42 `EmptyState` usages against 23 failed
renders.

*Gate (measured):* by type, plus `check-quality`'s count of `<EmptyState`
outside `ResourceView`. **Baseline:** 42 → 0.

### F12. One owner per datum

| Data | Owner |
|---|---|
| Synced rows | WatermelonDB, written by the sync engine and the entity's store |
| First frames | the view cache, written by projections and `useRemoteResource` |
| Pending mutations | the optimistic registry |
| Session, user and context | `AppPhase` |
| Ephemeral UI | small zustand stores in the slice that owns the UI |

- Zustand stores import no service and hold no server data.
- A store is exported as hooks, with atomic selectors.
- No module-level `Map`/`Set` caches server data outside `platform`.

*Why:* there are 61 exported singletons, 68 `getState()` calls outside
stores, 17 module-level caches, and the user held in both the auth store and
storage.

*Gate (measured):*

- `check-boundaries` rule `store-purity`: a `*.store.ts` imports nothing from
  `entities`, `platform/http` or `platform/database`.
- `check-quality` counts module-level `new Map`/`new Set` outside
  `platform`. **Baseline:** 17 → audited list.
- `getState()` outside stores and `platform`, **baseline** 68 → shrink.

### F13. Mutations are single-flight, abandon-safe and declared

Every user-started server action goes through `runServiceAction`,
`runOptimistic` or `useFormSubmit`:

- The action is ignored while pending (no double submit).
- It is cancelled or ignored after its surface unmounts (no work after
  `abandon()`).
- A destructive action confirms **before** any spinner.

Components and hooks never import `httpService`. Only an entity's `api/` does.

*Why:* there were two invitations from a double tap (A14/E9), an invitation
left active after Back during "Crear y mostrar QR" (R2-6), and a destructive
action spinning before the confirmation (W7).

*Gate (measured):*

- `no-restricted-imports` of `platform/http` outside `entities/*/api` and
  `platform`. **Baseline:** 21 files in `features/` and `shared/` import
  `core/services/http` today (18 of them call `httpService`) → 0.
- The action helpers have unit tests for double-press and unmount.

### F14. Local persistence *(kept, restated)*

The WatermelonDB rules of today's §12 stay:

- one file per table and model;
- snake_case columns;
- epoch milliseconds;
- `id` is the server id;
- JSON columns use `@json` with sanitizers;
- migrations for every schema bump;
- the Babel decorator overrides scoped to `src/`.

The database is reached only from `platform/database`, `platform/sync`, the
view-cache projections and each entity's `store/`. This restates what the
code does: 16 files outside `*.service.ts` reach it today, legitimately.

*Gate (measured):* `check-boundaries` rule `database-access` with that list.
**Baseline:** 0 once restated.

### F15. Local-first paint *(kept)*

Today's §12b stays as it is: screens paint from the view cache, never wait for
WatermelonDB or an HTTP list, and page with keysets.

*Gate (reviewed):* the startup trace of rule F27 records
`first-frame-from-cache`.

---

## UI

### F16. Design tokens have one source

`src/shared/theme/tokens.ts` is the only place a color, spacing step, size,
radius, type step, elevation, motion duration or breakpoint is written.
`scripts/gen-tokens.ts` generates the theme block of `global.css` (OKLCH) and
the JS constants. Tailwind's default palette is removed
(`--color-*: initial`). Mascot and avatar art reads `tokens.illustration`.

*Why:* 59 HEX constants are mirrored by hand to 62 OKLCH variables per theme,
and no test compares them. There are 65 HEX and 9 `rgb(a)` literals in
components, and no spacing or size tokens.

*Gate (measured):*

- `check-tokens` regenerates the outputs into a temporary folder and fails on
  any difference.
- A lint selector bans HEX and `rgb(`/`hsl(`/`oklch(` string literals in
  `src/` outside `shared/theme`. **Baseline:** 74 → 0.

### F17. No arbitrary values, no raw palette *(revised)*

The type-scale and radius bans of today's §7 and §10 extend to every
utility:

- no `-[…]` arbitrary value (`w-[…]`, `min-h-[…]`, `basis-[…]`, `tracking-[…]`);
- no default-palette class;
- no inline `style={{…}}` carrying a color or a size.

Platform APIs that need numbers (Reanimated, SVG, safe-area insets) read the
tokens.

*Why:* there are 114 arbitrary values and 78 inline style objects. Every one
is a size the redesign would have to hunt down.

*Gate (measured):* the `className` literal selectors already used for the type
scale, extended with `-\[` and the palette names. As an alternative,
`eslint-plugin-better-tailwindcss` `no-restricted-classes` and
`no-unknown-classes`. **Baseline:** 114 arbitrary values and 78 `style={{` →
0, except styles derived from a token.

### F18. One set of breakpoints, one responsive vocabulary

The breakpoints are tokens, and the same names drive CSS variants and
`useWindowClass`. A feature never reads `useWindowDimensions` or
`Dimensions`. Layout adapts through:

- the window class;
- the layout primitives (`Stack`, `Inline`, `Cluster`, `ResponsiveGrid`);
- CSS variants with the token names.

Rows of chips or actions wrap (`Cluster`) and never clip. A segmented control
that does not fit becomes a select.

*Why:* CSS `sm` is 480 px, a width the JS classes (640/1024) do not know.
53 files branch on the window class and 18 read the window size themselves.
Layout is the largest finding category (about 25), and the UI map counts
truncation in 863 of 1,740 captures.

*Gate (measured):*

- `no-restricted-imports` of `useWindowDimensions`/`Dimensions` outside
  `shared`. **Baseline:** 18 → 0.
- The layout audit of rule F25.

### F19. The design system owns every interactive and every state surface

Features compose `shared/ui`:

- `PressableSurface`, `Button`, `IconButton`, `ListRow`;
- `Switch`/`ToggleRow`;
- `ResourceView`, `Skeleton`, `RetryNotice`;
- `Field`;
- `AdaptiveDialog`/`Sheet`/menus.

A feature never imports `Pressable`, `TouchableOpacity`, `ActivityIndicator`
or `Switch` from `react-native`. Overlays register Back through
`useOverlayBack`. A new primitive starts in `ui-lab` with its visual
baseline.

*Why:* 104 raw `Pressable`s in features each re-decide target size, pressed
state and labels. The Back-with-menu-open regression came from a menu not
using `useOverlayBack`.

*Gate (measured):* `no-restricted-imports` (`react-native`: those names)
under `src/features/**` and `src/widgets/**`, with bulk suppressions.
**Baseline:** 104 `Pressable`, 9 `ActivityIndicator`, 3 `Switch` → 0.

### F20. Accessibility is part of the type

- Every interactive primitive requires `accessibilityLabel` (or visible text
  it derives one from) and sets its role.
- Touch targets are at least 44 pt on touch platforms and 24 px on pointer
  platforms.
- Text and icons on `background` and `card` meet WCAG AA through the
  `*-strong` tokens.
- `Text` caps font scale at 1.6.

*Why:* there are 304 captures with small targets, dark-mode controls that
nearly vanish (W37), clipping at font scale 1.3 (A3), and 20 of 122
`Pressable`s with no label.

*Gate (measured):*

- The primitives' prop types make the label required.
- `tests/e2e/accessibility.e2e.ts` runs over every UI-map state and fails on
  an unnamed control.
- The layout audit's `smallTargets` count. **Baseline:** 304 captures → 0 on
  touch viewports.
- A unit test computes the contrast of every text token pair from
  `tokens.ts`.

### F21. Type scale, radius, theme, icons *(kept)*

Today's §6, §7 (type scale, radius, touch targets) and §8 stay as they are:

- `Text` variants are the scale.
- `ICONS` is the only importer of `lucide`.
- `SystemBars` is used directly.

*Gate (measured):* the existing lint selectors.

### F22. Platform differences live in platform files

Behaviour that differs by platform lives in a `.native`/`.web` pair behind a
shared interface, or in a platform service. A pair exports the same names. A
runtime `IS_*` branch in a feature is limited to copy and layout, and
permission and device flows always go through the platform service. Phone
copy never shows on desktop: copy that names a device comes from
`platform/device` (`deviceNoun()`).

*Why:* the `heartbeat.native.ts` permission bypass (R2), phone copy on
desktop (W20), and 213 `IS_*` branches in 65 files, 16 of them in `auth`.

*Gate (measured):*

- `check-platform` compares the export names of every pair. **Baseline:** 0
  differences today.
- `check-quality` counts `IS_*` references in `features/`. **Baseline:** 213
  → shrink.

### F23. Text the user reads is a typed key *(revised)*

- Every user-facing string comes from the `es`/`en` dictionaries. Key parity
  is checked by `tsc`, as today.
- A key over a value from the server goes through a
  `Record<Enum | 'unknown', TranslationKey>` map, never a template literal.
- Server-supplied labels (settings catalog, module texts) are resolved per
  language by their owner, and a missing translation falls back to the
  other language, never to the raw identifier.
- Copy held by stores carries keys *(kept)*.

*Why:* raw keys leaked (W5), raw "privacy" and "Retention days" appeared in
Spanish (A9/E46), and there are 132 template-literal keys.

*Gate (measured):*

- A lint selector bans `` t(`…${…}…`) `` (`TemplateLiteral` with expressions
  as the first argument of `t`). **Baseline:** 132 → 0.
- `i18next/no-literal-string` in `jsx-only` mode, or the equivalent selector,
  bans literal JSX text and literal `label`/`title`/`placeholder` props.
  **Baseline:** to be measured at R0, near 0.

---

## Code shape

### F24. Size and complexity budgets

| Measure | Budget | Baseline (above the budget) |
|---|---|---|
| `complexity` per function | 15 | 76 functions (max 70) |
| `max-lines-per-function` | 80 | 133 (max 528) |
| `max-lines` per file, i18n dictionaries excluded | 300 | 32 files (max 1,098) |
| `max-statements` | 30 | 16 |
| `max-depth` | 3 | 7 |
| `max-params` | 3. Four or more becomes one object, as in the backend's rule 2 | 18 |
| Members of a props type | 10. Beyond that, slots or composition | 17 |

A screen lays out sections. A section owns its hook. Decisions live in
`model/` as pure functions with unit tests. The golden rule of today's §9
(file order, hook order, named props types) is *(kept)*.

*Why:* the hotspots (`camera-detail-screen.tsx`: 23 changes since 2026-10-03,
complexity 70, 528 lines) are where the testing finds regressions.

*Gate (measured):* ESLint rules as `error` + `eslint-suppressions.json`. The
props count goes in `check-quality`.

### F25. Layout is audited, not eyeballed

Every screen state of the UI map renders at the nine viewports with no
horizontal overflow, no clipped control, no overlap, no target below the
minimum and no text truncated where the text is the key fact.

*Why:* this is the single largest class of real findings, and none of the 40
web findings was retested.

*Gate (measured):* the UI-map harness (`tests/e2e/support/ui-map/capture.ts`,
from `test/ui-map`) runs in the integration build. Its DOM checks are counted
per screen and viewport into `scripts/lib/layout-baseline.txt`.
**Baseline:** 863 truncated, 416 overlapping, 304 small targets, 93
offscreen, 0 horizontal overflow (captures affected) → shrink.

### F26. Tests at the level the behaviour lives

- Pure logic: unit tests *(kept)*.
- Every `shared/ui` primitive and every screen: a render-level component test.
- Navigation behaviour (Back, deep links, redirects): `renderRouter` tests.
- Contracts: fixtures *(kept)*.
- Flows: web E2E over Chromium **and** WebKit, plus a small Maestro smoke set
  on Android.
- A bug fix lands with a test at the lowest level that reproduces it.
- No test asserts on source text (`readFileSync` of `src/**` followed by
  `toContain`).

*Why:* there are 0 render-level component tests. 14 test files read `.tsx`
sources as text instead. Two fixes regressed navigation that no test covered.

*Gate (measured):*

- `check-quality` counts source-text tests. **Baseline:** 14 → 0.
- It fails when a file in `screens/` or `shared/ui` has no test, with the
  current list as the baseline.
- Coverage per top-level slice (`bun test --coverage`), thresholds that only
  rise.

### F27. Performance budgets

- The web entry chunk and `dist/` have byte budgets.
- Call and media code loads only when used.
- Lists that can grow use `InfiniteList`.
- Manual `useMemo`/`useCallback`/`memo` exist only where an API needs a
  stable identity, because the React Compiler covers the rest.
- Startup records `first-frame-from-cache` and `ready` marks on production
  builds.

*Why:* the entry chunk grew from 5.30 MB to 6.61 MB in 17 days with no gate.
There are 347 `useCallback` and 153 `useMemo` under the compiler.

*Gate (measured):*

- `check:bundle` fails above the budget. **Baseline:** 6,612,933 B entry →
  the R9 target.
- `check-quality` counts `useCallback` and `useMemo`. **Baseline:** 347 and
  153 → shrink.

### F28. Formatting

Prettier with `prettier-plugin-tailwindcss` (class order) formats every
source file.

*Why:* 641 of 1,149 files differ from Prettier's output. The `(app)` layout
shows misindented JSX.

*Gate (measured):* `prettier --check` in `verify`, after one formatting
commit listed in `.git-blame-ignore-revs`.

### F29. No comments in code *(kept)*

Today's §10b stays, without exception: no comments, no lint or type
suppressions, `check-comments.ts`. ESLint's bulk suppressions file is not a
comment, and it is the only way debt is recorded.

*Gate (measured):* `bun run check:comments`. **Baseline:** 0.

### F30. Logging, dates, timers, React imports, platform flags *(kept)*

- `console` is used only in `log.ts`.
- Dates go only through the centralized formatter.
- Timers are never called as methods.
- React APIs are imported by name.
- Platform flags come from `common.constant.ts`.

*Gate (measured):* the existing lint rules.

### F31. Networking and secure storage *(kept)*

Today's §11 stays as written: one JS API with Nitro and Tauri backends, no
`fetch` from the WebView, `serviceUrl` for every URL, pairing proofs,
`CODE|message` errors, Rust-owned trust keys.

*Gate (measured):* the existing `net` unit tests and `cargo check`.

### F32. Contracts with the backend *(kept)*

`role-access`, `capability` and `modules` mirror the backend headers. HTTP
schemas mirror the backend fixtures. A backend change lands with the matching
frontend change.

*Gate (measured):* the existing contract tests.

### F33. Every agent writes to these rules

A prompt that delegates frontend work restates rules F29 (no comments) and
F24 (budgets). A new rule enters this file only together with its gate, or
marked **reviewed** with the phase that will measure it.

*Gate (reviewed).*

---

## Gate summary

| Gate | Command | Rules | New or existing |
|---|---|---|---|
| Comments | `bun run check:comments` | F29 | existing |
| Boundaries v2 (layers, deep imports, cycles, route shape, slice shape, file names, session owner, store purity, database access) | `bun run check:boundaries` | F1–F7, F10, F12, F14 | extended |
| Quality counters + `quality-baseline.txt` | `bun run check:quality` | F8, F9, F11, F12, F22, F23, F24, F26, F27 | new |
| ESLint + `eslint-suppressions.json` | `bun run lint` | F2, F8, F13, F16–F19, F21, F23, F24, F30 | extended |
| Tokens | `bun run check:tokens` | F16 | new |
| Platform pairs | part of `check:boundaries` | F22 | new |
| Formatting | `bun run check:format` | F28 | new |
| Types (`tsc`, i18n parity, `ReadyEmpty`, required labels) | `tsc --noEmit` | F11, F20, F23 | existing, used more |
| Unit, component and contract tests | `bun run test` | F9, F13, F26, F32 | extended |
| Bundle render + byte budget | `bun run check:bundle` | F27 | extended |
| Web E2E (Chromium + WebKit), visual baselines, accessibility | `bun run test:e2e:run` | F9, F20, F26 | extended |
| Layout audit (UI map) + `layout-baseline.txt` | integration build | F18, F20, F25 | new (from `test/ui-map`) |
| Maestro smoke | integration build | F22, F26 | new |

`bun run verify` keeps running everything except the layout audit and
Maestro, which need more time and a device. The integration build runs those,
like the backend's full-run-only clang-tidy scan.
