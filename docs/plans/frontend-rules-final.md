# Frontend rules: final set

Status: final, 2026-10-20, approved by the owner ("with the recommendations"),
including his additional requirements. The rules, the refactor and the
redesign are **one programme** in which nothing is built twice (owner
decision, 2026-10-20; spec §15 A1): "Implementation order with the redesign"
at the end is its order, and it replaces the plan's §5 and decision D7. Phase
1 of the redesign lands S0's gates (R0) and `shared/theme/tokens.ts` with the
spec's values; everything else is still to be built. It replaces the F1–F33
proposal (`frontend-rules-proposal.md`). The text that goes into `AGENTS.md`
is `AGENTS-rules-section.md`.

Where this document and the redesign spec disagree, the spec wins (owner
decision, spec §15 A1–A9), and the values are the ones `tokens.ts` holds.

Companion documents:

- `../references.md`: the sources, cited here as `[key]`;
- `error-messages-spec.md`: rule 20 in full;
- `frontend-refactor-plan.md`: the measured state and phases R0–R10;
- `redesign-spec.md`: the redesign spec, cited as "spec §n", whose values
  these rules enforce;
- `../../src/shared/theme/tokens.ts` and `../../src/shared/theme/effects.ts`:
  the values and the performance tier.

Numbers were measured on `09cf103` unless they name another source. They are
the survey that motivated each rule. The counts the gates enforce are the R0
baselines committed in `scripts/lib/quality-baseline.txt`,
`eslint-suppressions.json`, `scripts/lib/boundaries-baseline.txt` and
`scripts/lib/bundle-baseline.txt`; where a count below says `09cf103`, the R0
baseline replaces it.

## How to read a rule

Each rule has five parts:

- **Rule** is what is required.
- **Why** is the measured problem or the principle behind it.
- **Sources** are keys in `docs/references.md`.
- **Gate** is the exact command, what it counts, where the baseline lives and
  which way the baseline moves.
- **Phase** is when the gate turns on (the R0–R10 phases of the refactor
  plan) and when its count reaches 0. Step S0–S4 of the implementation order
  is given where it matters.

A rule is **measured** when a gate fails on it. It is **reviewed** when no
gate can see it yet, and the phase that will measure it is named.

## The ratchet

This is the backend's model (`backend/AGENTS.md` rules 5, 19 and 20,
`scripts/lib/tidy-baseline.txt`), applied to the frontend.

- Every counter has a committed baseline.
- A count above its baseline fails.
- A count below its baseline also fails until the baseline is lowered in the
  same change, so a fix cannot be undone silently.
- A baseline is never raised. A manual memoization that rule 31 allows is
  listed in `memo-exceptions.txt`, which the counter skips, so it raises
  nothing.
- The baseline files are:
  - `scripts/lib/quality-baseline.txt`: one `metric count` per line plus a
    `scanned-files` line, read by `scripts/check-quality.ts`;
  - `scripts/lib/boundaries-baseline.txt`: the cycle, deep-import and
    route-shape counts of `scripts/check-boundaries.ts`;
  - the Prettier ratchet's list of files not yet formatted (rule 33);
  - `eslint-suppressions.json`: ESLint's bulk suppressions [eslint-suppressions],
    written once by `eslint --suppress-all` at R0 and only shrunk by
    `--prune-suppressions`. A fixed violation makes ESLint exit non-zero until
    it is pruned;
  - `scripts/lib/bundle-baseline.txt`: entry chunk bytes, `dist/` bytes, and
    the packages that must stay out of the entry chunk;
  - `scripts/lib/layout-baseline.txt`: the UI-map DOM checks, per screen and
    viewport;
  - `scripts/lib/perf-baseline.txt`: cold start and frame statistics on the
    reference Android device;
  - `scripts/lib/memo-exceptions.txt`: the measured manual memoizations
    (rule 31).

`bun run verify` runs every gate except the layout audit, the Android
performance run and Maestro. The integration build runs those, the way the
backend's full build alone runs clang-tidy. The layout and performance
baselines and `check:tokens` do not exist yet: the rules that rely on them are
*reviewed* until the phase their rule names.

---

## A. How the rules work

### 1. Measured, not reviewed

**Rule.**
- Every rule names its gate.
- A new rule enters `AGENTS.md` only together with its gate, or marked
  *reviewed* with the phase that will measure it.
- A gate is proved by a unit test that feeds it a violating fixture
  (`tests/unit/scripts/`).
- A gate that cannot run fails. It never passes silently. This is the
  backend's "a check that cannot be run is not a check that passed".

**Why.** The 2026-10-03 plan's measured gates (comments, boundaries, lint)
still hold at 0. What grew without a gate grew, tripling the code in 17 days
(plan §1).

**Sources.** None. This is a house rule.

**Gate.** `bun run verify`. Each `scripts/check-*.ts` has a fixture test in
`tests/unit/scripts/`, and `check-quality` fails when a counter's scan sees
fewer files than the baseline records (`scanned-files` line).

**Phase.** R0 (S0).

### 2. Lint policy: one config, no inline switches, every rule an error

**Rule.**
- **Respect how the code is written.** A lint rule is adopted only when it
  encodes a decision of these rules or an authority in `references.md`.
  Adopting a whole third-party preset is not allowed.
- **`eslint.config.js` is the only place lint is configured.** Inline
  configuration is inert: `linterOptions.noInlineConfig: true`,
  `reportUnusedDisableDirectives: 'error'` and
  `reportUnusedInlineConfigs: 'error'` [eslint-config]. An `eslint-disable`
  comment is also a comment, which rule 3 forbids.
- **A rule is turned off only individually.** It is turned off by name, for
  the paths that need it (`files`/`ignores`), in `eslint.config.js`, with one
  row in `CONTEXT.md` › "Lint exceptions": rule, paths, reason, the source or
  measurement behind it, and the date. Never `'off'` for every rule, never a
  spread preset turned off wholesale, never a rule disabled for all of `src/`
  "for now".
- **Every adopted rule is `'error'`.** There are no warnings: the warn-level
  rules that `eslint-config-expo` sets are promoted to `error` in the config,
  and the run uses `--max-warnings 0`.
- **Legacy debt goes into the bulk suppressions file** at S0
  (`eslint --suppress-all`), never into the config. A violation in new code
  fails at once. Suppressed counts only shrink (`--prune-suppressions`).
- **The adopted set** is the table "The lint set" at the end of this
  document. Adding a plugin or a rule is a rules change with its source.

**Why.**
- The owner's requirement. The existing exception (`react-hooks/immutability`
  off, a Reanimated false positive) shows the pattern done right: in the
  config, named, explained.
- Inline switches are invisible debt. Bulk suppressions are visible and
  counted.
- 641 files would need a reformat before a stylistic rule could pass, which
  is why formatting belongs to Prettier and not to lint (rule 33).

**Sources.** [eslint-config], [eslint-rules-config], [eslint-suppressions],
[tseslint-configs], [react-hooks-lint].

**Gate.**
- `bun run lint` runs `eslint --max-warnings 0`. The suppressions file is
  applied, and unpruned suppressions fail.
- `scripts/check-lint-policy.ts`, part of `check:boundaries`:
  - It loads the resolved config for one file per path family (ESLint's
    `calculateConfigForFile`).
  - It lists every rule whose severity is `off`/`0` after the adopted set's
    declaration, and compares the list with the rows of "Lint exceptions" in
    `CONTEXT.md`.
  - It fails on an exception without a row, a row without an exception, any
    `warn` severity, or `noInlineConfig` not set.
  - **Baseline:** the rows of `CONTEXT.md` › "Lint exceptions" (at R0:
    `react-hooks/immutability`, and `no-console` for
    `src/core/services/log.ts` and `scripts/`). The immutability exception
    leaves at S1 (rule 26).

**Phase.** R0 (S0), together with the suppressions file.

### 3. No comments in code *(kept)*

**Rule.** Today's §10b, without exception:
- no comment of any kind in any tracked file;
- no lint, type or format suppressions (`eslint-disable`,
  `@ts-expect-error`, `@ts-ignore`, `prettier-ignore`);
- the "why" goes to `CONTEXT.md`.

The suppressions file, the baselines and `CONTEXT.md` are data and
documentation, not comments.

**Why.** It is the owner's rule for the whole repository (`backend/AGENTS.md`
rule 20).

**Gate.** `bun run check:comments` (`scripts/check-comments.ts`).
**Baseline:** 0 (1,749 files).

**Phase.** In force today.

### 4. Sources settle questions

**Rule.**
- Before deciding a question that `docs/references.md` covers (API behaviour,
  accessibility thresholds, platform idioms, wording, motion, performance),
  read the source it names and follow its "How to settle a question" order.
- A decision recorded in `CONTEXT.md` cites the source key or the
  measurement.
- A new library is adopted only with its official doc added to
  `references.md`.

**Why.** The owner's requirement. Many of today's findings repeat what a
primary source already says:
- target size [wcag-target];
- failures shown as empty [nng-empty];
- raw codes [nng-errors].

**Sources.** `docs/references.md` itself.

