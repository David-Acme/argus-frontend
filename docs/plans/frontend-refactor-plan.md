# Frontend refactor plan

Status: approved, 2026-10-20. This plan keeps its job: the measured state
(§1–§2), the target architecture (§3) and the phases R0–R10 (§4). The rules,
the refactor and the redesign are one programme (owner decision, 2026-10-20;
spec §15 A1), so the order of work is the "Implementation order with the
redesign" of `frontend-rules-final.md`, which replaces this plan's §5 and
decision D7. Phase 1 of the redesign lands R0 and `shared/theme/tokens.ts`
with the spec's values; the rest is not implemented yet. Every number below
was measured on `master` at `09cf103` unless it names another source; the
counts the gates enforce are R0's committed baselines (§4 R0).

Companion files:

- `frontend-rules-final.md`: the 36 rules, their gates and the implementation
  order;
- `redesign-spec.md`: the design values and components (spec §3, §4), which
  win wherever this plan disagrees (spec §15 A1–A9);
- `frontend-refactor-resumen-es.md`: the owner's one-page summary.

Goal: the frontend gets the discipline the backend gained in its own refactor
(`backend/AGENTS.md`, rules 1–27; `backend/docs/history/plans/architecture-plan.md`).
That means one shape for every unit, dependencies that only point one way, and
rules that a gate measures instead of a reviewer remembering them. The
redesign is built in the same pass: tokens get the spec's values once, the 26
components are built once, and each screen is rebuilt on them after its
domain has moved, so nothing is restyled twice.

This plan follows the one implemented on 2026-10-03
(`docs/plans/architecture-plan.md`). That plan worked: boundary violations
went to 0, the web entry bundle dropped from 8.46 MB to 5.30 MB, and
`shared/components` shrank from 11.8k to 3.9k lines. What it did not do was
measure size, complexity, layering inside `core/`, state semantics or layout.
Since then the code has tripled, and those unmeasured areas are where the
real-device testing finds its bugs.

## 0. Decisions the owner must take

Each one is explained where it applies. Section 8 collects them.

| # | Decision | Recommendation |
|---|---|---|
| D1 | Layer names: `platform/` + `entities/` + `widgets/` (FSD-lite), or keep `core/` with sub-rules | FSD-lite (§3.1) |
| D2 | Runner for render-level component tests: bun + happy-dom + react-native-web, or jest-expo as a second runner | spike bun first, fall back to jest-expo (§4 R8) |
| D3 | Native E2E with Maestro on the emulator | yes, a small smoke set only (§4 R8) |
| D4 | What happens to the ~30 open frontend worktrees before the moves in R3/R4 | merge or abandon each one first; freeze one domain at a time |
| D5 | Token source format: a TypeScript object, or DTCG JSON + Style Dictionary | TypeScript object first, generator in-repo (§3.5) |
| D6 | Budgets: complexity 15, 80 lines per function, 300 lines per file, 10 props | accept, enforced as a ratchet (§4 R0) |
| D7 | ~~When the redesign starts: after R5 and R6 exit~~ **Superseded** (owner, 2026-10-20): the rules, the refactor and the redesign are one programme, in the order of `frontend-rules-final.md` | — |
| D8 | One formatting commit touching 641 files | yes, isolated in its own commit, listed in `.git-blame-ignore-revs`, once the open branches are settled (D4); until then `check:format` is a ratchet over the list of unformatted files |
| D9 | Merge the UI-map harness (`test/ui-map`) into `master` as a gate | yes, as the layout audit of R8 |

## 1. Why now: growth since the last plan

| Measure | 2026-10-03 (previous plan §6) | 2026-10-20 (`09cf103`) |
|---|---|---|
| `src` lines (`.ts`/`.tsx`) | 30,798 | 92,939, of which 8,461 are i18n dictionaries |
| `src` files | n/a | 1,149 (377 `.tsx`, 772 `.ts`) |
| Commits | n/a | 475 since 2026-10-03, out of 606 in total |
| Web entry bundle | 5,298,260 B | 6,612,933 B (1,673,386 B gzip; `dist/` from 2026-10-16) |
| Unit test files | 28 | 225 (1,861 `test`/`it` calls); 0 render-level component tests |
| Boundary violations | 0 | 0 |
| Comments in code | n/a | 0 (`check-comments`, 1,749 files) |
| ESLint problems | n/a | 0 |

The existing gates still hold, and they hold because they are measured. What
grew is everything they do not measure.

## 2. Current state, measured

### 2.1 Size and complexity

Measured with ESLint's `complexity`, `max-lines-per-function`,
`max-statements`, `max-depth`, `max-params` and `react/jsx-max-depth`, all set
to 0 so that every function reports its value (`src/**`). The scripts are in
Appendix A.

| Metric | Count above the threshold | Worst |
|---|---|---|
| Cyclomatic complexity > 10 / > 15 / > 20 / > 30 | 196 / 76 / 33 / 11 functions | 70, `CameraDetailScreen` |
| Function length > 50 / > 80 / > 150 / > 200 lines | 256 / 133 / 33 / 13 | 528 lines, `CameraDetailScreen` |
| Statements > 30 / > 50 | 16 / 4 | 97, `CameraDetailScreen` |
| Parameters > 3 | 18 functions (193 take exactly 3) | 4 |
| Nesting depth > 3 | 7 | 4 |
| JSX depth | max 8 (`app/_layout.tsx`, `welcome-screen.tsx`) | none above 8 |
| Files > 300 / > 400 / > 500 lines (i18n excluded) | 32 / 8 / 5 | 1,098, `voice.service.ts` |
| Props types with > 10 / > 15 members | 17 / 6 | 17, `CameraLiveStreamProps`, `CallSurfaceProps` |

The most complex functions are all screens or large components:

| Function | File | Complexity | Lines |
|---|---|---|---|
| `CameraDetailScreen` | `features/cameras/screens/camera-detail-screen.tsx` | 70 | 528 |
| `ModuleCard` | `features/modules/components/module-card.tsx` | 68 | — |
| `CameraLiveStage` | `features/cameras/components/camera-live-stage.tsx` | 57 | 204 |
| `EpisodeCard` | `features/security/components/episode-card.tsx` | 47 | 199 |
| `CameraForm` | `features/cameras/components/camera-form.tsx` | 43 | 501 |
| `ProjectsScreen` | `features/projects/screens/projects-screen.tsx` | 41 | 264 |
| `NotificationThreadRow` | `features/home/components/notification-thread-row.tsx` | 40 | — |
| `CameraCallPanel` | `features/cameras/components/camera-call-panel.tsx` | 37 | — |
| `ScheduleScreen` | `features/agenda/screens/agenda-screen.tsx` | 34 | 366 |

