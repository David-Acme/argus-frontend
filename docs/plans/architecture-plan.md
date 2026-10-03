# Frontend architecture plan

Status: proposed, 2026-10-03. A living plan: each phase is small, shippable
on its own, and verified before the next one starts. Evidence was measured on
commit `613b0e1` (file paths and counts below are from that tree).

Goal: an app that is secure, simple, scalable and maintainable, and above all
fast for the person using it — local data painted instantly, smooth on phones,
tablets, laptops and desktop. The frontend adopts the backend's discipline
(AGENTS rules 23–25): a feature folder is the home of a capability, `shared/`
is earned by two or more consumers, and a folder is a module with one public
entry.

## 1. What is already right — keep it

- `core/services/sync/`: 22 focused modules (cursor store, pager, live-frame
  batching and applier, audit pager/patch/processor). Move, do not redesign.
- The `net` layer: HMAC pairing proof on every platform, `CODE|message`
  errors, cached clients, route table, native sockets.
- `http.service` + `session.service`: single-flight refresh with three
  outcomes and a session-version guard.
- WatermelonDB: one file per table plus registry, `DatabaseService<K>`.
- The view-cache idea: per-user MMKV snapshots read through
  `useSyncExternalStore`, cleared at the session boundary.
- Typed i18n, small zustand stores with atomic selectors, the avatar and QR
  animation work, the form stack (`useFormSubmit`, adaptive dialog/select),
  the comment gate and lint restrictions, the Nitro module split.

## 2. Findings that drive the plan

| Area | Finding | Evidence |
|---|---|---|
| Layout | ~70% of `shared/components` (145 files, 11.8k lines) has a single consumer feature | `calendar/` 11/12, `cameras/` 15/17, `projects/` 10/10, `security/`, `settings/`, `users/`, `face/` all single-feature |
| Layout | Layer inversions: `core` imports `shared/constants` (32×) and libs (7×); the constants barrel drags both lucide packages into every core service and test | `core/types/icon.type.ts`, `shared/constants/index.ts` |
| Layout | Screens hold logic: `qr` 410 lines, `agenda` 400, `welcome/face` 375, `cameras/[id]` 366, `projects` 347, `index` 342 | route files |
| Duplication | Panel surface 38× in 22 files; 2 shells; 8 dashed create tiles; 2 measured grids; 3 empty states; 2 toggles; 2 different `SettingRow` exports | class-string counts |
| Duplication | HTTP loading written by hand (generation ref + loading/failed + focus) in `use-guard`, `use-settings`, `people`; 9 `let active = true` effects; 11 confirm→call→toast blocks; 9 per-route auth redirects | hooks and routes |
| Data | The view-cache coordinator (402 lines) subscribes to 11 sources in one `combineLatest` and rewrites **every** snapshot on any change; `notify` fires even when the content is identical | `view-cache-coordinator.service.ts:143-155`, `view-cache.service.ts:58-78` |
| Data | Security, home guard mode and camera device status fetch on focus with no cache; `/security` shows a full-screen spinner | `security/index.tsx:181`, `use-guard-mode.ts`, `cameras/[id].tsx` |
| Data | Orphan MMKV keys for deleted cameras/projects; one calendar month cached; per-keystroke people query | coordinator |
| Contracts | The role table already drifted: the backend gives guard and guest `user` read, the app does not | `shared/libs/role-access.ts` vs `backend/.../role-access.hxx` |
| Performance | Web entry bundle 8.4 MB; the whole lucide set ships (unused icons such as `Banana` are in it); 8 MB `canvaskit.wasm` and `@shopify/react-native-skia` ship although nothing imports Skia | `dist/`, `package.json` |
| Performance | Signed-in cold start awaits 9 sequential secure-storage reads before the first frame | `net/net-persistence.ts:26-33` |
| Performance | 1000-row people/users lists render with `.map` in a ScrollView; React Compiler off; `useWindowClass` re-renders 23 consumers on every resize pixel; the nav rail remounts on every route | lists, `use-window-class.ts`, shells |
| Security | Tauri: `csp: null`, `withGlobalTauri: true`; JS passes CA, host and IP on every `argus_request`; reqwest keeps the public roots (HTTP less strictly pinned than the socket); `argus_secure_*` accept any key | `tauri.conf.json`, `src-tauri/src/net/http.rs`, `secure.rs` |
| Security | Plain-web secure storage falls back to `localStorage`; the invitation token travels as a route param | `secure-storage.web.ts`, `welcome/face` |
| Quality | 14 unit test files, all pure logic; no boundary lint; `as` casts at the wire; no `noUncheckedIndexedAccess` | `tests/unit` |

## 3. Target layout