**Gate.** `scripts/check-references.ts`, part of `check:boundaries`. Every
`[key]` cited in `AGENTS.md`, `CONTEXT.md` files and `docs/plans/*.md` must
exist in `references.md`, and every reference row must have a URL. A family
written with `*` in prose (`[nng-*]`) must match at least one key.
*Reviewed:* whether the source was actually read.

**Phase.** R0 (S0).

### 5. Every agent writes to these rules

**Rule.** A prompt that delegates frontend work:
- states rule 3 (no comments), rule 2 (no inline lint switches), rule 32 (the
  budgets) and rule 20 (no codes on screen);
- points the agent to `AGENTS.md` and `docs/references.md`.

**Why.** Agents produce most of the code. The backend has the same rule.

**Gate.** Reviewed. The gates above catch the result.

**Phase.** At once.

---

## B. Structure and one home for everything

### 6. Layers and the direction of imports

**Rule.**
- `src/` has six layers: `app`, `features`, `widgets`, `entities`,
  `platform`, `shared` (FSD-lite, plan §3.1).
- A unit imports only the layers below it, following the plan's matrix:
  - `app` composes;
  - `features` are screen-level capabilities;
  - `widgets` are entity UI reused by 2+ features;
  - `entities` own one domain's data (api + schema, model, store,
    projection, optimistic lens);
  - `platform` is infrastructure without a domain;
  - `shared` is the design system (`ui/`, `layout/`, `theme/`) plus generic
    hooks and libraries.
- Nothing in `platform` or `shared` knows a domain.

**Why.** `core/` mixes infrastructure with 13 domain services and about 100
type, interface and contract files. A domain change touches 4–5 folders.

**Sources.** [fsd-overview], [fsd-layers].

**Gate.** `bun run check:boundaries` (v2). **Baseline:** its five rules at 0
from R0. The layer matrix is *reviewed* until R3 creates the layers; each
moved domain is at 0 from the moment it moves.

**Phase.** R0 for the mechanism, R3 per domain (S3).

### 7. One public API per slice; no deep imports; no `export *`

**Rule.**
- Every slice (`features/x`, `widgets/x`, `entities/x`, `platform/x`) is
  reached only through its `index.ts`.
- An index lists named exports.
- `export *` is not allowed anywhere in `src/`. The `shared/constants`
  barrel convention of today's §2 ends.

**Why.**
- 71 imports go around a service's barrel into 33 internal files.
- 116 `export *` lines hide who exports what. They also defeat the
  duplicate-name check of rule 11.

**Sources.** [fsd-public-api].

**Gate.**
- `check:boundaries` rule `deep-import` (71 at `09cf103`), ratcheted against
  `scripts/lib/boundaries-baseline.txt` → 0.
- The lint selector `ExportAllDeclaration` in `src/**` (116 at `09cf103`) →
  0, through bulk suppressions.

**Phase.** `deep-import` is measured from R0. `export *` is *reviewed* until
R3 adds its selector, when the barrels are rewritten. Both reach 0 with R3.

### 8. No import cycles

**Rule.** No cycle at file level and none between slices. Type-only imports
do not count.

**Why.** `features/{voice,response,security,cameras}` form one 21-file
strongly connected component.

**Sources.** [fsd-layers].

**Gate.** `check:boundaries` cycle detection (Tarjan SCC over runtime edges,
file and slice level), ratcheted against `scripts/lib/boundaries-baseline.txt`.
**Baseline:** 1 file SCC and 1 slice SCC at `09cf103` → 0.

**Phase.** R0 gate, 0 at R4 (S3).

### 9. Routes are one line; layouts compose only

**Rule.**
- A route file under `src/app/` is a single re-export of a feature screen.
- A `_layout.tsx` renders providers, gates, the Stack/Tabs and
  `<AppRuntime />`. It has no effect, no redirect logic and no domain hook.
- Background controllers (push, call push, beacons, tamper keeper, call lock)
  are entries in `platform/runtime`, each with its start phase and the
  capability it needs.

**Why.** The two layouts start six controllers through hooks, so process-wide
ordering hides in JSX.

**Sources.** [expo-router].

**Gate.** `check:boundaries` rule `route-shape`: a route file under
`src/app/**` that is not a one-line re-export, ratcheted against
`scripts/lib/boundaries-baseline.txt`. The layout half (6 hook calls in
layouts at `09cf103` → 0) is *reviewed* until R1 builds `<AppRuntime />`.

**Phase.** R0 gate for routes, 0 at R1 (S1) for layouts.

### 10. One home for each kind of thing

**Rule.** Every kind of artifact has exactly one home. Nothing of that kind
exists anywhere else.

| Kind | The one home |
|---|---|
| Design values (colour roles, Aura tones, elevation, illustration colours, type steps and roles, space, radius, size, motion, material, breakpoints, layout) | `shared/theme/tokens.ts` (rule 21) |
| The performance tier and the reduce-motion/transparency flags | `shared/theme/effects.ts` (`useEffects`, rule 26) |
| Icons | the `ICONS` registry, `shared/ui/icon` |
| User-facing text | the `es`/`en` dictionaries (`platform/i18n/locales`) |
| Error codes → words | `platform/errors` (rule 20) |
| Date, time, number, duration formatting | the formatter in `shared/lib/format` (`useDateFormatter` today) |
| Platform flags | `IS_*` in `platform/device` (`common.constant.ts` today) |
| Storage keys, view-cache keys | one constants module in `platform/storage` and `platform/view-cache` |
| Route paths | `app/` files and one `routes` constant per feature index |
| HTTP calls and their schemas | the entity's `api/` (rule 13) |
| Domain types | `z.infer` of the entity's schema (rule 13); never a second hand-written copy |
| Server-mirrored vocabularies (roles, capabilities, modules, error codes, tables) | the generated or contract-tested module in the owning entity or `platform` (rule 36) |
| Interactive and state UI | the 26 components of `shared/ui` (rule 24) |
| Animation values | `tokens.motion` + `springs` (rule 26) |
| Logging | `platform/log` (rule 33) |

Inside a slice the segment names say the kind (rule 12). A `*.constant.ts`,
`*.type.ts` or `*.schema.ts` file exists only in its slice's matching
segment.

**Why.** The owner's requirement. Today:
- 59 HEX constants are mirrored by hand to 62 OKLCH variables;
- 80 types are written twice (`satisfies z.ZodType<T>`);
- the user is held in two places;
- copy names one thing three ways (web finding W19).

**Sources.** [react-state] (one source per datum), [fsd-slices].

**Gate.**
- `check:boundaries` rule `kind-home`: a suffix family or a forbidden import
  found outside its home fails (for example `lucide-react-native` outside the
  registry, `date-fns`/`Intl.DateTimeFormat` outside the formatter).
- `check-quality` counters:
  - `type-written-twice` (`satisfies z.ZodType`): 80 at `09cf103` → 0;
  - `hex-literal`: its R0 baseline → 0 (rule 21).

**Phase.** `hex-literal` and the icon and formatter import bans are measured
from R0. `kind-home` and `type-written-twice` are *reviewed* until R3 and R2,
which build them. The counters reach 0 at R2/R3 (types) and S3 (values).

### 11. No duplication; shared code is earned; no dead code

**Rule.**
- **No copy-paste.** A duplicated block, helper, constant, type or component
  is merged into its one home (rule 10) in the change that finds it.
- **One exported name, one meaning.** Two modules never export the same
  function or constant name, except a `.native`/`.web` pair, which must
  export the same names (rule 28).
- **The 2+ consumer rule.** A module moves to `shared/` (outside `ui/`,
  `layout/` and `theme/`) or to `widgets/` only when two or more slices
  consume it. A module with one consumer lives in that consumer.
- **No dead code.** An unused file, export or dependency is deleted in the
  change that makes it unused. A replaced component is deleted with its last
  consumer.

**Why.**
- The owner's requirement.
- Duplication is low today (0.5% by jscpd at 70 tokens). The ratchet keeps it
  low through a redesign that rewrites most components.
- Five exported names are duplicated outside the locales and platform pairs:
  `crossesMidnight`, `ownerName`, `refusalOf`, `stepsOf`, `withMode`.

**Sources.** [jscpd], [knip], [sonarjs], [fsd-public-api].

**Gate.** `bun run check:quality` counters:
- `duplication-clones` and `duplication-lines`: jscpd 5.x pinned,
  `--min-tokens 50 --mode mild`, i18n dictionaries and generated files
  ignored, `--reporters json`. The R0 run sets the baseline, and it only goes
  down.
- `duplicate-export-name`: an AST scan of exported identifiers, excluding
  `.native`/`.web`/`.ios` siblings and the locales. 5 → 0.
- `unused-file`, `unused-export`, `unused-dependency`: knip 5, with
  routes, scripts, tests and every platform-suffixed file as entries. R0
  measures the false positives first; the counts then only fall.