**Hotspots** rank files by changes since 2026-10-03 times their worst
function's complexity. That ranking says where the refactor pays back first:

| File | Changes | Complexity | Lines |
|---|---|---|---|
| `camera-detail-screen.tsx` | 23 | 70 | 624 |
| `voice.service.ts` | 28 | 21 | 1,098 |
| `camera-live-stage.tsx` | 10 | 57 | 248 |
| `notification-thread-row.tsx` | 9 | 40 | 301 |
| `agenda-screen.tsx` | 10 | 34 | 437 |
| `camera-form.tsx` | 7 | 43 | 662 |
| `projects-screen.tsx` | 7 | 41 | 327 |
| `session.service.ts` | 15 | 18 | 401 |

The feature sizes are uneven. `cameras` has 120 files and 13,135 lines.
`voice` (6,007), `security` (5,378) and `auth` (4,881) come next. Nine
features are under 1,000 lines.

**Duplication is not the problem.** `jscpd` (70-token minimum, i18n excluded)
finds 31 clones and 518 duplicated lines, which is 0.51%. The largest clone is
66 lines shared by `environment-screen.tsx` and `security-screen.tsx`.

### 2.2 Architecture and boundaries

**What `check-boundaries.ts` enforces** (5 rules, 0 violations):

1. `app` reaches features only through their index, and never `core/database`
   or `core/services`.
2. A feature reaches another feature only through its index.
3. `core` never imports `features` or `shared/components`.
4. `shared` never imports `features`.
5. A `shared` module needs 2+ consumers.

**What it misses**, measured with an import-graph script (Appendix A) that
uses the same resolution as the gate:

- **Cycles.** There is one runtime strongly connected component of 21 files
  spanning `features/voice`, `features/response`, `features/security` and
  `features/cameras`. At the slice level the cycle is
  `security ↔ voice ↔ cameras ↔ response`:
  - `voice` uses `CameraLiveView`, `CameraSnapshotView` and `useCameraPrivacy`
    from cameras, `matchEnvironment` from security and `ResponseCard` from
    response.
  - `cameras` uses `createVoiceMic` and `useVoiceCallActive` from voice, and
    `CameraEnvironmentPanel`, `MaintenancePanel` and `sightNoticeOf` from
    security.
  - `security` uses `TamperEvidenceView` from cameras.
  - `response` uses `CameraLiveView` from cameras.

  The cause is that UI built around one entity (a camera's live view) and
  domain logic (environment matching) live inside a feature, so other features
  must reach into it. A gate that only checks "through the index" cannot see
  this.
- **Cross-feature fan-out.** There are 69 cross-feature import statements.
  `home` imports 9 features. The features others depend on most are
  `modules` (fan-in 6) and `safety`, `privacy` and `voice` (5 each). No
  direction is defined, so any feature may depend on any other.
- **`core/` is layer-based, not domain-based.** It is 26,265 lines in 352
  files. It holds infrastructure (net, http, storage, secure storage,
  database, sync, session, view cache, i18n, log) together with 13 domain data
  services:
  - `calendar-event`, `calendar-event-share`, `camera`, `conversation`,
    `guard`, `notification`, `project`, `project-member`, `project-task`,
    `reminder`, `user`, `user-invitation`, `zone`.

  Their vocabulary is spread over global barrels: 56 files in `core/types`,
  25 in `core/interfaces` and 19 in `core/contracts`. A domain change touches
  4–5 folders. This is the frontend's equivalent of the backend's pre-Phase-4
  "`feature/api/<resource>`" spelling.
- **Barrels are bypassed.** Rule 5 of AGENTS says consumers import only a
  service's barrel. There are 71 imports from 33 distinct internal files under
  `core/services/<dir>/`. The most common are `http/http-envelope.ts` (13),
  `modules/module-state.ts` (9), `sync/synchronize.service.ts` (6) and
  `net/net-routes.ts` (6).
- **The database rule is written more narrowly than it is practised.** AGENTS
  §12 says "only `core/services/*.service.ts`" reaches the database. In fact
  16 more files do: 9 sync modules, 6 view-cache projections and
  `database.type.ts`. The rule needs restating, not the code.
- **Routes are thin.** All 41 route files are one-line re-exports except the
  layouts. That is good. The root `_layout.tsx` (97 lines), however, holds
  call-lock redirect logic and mounts 9 global overlays. `(app)/_layout.tsx`
  starts 4 background controllers as hooks (`usePushRegistration`,
  `useCallPush`, `useBeaconController`, `useTamperEvidenceKeeper`). The start
  order of process-wide work is implicit in JSX.
- **Feature interiors vary.** Some features have a `constants/` folder and
  others a `constants.ts` file (5 of 25 use the file). `services/` appears in
  13 features while their data services sit in `core/`. `stores/` appears in 3.
- **Platform splits are consistent.** There are 24 `.native` and 23 `.web`
  files plus one `.ios`, every pair exports the same names, and there are no
  orphans. Divergence instead lives in 213 runtime `IS_*` branches in 65
  files (16 of them in `auth`) and 58 `Platform.select` calls.
- **Dead code is small.** `knip` (approximate, because it does not follow
  platform suffixes) reports 232 unused exports and 377 unused exported types
  (111 of them in `core`), plus 2 unused dependencies (`expo-crypto`,
  `tw-animate-css`, both to be verified). There are no truly unused files: the
  3 knip lists are reached through `.web` files.

### 2.3 State and data

**Sources of truth.** A synced row can exist in five places at once:

- WatermelonDB;
- the MMKV view-cache snapshot;
- the optimistic registry overlay;
- for some data, a zustand store (`auth.store` holds the user, which is also
  persisted under `SESSION_USER_KEY`);
- a module-level cache (17 module-level `Map`/`Set` caches, 28 module-level
  `let`s).

There are 61 exported singletons (`export const x = new …`) and 68
`getState()` calls outside the stores. The data flow
(Watermelon → projection → MMKV → `useSyncExternalStore`) is sound and is kept.
What is missing is an explicit owner of the session-scoped lifecycle.

**Startup is an imperative sequence, not a state machine.** `session.service.ts`
`establish()` and `restore()` mutate the following in a fixed order: device
credential, auth store, `viewCacheService.setUserId`, module engine, context
engine, resource-signal binding, cached access, view-cache coordinator.
`performClear()` undoes them in another order. The hooks that read remote
resources (`useRemoteResource`) load on focus, on a matching
`ResourceChanged` and on reconnect, but **not when the session becomes
ready**.

The UI map shows the result (web finding 1). With a fast server, the answers
fetched at start-up are lost: Home shows 0 detections instead of 5, the alert
card and the watch pill are missing, and the privacy consent gate never
appears. Every other capture had to add 1.2 s of latency per GET to get past
it.

**A gate that fails open, verified in code.**
`features/privacy/components/privacy-gate.tsx`:

```tsx
if (!me || !needsConsent(me)) return children;
```

While `/privacy/me` is loading, after it has failed, or when its answer was
lost (above), the signed-in app renders with no consent check. The same
two-state thinking (data or no data) appears in `EntryGate`: the
`routeFallback` decision on a cold deep link is taken before the live context
arrives (web finding 2). A pending guard now exists for module routes only.

**Failures shown as facts.** `useRemoteResource` returns
`status: 'ready'` whenever a cached value exists, even when the last load
failed. That means "stale" is indistinguishable from "fresh". With no cached
value, a failure becomes `failed`, but there is no shared component that
renders loading, failed, empty and stale differently. There are 42
`<EmptyState>` usages and only 23 places that render a failed state, and 5 of
29 `useRemoteResource` consumer hooks drop `status` altogether. The testing
found about 14 instances, among them:

- "Sin sesiones abiertas" after the request failed;
- "No receivers yet" while loading;
- "Tus datos se conservan" with purge selected;
- a failed install still saying "Tu servidor lo mueve bien".

**Wire data is trusted by type, not checked.** `httpService.get<T>()` is a
generic cast. There are 164 call sites:

- 25 pass an explicit type argument;
- 69 are in 22 files that run no schema at all, among them `camera.service`,
  `calendar-event.service`, `project*.service`, `reminder.service`,
  `proximity.service` (9 calls) and `settings.service`.

`guard.service.ts` validates environments but reads episodes as
`httpService.get<GuardEpisodePage>`. When the server sent the subject
`household`, which the union type does not contain, the UI rendered the raw
key `screens.security.episodes.subject.household` (web finding 5). The type
said this could not happen. There are 132 template-literal translation keys
(`` t(`screens.security.danger.${danger}`) ``) that are only as safe as the
unchecked union behind them.

The zod schemas and the TypeScript types are written twice: 80
`satisfies z.ZodType<T>` against 7 `z.infer`.

### 2.4 UI layer

**Tokens.**

- `color.constant.ts` (59 HEX values) and `global.css` (62 OKLCH variables
  per theme) are mirrored by hand. No test compares them.
- There are 65 HEX and 9 `rgb(a)` literals outside `shared/constants`. Most
  are mascot and avatar art; a few are UI.
- There are 114 arbitrary Tailwind values (`w-[…]` 13, `min-h-[…]` 12,
  `min-w-[…]` 11, `sm:max-w-[…]` 10, `basis-[…]` 10, …) and 78 inline
  `style={{…}}` objects.
- No spacing, size, elevation or motion tokens exist. Spacing is Tailwind's
  default scale.
- The type scale and the radius scale are tokens and are lint-enforced. Those
  are the model to follow.

**Responsive strategy: two systems that disagree.** CSS breakpoints are
`sm 480 / md 640 / lg 1024 / xl 1280 / 2xl 1536` (`global.css @theme`). JS
window classes are `compact < 640 ≤ medium < 1024 ≤ expanded`, plus short
height `< 500` (`layout.constant.ts`). The most used CSS breakpoint, `sm:`
(29 of 41 uses), is one the JS layer does not know. 53 files branch on
`useWindowClass` and 18 on `useWindowDimensions` directly.

The UI map's automatic DOM checks over 1,740 captures (9 viewports, both
themes, both languages) found:

| Check | Captures affected |
|---|---|
| Text truncated | 863 |
| Overlapping elements | 416 |
| Targets under the minimum size | 304 |
| Offscreen elements | 93 |
| Horizontal overflow | 0 |

The worst screens are Home (190 truncated, 158 small targets), Profile (134
truncated), Users (84) and Agenda (91 small targets). By viewport, `phone`
(359) and `tablet-portrait` (256) carry most truncation. Layout is the largest
category in the manual findings too: about 25 of them. Examples are segmented
controls cut to "A." (W3), the Home header overflowing at 320 px (W8), the
landscape rail clipping Perfil and Crear (A1), and words broken mid-word at
font scale 1.0 (A2).

**Component library.** `shared/components/ui` has 46 primitives. Features
still use 104 raw `Pressable`s, 23 `ScrollView`s, 9 `ActivityIndicator`s and 3
raw `Switch`es. Each raw `Pressable` re-decides its pressed state, target size
and accessibility. By a rough scan, 20 of 122 `Pressable` elements have
neither an `accessibilityLabel` nor an `aria-label`.

**Accessibility.** `tests/e2e/accessibility.e2e.ts` reads Chromium's
accessibility tree, which is a good base. No report tested screen-reader
order. The AA contrast "strong twins" are a documented rule, but nothing
checks them.

**i18n.** Key parity between `es` and `en` is enforced by `tsc`. There are
almost no literal JSX strings. The leaks come from server vocabulary the
types do not cover (above) and from server-supplied labels (raw "privacy" and
"Retention days" in Spanish settings, A9/E46).

**Formatting.** `.prettierrc` and `prettier-plugin-tailwindcss` exist, but
nothing runs them: 641 of 1,149 source files differ from Prettier's output.

### 2.5 Testing

| Layer | Today |
|---|---|
| Unit (bun test) | 225 files, 1,861 tests, 27,124 lines. Strong on `core/services/sync` (18), `net` (11), `voice` (27) and `cameras` (23) |
| Contracts | 13 files; HTTP schemas against `backend/scripts/fixtures/http`; role, capability and module tables against the backend headers |
| Component | none renders a component. 14 test files assert on **source text** instead (`readFileSync` of a `.tsx` + `toContain`), e.g. `camera-sight-layout.test.ts` (17 assertions) and `response-card.test.ts` (20). The unmerged `fix/q1-component-tests` branch adds more of the same kind |
| E2E web | 23 specs, 41 tests, one target (desktop-web, Chromium, 1280×800), a scripted fake backend; `retries: 0` |
| Visual | 12 baselines (`visual.e2e.ts`), main screens at phone, tablet and desktop widths |
| Native E2E | none. Android was tested by hand (61 cases in `e2e-report.md` plus two retests) |
| Layout audit | the UI map harness exists on the unmerged branch `test/ui-map` (`tests/e2e/support/ui-map/capture.ts`) |
| Native modules | 28 Kotlin test files; 77 Rust `#[test]`/`#[cfg(test)]` in `src-tauri` |