```
src/
  app/                      routes only: params → feature screen
    _layout.tsx             providers + root Stack
    (auth)/                 welcome, login, approve, qr
    (app)/_layout.tsx       Stack.Protected (signed in) + AppShell (nav rail / bottom nav mounted once)
    (app)/...               index, agenda, projects, cameras, people, users, profile, security, settings, call
  core/                     app-wide infrastructure; never imports features/ or shared/components
    platform/ net/ http/ storage/ secure-storage/ database/ sync/ log/
    session/                session service, auth store, SessionGate, route guards
    view-cache/             cache service, projection registry, useViewCache*, useRemoteResource
    contracts/              envelope, role access, sync enums, schemas checked against backend fixtures
    i18n/
  features/<domain>/        vertical slice; public API = index.ts
    components/ hooks/ services/ model/ screens/
    domains: auth, home, agenda, projects, cameras, people, security, settings, voice, notifications, qr
  shared/                   only what 2+ features use
    ui/                     design system: Text, Button, Icon, dialogs, sheets, adaptive-*, forms,
                            Panel, SectionHeader, EmptyState, ListRow, VirtualList, FilterChips,
                            StatusBadge, CreateTile, ResponsiveGrid, ToggleRow, IconCircle
    layout/                 AppShell, ScreenHeader, NavRail, BottomNav, CenteredScreen, OfflineBanner
    hooks/ libs/ constants/ (color, theme, layout, icon — no domain constants)
```

Boundary rules, enforced by a `scripts/check-boundaries.ts` gate in
`bun run verify` (the frontend twin of `check-deps.sh`):

1. `app/**` imports `features/*/index` and `shared`, never `core/database` or
   `core/services/*`.
2. `features/A/**` imports another feature only through `features/B/index.ts`.
3. `core/**` never imports `features/` or `shared/components`.
4. `shared/**` never imports `features/`.
5. A non-`ui` module in `shared/` with fewer than two feature consumers is
   reported (the 2+ rule, checkable).

## 4. Phases

Every phase is verified with `bun run verify`, `bun run web:build` (record the
entry bundle size), `cargo check` in `src-tauri` when Rust changes, and a
visual pass at 420 / 952 / 1366 px in light and dark; motion and list phases
also get one Android device pass.

### Phase 0 — Quick wins (about a day)

- [x] **Bundle.** Per-icon deep imports in `icon.constant.ts` and
  `morph-icon.constant.ts` (or Expo tree shaking); remove
  `@shopify/react-native-skia`, its postinstall steps and `public/canvaskit.wasm`.
  Check: `Banana` absent from the bundle, entry well under 8.4 MB, APK smaller.
  Done: entry 8,463,295 B → 5,235,894 B, `dist/` 17 MB → 5.3 MB.
- [x] **Tauri hardening.** A real CSP, `withGlobalTauri: false`,
  `tls_built_in_root_certs(false)` on reqwest, allow-listed secure-storage keys.
- [x] **Web storage.** Outside Tauri, secure storage refuses instead of using
  `localStorage`.
- [x] **Cold start.** (commit `7aedc53`) Read the nine pairing keys with one `Promise.all`.
- [ ] **Dead code.** `avatar-fab.tsx`, the empty `navigation.type.ts`, the
  unused `voiceEnabled` prop; decide whether the four zero-consumer Watermelon
  services stay synced or go.
- [ ] **Role contract test.** Parse the backend `role-access.hxx` in a test and
  compare it with the app table; fix the guard/guest `user` drift.

### Phase 1 — Data-layer efficiency (no visible UI change)

- [ ] `viewCacheService.write` skips identical content (no write, no notify),
  so React keeps the same reference and does not re-render.
- [ ] The coordinator becomes a projection registry; each feature owns its
  projection and subscribes only to its own sources:
  ```ts
  type ViewProjection<S extends Record<string, Observable<unknown>>> = {
    key: ViewCacheKey;
    sources: (ctx: { userId: string }) => S;
    project: (values: { [K in keyof S]: ObservedValueOf<S[K]> }, ctx: { now: Date }) =>
      Array<{ scope?: string; value: unknown; rows?: boolean; limit?: number }>;
    scoped?: 'replace' | 'track';
  };
  ```
- [ ] `scoped: 'track'` removes stale scopes (deleted cameras and projects).
- [ ] One camera snapshot instead of three; the calendar keeps the active
  month ±1; the people search filters cached rows in memory.
- [ ] Unit tests for each pure `project` function.

### Phase 2 — Remote resources and actions

```ts
function useRemoteResource<T>(opts: {
  cacheKey?: ViewCacheKey; scope?: string;
  load: () => Promise<IServiceResponse<T>>;
  enabled?: boolean; refetchOnFocus?: boolean; staleMs?: number;
}): { data: T | null; status: 'idle' | 'loading' | 'ready' | 'failed';
      reload: () => Promise<void>; mutate: (update: (prev: T | null) => T) => void };

function useServiceAction<A extends unknown[], R>(
  action: (...args: A) => Promise<IServiceResponse<R>>,
  opts?: { confirm?: (...args: A) => ConfirmOptions; success?: TranslationKey }
): { run: (...args: A) => Promise<R | null>; pending: boolean };
```