- Lint `sonarjs/no-identical-functions` (rule 2's set) catches the small
  copies below jscpd's token floor.
- `check:boundaries` rule 5 (2+ consumers in `shared/`), extended to
  `widgets/` at R4. **Baseline:** 0.

**Phase.** `sonarjs/no-identical-functions` and rule 5 are measured from R0.
The jscpd, knip and `duplicate-export-name` counters are *reviewed* until R3,
when the moves that would churn them are done; knip turns into a ratchet once
its false-positive list is configured.

### 12. One interior per slice; file naming

**Rule.**
- A slice's children come from a fixed list. A segment exists only when it
  has a file. There is never `constants.ts` beside `constants/`.

  | Layer | Allowed children |
  |---|---|
  | feature | `screens/`, `components/`, `hooks/`, `model/`, `constants/`, `stores/`, plus `index.ts` and `CONTEXT.md` |
  | widget | `ui/`, `model/`, `index.ts` |
  | entity | `api/`, `model/`, `store/`, `index.ts` |
  | platform module | free inside, behind `index.ts` |

- **Files are kebab-case**, and exports are PascalCase or camelCase.
- The suffix families are `.constant`, `.type`, `.schema`, `.store`,
  `.projection`, `.native`, `.web` and `.ios`.
- Nitro specs are the one exception: `modules/*/src/{Name}.nitro.ts`.

**Why.** Five of 25 features use a `constants.ts` file and the rest a folder.
`services/` appears in 13 features while their data lives in `core/`.

**Sources.** [fsd-slices].

**Gate.**
- `check:boundaries` rule `slice-shape`: 5 → 0.
- `check:boundaries` rule `file-name`, the regex
  `^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z]+)*\.(ts|tsx)$`.

**Phase.** *Reviewed* until R3, which adds both rules with the layers; 0 per
domain at R3.

---

## C. Data, state and trust

### 13. Wire data is validated, never cast

**Rule.**
- Every HTTP answer, socket frame and stored JSON is parsed by a zod schema
  at the boundary.
- `httpService` takes a schema and has no type parameter.
- Domain types are `z.infer` of the schema.
- A server enum is open: `z.enum([...]).catch('unknown')`, and `unknown` is a
  rendered state, never a key.
- A new schema ships in log-only mode for one integration build before its
  refusals become visible (plan R2).

**Why.**
- 85 of 164 HTTP call sites run no schema.
- The raw key `screens.security.episodes.subject.household` reached the
  screen (W5).

**Sources.** [zod], [ts-narrowing].

**Gate.**
- `check-quality` counter `http-unchecked` (85 at `09cf103`, the R0 baseline
  replaces it) → 0.
- Lint: a type argument on `httpService.*` is banned, and
  `type-written-twice` (80 at `09cf103`) → 0. Both are *reviewed* until R2
  gives `httpService` its schema argument.
- `tests/contracts/http-contract.test.ts` validates every route an entity
  calls against `backend/scripts/fixtures/http`. Its route list is generated
  from the entities' `api/`.

**Phase.** R0 for the counter. It reaches 0 per domain at R2, before that
domain's screens are rebuilt (S3).

### 14. Gates fail closed and are tri-state

**Rule.**
- Whatever decides access, consent, privacy or a route returns
  `pending | allow | deny`.
- `pending` renders the splash or a skeleton, never the protected children.
- A failed, missing or unknown answer is `deny`, with a retry.
- An unknown role holds nothing.

**Why.**
- `PrivacyGate` ran `if (!me || !needsConsent(me)) return children;`: the
  consent screen never showed (W1).
- Cold deep links were refused (W2).
- An unknown role got the compose button (W27).

**Sources.** [expo-auth], [ts-narrowing].

**Gate.**
- `check-quality` lists the gate modules (`*-gate.tsx`, `route-access.ts`,
  `capabilities.ts`) and fails when one lacks a unit test covering
  loading/failed/allow/deny.
- The web E2E `startup.e2e.ts` runs the fake server at zero latency.

**Phase.** *Reviewed* until R1 (S1) builds both.

### 15. One session state machine owns the session lifecycle

**Rule.**
- `platform/session` holds `AppPhase`:
  `booting → restoring → signed-out | establishing → ready → ending`.
- Its transitions are pure and unit-tested.
- Only this module starts and stops the context, module and view-cache
  engines and sets the device credential and `viewCacheService.setUserId`.
- Entering `ready` makes every mounted remote resource reload.

**Why.** `establish`, `restore` and `performClear` mutate eight singletons in
hand-written orders. Answers fetched during start-up were thrown away (W1:
Home showed 0 detections, not 5).

**Sources.** [react-state].

**Gate.** `check:boundaries` rule `session-owner`: only `platform/session`
may hold those calls.

**Phase.** *Reviewed* until R1 (S1) creates `platform/session` and the rule.

### 16. A failure is never shown as a fact

**Rule.**
- A remote read is a `Resource<T>` (`loading | ready | stale | failed |
  refused`) rendered by `ResourceView`.
- `ResourceView` produces a `ReadyEmpty` token, and `Empty` requires it, so an
  empty state for a loading or failed read does not compile.
- `stale` is shown with the time of the data.
- Loading in a list is a skeleton, never a spinner (spec §5.4).

**Why.** About 14 findings, for example "Sin sesiones abiertas" after a
failure (W6).

**Sources.** [nng-empty], [nng-skeleton], [ts-narrowing].

**Gate.**
- By type (`ReadyEmpty`).
- `check-quality` counter `empty-outside-resource-view` (42 at `09cf103`) →
  0.
- Lint bans `ActivityIndicator` from `react-native` in features (rule 24),
  with its R0 bulk suppressions → 0.

**Phase.** The lint ban is measured from R0. The type and the counter are
*reviewed* until R1 builds `Resource<T>`, and S2 builds `ResourceView`. The
count falls per screen at S3.

### 17. One owner per datum

**Rule.**

| Data | Owner |
|---|---|
| Synced rows | WatermelonDB, written by the sync engine and the entity store |
| First frames | the view cache |
| Pending mutations | the optimistic registry |
| Session, user, context | `AppPhase` |
| Ephemeral UI | small zustand stores in the slice that owns the UI, exported as hooks with atomic selectors |

- Stores import no service and hold no server data.
- No module-level `Map`/`Set` caches server data outside `platform`.

**Why.**
- 61 exported singletons.
- 68 `getState()` calls outside stores.
- 17 module-level caches.
- The user is held twice.

**Sources.** [react-state].

**Gate.**
- `check:boundaries` rule `store-purity`.
- `check-quality` counters:
  - `module-cache`: 17 at `09cf103` → an audited list in `platform`;
  - `get-state-outside-store`: 68 at `09cf103` → shrink.

**Phase.** *Reviewed* until R1–R3, which add these with `platform/` and the
entity stores.

### 18. Mutations are single-flight, abandon-safe, and confirmed or undoable

**Rule.**
- Every user-started action goes through `runServiceAction`, `runOptimistic`
  or `useFormSubmit`:
  - it is ignored while pending;
  - it is ignored after its surface unmounts.
- A reversible action acts at once and offers Deshacer for 5 s.
- An irreversible or loud action asks through `Confirm`, whose button names
  the act, **before** any spinner (spec §5.5).
- Components and hooks never import `platform/http`.

**Why.**
- A double tap created two invitations (A14).
- An invitation stayed active after Back (R2-6).
- A destructive action spun before its confirmation (W7).

**Sources.** [nng-confirm], [hig-alerts], [m3-dialogs].

**Gate.**
- `no-restricted-imports` of the HTTP service (today `core/services/http`,
  then `platform/http`) outside `entities/*/api` and `platform` (21 files at
  `09cf103`), with its R0 bulk suppressions → 0.
- The action helpers have unit tests for double press and unmount.
- `Button`'s `busy` state is single-flight by construction.

**Phase.** R0 gate. The helpers land at S1, and the count falls at S3.

### 19. Local persistence and local-first paint *(kept)*

**Rule.** Today's §12 and §12b stay as written:
- one file per table and model;
- snake_case columns;
- epoch milliseconds;
- the server id as `id`;
- `@json` with sanitizers;
- a migration for every schema bump;
- screens paint from the view cache and never wait for WatermelonDB or an
  HTTP list;
- keyset paging.

The database is reached only from `platform/database`, `platform/sync`, the
projections and each entity's `store/`.

**Why.** It is the app's core contract with the backend: persisted local data
first, then live sync.

**Sources.** None. These are house rules (`backend/AGENTS.md` §18).

**Gate.**
- `check:boundaries` rule `database-access`, baseline 0 once restated.
- The startup trace of rule 30 records `first-frame-from-cache`.

**Phase.** *Reviewed* until R3 restates the rule for the new homes; the trace
comes with R9's measurements.

### 20. Errors are words the user can act on

**Rule.**
- The user never sees a backend or client error code, an HTTP status, an id
  or a raw server message.
- Every code (the 52 backend codes, the client and native codes and, with
  owner decision E1, every user-facing reason) maps through **one**
  map in `platform/errors` (today's `serviceErrorKey`) to an `errors.*` key.
  That key holds a short es/en message: what happened, then what to do,
  naming the object when it is known.
- An unknown code gets one friendly generic message, and on an access
  decision it is a `deny` (rule 14).
- Codes go only to `log.error` and telemetry.
- The surface (inline, toast with Reintentar, inline `Notice`, in-place
  failed state, full screen, alert) is chosen by the error module from the
  failure and its context, never by a screen (spec §5.8).
- Everything else, including the copy for the 30 most visible codes, is in
  `error-messages-spec.md`.

**Why.**
- The owner's requirement.
- 23 of 52 backend codes have no entry in the central map.
- Four modules read English server text to decide.
- One module (`media-access.ts`) shows server text to the user.

**Sources.** [nng-errors], [nng-hostile], [nng-forms], [nng-indicators],
[hig-alerts], [m3-snackbar], [ms-errors], [wcag-error-id],
[wcag-error-sugg], [wcag-status].

**Gate.** The G1–G8 gates of `error-messages-spec.md` §7:
- `tsc` exhaustiveness;
- the backend and native parity contract tests;
- `check-quality` `error-message-match`: 4 → 0;
- `ApiFailure` hiding the raw fields, plus a lint selector;
- the copy test;
- the UI-map `rawErrorText` check;
- surface component tests.

**Phase.** *Reviewed* until S1 (together with `ResourceView`, `Toast`,
`Notice` and `Field`). The counters reach 0 at S3.

---

## D. Interface

### 21. Design tokens have one source, with the redesign's values

**Rule.**
- `shared/theme/tokens.ts` is the only place a colour, space step, size,
  radius, type step or role, elevation, motion duration or spring, material
  value, breakpoint, layout width or illustration colour is written. It holds
  the redesign spec §3 as the prototype renders it, and this list names its
  groups; the numbers are read from the file, never copied out of it:
  - `color`: about 18 UI roles per theme (`bg`, `surface`, `fill`,
    `fill-press`, `line`, `text`, `text-2`, `text-3`, `ink`, `on-ink`,
    `accent`, `accent-fill`, `accent-soft`, `ok`, `ok-soft`, `attn`,
    `attn-soft`, `alert`, `alert-soft`, `scrim`), plus the glass hairlines
    (`glass`, `glass-line`, `glass-edge`), the skeleton fills (`skel`,
    `skel-2`) and the calendar event tints with their text (`ev1`…`ev4`,
    `ev1-text`…`ev4-text`). The text-safe value **is** the role: there are no
    `*-strong` twins, and a fill that cannot carry text is named as a fill
    (`accent-fill`);
  - `aura`: the six tones `calm`, `duty`, `attn`, `alert`, `off`, `listen`,
    three stops each per theme (fills only);
  - `elevation`: `card` and `float` per theme; `none` is content inside a
    card, separated by hairlines, and has no shadow token;
  - `illustration`: media, live dot, switch thumb, eye chip and Estela's
    palettes per theme;
  - `type`: six steps, `hero`, `title`, `headline`, `body`, `meta`,
    `caption` (36 … 12), each with its line height, weight, tracking and
    `maxScale` (rule 25); and `typeRoles`, the named component roles the
    prototype renders (`heroCompact`, `heroSecondary`, `section`,
    `rowTitle`, `rowMeta`, `button`, `buttonCompact`, `label`, `feed`,
    `chip`, `tab`, `key`);
  - `space`: seven steps, `4 · 8 · 12 · 16 · 24 · 32 · 48`;
  - `radius`: the named roles `key`, `sm`, `segInner`, `control`, `well`,
    `button`, `toast`, `media`, `dialog`, `card`, `status`, `sheet` and
    `full`, concentric where shapes nest;
  - `size`: targets, rows, icons and their stroke, wells, avatars, buttons,
    fields, chips, the switch, segments, the tab bar, the sheet grabber, dots
    and the hairline;
  - `motion`: the springs `snappy`, `gentle` and `playful`, the durations
    `fast` 120, `base` 200 and `slow` 300 ms, and the press scales;
  - `material`: the glass blur and saturation per surface (bar, control,
    sheet, palette);
  - `breakpoints` (rule 23) and `layout` (gutters, content and text widths,
    dialog, side sheet, palette and sidebar widths).
- `scripts/gen-tokens.ts` generates the theme block of `global.css` (OKLCH)
  and the JS constants, and Tailwind's default palette is removed
  (`--color-*: initial`).

**Why.**
- 59 HEX constants are mirrored by hand to 62 OKLCH variables per theme, with
  no test.
- There are 74 colour literals in components.
- One token edit must restyle the app (spec §3, A3 and A4).

**Sources.** [tailwind-theme], [uniwind], [dtcg], [wcag-contrast],
[wcag-non-text].

**Gate.**
- The lint selector bans HEX, `rgb(`, `hsl(` and `oklch(` literals in `src/`
  outside `shared/theme`, and `check-quality` `hex-literal` counts them (74
  at `09cf103`; the R0 baseline replaces it) → 0.
- `check-quality` `legacy-token-class` counts uses of today's colour class
  names (`background`, `foreground*`, `muted-foreground`, `card*`,
  `surface-secondary`, `border*`, `error-strong`, …) → 0. The legacy CSS
  block is deleted at 0.
- `bun run check:tokens` regenerates the outputs into a temporary folder and
  fails on any difference.
- A unit test computes every text and background pair in both themes:
  4.5:1 for text, 3:1 for icons, borders and focus.

**Phase.** The literal ban and both counters are measured from R0.
`tokens.ts` landed with the spec's values in Phase 1 (`539d76c`).
`check:tokens` and the contrast test are *reviewed* until the generator lands
(R5, S1). The legacy count reaches 0 at S4.

### 22. No arbitrary values, no raw palette, no inline sizes

**Rule.**
- There is no `-[…]` arbitrary utility, no default-palette class, no
  `text-xs…9xl`, no `rounded-[…]`, and no inline `style={{…}}` carrying a
  colour or a size.
- APIs that need numbers (Reanimated, SVG, insets) read `tokens`.

**Why.** There were 114 arbitrary values and 78 inline style objects at
`09cf103`. Each one is a value the redesign would have to hunt down.

**Sources.** [better-tailwind], [tailwind-theme].

**Gate.**
- `better-tailwindcss/no-restricted-classes` (arbitrary values, the palette,
  the old scale), `no-unknown-classes`, `no-conflicting-classes` and
  `no-duplicate-classes`, with `entryPoint: 'src/global.css'`.
- The `style={{` selector.
- The `check-quality` counters of arbitrary Tailwind values and `style={{`.
- **Baseline:** the R0 counts (114 and 78 at `09cf103`) → 0 (tokens-derived
  styles excepted).

**Phase.** R0 gate. R0 spikes whether `no-unknown-classes` understands
Uniwind's platform variants and the generated theme; its result is recorded
in `CONTEXT.md`. If it does not, that one rule waits and the in-repo
selectors cover the rest. The counts reach 0 at S3.

### 23. One responsive system

**Rule.**
- One set of breakpoints, from `tokens.breakpoints`, drives the CSS variants
  and `useWindowClass`:
  - `compact` < 600;
  - `medium` < 1024;
  - `expanded` < 1440;
  - `wide`.
- Navigation per class follows spec §6: bar, rail, sidebar. A compact height
  keeps the bar.
- Layout adapts through the window class, `Screen` and the layout helpers
  (`Stack`, `Inline`, `Cluster`). A feature never reads `useWindowDimensions`
  or `Dimensions`.
- Chip and action rows wrap.
- A `Choice` that does not fit becomes a list in a `Sheet`.
- Nothing scrolls in two directions at 320 px. There is no inner scroll
  inside the page, except the week grid.

**Why.**
- CSS `sm` is 480 while JS uses 640/1024.
- Layout is the largest finding class: truncation in 863 of 1,740 captures,
  the clipped rail in landscape (A1), two narrow columns at 768 px (W15).

**Sources.** [wcag-reflow], [m3-a11y], [android-a11y].

**Gate.**
- `no-restricted-imports` of `useWindowDimensions`/`Dimensions` outside
  `shared`, and the `check-quality` counter of `useWindowDimensions` in
  features (18 at `09cf103`; the R0 baseline replaces it) → 0.
- The layout audit (rule 29), *reviewed* until R8.

**Phase.** The ban and the counter from R0; the breakpoints from tokens at R5
(S1); per screen at S3.

### 24. The design system owns every interactive, state and overlay surface

**Rule.**
- Features compose the **26 components** of spec §4. Spec §4 is the one
  list, with each component's variants; `AGENTS.md` rule 24 names them for
  agents, and no other document keeps a copy. The spec's names hold:
  `Pressable` (the `PressableSurface`), `Button` with `iconOnly` (no
  `IconButton`), `Row`, `Choice`, `Notice` (it covers retry and stale) and
  `Field`. `Stack`, `Inline` and `Cluster` are layout helpers, not counted
  among the 26. A new component or variant needs a spec change and a `ui-lab`
  baseline.
- A feature never imports `Pressable`, `TouchableOpacity`,
  `TouchableHighlight`, `ActivityIndicator`, `Switch`, `Modal`, `Image`,
  `FlatList`, `SectionList` or `ScrollView` from `react-native`.
- **Dismissal is one rule** (spec §5.7):
  - every overlay closes on an outside tap or click, Esc, Back or a drag;
  - focus returns to the control that opened it;
  - a destructive `Confirm` and a dirty form ask first.
- A feature adds no styling or animation of its own to these components.
- Domain components keep their core (the camera player, PTZ, zones, the month
  grid, QR, face capture) and compose the components around it.

**Why.**
- 104 raw `Pressable`s each re-decide target size, pressed state and label.
- 26 bespoke dialogs.
- The Back-with-menu regression.
- The spec forecasts about 40% less UI code.

**Sources.** [rngh-pressable], [apg-dialog], [hig-alerts], [m3-dialogs],
[nng-confirm].

**Gate.**
- `no-restricted-imports` (`react-native`: the names above, and `Animated`)
  under `features/**`, with bulk suppressions, and the `check-quality`
  counter of raw `Pressable` in features. **Baseline:** the R0 suppressions
  and count (at `09cf103`: `Pressable` 104, `ActivityIndicator` 9, `Switch`
  3, `Image` 6, list and scroll components in about 30 files). All reach 0.
  `widgets/**` joins the ban when R4 creates it.
- `check-quality` `untested-component-or-screen` (rule 34).
- Each component has a component test and a `ui-lab` visual baseline (3
  widths × 2 themes × reduced motion/transparency), *reviewed* until S2.

**Phase.** The bans from R0. R6 = S2 (the components, built once with the
spec's values); the counts reach 0 at S3.

### 25. Accessibility is part of the type

**Rule.**
- Every interactive component requires a role and a label in its props type,
  or derives the label from visible text.
- **Targets:**
  - 48 dp, with 44 pt the minimum on iOS;
  - at least 8 dp apart;
  - at least 24 px on pointer-only desktop.
- **Contrast** is AA in both themes, checked from `tokens.ts` (rule 21).
- **Font scale:** `maxFontSizeMultiplier` 2.0 for `body`, `meta` and
  `caption`, and 1.5 for `hero` and `title` (spec §11, A2). `Text` reads each
  step's and role's `maxScale` from `tokens.ts`. Today's global 1.6 cap goes.
- **Platform settings:** Reduce Motion, Reduce Transparency and Increase
  Contrast are honoured, and so is the app's "Reducir efectos" setting.
- **Announcements:** the alert `Status` is announced, and toasts are polite
  live regions.
- **Focus:**
  - it is visible (2 px accent ring, 3:1);
  - it is never hidden by a sticky bar or a toast;
  - it is trapped and returned in dialogs.
- **Status is never shown by colour alone.**
- Hold gestures have tap alternatives.

**Why.**
- 304 captures have small targets.
- Controls nearly vanish in dark mode (W37).
- Text clips at font scale 1.3 (A3).
- 20 of 122 `Pressable`s have no label.

**Sources.** [wcag22], [wcag-contrast], [wcag-non-text], [wcag-resize],
[wcag-target], [wcag-focus], [wcag-status], [rn-a11y], [rn-a11yinfo],
[rn-text], [hig-a11y], [m3-a11y], [android-a11y], [apg-dialog].

**Gate.**
- Required props in the component types (`tsc`).
- `tests/e2e/accessibility.e2e.ts` runs axe-core [axe] over every UI-map state
  and fails on a violation at AA level or on an unnamed control.
- The layout audit's `smallTargets`: 304 → 0 on touch viewports.
- The contrast unit test.
- Component tests query by role and label [tl-queries].

**Phase.** *Reviewed* until S2 for the components and R8 for the audits (S2
starts them on `ui-lab`).

### 26. Motion runs on the UI thread and respects the user

**Rule.**
- **Only what explains a change moves** (spec §7): a sheet rising, a check
  filling, a tone changing.
- At most two continuous animations on a screen (`Aura`, `Presence`). Both
  pause off-screen, in the background, and when scrolled out of view
  (spec §7b).
- **Every animation runs on the UI thread:**
  - Reanimated shared values and worklets;
  - Reanimated CSS animations [rea-css];
  - the platform's own sheet, push and alert curves;
  - Estela (R-D28): `@shopify/react-native-skia` v2's Atlas driven by
    Reanimated worklets on iOS and Android [skia-atlas] [skia-reanimated],
    and a plain Canvas 2D renderer of the same particle system on web and
    Tauri [canvas-2d], inside `shared/ui`, the one place a frame loop may
    drive visuals.

  Never a `setState` per frame, never `setInterval` or `requestAnimationFrame`
  driving visuals, never `Animated` from `react-native`.
- **Animate `transform` and `opacity` only**, never layout props (`width`,
  `height`, `top`, `left`, `margin`, `padding`) [rea-perf].
- At most one blur layer is visible, and never over moving video.
- **Values come from tokens:** the springs `snappy`/`gentle`/`playful`, the
  durations `fast`/`base`/`slow`, and presses at 0.96 through
  `usePressScale`.
- **Shared values are written with `.set()` and read with `.get()`**, never
  through `.value` [rea-sv]. They are never read during render. This lets the
  compiler's `react-hooks/immutability` rule come back on.
- **Reduce Motion:**
  - every animation keeps `ReduceMotion.System` (the Reanimated default
    [rea-a11y]);
  - every loop (`withRepeat`, `useFrameCallback`, an infinite CSS animation,
    Estela's frame loop) has a still form;
  - transitions jump to their end state or become a 120 ms cross-fade.
- **Flashing:** an alert pulse never flashes more than three times a second
  [wcag-flash].
- **The performance tier** is `perfTier`, `low`, `mid` or `high`, decided by
  `shared/theme/effects.ts` (`resolvePerfTier`, read through `useEffects`)
  from the hardware profile [expo-device]: "Reducir efectos", Android below
  API 31 or under 4 GB RAM give `low`; Android under 6 GB gives `mid`;
  everything else `high`. `low` gets the still and solid forms of spec §7b
  and §8b. Spec §7b names two tiers; the owner's Phase 1 brief asked for
  three, so the spec gets `mid`, and `effects.ts` defines it.
- **Haptics, not sound.** UI sound is deferred (spec §7c, S1 in spec §13):
  nothing plays a UI sound. Moments are carried by animation and expo-haptics
  [expo-haptics].

**Why.**
- The owner wants an elegant, futuristic feel that is performance-first.
- The spec's identity rests on four animated primitives, and each one needs
  a measured budget and a fallback.
- Today 3 of the 10 files with looping animations have no reduce-motion path
  (`button.tsx`, `mascot-figure.tsx`, `use-frame-budget.ts`).
- 129 `.value =` writes block the immutability rule.

**Sources.** [rea-perf], [rea-a11y], [rea-sv], [rea-css], [rn-perf],
[hig-motion], [m3-motion], [nng-anim], [wcag-motion], [wcag-pause],
[wcag-flash].

**Gate.**
- Lint:
  - `react-hooks/immutability` back to `error` (its exception row is deleted)
    once `.value` writes are suppressed in bulk;
  - `no-restricted-imports` of `Animated` from `react-native`;
  - a selector banning `setInterval`/`requestAnimationFrame` in `*.tsx`
    outside `shared/ui`.
- `check-quality` counters, each with its R0 baseline → 0 (the `09cf103`
  survey in brackets):
  - `shared-value-dot-value` (129);
  - `loop-without-reduce-motion` (3), an AST scan of files that start a loop
    and never read `useReduceMotion`/`ReduceMotion`;
  - `animated-layout-prop`: the keys returned by `useAnimatedStyle`;
  - `timer-in-component` (8 files).
- The layout audit, on the web build, *reviewed* until R8:
  - `infiniteAnimations` ≤ 2 per capture (`document.getAnimations()`);
  - 0 under `emulateMedia({ reducedMotion: 'reduce' })`.
- The Android frame budget of rule 31, *reviewed* until R9.

**Phase.** R0 for the lint bans and the counters. The motion tokens and
`effects.ts` landed in Phase 1; S1 adds `springs.ts`. S2 for the components
that own the motion. The integration build measures frames once the
reference run exists (R9) and at every S3 step.

### 27. Text the user reads is a typed key, in Argus's voice

**Rule.**
- Every string a user reads comes from the `es`/`en` dictionaries. `tsc`
  checks the key and its parameters, as today.
- A key over a server value goes through a
  `Record<Enum | 'unknown', TranslationKey>` map, never a template literal.
- **Plurals** use `Intl.PluralRules` categories in the dictionaries (`one`,
  `other`, and `many` where CLDR has it), never `count === 1` in code.
- Sentences are never concatenated from fragments [icu-messages].
- Dates, times, numbers and durations go only through the formatter:
  - the device's 12/24-hour setting;
  - relative times for the last hour;
  - units in words ("1 hora", never "3590 s").
- Server-supplied labels are resolved per language by their owner. A missing
  language falls back to the other language, never to an identifier.
- **Copy follows spec §12:**
  - tú, short and calm;
  - one name per thing from the glossary;
  - buttons start with a verb and name the object;
  - no technical words;
  - no exclamation marks;
  - English written natively.

**Why.**
- Raw keys leaked (W5).
- "privacy" and "Retention days" appeared in Spanish (A9).
- "3590 s" was shown (W22).
- One thing had three names (W19).
- There are 132 template-literal keys.

**Sources.** [mf2], [icu-messages], [cldr-plurals], [mdn-plural],
[hermes-intl], [expo-localization], [hig-writing], [m3-writing].

**Gate.**
- Lint: a selector bans a `TemplateLiteral` with expressions as `t()`'s first
  argument, counted by `check-quality` too (132 at `09cf103`; the R0
  baseline replaces it) → 0, and `i18next/no-literal-string` runs in
  `jsx-only` mode on `src/**/*.tsx`, its debt in the R0 suppressions.
- A unit test checks glossary terms and banned words over the dictionaries,
  and the plural keys are typed: both *reviewed* until S1 (plurals) and S3
  (copy).

**Phase.** R0 gate; R2 for server values; S3 for the copy, per screen.

### 28. Platform differences live in platform files

**Rule.**
- Behaviour that differs by platform lives in a `.native`/`.web` pair behind
  one interface, or in a `platform/*` service. The two halves export the same
  names.
- A runtime `IS_*` branch in a feature is limited to copy and layout.
- Permission and device flows always go through the platform service.
- Copy that names a device comes from `platform/device`.
- Desktop and mobile idioms (spec §8c) are chosen by the components from the
  input and the window class, never by a screen.

**Why.**
- The `heartbeat.native.ts` permission bypass (R2).
- Phone copy on desktop (W20).
- 213 `IS_*` branches in 65 files.

**Sources.** [ts-config] (`moduleSuffixes`), [hig-alerts], [m3-dialogs],
[apg-dialog].

**Gate.**
- `check-quality` `is-flag-in-features` (213 at `09cf103`) → shrink, and
  `platform-select` (58) → shrink, from their R0 baselines.
- `check-platform` (inside `check:boundaries`) compares a pair's exports
  (0 mismatches at `09cf103`), *reviewed* until R3.

**Phase.** R0 for the counters; S3 per screen.

### 29. Layout is audited, not eyeballed

**Rule.** Every UI-map state of every screen renders at the nine viewports,
at font scale 1.0, 1.3 and 2.0, in light and dark, with:
- no horizontal overflow;
- no clipped or overlapping control;
- no target below the minimum;
- no truncation of a key fact (times, names, amounts, states);
- no raw error text (rule 20).

**Why.** This is the largest class of real findings, and none of the 40 web
findings was retested.

**Sources.** [wcag-reflow], [wcag-target], [wcag-resize].

**Gate.** The UI-map harness (`tests/e2e/support/ui-map/capture.ts`, from
`test/ui-map`) runs in the integration build and writes its checks per
screen and viewport to `scripts/lib/layout-baseline.txt`. **Baseline** (in
captures affected):

| Check | Count |
|---|---|
| truncated | 863 |
| overlapping | 416 |
| small targets | 304 |
| offscreen | 93 |
| horizontal overflow | 0 |
| infinite animations | measured at R8 |
| raw error text | measured at R8 |

Each count only shrinks. A rebuilt screen must reach 0 on its own states.

**Phase.** R8, merged at S2 so that every rebuilt screen is born audited.

---

## E. Performance

### 30. Startup and bundle budgets

**Rule.**
- **Measure first.** Cold start is measured before anything changes (S0):
  - device: the reference Android device (Samsung SM-G990U);
  - build: production;
  - method: `adb shell am start -S -W`, the median of 10 runs [android-launch];
  - marks: `first-frame-from-cache` and `ready` through `performance.mark`
    [rn-perf-api].
- **Nothing runs before the first frame** except reading the persisted
  session and the view cache. Engines start in `AppPhase` order, after the
  first frame where possible. `Presence` adds nothing to first paint: it
  shows its state's still frame and starts its renderer after the first
  frame (spec §7b).
- **The web entry chunk stays ≤ 6.6 MB** (6,600,000 B), and `dist/` has its
  own budget.
- **Heavy, rarely used code is loaded on use:** `livekit-client`, the
  WebCodecs player, the QR scanner and face capture. Skia's CanvasKit never
  ships on web: Estela draws with Canvas 2D there, and Skia is native-only.
  Async routes are measured before they are adopted [expo-async-routes].
- **Every new dependency** records its size (native download and web gzip)
  in `CONTEXT.md` when it is added. The redesign's set (spec A6) is
  `@lodev09/react-native-true-sheet` 3.11.18 [true-sheet],
  `@shopify/react-native-skia` 2.14.0 [skia-atlas] (about +4 MB Android and
  +6 MB iOS by the spec's estimate, nothing on web), expo-haptics
  [expo-haptics], expo-blur [expo-blur], expo-glass-effect [expo-glass],
  expo-device [expo-device], sonner-native [sonner-native] and sonner
  [sonner].

**Why.**
- The entry chunk grew from 5.30 to 6.61 MB in 17 days with no gate.
- Startup lost answers (W1).
- The owner asked for cold start to be measured first.

**Sources.** [rn-perf], [rn-perf-api], [android-launch], [expo-atlas],
[expo-async-routes], [web-vitals].

**Gate.**
- `bun run check:bundle` fails on any of these:
  - the entry chunk above min(6,600,000 B, its baseline);
  - `dist/` above its baseline;
  - a listed lazy package found in the entry chunk.

  **Baseline:** `scripts/lib/bundle-baseline.txt`, measured at R0 (the
  2026-10-16 dist measured 6,612,933 B; R0's measurement replaces it). A
  merge that legitimately grows it re-baselines with a recorded reason, never
  silently. See owner decision P1.
- `scripts/perf/cold-start.ts` runs in the integration build. It fails when
  the median cold start or either mark is more than 10% above
  `perf-baseline.txt`. The baseline is lowered when a change improves it and
  is never raised.

**Phase.** `check:bundle`'s budgets are measured from R0. The cold-start run
is *reviewed* until its baseline is measured on the reference device (S0's
measurement, then R9's targets).

### 31. Rendering budgets: frames, lists, images, effects, memoization

**Rule.**
- **Frames.** Scrolling Inicio on the reference device stays at ≤ 1% janky
  frames, and the 90th-percentile frame time is ≤ 16.7 ms (spec §7b,
  [rn-perf], [android-rendering]). Performance is judged only on release
  builds [rn-perf] [rea-perf].
- **Lists.** A list that can grow uses the shared list component
  (`InfiniteList` over Legend List [legend-list]). There is never a `.map()`
  over a server collection inside a `ScrollView`. Items have stable keys and
  recycle cleanly.
- **Images** go through one component (`Media`, or an image primitive in
  `shared/ui`) that sets dimensions, a placeholder and caching. No feature
  imports `Image` (rule 24). See owner decision P2 on expo-image
  [expo-image].
- **Effects.** No effect derives state, chains another effect, or reacts to
  an event that a handler could handle [react-effects]. This is enforced by
  the compiler rules `set-state-in-effect`, `set-state-in-render`, `refs`
  and `purity`.
- **Memoization.**
  - The React Compiler is on, so new code writes no `useMemo`,
    `useCallback` or `memo` [react-compiler].
  - The exceptions are a value used as an effect dependency, an identity a
    third-party API requires (for example a Reanimated gesture object or a
    `useFrameCallback` worklet [rea-perf]), and a case with a measured gain.
    Each exception is one line in `scripts/lib/memo-exceptions.txt`: path,
    symbol and reason (`effect-dependency`, `library-identity`, or
    `measured:` plus a `CONTEXT.md` anchor).
  - Existing manual memoization is removed only in a change that has
    component tests for that component, because removal can change what the
    compiler emits [react-compiler].
- **Release logging.** `console` is used only in `platform/log`, and debug
  output is `__DEV__`-only [rn-perf].

**Why.**
- There are 347 `useCallback`, 153 `useMemo` and 5 `memo` under the
  compiler.
- About 30 files use raw list or scroll components.
- 6 files import `Image` directly.
- Taps lagged 2–5 s during camera calls (A11).

**Sources.** [rn-perf], [rn-flatlist], [legend-list], [flashlist],
[expo-image], [react-effects], [react-compiler], [react-memo], [rea-perf],
[android-rendering].

**Gate.**
- `check-quality` `manual-memo` (`useCallback` + `useMemo` + `memo`: 505 at
  `09cf103`; the R0 baseline replaces it) → shrink. A new occurrence passes
  only when it matches a line of `memo-exceptions.txt`.
- The raw list and image imports (rule 24).
- The compiler rules of `react-hooks` 7 (rule 2).
- `scripts/perf/frames.ts` runs in the integration build: a Maestro scroll of
  Inicio, then `dumpsys gfxinfo` against `perf-baseline.txt`, with 10%
  tolerance and the absolute caps above.

**Phase.** R0 for the counters. The frame run is *reviewed* until its
baseline is measured (S0's measurement, R9's targets). Each rebuilt screen
meets the budget at S3.

---

## F. Code shape, tests and contracts

### 32. Size and complexity budgets

**Rule.**

| Measure | Budget | Above the budget at `09cf103` (the R0 suppressions replace it) |
|---|---|---|
| `complexity` per function | 15 | 76 functions (max 70) |
| `max-lines-per-function` | 80 | 133 (max 528) |
| `max-lines` per file (i18n dictionaries and generated files excluded) | 300 | 32 files (max 1,098) |
| `max-statements` | 30 | 16 |
| `max-depth` | 3 | 7 |
| `max-params` | 3; four or more become one object, as in the backend's rule 2 | 18 |
| Members of a props type | 10; beyond that, slots or composition | 17 |

- A screen lays out sections. A section owns its hook. Decisions are pure
  functions in `model/` with unit tests.
- The golden rule of today's §9 stays: file order, hook order, named props
  types.

**Why.** The hotspots are where testing finds regressions.
`camera-detail-screen.tsx` changed 23 times in 17 days, with complexity 70
and 528 lines.

**Sources.** [eslint-core-rules].

**Gate.**
- The ESLint rules at `error`, with their debt in `eslint-suppressions.json`.
- `check-quality` `props-over-10` (17 at `09cf103`) → 0.

**Phase.** R0. The suppressions shrink as screens are rebuilt (S3, which
replaces R7).

### 33. Formatting and the small conventions *(kept, plus Prettier)*

**Rule.**
- Prettier and `prettier-plugin-tailwindcss` format every file, and class
  order is theirs.
- Today's conventions stay:
  - `console` only in `platform/log`;
  - dates only through the formatter;
  - timers are never called as methods;
  - React APIs are imported by name;
  - platform flags come from their one home.

**Why.**
- 641 of 1,149 files differed from Prettier's output at `09cf103`.
- A timer called as a method crashed WebKit (`e0e2abd`).

**Sources.** [prettier].

**Gate.**
- `bun run check:format`, a ratchet: the files not yet formatted are a
  committed list (`scripts/lib/format-baseline.txt`). A file on the list may
  stay unformatted, a file not on it must be formatted, and the list only
  shrinks.
- The one formatting commit (plan D8) waits until the open frontend branches
  are settled (D4), and lands listed in `.git-blame-ignore-revs`; the list is
  then empty.
- The existing lint selectors.

**Phase.** R0 for the ratchet; the formatting commit after D4.

### 34. Tests at the level the behaviour lives

**Rule.**

| Behaviour | Test |
|---|---|
| Pure logic | unit tests |
| Every `shared/ui` component and every screen | at least one render-level component test, querying by role and label [tl-principles] [tl-queries] |
| Navigation (Back, deep links, redirects) | `renderRouter` tests [expo-router-test] |
| Contracts | fixture tests |
| Flows | web E2E on Chromium and WebKit, plus a small Maestro smoke set on Android: welcome to Inicio, camera live, answering a call, the explain-first permission prompt [maestro] |

- The component runner is bun + happy-dom + react-native-web, as approved.
  jest-expo [expo-unit] is the documented fallback.
- A bug fix lands with a test at the lowest level that reproduces it.
- No test asserts on source text.

**Why.**
- There are 0 render-level tests today.
- 14 tests read `.tsx` as text.
- Two navigation regressions went uncaught.

**Sources.** [tl-principles], [tl-queries], [rntl], [expo-unit],
[expo-router-test], [expo-e2e], [maestro], [axe].

**Gate.**
- `check-quality`:
  - `source-text-test` (14 at `09cf103`) → 0;
  - `untested-component-or-screen`, with the R0 list as the baseline;
  - coverage per top-level slice (`bun test --coverage`), with thresholds
    that only rise, *reviewed* until R8.
- Each gate script has a fixture test under `tests/unit/scripts/` (rule 1).
- Maestro and WebKit run in the integration build, *reviewed* until R8.

**Phase.** R0 for the counters. The runner spike at S0. The harness is in
place before the first component (S2), so nothing is built untested.

### 35. Networking and secure storage *(kept)*

**Rule.** Today's §11 stays:
- one JS API over Nitro and Tauri;
- no `fetch` from the WebView;
- `serviceUrl` for every URL;
- pairing proofs;
- `CODE|message` native errors, which are mapped by rule 20 and never shown;
- Rust-owned trust keys;
- a strict CSP.

The CSP stays as it is. Estela needs no change: its desktop renderer is plain
Canvas 2D, with no CanvasKit and no wasm, so R-D18 (`'wasm-unsafe-eval'`) is
withdrawn and R-D17 (Rive) is superseded by R-D28 (spec §13). Any future CSP
change is an explicit owner decision recorded in `CONTEXT.md`.

**Why.** This is the trust model, and it is outside the redesign's scope.

**Sources.** None. These are house rules.

**Gate.**
- The existing `net` unit tests, `cargo check`, and `check:bundle` loading
  under the CSP.
- The native-code parity test of rule 20.

**Phase.** In force.

### 36. Contracts with the backend

**Rule.**
- `role-access`, `capability`, `modules`, the notification kinds and now the
  **error codes and reasons** mirror the backend headers.
- HTTP schemas mirror the backend fixtures.
- A backend change lands with the matching frontend change.
- Generated mirrors are committed and compared in memory by the contract
  tests.

**Why.** The two halves are one product (`backend/AGENTS.md`).

**Sources.** None. These are house rules.

**Gate.** `bun run test` → `tests/contracts/*`, including
`error-code-contract.test.ts`.

**Phase.** In force; the error contract arrives at S1.

---

## The lint set

The complete ESLint configuration the rules adopt. Every row is `error`, and
any exception lives in `CONTEXT.md` › "Lint exceptions" (rule 2).

| Package (version) | Rules adopted | Rule |
|---|---|---|
| `eslint` 9.39 (core) | `linterOptions`: `noInlineConfig: true`, `reportUnusedDisableDirectives: 'error'`, `reportUnusedInlineConfigs: 'error'`. Rules: `complexity` 15, `max-lines-per-function` {80, skipBlankLines}, `max-lines` {300, skipBlankLines} (locales and generated files ignored), `max-statements` 30, `max-depth` 3, `max-params` 3, `no-console`, `eqeqeq`, `no-restricted-imports` and `no-restricted-syntax` (the bans and selectors of rules 10, 18, 21–24, 26, 27 and 33 from R0; rule 7's `ExportAllDeclaration` at R3, rule 13's `httpService` type argument at R2, error-messages G5 at S1) | 2, 7, 10, 13, 18, 21–24, 26, 27, 32, 33 |
| `eslint-config-expo/flat` 57 [expo-eslint] | the base: `eslint-plugin-react` recommended, `@typescript-eslint` basics, `eslint-plugin-import`, `eslint-plugin-expo`, with every `warn` promoted to `error` | 2 |
| `eslint-plugin-react-hooks` 7.1 [react-hooks-lint] | all 17 rules of `recommended`: `rules-of-hooks`, `exhaustive-deps` and the compiler's (`immutability` back on at S1, `purity`, `refs`, `set-state-in-effect`, `set-state-in-render`, `static-components`, `use-memo`, `preserve-manual-memoization`, `globals`, `incompatible-library`, `unsupported-syntax`, `error-boundaries`, `component-hook-factories`, `config`, `gating`) | 26, 31 |
| `@typescript-eslint` 8 (type-aware, `projectService`) [tseslint-typed] [tseslint-rules] | `no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check` (`considerDefaultExhaustiveForUnions: false`), `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-argument`, `no-unsafe-return`, `no-unsafe-call`, `no-explicit-any`, `no-non-null-assertion`, `consistent-type-imports`, `no-unnecessary-type-assertion`, `only-throw-error`, `no-deprecated` | 13, 14, 16, 18 |
| `eslint-plugin-better-tailwindcss` 4 [better-tailwind] | `no-restricted-classes`, `no-unknown-classes` (after R0's Uniwind spike, `CONTEXT.md` › "Lint exceptions" records the outcome), `no-conflicting-classes`, `no-duplicate-classes`, `no-deprecated-classes`, `no-unnecessary-whitespace`. `enforce-consistent-class-order` is off, by name, because Prettier owns class order: that is an exception row | 21, 22 |
| `eslint-plugin-i18next` 6 [i18next-lint] | `no-literal-string` in `mode: 'jsx-only'` on `src/**/*.tsx` | 27 |
| `eslint-plugin-sonarjs` 4 [sonarjs] | `no-identical-functions`, `no-all-duplicated-branches` only. Not the recommended preset | 11 |

Considered and not adopted:

- **`eslint-plugin-react-native-a11y`.** Its last release is 3.5.1, with no
  documented flat config and an inactive repository. Required label and role
  props in the component types, plus axe on every UI-map state, cover it
  better.
- **`eslint-plugin-boundaries`, `import-x/no-cycle` and dependency-cruiser.**
  The in-repo `check-boundaries.ts` already resolves `.native`/`.web`
  suffixes, and these tools skip files silently without the right resolver
  (plan §3.1).
- **`@eslint-community/eslint-plugin-eslint-comments`.** `noInlineConfig`
  plus `check-comments` make inline switches both inert and forbidden.
- **typescript-eslint `strict-type-checked` as a whole.** It is too broad to
  "respect how the code is written". The named rules above carry the
  decisions.
- **ESLint 10.** It is current, and v9 reached end of life on 2026-08-06
  [eslint-versions]. But `eslint-plugin-react` 7.37.5 and
  `eslint-plugin-import` 2.32.0, both pulled in by `eslint-config-expo`, do
  not declare ESLint 10 support. See owner decision L1.

## The gates

| Gate | Command | Rules | Runs in |
|---|---|---|---|
| Comments | `bun run check:comments` | 3 | verify |
| Boundaries v2 + `boundaries-baseline.txt` (from R0: the five rules, cycles, deep imports, route shape, lint policy, references; later: the layer matrix, kind homes, slice shape, file names at R3, session owner at R1, store purity, database access, platform pairs) | `bun run check:boundaries` | 1, 2, 4, 6–12, 15, 17, 19, 28 | verify |
| Quality counters + `quality-baseline.txt` + `memo-exceptions.txt` (the AST counters from R0; jscpd and knip at R3) | `bun run check:quality` | 10, 11, 13, 14, 16, 17, 20, 21, 26, 28, 31, 32, 34 | verify |
| ESLint + `eslint-suppressions.json` | `bun run lint` | 2, 7, 10, 13, 16, 18, 21–27, 31–33 | verify |
| Tokens (from R5, S1) | `bun run check:tokens` | 21 | verify |
| Formatting (a ratchet over the list of unformatted files) | `bun run check:format` | 33 | verify |
| Types (i18n parity, `ReadyEmpty`, required labels, error map exhaustiveness) | `tsc --noEmit` | 16, 20, 25, 27 | verify |
| Unit, component, navigation and contract tests | `bun run test` | 14, 15, 18, 20, 21, 25, 34, 36 | verify |
| Bundle render under the Tauri CSP + byte budgets from `bundle-baseline.txt` | `bun run check:bundle` | 30, 35 | verify |
| Web E2E on Chromium and WebKit, visual baselines, axe | `bun run test:e2e:run` | 14, 25, 34 | verify (Chromium), integration (WebKit) |
| Layout audit + `layout-baseline.txt` | integration | 20, 23, 25, 26, 29 | integration |
| Android cold start and frames + `perf-baseline.txt` | integration | 30, 31 | integration |
| Maestro smoke | integration | 28, 34 | integration |

## Alignment with the redesign spec (§15 of the spec)

| Spec item | Resolution in these rules |
|---|---|
| A1: rules, refactor and redesign as one programme | Adopted. "Implementation order with the redesign" below replaces plan §5 and D7. |
| A2: font scale 2.0 for body/meta/caption, 1.5 for hero/title | Rule 25. |
| A3: six type steps and the spec's radii, enforced by lint | Rules 21 and 22: the mechanism kept, the values those `tokens.ts` holds (six steps plus `typeRoles`, the named radius roles, `card`/`float`/`none` elevation). |
| A4: `*-strong` twins dropped, contrast test kept | Rule 21: the text-safe value is the role, pure fills are named as fills (`accent-fill`). |
| A5: one component list | Rule 24: spec §4 is the list; `Stack`/`Inline`/`Cluster` are helpers. |
| A6: §7b animation budget, `perfTier`, new dependencies | Rules 26, 30 and 31. `perfTier` is `low`/`mid`/`high` (`effects.ts`; the spec gets `mid`). Each new dependency records its size. |
| A7: the Tauri CSP | Rule 35: no change. Estela draws with Canvas 2D on desktop; R-D18 is withdrawn and R-D17 superseded. |
| A8: `serviceErrorKey` as the single map | Rule 20; it becomes `platform/errors`. |
| A9: breakpoints | Rule 23; identical. |

## Implementation order with the redesign

The owner decided on 2026-10-20 that the rules, the refactor and the redesign
are one programme, built once. The rule that orders it: **build each thing at
its final shape the first time it is touched.**

- The redesign rebuilds about 39,000 lines of UI into about 22,000 (spec
  §4.6). So:
  - R6 (completing today's design system) and R7 (splitting today's hotspots)
    are not done on the old UI;
  - the 26 components are built once, with the new tokens;
  - each hotspot is replaced by its rebuilt screen.
- A screen is rebuilt only after its domain has moved to `entities/` with
  schemas. Otherwise its imports and types are rewritten twice.
- Tests, the layout audit and the error surfaces exist **before** the first
  component, so nothing is born untested or unaudited.

The five steps:

| Step | What lands | Phases | Rules that turn on or reach 0 |
|---|---|---|---|
| **S0. Gates, baselines, measurements, spikes** (no behaviour change) | The Prettier ratchet (the formatting commit itself waits for D4). ESLint policy plus the suppressions file. `check-quality`, `check-boundaries` v2, `check-lint-policy`, `check-references`, the bundle budget. **Cold start and frame stats measured** on the reference device. The four spikes: (1) the bun + happy-dom + react-native-web component runner; (2) TrueSheet 3.11.18 with the keyboard on the S21 FE and iOS; (3) Estela on Skia v2 Atlas on a low-end Android (frame time, voice level to waves latency) and its Canvas 2D renderer in the Tauri WebKitGTK build under the unchanged CSP; (4) better-tailwindcss with Uniwind. The generated error-code list and its contract test. | R0, R9 (measurement only) | 1–4, 7 (deep imports), 8, 9 (routes), 10 (literals, icon and formatter imports), 21–24, 26, 27, 30–34 on as ratchets; every baseline committed |
| **S1. Foundations every new screen reads** | `platform/` skeleton: `AppPhase` (session), `<AppRuntime />`, tri-state gates, `Resource<T>`, `httpService` with schemas, `platform/errors` (`ApiFailure`, the map, the copy for the 30 codes), the i18n `errors` namespace and plurals. `tokens.ts` with the **spec's values** (landed in Phase 1) plus the generator (the legacy CSS block frozen beside it). One breakpoint set, `springs.ts`, the three-tier `perfTier` of `effects.ts` (landed in Phase 1), the `.value` → `.set()` codemod with `react-hooks/immutability` back on. | R1, R2 (mechanism), R5 | 9, 14, 15, 20, 21, 23, 26 |
| **S2. The design system, once** | The 26 components of spec §4 in `ui-lab` on the new tokens. Each one has a component test, an axe pass and visual baselines (3 widths × 2 themes × reduced motion and transparency). `ResourceView`, `Toast`, `Notice`, `Field` and `Confirm` render the error surfaces. The UI-map harness is merged as the layout audit. The old primitives stay until their last consumer goes. | R6 (spec list), R8 (harness) | 16, 24, 25, 29, 34 for components |
| **S3. Domain by domain, screen by screen** in the spec's order: navigation + Inicio; Seguridad + Cámara; Agenda + Proyectos; Argus; Tú/Ajustes/Personas; onboarding. For each one, in this order: (a) the entity moves to `entities/` with its schemas (R3, R2 for that domain); (b) widgets where 2+ features need them (R4); (c) the screens are rebuilt on the components to spec §9 and §10, within the budgets (this replaces R7); (d) component, navigation and E2E tests, UI-map recapture, frame check; (e) the replaced components and code are deleted and the baselines lowered; (f) the slice's `CONTEXT.md` is written (R10). | R2, R3, R4, R7 (as rebuild), R8, R10 | 6, 10, 13, 16–18, 22, 24, 27–29, 31 reach 0 for that domain |
| **S4. Closure** | `core/` is gone. The legacy token block, `common.errors.*` and the old primitives are deleted. Every counter is at 0 or at its audited list. WebKit and Maestro are green. Performance is compared with the S0 baseline and the R9 targets are set. The new `AGENTS.md` rules section is applied, and the narrative moves to `CONTEXT.md` files. | R9, R10 | all |

Parallelism:

- S1's tracks run in parallel: session and gates, wire validation, tokens,
  and errors.
- S2 can start on `Text`, `Icon`, `Pressable` and `Screen` as soon as the
  tokens land.
- S3 domains run one at a time per area, because R3 moves conflict with open
  branches (plan D4).

## Decisions the owner must still take

| # | Decision | Recommendation |
|---|---|---|
| P1 | The 6.6 MB ceiling is measured in decimal bytes (6,600,000 B, the plan's unit). The entry chunk was 6,612,933 B on 2026-10-16 and R0's measurement in `bundle-baseline.txt` is above the ceiling, so either S0 trims it, or the ceiling applies from R9 with R0's measurement as a ratchet until then | Ratchet from R0, ceiling enforced from the end of S1 |
| P2 | Images through `expo-image` (cache, placeholder, cross-fade, list recycling) inside `Media`, instead of React Native `Image` | Yes, measured in the S0 spike on the camera tiles |
| P3 | The cold-start and frame targets, set after the S0 measurement | Decide at R9 with the numbers in hand |
| L1 | ESLint stays on 9.39 (end of life since 2026-08-06) until `eslint-config-expo`'s dependencies support 10, or the move to ESLint 10 is made by replacing `eslint-plugin-import` with `eslint-plugin-import-x` | Stay on 9.39 and re-check at the next Expo SDK |
| L2 | `react-hooks/immutability` back on, after a codemod from `.value` to `.get()`/`.set()` as Reanimated documents for the compiler | Yes, at S1 |
| E1–E4 | The error-message decisions | See `error-messages-spec.md` §9 |
| — | The spec's R-D8 (TrueSheet), which depends on the S0 spike. R-D17 (Rive) is superseded by R-D28 (Estela on Skia Atlas and Canvas 2D) and R-D18 (the CSP) is withdrawn | as in the spec |