None of the 40 web findings was retested. Two Android fixes introduced
regressions that the next retest found:

- `b9b2af6` made Back with the "Crear" menu open exit the app.
- `46108ae` routes a checklist row to `/guard`, which 404s.

Tests at the level where those flows live (component and navigation) would
have caught both.

### 2.6 Performance

- The web entry bundle is 6.61 MB (1.67 MB gzip) in one chunk (`output:
  'single'`), plus a 594 KB `livekit-client` chunk. It grew 25% since
  2026-10-03. `check:bundle` proves the bundle renders under the Tauri CSP but
  sets no byte budget.
- The React Compiler is on, yet there are 347 `useCallback`, 153 `useMemo`
  and 5 `memo(`. Some are required for identity (`useRemoteResource`'s `load`
  must be stable). Most are noise the compiler makes redundant.
- 228 `.map(` renders in feature `.tsx` files. Long lists go through
  `InfiniteList` (LegendList) in 40 places. No list virtualization finding
  came from the testing.
- Web captures logged 415 console errors "Deleting database failed because it
  is blocked by another connection": the Loki/IndexedDB wipe at sign-out runs
  while a connection is open.

### 2.7 What real testing found, by root cause

Sources: `uiux-map/web/findings.md` (40: 6 critical, 10 high, 16 medium, 8
low), `uiux-map/android/findings.md` (25), `e2e-report.md` (61 tests, 25
bugs), `e2e-retest-r2.md` (17 checks, 6 new bugs) and `e2e-retest-r3.md` (37
rows, 13 bugs). A finding can sit in two rows.

| Root cause | About | Examples | Prevented by |
|---|---|---|---|
| Layout, responsive, truncation | 25 | W3, W8, W9, W14, W15, A1, A2, A3, A6, A8 | R5 tokens + breakpoints, R6 primitives, R8 layout audit |
| Failure or loading shown as a fact | 14 | W6, W4, W31, W39, A7, A10 | R1 `Resource<T>` + `ResourceView` |
| Raw keys, copy, units | 10 | W5, A9, W18, W22 | R2 wire validation, rule 27 |
| Async actions (double submit, abandon, order) | 8 | A14/E9, R2-6 (`invitation-dialog.tsx` keeps going after `abandon()`), W7, E19 | rule 18 + R6 |
| Native permissions | 8 | E11, E43, R2 `heartbeat.native.ts` bypass, R3-D6 | rule 28, R8 Maestro |
| Navigation and back stack | 7 | E12, E23, R2 Back with menu open, R3 `/guard` 404 | R8 navigation tests (`renderRouter`) |
| Inconsistent components and tokens | 7 | W24, W30, W35/36, W38 | R5, R6 |
| Errors, toasts, offline | 7 | A8/E18, W10, W11 | R1, R6 |
| Startup and session races | 6 | W1, W2, E25, R3-12 (mDNS loop) | R1 `AppPhase` |
| Accessibility | 6 | W16, W37, A3, A19 | R6, R8 a11y + layout gates |
| Privacy or permission gate failing open | 4 | W1, W27 (Unknown role gets compose '+'), W32 | R1, rule 14 |
| Stale live state | 4 | A11/E20 (privacy mode 8–10 s late) | R1 |
| Platform divergence | 4 | W20 (phone copy on desktop), A1 | rule 28 |

### 2.8 What is right and stays

- The local-first model: MMKV paints first and WatermelonDB is the durable
  projection. Behind it sit the view-cache projections, keyset paging,
  `RemoteFeed`, `InfiniteList` and optimistic intents with lenses.
- The sync engine (`core/services/sync`, 18 test files), with its audit
  cursors and grant scopes.
- The `net` layer: HMAC pairing proofs, `CODE|message` errors, pinned CA on
  three platforms, the Tauri trust keys written only by Rust, the CSP.
- Session refresh with its three outcomes and single-flight clear.
- Typed i18n keys with `es`/`en` parity checked by `tsc`.
- The capability, role-access and module tables, pinned to the backend
  headers by contract tests.
- The gates that work: `check-comments`, `check-boundaries`, the lint
  restrictions (`date-fns`, `Platform.OS`, timers as methods, type scale),
  `check:bundle`.
- The icon registry with deep imports, kebab-case file names, thin route
  files, the React Compiler, and Nitro modules split by domain.

## 3. Target architecture

### 3.1 Layers (FSD-lite, D1)