- [ ] Migrate `use-settings`, then `use-guard` (mode, guests, incidents,
  decisions as separate resources), delete `use-guard-mode`, then the two
  camera-detail effects.
- [ ] Replace the confirm → call → toast blocks with `useServiceAction`.
- [ ] Result: security, guard mode and the camera device panel paint from
  cache; the full-screen spinner and the PTZ flicker disappear.
- [ ] Push guard-mode and settings changes over `/sync` so every device
  updates live (backend change, coordinated).

### Phase 3 — Design-system primitives

One primitive per change, its call sites migrated and the old copies deleted
in the same change.

| Primitive | Replaces |
|---|---|
| `Panel { title?, description?, count?, action?, tone, padding, fill }` | `SecurityPanel`, `SettingsGroup`, card panels in people/users/cameras (~22 files) |
| `SectionHeader { title, count?, action? }` | `SectionHeading` and panel headers |
| `EmptyState { icon, title, hint?, action?, variant: 'page' \| 'panel' \| 'inline' }` | `SecurityEmpty`, ad-hoc empty texts |
| `CreateTile { label, hint?, onPress, layout: 'tile' \| 'row' \| 'fill' }` | 8 dashed tiles |
| `ResponsiveGrid<T> { items, keyOf, renderItem, breakpoints, gap, trailing? }` — width seeded from the window so the first frame is laid out | camera and project grids |
| `ListRow` (extended) + `VirtualList<T>` (LegendList, recycled) | people, users, invitations, role rows |
| `FilterChips<T>`, `StatusBadge` | 13 chips, 7 status ternaries |
| `ToggleRow` on `ui/switch` | `cameras/setting-row` (removes calendar→cameras and security→cameras edges) |
| `AppShell` + `ScreenHeader` | `DashboardShell` + `ScreenShell` |

Typography sweep: legacy `h1–h4` (15 uses) and raw `text-xs/sm/…` (108 uses)
to the documented scale, then a lint rule against them.

### Phase 4 — Routing, shell and guards

- [ ] `(app)/_layout.tsx` with `Stack.Protected` and the nav mounted once: no
  per-screen auth redirects, no rail remount or cross-fade per navigation.
- [ ] Role guards from the policies (`requireRole`, people access) instead of
  hand-written checks in settings, users, people and cameras.
- [ ] `entryPermissions(entry, can)` for the eight agenda repeats.
- [ ] Split `app/index.tsx` into an entry resolver and the home screen; show
  the branded splash while resolving instead of a blank view.

### Phase 5 — Feature folders (one domain per change)

Order, lowest risk first: settings → security → projects → people/users →
agenda → cameras → home → auth/welcome → voice. For each domain the
components, single-consumer hooks and libs, domain constants, types and
`core/services/<domain>*` move into `features/<domain>/`, and the route file
becomes one line. Large screens become a hook plus a view
(`useQrScanner`, `useFaceCapture`). The face native module moves behind a
service with a web stub. The call bridge reads a coordinator projection
instead of observing Watermelon from a hook.

The boundary gate turns on at the start of this phase with a temporary
allow-list that shrinks with each domain and is deleted at the end.

### Phase 6 — Contracts and tests

- [ ] Zod schemas in `core/contracts/` for the HTTP DTOs the app reads, and a
  contract test that validates every recorded backend fixture
  (`backend/scripts/fixtures/http/*.json`) against them.
- [ ] Enum assertions against the protos (`SyncOperation`, `TableName`, voice
  enums) and the default route ports against the service configs.
- [ ] Tests for `toNetError`, the three QR parsers, refresh outcomes and dates.
- [ ] `noUncheckedIndexedAccess`, feature by feature.
- [ ] Visual regression of the web export at three widths (Playwright).

### Phase 7 — Rendering polish (measure on a low-end Android first)

- [ ] React Compiler on, then remove manual memoization only where it covers.
- [ ] `useWindowClass` memoized on class and orientation; width read
  separately.
- [ ] `MosaicChart`: one animated container, no placeholder pattern posing as
  data.
- [ ] Tauri trust boundary: Rust reads the pairing from the keyring; the JS
  API shrinks to `{ method, path, headers, body }`.
- [ ] Deep links: an allow-list in `+native-intent`; the invitation token
  leaves route params for a short-lived store slot.

## 5. Order and expected wins

| Priority | Phase | Effort | Win |
|---|---|---|---|
| 1 | 0 | ~1 day | several MB off desktop and mobile builds, faster cold start, Tauri hardened, contract drift caught |
| 2 | 1 | 2–3 days | a sync patch re-renders only what changed |
| 3 | 2 | 2–3 days | every screen paints from cache; live guard/settings |
| 4 | 3 + 4 | 1–2 weeks | consistent design, smoother navigation, 1000-row lists scroll on phones, ~30–40% less code in shared components |
| 5 | 5 | 1–2 weeks | the frontend mirrors the backend's feature architecture, enforced by a gate |
| 6 | 6 + 7 | ongoing | contracts fail CI instead of production; final rendering polish |