Feature-Sliced Design orders layers so that a slice may import only from
layers strictly below it, and each slice exposes a public API
([FSD layers](https://feature-sliced.design/docs/reference/layers),
[public API](https://feature-sliced.design/docs/reference/public-api)). Expo
Router owns `src/app/`, so the FSD "app" and "pages" layers keep their Argus
names. Routes stay one-line re-exports, which is FSD's own file-router guide
applied to Expo
([FSD with Next.js](https://feature-sliced.design/docs/guides/tech/with-nextjs),
[Expo Router core concepts](https://docs.expo.dev/router/basics/core-concepts/)).

```
src/
  app/                  routes (one line each) + layouts that compose only
  features/<name>/      a screen-level capability: screens/ components/ hooks/ model/
  widgets/<name>/       UI built around one entity and reused by 2+ features
                        (camera-view, response-card, call-surface, …)
  entities/<domain>/    domain data: api (the HTTP calls + zod schemas), model (types inferred
                        from the schemas, pure functions), store (WatermelonDB service, projection,
                        optimistic lens) — camera, zone, project, project-task, project-member,
                        calendar-event, reminder, notification, conversation, user, invitation,
                        guard, module, privacy, session-list, …
  platform/             app-wide infrastructure, no domain: net, http, storage, secure-storage,
                        database (engine + table registry), sync engine, session (AppPhase),
                        view-cache engine, i18n engine, log, push transport, device permissions
  shared/               ui/ (design system), layout/ (app chrome), theme/ (tokens), hooks/, libs/
```

Import direction (a cell is "may import"):

| from \ to | app | features | widgets | entities | platform | shared |
|---|---|---|---|---|---|---|
| app | — | index only | index only | no | composition only (§3.3) | yes |
| features | no | index only, of a feature it declares | index only | index only | barrel only | yes |
| widgets | no | no | index only | index only | barrel only | yes |
| entities | no | no | no | index only, no cycle | barrel only | `shared/libs`, `shared/theme` |
| platform | no | no | no | no | yes, no cycle | `shared/libs`, `shared/theme` |
| shared | no | no | no | no | `ui` may read `platform/i18n` | yes |

Feature-to-feature imports are allowed only through the index and only
without cycles. The gate records the remaining edges as a baseline. The
direction rule removes the `security ↔ voice ↔ cameras ↔ response` cycle by
construction: `CameraLiveView` becomes `widgets/camera-view`,
`matchEnvironment` moves to `entities/guard`, and `ResponseCard` becomes
`widgets/response-card`.

The tables in `platform/database/tables/` remain one registry, because the
schema is one database. Each domain's WatermelonDB service moves to its
entity. Tables and models are one file per table, as now.

What is deliberately not adopted from full FSD: no `processes` layer and no
`@x` cross-entity notation. The tools that enforce FSD (Steiger,
eslint-plugin-boundaries, dependency-cruiser) are not added. The in-repo
`check-boundaries.ts` grows the matrix and the cycle check instead, because
it already resolves `.native`/`.web` suffixes. Both eslint-plugin-boundaries
and knip are documented to need a correct resolver, or they skip files
silently ([eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries),
[knip](https://knip.dev/)).

### 3.2 One owner per datum

| Data | Owner | Read through |
|---|---|---|
| Synced rows | WatermelonDB, written only by the sync engine and the entity's store | view-cache projection → `useViewCacheRows` |
| A view's first frame | MMKV view cache (a projection, never edited by UI) | `useViewCacheRows`/`useViewCacheValue` |
| Server-only resources | the entity's `api` + the view cache | `useRemoteResource` → `Resource<T>` |
| Pending mutations | the optimistic registry | `useOptimisticRows` |
| Session, user, context | `platform/session` (`AppPhase`) | `useAppPhase()`, `useCapabilities()` |
| Ephemeral UI (dialogs, toasts, scan purpose) | small zustand stores in the slice that owns the UI | atomic selectors, exported as hooks only |

Zustand stores hold no copy of server data and import no service. That
matches the guidance on small stores, atomic selectors and exporting hooks,
not stores ([TkDodo, Working with Zustand](https://tkdodo.eu/blog/working-with-zustand)),
and react.dev's rule against redundant or duplicated state
([choosing the state structure](https://react.dev/learn/choosing-the-state-structure)).

### 3.3 Startup and session: `AppPhase`

There is one finite state in `platform/session`:

```
booting → restoring → signed-out
                    → establishing(user) → ready(user, context) → ending → signed-out
```

- Each transition is a pure function `(phase, event) → phase` plus an effect
  list, unit-tested. The effect list covers device credential, view-cache
  namespace, engines, coordinator and resource reload. Only this module calls
  `viewCacheService.setUserId`, `contextEngine.start/stop`,
  `moduleEngine.start/stop` and `viewCacheCoordinatorService.start/stop`.
- `ready` is entered only once the live context has been read (or the cached
  context for that user has been applied). Entering `ready` broadcasts a
  "session ready" signal. Every mounted `useRemoteResource` reloads on it, the
  same way it reloads on reconnect. That closes W1.
- The background controllers that `(app)/_layout.tsx` mounts as hooks today
  are registered in one `platform/runtime` list. Each entry has the phase it
  starts in and the capability it needs. The layout renders `<AppRuntime />`
  once.
- Gates are tri-state. `verdict: 'pending' | 'allow' | 'deny'`. `pending`
  renders the branded splash or a skeleton, never the children. A failed
  verdict renders a retry surface. A cold deep link waits for `ready`,
  bounded by a timeout that leads to a retry screen, not to Home (W2).
- This is an explicit discriminated union with a reducer, not a library.
  Expo's own auth guide models a status union, holds the splash until the
  session is known and protects routes declaratively with `Stack.Protected`
  ([Expo Router authentication](https://docs.expo.dev/router/advanced/authentication/)).

### 3.4 Remote state semantics: `Resource<T>`

```ts
type Resource<T> =
  | { kind: 'loading' }
  | { kind: 'ready'; data: T; at: number }
  | { kind: 'stale'; data: T; at: number; error: ApiError }
  | { kind: 'failed'; error: ApiError }
  | { kind: 'refused'; error: ApiError }
```

`useRemoteResource` and `useRemoteFeed` return it. `<ResourceView resource
empty={…} loading={…}>` renders each kind with the shared surfaces: skeleton,
retry, a stale ribbon, and module-off or forbidden. `EmptyState` can only be
reached from `ready` with no rows. The type takes a `ReadyEmpty` token that
only `ResourceView` produces, so the compiler is the gate.

### 3.5 Wire data

- `httpService` takes a schema and has no type parameter:
  `httpService.get(path, schema)`. It returns `IServiceResponse<z.infer<S>>`,
  and a mismatch becomes `INVALID_RESPONSE`, logged with the route.
- Types come from the schemas (`z.infer`). The 80 hand-written types tied by
  `satisfies` are replaced one entity at a time.
- Server vocabularies are open. Every server enum is parsed as
  `z.enum([...]).catch('unknown')`, and every translation map over a server
  enum is a `Record<Enum | 'unknown', TranslationKey>`. A template-literal
  key over server data is forbidden.
- Contract tests validate every recorded backend fixture against the route's
  schema, as today, but for every route an entity calls.

### 3.6 Design tokens, one source

`shared/theme/tokens.ts` is the single source (D5). It landed in Phase 1
with the redesign spec's §3 values as the prototype renders them; its groups
are listed in rule 21 of `frontend-rules-final.md`. The performance tier and
the accessibility flags beside it are `shared/theme/effects.ts` (rule 26).

`bun scripts/gen-tokens.ts` writes the `@theme`/`@layer theme` block of
`global.css` (OKLCH computed from the source), `color.constant`'s successor
and the JS breakpoints. `check-tokens` fails when the generated files differ
from the source. Tailwind's default palette is removed (`--color-*: initial`),
so a class outside the tokens does not exist
([Tailwind v4 theme](https://tailwindcss.com/docs/theme),
[Uniwind themes](https://docs.uniwind.dev/theming/custom-themes)).

DTCG JSON + Style Dictionary is the standard route
([DTCG 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/),
[Style Dictionary DTCG](https://styledictionary.com/info/dtcg/)), and stays
the upgrade path if the redesign brings a design tool that exports DTCG. Its
own docs still call full 2025.10 support work in progress for v5, so the
plan starts with the TypeScript source. Illustration colors (mascot, avatar)
live in `tokens.illustration`, so the hex ban has no exceptions.

**Breakpoints** are one set, used under the same names by CSS variants and by
`useWindowClass`: `compact < 600 ≤ medium < 1024 ≤ expanded < 1440 ≤ wide`
(`tokens.breakpoints`, spec §6, A9).

### 3.7 Design system ownership

`shared/ui` owns every interactive and every state surface: the 26 components
of spec §4, which is the one list (rule 24 of `frontend-rules-final.md`). The
names this plan first proposed map onto it: `PressableSurface` is `Pressable`,
`IconButton` is `Button`'s `iconOnly`, `ListRow` is `Row`, `SegmentedControl`
is `Choice` (it becomes a sheet list instead of truncating, W3), and
`RetryNotice`/`StaleRibbon` are `Notice` and `ResourceView`'s states. The
layout helpers `Stack`, `Inline` and `Cluster` (which wraps, so chip rows
cannot clip, W14) are not counted among the 26.

Features compose these and never import `Pressable`, `ActivityIndicator` or
`Switch` from `react-native`. `ui-lab` becomes the dev-only catalogue. Every
component has visual baselines at three widths × two themes × reduced
motion and transparency.

## 4. Phases

Each phase lands and is verified on its own. Common verification:
`bun run verify`, the phase's new gate, `bun run web:build` with the entry
size recorded, one Android pass for phases that touch native rendering, and
the UI-map capture of the screens touched once R8 has merged it. Code moves
happen one domain per commit and never mix with behaviour changes.

### R0. Gates first, as ratchets (no behaviour change)

- **Scope.**
  - `scripts/check-quality.ts` runs the counters. `scripts/lib/quality-baseline.txt`
    holds the baseline, one `metric count` per line, in the style of the
    backend's `tidy-baseline.txt`. A count that rises fails the gate. A count
    that drops fails until the baseline is lowered in the same change.
  - ESLint metric rules become `error`: `complexity` 15,
    `max-lines-per-function` 80, `max-lines` 300, `max-statements` 30,
    `max-params` 3, `max-depth` 3. The current debt goes into ESLint's bulk
    suppressions (`eslint --suppress-all` → `eslint-suppressions.json`;
    ESLint 9.39 is installed). A suppressed count may only shrink, and
    `--prune-suppressions` is required once one is fixed
    ([ESLint bulk suppressions](https://eslint.org/docs/latest/use/suppressions)).
  - `check-boundaries.ts` v2 checks file- and slice-level cycles, deep
    imports into a service folder's internals, and that every route file is a
    one-line re-export. Its current five rules stay.
  - `check:format` as a ratchet over the list of unformatted files; the
    formatting commit (D8) waits for D4.
  - `check:bundle` gets a byte budget for the entry chunk and for `dist/`
    (`scripts/lib/bundle-baseline.txt`), and a list of lazy packages that
    must stay out of the entry chunk.
  - The counters of `frontend-rules-final.md`, with the baselines R0
    measures and commits in `scripts/lib/quality-baseline.txt`. They replace
    the `09cf103` survey this plan took: hex/rgb literals (74), arbitrary
    Tailwind values (114), `style={{` (78), raw `Pressable` in features
    (104), `useWindowDimensions` in features (18), template-literal `t()`
    (132), unchecked HTTP calls (85), source-text tests (14), manual
    memoization (`useCallback` 347, `useMemo` 153, `memo` 5), `IS_*` branches
    (213) and `Platform.select` (58).
- **Entry.** None.
- **Exit.**
  - `verify` runs every new gate.
  - Each gate is proved by a unit test under `tests/unit/scripts/` that feeds
    it a violating fixture.
  - The baselines are committed.
  - The rules (`AGENTS-rules-section.md`) replace `AGENTS.md`'s
    MUST-FOLLOW section, each rule marked "measured" or "reviewed".
- **Risks.** Noise and churn on open branches. Baselines make the gates
  non-blocking for existing debt, so only new debt fails.
- **Unblocks for the redesign.** The redesign cannot regress size, layout or
  token use unnoticed.

### R1. Trust: startup, gates and failure semantics

- **Scope.**
  - `AppPhase` (§3.3) in `platform/session`, with transition tests.
  - `<AppRuntime />` replaces the four controller hooks in `(app)/_layout.tsx`
    and the call-lock effect in the root layout.
  - `useRemoteResource` reloads on `ready`.
  - `PrivacyGate`, `EntryGate` and `routeFallback` become tri-state and fail
    closed.
  - `Resource<T>` and `ResourceView` (§3.4). Every screen W6 names moves to
    it first: sessions, pending items, proximity, notice opening.
  - The parked-alert and offline copy follow the phase (A7: "fuera de casa"
    shown at home).
  - The Loki wipe closes its connection before deleting.
- **Entry.** R0.
- **Exit.**
  - The UI-map `populated-fast-server` captures equal the latency captures
    (Home 5 detections, alert card, watch pill, privacy gate shown).
  - A new web E2E `startup.e2e.ts` runs the fake server at zero latency and
    asserts the consent gate.
  - A cold deep link to `/agenda` and `/cameras/3` opens the screen.
  - Unit tests cover every gate verdict: loading, failed, allow, deny.
  - 0 `EmptyState` outside `ResourceView`'s `ReadyEmpty`.
- **Risks.** A gate that now waits can feel slower on a slow server. The
  splash hint and the bounded timeout keep it honest. Measure cold start
  before and after on a production Android build.
- **Unblocks for the redesign.** The redesign designs five states (loading,
  ready, stale, failed, refused) once, as components.

### R2. Wire validation

- **Scope.**
  - `httpService` takes schemas (§3.5).
  - Schemas for the 85 unchecked call sites, entity by entity, beginning with
    guard episodes, camera, calendar, projects, reminders, proximity and
    settings.
  - Open server enums.
  - Translation maps replace template-literal keys over server data.
  - Contract tests per route against the backend fixtures.
- **Entry.** R0. Can run in parallel with R1.
- **Exit.**
  - 0 calls without a schema (the gate's counter).
  - 0 template-literal `t()` over server values.
  - The UI-map capture of the episode with subject `household` shows a
    translated label.
- **Risks.** A schema stricter than the server refuses real answers.
  Mitigation: build each schema from the recorded fixtures, use `.catch` on
  enums, and roll out with a log-only mode for one integration build before
  refusals become visible.

### R3. Layers: `platform/` and `entities/` (D1, D4)

- **Scope.**
  - `core/` splits:
    - `platform/` takes the infrastructure;
    - `entities/<domain>/` takes the 13 domain services, their types (from
      the 56 `core/types` files), interfaces (25), contracts (19), view-cache
      projections and optimistic lenses.
  - The barrels `core/types`, `core/interfaces` and `core/contracts`
    disappear.
  - A codemod script (kept in `scripts/`, deleted after the phase) rewrites
    imports.
  - The gate learns the layer matrix of §3.1.
- **Entry.**
  - R2 for the entity being moved, so its schema is the type source.
  - The open frontend branches that touch that entity are merged or dropped
    (D4).
- **Exit.**
  - `core/` is gone.
  - 0 matrix violations and 0 deep imports.
  - `AGENTS.md` rules 3, 4, 5 and 12 rewritten for the new homes.
- **Risks.** It is the largest diff. One entity per commit, mechanical only,
  with `tsc`, tests and the bundle probe on each.

### R4. No cycles: `widgets/`

- **Scope.**
  - `widgets/camera-view` (live view, snapshot, tamper evidence),
    `widgets/response-card` and `widgets/call-surface` where 2+ features use
    them.
  - Environment matching moves to `entities/guard`.
  - `home`'s 9 feature imports are reviewed. Home sections that render
    another feature's UI become widgets.
- **Entry.** R3 for the entities involved.
- **Exit.**
  - 0 file SCCs and 0 slice SCCs.
  - The feature-to-feature edge count is recorded and only shrinks.

### R5. Tokens and breakpoints (redesign foundation)

- **Scope.**
  - `shared/theme/tokens.ts` with the spec's values (landed in Phase 1) +
    `gen-tokens.ts` + `check-tokens` (§3.6).
  - Spacing, size, radius, type-role and elevation scales from `tokens.ts`.
  - One breakpoint set for CSS and JS.
  - `useWindowDimensions` leaves the features.
  - Lint bans hex, `rgb(`, arbitrary values and default-palette classes in
    `src/**/*.tsx`. The selector form is already used for the type scale;
    `eslint-plugin-better-tailwindcss`'s `no-restricted-classes` and
    `no-unknown-classes` are the packaged alternative
    ([better-tailwindcss](https://github.com/schoero/eslint-plugin-better-tailwindcss/blob/main/docs/rules/no-restricted-classes.md)).
- **Entry.** R0. Independent of R3 and R4.
- **Exit.**
  - All of these at 0: hex and rgb literals (illustrations moved to tokens),
    arbitrary values, `useWindowDimensions` in features.
  - The UI-map truncation count on `phone` and `tablet-portrait` lower than
    the R0 baseline.
- **Unblocks for the redesign.** A palette, spacing or breakpoint change is
  one edit in `tokens.ts`.

### R6. Design system completion

R6 is not done on today's UI: it becomes S2 of the implementation order, the
26 components of spec §4 built once on the new tokens.

- **Scope.** The primitives of §3.7. The 104 feature `Pressable`s move to
  `Pressable` (`PressableSurface`), `Row` or `Button`. `ActivityIndicator` and `Switch`
  leave the features. Accessibility props become required in the primitive
  types. `ui-lab` becomes the catalogue, with visual baselines per primitive.
- **Entry.** R5.
- **Exit.**
  - 0 raw interaction primitives in features.
  - Every primitive has a baseline at 3 widths × 2 themes.
  - The UI-map small-target count is 0 on touch viewports.

### R7. Hotspot decomposition

R7 is not done on today's UI: in S3 each hotspot is replaced by its rebuilt
screen, within the same budgets.

- **Scope.** The hotspot list of §2.1, worst first:
  - `camera-detail-screen.tsx`, `camera-form.tsx`, `camera-live-stage.tsx`;
  - `module-card.tsx`, `episode-card.tsx`;
  - `projects-screen.tsx`, `agenda-screen.tsx`;
  - `notification-thread-row.tsx`;
  - `voice.service.ts` (1,098 lines, into a call-state reducer + transports);
  - `use-face-capture.ts`.

  The pattern: a screen lays out sections. Each section owns its hook. The
  model holds the pure decisions, which get unit tests. A component with more
  than 10 props gets slots or composition. Manual `useMemo`/`useCallback`
  goes where the compiler covers it.
- **Entry.** R1 (so the sections read `Resource<T>`) and R6 for the screens
  that will be restyled.
- **Exit.**
  - No function above complexity 20 or 150 lines.
  - The ESLint suppression file shrinks by the counts these files held.
  - The UI map for each screen is unchanged or better.
- **Risks.** Behaviour drift in the camera and call flows. Each split lands
  with component tests (R8) before the move.

### R8. Test pyramid

- **Scope.**
  - A render-level component test harness (D2). The first choice is bun +
    happy-dom + react-native-web + Testing Library, because the web export
    already renders the whole app under react-native-web and the suite stays
    on one runner. If the spike cannot render the primitives, the fallback is
    jest-expo + React Native Testing Library, the officially supported path
    ([Expo unit testing](https://docs.expo.dev/develop/unit-testing/)). The
    14 source-text tests are rewritten on it and the pattern is banned.
  - Navigation tests with `expo-router/testing-library` `renderRouter`
    (Back with a menu open, deep links, the checklist route)
    ([Expo Router testing](https://docs.expo.dev/router/reference/testing/)).
  - The UI-map harness merges (D9). Its DOM checks (truncated, overlapping,
    small targets, offscreen, horizontal overflow) become a gate per screen
    and viewport, ratcheted from the R0 numbers.
  - Visual baselines extend to every primitive and to the Home and Agenda
    states.
  - A WebKit project in the E2E config, because Tauri on Linux is WebKitGTK.
  - Maestro smoke flows on the emulator (D3): welcome to Home, camera live,
    call answer, permission explain-first
    ([Expo E2E on EAS](https://docs.expo.dev/build-reference/e2e-tests)).
  - A coverage ratchet per directory (`bun test --coverage`), thresholds that
    only rise.
- **Entry.** R0. The harness spike can start at once. The layout gate needs
  R5 to be meaningful.
- **Exit.**
  - Every `shared/ui` primitive and every feature screen has at least one
    render test.
  - The layout audit, WebKit and Maestro run in the integration build.
  - The 40 web and 25 Android findings each have a test or an explicit
    "manual only" mark in a tracking list.

### R9. Performance and startup

- **Scope.**
  - Analyse the bundle with Expo Atlas
    ([analyzing bundles](https://docs.expo.dev/guides/analyzing-bundles/))
    and set a target budget.
  - Load call and camera media code (`livekit-client`, WebCodecs player) only
    when needed.
  - Measure Expo Router's async routes for the web export before adopting
    them.
  - Remove manual memoization the compiler covers.
  - Startup marks (`first-frame-from-cache`, `ready`) traced in production
    builds, with the cold-start target recorded.
- **Entry.** R0 (budget). Anytime after that.
- **Exit.** The entry chunk is below the R0 budget by the target the owner
  sets, and the startup marks are recorded on the reference Android device.

### R10. Documentation shape

- **Scope.**
  - `AGENTS.md` keeps the rules (the 36 of `frontend-rules-final.md`) and the
    commands, and drops the narrative it holds today (993 lines, part of it
    in Spanish).
  - `CONTEXT.md` (4,980 lines) splits into one `CONTEXT.md` per slice
    (`features/<name>`, `entities/<domain>`, `platform/<module>`), as the
    backend keeps one per unit.
  - The root file keeps the cross-cutting history.
- **Entry.** After R3, so the new homes exist. It can be done per slice as
  each one moves.

## 5. Order and parallelism

Superseded. The order is "Implementation order with the redesign" in
`frontend-rules-final.md` (steps S0–S4), which maps every phase above onto
one programme with the redesign. Two of this plan's reasons still hold
there: R1 and R2 close trust bugs (privacy fail-open, lost answers, raw keys)
before a screen is rebuilt, and R3/R4 wait for the open branches (D4).

## 6. What not to change

- **The local-first paint model** and its pieces: MMKV first frame,
  WatermelonDB projection, the coordinator's projection registry, keyset
  paging, optimistic intents.
- **The sync engine's algorithms**: creation-only `Synchronize`, audit
  cursors, grant scopes. Move them; do not redesign them.
- **The WatermelonDB schema and migrations.** No local reset as a side effect
  of a move.
- **The networking trust model**: pairing proofs, pinned CA, Rust-owned trust
  keys, CSP, client identity headers.
- **The capability, role-access and module contract tests** against the
  backend headers.
- **The i18n engine and typed keys, React Compiler on, Expo Router, Uniwind,
  bun.** Do not add TanStack Query, Redux or a state-machine library. The
  data owners of §3.2 and an explicit union in §3.3 cover the need.
- **The comment rule, kebab-case names, the icon registry, Nitro module
  boundaries and the Tauri commands.**
- **No visual change outside the redesign's steps.** Moves (R3, R4) and
  gates (R0) change no pixel. Visual change comes only from the spec's
  tokens and components and the screens S3 rebuilds on them.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Moves conflict with about 30 open frontend worktrees | D4. One domain at a time, announced. Codemod for imports |
| Ratchet gates slow down feature work | Baselines: only new debt fails. Budgets chosen above today's median |
| A stricter gate or schema breaks working flows | Log-only rollout for schemas. Gates proved on fixtures. UI-map before and after |
| Component test runner friction on SDK 57 | Spike first (D2); fallback documented |
| A long freeze before the redesign | None: one programme. S1's tracks and S2's first components run in parallel (`frontend-rules-final.md`) |

## 8. Open decisions

D1–D9 from §0 (D7 superseded). Also:

- The cold-start target and the bundle target for R9.
- Whether the Owner wants the redesign to bring a design tool. A DTCG
  export would move R5 to Style Dictionary.

## Appendix A. How the numbers were measured

All of the following ran on `09cf103`. The scripts are in the session's
scratchpad and are not part of this change. R0 turns them into gates.

- Size: `wc -l` over `git ls-files src`.
- Complexity and length: ESLint with the repo config plus `complexity`,
  `max-lines-per-function`, `max-statements`, `max-depth`, `max-params` and
  `react/jsx-max-depth` set to 0, JSON output, aggregated per function.
- Import graph: a TypeScript script using `ts.createSourceFile`, resolving
  `@/` and relative imports with the same suffix order as
  `check-boundaries.ts`. It runs Tarjan SCCs at file and slice level and
  counts cross-feature edges, deep imports and barrel consumers.
- Duplication: `jscpd@4 --min-tokens 70`, i18n excluded.
- Dead code: `knip@5` with routes, scripts and tests as entries.
  Platform-suffixed files are false positives.
- Churn: `git log --since=2026-10-03 --name-only`.
- Layout: `uiux-map/web/manifest.json` (1,740 captures, `auto` checks).
- Findings: the five reports listed in §2.7 and `docs/ui-map/inventory.md` on
  `test/ui-map`.
- Formatting: `prettier --list-different "src/**/*.{ts,tsx}"`.

## Appendix B. Sources

- Feature-Sliced Design: [layers](https://feature-sliced.design/docs/reference/layers),
  [public API](https://feature-sliced.design/docs/reference/public-api),
  [with a file router](https://feature-sliced.design/docs/guides/tech/with-nextjs),
  [Steiger](https://github.com/feature-sliced/steiger).
- [Bulletproof React project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md).
- Expo: [Router core concepts](https://docs.expo.dev/router/basics/core-concepts/),
  [authentication](https://docs.expo.dev/router/advanced/authentication/),
  [unit testing](https://docs.expo.dev/develop/unit-testing/),
  [Router testing](https://docs.expo.dev/router/reference/testing/),
  [E2E on EAS](https://docs.expo.dev/build-reference/e2e-tests),
  [React Compiler](https://docs.expo.dev/guides/react-compiler/),
  [bundle analysis](https://docs.expo.dev/guides/analyzing-bundles/).
- React: [choosing the state structure](https://react.dev/learn/choosing-the-state-structure),
  [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore),
  [eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks).
- State: [TkDodo, Working with Zustand](https://tkdodo.eu/blog/working-with-zustand),
  [WatermelonDB components](https://watermelondb.dev/docs/Components).
- Tokens: [DTCG Format Module 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/),
  [Style Dictionary DTCG](https://styledictionary.com/info/dtcg/),
  [Tailwind v4 theme](https://tailwindcss.com/docs/theme),
  [Uniwind themes](https://docs.uniwind.dev/theming/custom-themes),
  [better-tailwindcss](https://github.com/schoero/eslint-plugin-better-tailwindcss),
  [tailwind-variants comparison](https://www.tailwind-variants.org/docs/comparison).
- Gates: [ESLint bulk suppressions](https://eslint.org/docs/latest/use/suppressions),
  [knip](https://knip.dev/), [jscpd](https://github.com/kucherenko/jscpd),
  [size-limit](https://github.com/ai/size-limit),
  [dependency-cruiser](https://github.com/sverweij/dependency-cruiser).
- Accessibility and i18n: [React Native accessibility](https://reactnative.dev/docs/accessibility),
  [eslint-plugin-react-native-a11y](https://github.com/FormidableLabs/eslint-plugin-react-native-a11y),
  [i18next no-literal-string](https://github.com/edvardchen/eslint-plugin-i18next/blob/HEAD/docs/rules/no-literal-string.md).
- Lists: [FlashList v2](https://shopify.engineering/flashlist-v2),
  [Legend List](https://legendapp.com/open-source/list/v3/api/).
