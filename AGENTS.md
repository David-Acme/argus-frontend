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
  15 tables), `rxjs` (service observables → React via `useObservable`), `zod` +
  `react-hook-form` (forms), custom i18n engine (es/en).
- **Media/Platform**: `expo-camera` (barcode/QR + face capture, mobile),
  `expo-audio`, `react-native-svg` + `qrcode` (QR rendering y avatar
  procedural). Platform/Tauri flags centralized in
  `common.constant.ts` (`IS_WEB`, `IS_NATIVE`, `IS_ANDROID`, `IS_IOS`, `IS_TAURI`).
- **Local network**: **Nitro** module (`modules/argus-net`, Kotlin/Swift) for mobile and
  **Tauri 2 + Rust** (`src-tauri/`) for desktop; secrets with `expo-secure-store`
  (mobile) / `keyring` crate (desktop). See `CONTEXT.md` → "Secure networking".
- **Package manager**: **bun** (`bun.lock`). Path alias `@/* → src/*`.

## MUST-FOLLOW Rules

### 1. Folder structure & file naming

```
src/
  app/          expo-router pages (file-based routes); native-only routes via Stack.Protected in _layout.tsx
  core/         infra: services, types, interfaces, stores (zustand)
  shared/       UI: components, constants, libs, hooks
  global.css    Uniwind/Tailwind tokens (source for styling)
```

**Every file is `kebab-case` — including component files.** The exported symbol
stays `PascalCase`; only the file name is kebab.

```
src/shared/components/avatar/avatar.tsx        → export default function Avatar()
src/shared/components/avatar/avatar-fab.tsx    → export function AvatarFab()
src/shared/components/ui/native-only-animated-view.tsx
src/shared/hooks/use-mic-level.ts
src/core/stores/qr-scan.store.ts
```

- Never `Avatar.tsx` (kebab-case file, PascalCase export).
- Multi-word compounds split on `-`: `avatar-fab`, `use-theme-preference`,
  `qr-scan.store`.
- Suffixed families keep their suffix after the kebab name:
  `{domain}.constant.ts`, `{domain}.type.ts`, `{domain}.interface.ts`,
  `{domain}.store.ts`, `{domain}.native.ts` / `{domain}.web.ts`.
- **Only documented exception**: `modules/*/src/{Name}.nitro.ts`
  (`ArgusNet.nitro.ts`, `ArgusCamera.nitro.ts`, ...). Nitrogen requires the
  spec file name to match the HybridObject name declared in
  `nitro.json` (`autolinking.ArgusNet`, `androidCxxLibName`, `iosModuleName`) —
  renaming it breaks codegen.

### 2. Constants — `*.constant.ts` + barrel

- `src/shared/constants/{domain}.constant.ts` (e.g. `color.constant.ts`,
  `theme.constant.ts`, `icon.constant.ts`).
- Barrel: `src/shared/constants/index.ts` → `export * from './{domain}.constant'`.
- Consumers import from `@/shared/constants` (never the file directly).

### 3. Types — `*.type.ts` + barrel

- `src/core/types/{domain}.type.ts` — aliases and unions (e.g. `ThemePreference`,
  `StoragePrimitive`, `IconName`).
- Barrel: `src/core/types/index.ts`.

### 4. Interfaces — `*.interface.ts` + barrel

- `src/core/interfaces/{domain}.interface.ts` — `I*` contracts (e.g. `IStorageService`).
- Barrel: `src/core/interfaces/index.ts`.

### 5. Services — platform-split pattern

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

### 6. Icons — centralized registry (critical)

- **Only** `src/shared/constants/icon.constant.ts` imports `lucide-react-native`.
- To add an icon: import it there + add a **kebab-case** key to `ICONS`.
- Consume **only** via `Icon` from `@/shared/components/ui/icon`:
  ```tsx
  <Icon name="shield-check" className="size-5 text-muted-foreground" />
  ```
- `IconName = keyof typeof ICONS` lives in `src/core/types/icon.type.ts`.
- **Never** import lucide directly in components or pages.

### 7. Colors — canonical HEX + OKLCH mirror

- `src/shared/constants/color.constant.ts` — **canonical HEX** (JS/native/React
  Navigation source of truth).
- `src/global.css` — OKLCH tokens for Tailwind/Uniwind. **MUST mirror
  color.constant.ts** — keep both in sync manually.
- Semantic tokens: `background`, `surface`, `surface-secondary`, `card`,
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

### 8. Theme preference

- `ThemePreference = 'system' | 'light' | 'dark'` in `core/types/theme.type.ts`.
- `src/shared/hooks/use-theme-preference.ts` → `getThemePreference()` /
  `setThemePreference()` (persists to storage + `Uniwind.setTheme`).
- `src/app/_layout.tsx` applies the persisted preference on mount.
- React Navigation colors via `NAV_THEME` / `BG_COLORS` in
  `src/shared/libs/theme.ts` (HEX from `color.constant.ts`).
- **Native system bars**: `SystemBars` from `react-native-edge-to-edge` (official
  Expo-supported API) is used **directly** in `_layout.tsx` — **no wrapper
  component**: `<SystemBars style={isDark ? 'light' : 'dark'} />`. It replaces
  the deprecated `expo-status-bar`/`expo-navigation-bar` APIs in edge-to-edge
  apps, handling the status bar (notification bar) + Android navigation-bar
  buttons. Config plugin in `app.json` (`parentTheme: "Default"`,
  `enforceNavigationBarContrast: false` for a fully transparent button nav bar
  that follows the app background). NOTE: plugin options require a development
  build (not Expo Go).

### 9. GOLDEN RULE — component/page structure

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

### 10. General constraints

- TypeScript strict. Run `bunx tsc --noEmit` before committing — **0 errors**.
- Barrel imports only (`@/shared/constants`, `@/core/types`, `@/core/interfaces`).
- No unused imports (`bun run lint` must be clean).
- Keep design language premium/calm: warm neutrals, grafito actions + arena accent,
  hierarchical radii (sm 14 / md 18 / lg 24 / xl 32), soft shadows.
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
  **disabled in `eslint.config.js`** — a known false positive with Reanimated shared-value
  writes; do not re-enable it and do not scatter per-line disable comments.

### 11. Networking layer (Nitro + Tauri + secure-storage)

One JS API with two native backends. The app **never** talks to the backend from the
WebView: mobile → **Nitro** module, desktop → **Tauri (Rust)** commands.

- **`src/core/services/net/`** → `IArgusNetService`
  (`discover / pair / request / isPaired / instance / unpair`). `net.native.ts` calls
  the Nitro module; `net.web.ts` calls `invoke('argus_*')`; `net-persistence.ts` stores
  the pairing in secure-storage (shared). Consumers only import the barrel
  `@/core/services/net`.
- **`src/core/services/secure-storage/`** → `ISecureStorageService` **async**
  (`getStringAsync/setStringAsync/deleteAsync/hasAsync`). Native = `expo-secure-store`;
  web = Tauri command + `keyring` crate (fallback `localStorage`). Keys **separate**
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
    `configure` when the config is already applied (key `caPem|host|ip`); `net-persistence.ts`
    caches the bound instance in memory (invalidated in `savePairing`/`clearInstance`)
    to avoid re-reading secure-storage on every request.
  - **Verify the fingerprint during pairing (all 3 platforms)**: after receiving
    `caPem` + `caFingerprint`, parse the cert and compare `SHA-256(DER)` in uppercase
    hex against `caFingerprint`. If it does not match → `FINGERPRINT_MISMATCH`. This
    closes the "trust-on-first-use" gap during the pairing trust-any call.
  - **Structured errors**: natives throw `IllegalStateException`/`NSError`/
    `Err(String)` with the format **`CODE|human message`** (`INVALID_PAIRING_CODE`,
    `FINGERPRINT_MISMATCH`, `CERT_NOT_TRUSTED`, `HOST_NOT_ALLOWED`, `PAIRING_REQUIRED`,
    `NETWORK_ERROR`, ...). `toNetError()` parses the prefix; context fallbacks:
    `pair` → `NETWORK_ERROR`, `discover`/`request` → their codes.
  - iOS: resolve Bonjour with a single-resume guard; NetServiceBrowser requires `@MainActor`.
  - Multipart: the backend field for login is `image`.
- **Desktop `src-tauri/`**: Rust in `src/net/` (`discover`/`pair`/`http`/`secure`),
  commands `argus_*`. `frontendDist = ../dist` (`bun run web:build`). Verify with
  `cargo check` (requires `webkit2gtk-4.1` on Linux). `argus_request` uses a
  **pinned DNS resolver** (`reqwest::dns::Resolve`): `argus.local` → the discovery IP,
  same as Android's custom `Dns` (`.local` does not always resolve).
- **WebSocket (shipped)**: always native — RN's JS `WebSocket` does not trust
  the CA. `ArgusSocket` HybridObject in `modules/argus-net` (OkHttp /
  `URLSessionWebSocketTask` over the pinned CA session) and Tauri commands
  `argus_socket_open/send_text/send_binary/close`. Consumed through
  `netService.openSocket()`. **Two sockets**: the sync engine owns `/sync`
  (sync + emits + voice PCM), and the camera live view opens
  `/camera-stream` through `cameraMediaService` and pumps fMP4 fragments
  into the native `argus-camera` player. `http.service.ts` is the HTTP
  wrapper; there is no separate websocket wrapper.
- **Nitro modules are split by domain** (`modules/argus-net`, `modules/argus-mic`,
  `modules/argus-face`, `modules/argus-camera`), each with its own spec + nitrogen + Kotlin/Swift. They are
  registered in `android/settings.gradle` with explicit includes (autolinking does
  not pick up the symlinked local packages reliably) and linked by
  `scripts/link-argus-modules.mjs`. `argus-face` detects faces by **file URI**
  (`detectFaces(jpegUri)` → `FaceFrame { luminance, faces }`, normalized 0..1,
  top-left origin) — MLKit on Android (GMS), Vision on iOS.
- **Cross-device login (desktop QR)**: `POST /auth/device-login` creates a
  short-lived challenge bound to the DESKTOP device hash; the mobile approves it
  (`POST .../approve`, JWT) and the backend issues a session bound to that hash;
  the desktop polls `GET /auth/device-login/{id}` for the tokens (single use).
  `auth.service.ts` exposes `createDeviceLogin/approveDeviceLogin/pollDeviceLogin`;
  the QR JSON is built/parsed by `shared/libs/login-qr.ts` and rendered with the
  `QrCode` component (`qrcode` + react-native-svg). The desktop never uses the
  camera: pairing is a manual code, login is the QR.
- **Register with an existing face**: `POST /auth/register` no longer 409s on a
  duplicate face — it issues a session for the matched user and sets
  `alreadyRegistered` in the response (owner → admin session; anyone else → the
  client informs them "ya estás registrado" and continues).

### 12. Local persistence (WatermelonDB)

**The database is reached ONLY from `src/core/services/*.service.ts`.** There is
no `DatabaseProvider` and no `useDatabase`: a hook or a screen that imports
`@/core/database` is a bug.

```
core/database  ←  core/services/*.service.ts  ←  shared/hooks/use-observable  ←  UI
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
- Relations point at `camera` / `reminder` only. Toward `user`, expose the raw id:
  role filtering can leave that row absent locally and `Relation.fetch()` throws.
- **`DatabaseService<K>`** (`core/services/database.service.ts`) is the base class.
  Query primitives are **`protected`** so `Clause` never crosses the service
  boundary; the public surface of a service is domain-named.
- **`query.observe()` does NOT re-emit when a field changes** on a record already
  in the result set — only on enter/leave. Lists that render fields must use
  `observeManyWithColumns`.
- **`shared/hooks/use-observable.ts`** is the only bridge into React
  (`useSyncExternalStore`). It knows rxjs, not WatermelonDB. No
  `@nozbe/with-observables` (HOC, and the source of the React 19 peer conflict).
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

### 12b. Local-first cache, pagination and granular synchronization

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
  `view-cache-memory.ts` must not be reintroduced.
- `ViewCacheCoordinatorService` is the **only** owner of the Watermelon
  subscriptions that feed views. `sessionService` starts it once the user is
  established/restored and stops it before local projection/cache cleanup. A
  screen may request a semantic scope (currently calendar month or people
  filter), but may not subscribe to a model itself.
- Cache pages are semantic, not an unbounded dump: ordinary list pages have
  `VIEW_CACHE_PAGE_SIZE = 40`; agenda day/week/month reads the requested date
  range from its active calendar cache, and a month cache covers the 42-day
  visible grid. Keep only the active calendar scope. Pagination/filter SQL stays
  inside its `.service.ts`, never a component.
- The coordinator writes base snapshots whenever Watermelon changes and keeps
  the default cache fresh before navigation. A filter preserves its last MMKV
  result while its Watermelon query resolves, then replaces only that scoped
  cache; stale async filter results are discarded. A next-midnight refresh
  rebuilds date-derived dashboard/day snapshots.
- Initial normal sync is a full projection bootstrap; subsequent `Synchronize`
  pages use **`createdAt` only** for newly created rows and deletions. Field
  updates/revocations flow through global `audit_log` and user-scoped
  `user_audit_log`, whose cursors are monotonic `{ lastId, watermarkId }`.
  Fetch audit pages with `afterId/endId`, apply only each
  `changes[field].current` to Watermelon, and persist the cursor only after the
  page is applied. A missing audit target triggers a context recovery.
- Remote mutations may show loading only on the initiating control via
  `<Button loading>`; they must not replace a cached screen with a full-screen
  spinner. Detail routes must not redirect merely because their cache has not
  been populated yet.

### 12c. People, invitations and portrait privacy

- Roles shape the local projection, not merely the buttons: Owner sees
  `/users` (users + invitation metadata); Guard sees `/people` (directory only);
  Resident/Guest see their own profile only. Reuse
  `shared/libs/people-access.ts` instead of scattering role checks.
- The personal `/profile` and the directory preview use the neutral `user`
  icon. Do **not** cache, persist, preload or render a user portrait in a list,
  profile, MMKV, WatermelonDB or global store.
- A Guard can explicitly select a person and request a portrait verification.
  `portraitPreviewService` obtains/consumes a one-use server capability; the
  resulting data URI lives only in that open dialog's React state and is cleared
  when it closes or a newer request wins. Do not add image caching.
- Owner invitation QRs contain the opaque token plus pinned local server
  identity. The QR preview itself is single-display: dismissing or unmounting
  revokes its invitation. Do not persist its token or reconstruct it from
  invitation metadata.
- `AuthContextChanged` from `/sync` updates the signed-in role and requests a
  resync without treating a role change as logout. A deactivated account is the
  only case that must end the session.

### 12d. Responsive product rules

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

### 13. Avatar procedural (asistente visual)

- El avatar de Argus es un **bubble-head 2D procedural** renderizado con
  **react-native-svg** (cross-platform: native + web/Tauri, sin CanvasKit). NO hay
  loader platform-split (`avatar-loader.{native,web}.tsx` NO existe) — el barrel
  `src/shared/components/avatar/index.ts` es un solo archivo y funciona en ambas.
- **Geometría pura sin React**: `src/shared/libs/avatar-geometry.ts`
  (`computeFaceGeometry(size)`) — los consumidores la memorizan con `useMemo`
  (solo `size` cambia los paths; el resto del movimiento es transform/opacity).
- **Presets por estado**: `src/shared/constants/avatar.constant.ts`
  (`AVATAR_STATE_PARAMS: Record<AvatarState, AvatarExpression>` — eyeOpen, pupilX/Y,
  browTilt/raise, headTilt, headBob, sparkle, driftSpeed) + `AVATAR_PALETTE`
  (light/dark) + tiempos de transición/blink.
- **Tipos en `src/core/types/avatar.type.ts`** (`AvatarState`, `AvatarExpression`);
  estado en `src/core/stores/avatar.store.ts` (`useAvatarStore`, reemplazó orb.store).
- **Expresión → shared values** con `withTiming` (900 ms; 380 ms al hablar). La vida
  por frame vive en `useFrameCallback` (worklet): **blink Poisson** (2.6-5.4 s,
  `AVATAR_BLINK_*`), micro-saccades lentas, drift de cabeza (`sin` producto de dos
  frecuencias), bounce al hablar (`headBob`). Todo se aplica con `animatedProps`
  (`Animated.createAnimatedComponent(G/Ellipse/Circle/Line)` de react-native-svg)
  → **cero re-renders React por frame**.
- **Párpado = elipse piel con `ry` animado** sobre el ojo (blanco+pupila+highlight);
  la pupila viaja con la mirada (`pupilX/Y + saccade`), las cejas rotan sobre su
  pivote interno (`browTilt`).
- **Reduce motion**: drift/bob/saccades = 0 y el parpadeo se espacia (~+6 s); el
  rostro se queda quieto pero vivo.
- Integración: `welcome/voice` (estados de voz → `AvatarState`), saludo
  (`welcome/index`), home (`AvatarFab`). Los estados `idle/listening/thinking/
  speaking/error` se mapean a expresiones — nunca se deforma con el audio (sin
  lip-sync; el "hablar" es bounce de cabeza + brillo de ojos).


### 14. i18n — custom engine (no external library)

- **Dictionaries**: `src/core/i18n/locales/{locale}/` — one folder per locale;
  namespaces are **folders named like the routes** (`common/`, `screens/home/`,
  `screens/qr/`, `screens/not-found/`), each with an `index.ts` (route-folder
  convention). Default locale is `es`. `en` is forced to the same shape by
  `localeDictionaries satisfies Record<LanguageCode, I18nSchema>` in
  `locales/index.ts` — a key added in `es` but missing in `en` fails tsc.
- **Typed keys**: `TranslationKey` (public in `core/types/i18n.type.ts`, derived
  in `core/i18n/locales/schema.ts` from the `es` literal) is the flattened union
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
  init at module load (MMKV/localStorage are sync) — no layout effect needed.
- **Missing keys/params**: dev-only `console.error` + fallback to the default
  locale → returns the key as last resort. Never crashes.
- **Copy held by stores carries keys, never rendered text** (`QR_SCAN_PURPOSES`,
  `QrScanConfig`): translate at render time, so the store stays language-agnostic.
- `app.json` native plugin strings (`cameraPermission`) are NOT runtime-translatable.

## Commands

```bash
bun run dev            # expo start -c
bun run android        # expo start -c --android
bun run ios            # expo start -c --ios
bun run web            # expo start -c --web
bun run lint           # expo lint
bunx tsc --noEmit      # typecheck (must be 0 errors)
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
| `src/shared/constants/color.constant.ts` | Canonical color palette (HEX) |
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
| `src/core/services/auth.service.ts` | Auth API: `login` (multipart `image`), `register`, `hasAdmin`, `status`, `logout` |
| `src/core/services/session.service.ts` | Ciclo de sesión: establish/refresh/updateUser/clear, cola serializada sobre secure-storage; inicia/detiene el coordinador de cache local |
| `src/core/services/view-cache.service.ts` | Valores serializados MMKV/localStorage por usuario + señal de revisión; no mantiene filas en memoria JS |
| `src/core/services/view-cache-coordinator.service.ts` | Único suscriptor Watermelon que proyecta/pagina vistas hacia MMKV y refresca derivados diarios |
| `src/core/interfaces/{view-cache,audit-log}.interface.ts` | Contratos de snapshots de vista y payloads de auditoría; siempre importar desde el barrel de interfaces |
| `src/core/types/{view-cache,audit-log}.type.ts` | Uniones y tipos auxiliares de cache/auditoría; siempre importar desde el barrel de tipos |
| `src/core/types/sync.type.ts` | `SYNC_TABLE_KEYS` (15 tablas) + cursores normales `createdAt` y de auditoría `{lastId, watermarkId}` por usuario |
| `src/core/services/voice/` | `voiceService`: mic PCM por el socket de sync, observables STT/asistente, playback TTS |
| `src/core/services/invite.service.ts` | Invitaciones: `create` (Owner), `accept` pre-CA (trust-any + fingerprint) |
| `src/core/stores/auth.store.ts` | Sesión (zustand, auto-bootstrap al importarse; tokens secure-storage, user storageService) |
| `src/core/services/sync/` | Sync autónomo: bootstrap/altas/bajas (`createdAt`) + parches `audit_log`/`user_audit_log` por id (`audit-log-*`), mappers, DB utils y socket platform-split |
| `modules/argus-net/` | Nitro module: `ArgusNet` (HTTP) + `ArgusSocket` (WebSocket nativo), `trustAny` para TOFU |
| `src/core/database/` | WatermelonDB: adapters (`native`/`web`), `schema`, `migrations`, typed `collection()` |
| `src/core/database/tables/` | One file per table: `tableSchema` + `Model` + the `TABLES` registry |
| `src/core/services/database.service.ts` | `DatabaseService<K>` base class (protected query primitives) |
| `src/core/services/{domain}.service.ts` | Data services — the only code that reads the database |
| `src/shared/hooks/use-observable.ts` | Bridge genérico Service `Observable` → React (`useSyncExternalStore`); no es una API de rutas |
| `src/shared/hooks/use-cached-rows.ts` | Lectura síncrona de snapshots MMKV por revisión (`useViewCacheRows` / `useViewCacheValue`) |
| `src/shared/constants/database.constant.ts` | `DATABASE_NAME`, `SCHEMA_VERSION` |
| `modules/argus-mic/` | Nitro module de voz: `ArgusMic` (PCM s16le streaming) |
| `modules/argus-face/` | Nitro module de visión: `ArgusFace` (MLKit/Vision, detección por URI + luminancia) |
| `modules/argus-camera/` | Nitro view `ArgusCameraView`: decoder nativo del feed `/camera-stream` (ExoPlayer/Media3 en Android, `AVSampleBufferDisplayLayer` en iOS) con `bufferedBytes()` para el credit-window |
| `src/core/services/camera-media.service.ts` | Socket `/camera-stream`: subscribe/ack/unsubscribe, framing `0xA7`, reconexión con backoff y ack guiado por el decoder |
| `src/shared/components/cameras/camera-live-view.*` | Vista en vivo de la cámara (nativa) / placeholder en web |
| `src-tauri/` | Desktop (Tauri 2 + Rust: `mdns-sd`, `reqwest/rustls`, `keyring`) |
| `src/shared/components/ui/` | UI primitives (`button`, `text`, `icon`, `input`) |
| `src/app/welcome/` | Onboarding completo (Stack anidado con fade + progreso): `index` (saludo+avatar), `pairing/` (QR móvil / código desktop), `face/` (guidance MLKit, móvil-only), `voice/` (avatar+voz, móvil-only) |
| `src/app/login/index.tsx` | Desktop: QR de login cruzado (device-login) + polling + espera de propietario |
| `src/app/approve/index.tsx` | Móvil: escanear el QR del otro dispositivo y aprobar la sesión |
| `src/app/qr/index.tsx` | QR scan route (native-only, `expo-camera`; web → redirect to `/`) |
| `src/app/index.tsx` | Entry router (unpaired→welcome, paired→login/dashboard) + DashboardScreen |
| `src/app/agenda/` · `projects/` · `cameras/` · `people/` · `users/` · `profile/` | Tabs principales: calendario mes/semana/día, proyectos+tareas, cámaras (+`[id]`: PTZ/zonas/talk), directorio Guard, gestión Owner + QR invitación, perfil |
| `src/shared/components/dashboard/` | Familia dashboard (23): camera grid/tile, activity, nav rail/bottom nav, charts, popovers |
| `src/shared/components/session/session-gate.tsx` | Auth bootstrap y puerta de UI autenticada; no observa ni “prime” Watermelon |
| `src/shared/components/face/` | Guidance facial: `face-guide-overlay` (máscara+óvalo+pill), `face-frame` |
| `src/shared/hooks/use-face-guide.ts` | Muestreo de cámara → `argusFace.detectFaces` → estado de guía + auto-capture |
| `src/shared/constants/face.constant.ts` | Umbrales del guidance (zonas, ángulos, luz, muestreo) |
| `src/shared/components/qr/` | Scanner UI: `qr-guide-frame`, `qr-scan-sheet`, `qr-manual-entry` |
| `src/shared/constants/qr.constant.ts` | `QR_SCAN_PURPOSES`, `QR_SCAN_FEEDBACK`, scan timings |
| `src/shared/constants/morph-icon.constant.ts` | `MORPH_ICONS` — registro de iconos animables (datos `lucide` para morphicons) |
| `src/shared/constants/welcome.constant.ts` | Entrada por turnos del welcome (`WELCOME_*_MS`) |
| `src/shared/components/ui/morph-icon.tsx` | Icono animado (morphicons): morphs por `setNativeProps`, `reducedMotion="user"`, ref `morphTo`/`set` |
| `src/core/types/qr.type.ts` | `QrScanPurpose`, `QrScanStatus`, `QrScanFeedback`, `QrScanConfig` |
| `src/shared/hooks/use-reduce-motion.ts` | OS "reduce motion" setting, live |
| `src/core/stores/` | Zustand stores (barrel): `auth`, `avatar`, `locale`, `onboarding`, `navigation`, `qr-scan`, `toast`, `confirm` |
| `src/core/i18n/` | Custom i18n engine (barrel: `t`/`setLanguage`/`getLanguage`, `translate`, `locales/`) |
| `src/core/i18n/locales/schema.ts` | `I18nSchema`/`TranslationKey`/`TranslateFn` derivation from the `es` dictionary |
| `src/core/types/i18n.type.ts` | i18n public types (barrel surface) |
| `src/core/stores/locale.store.ts` | `useLocaleStore` — language preference/state, `app.language` |
| `src/shared/hooks/use-translation.ts` | `useTranslation()` reactive hook (real-time) |
| `src/shared/constants/i18n.constant.ts` | `I18N_STORAGE_KEY`, `I18N_DEFAULT_LANGUAGE`, `SUPPORTED_LANGUAGES`, `LANGUAGE_OPTIONS` |
| `src/shared/components/avatar/` | Avatar procedural: `avatar.tsx`, `avatar-fab.tsx`, barrel |
| `src/shared/constants/avatar.constant.ts` | `AVATAR_STATE_PARAMS`, `AVATAR_PALETTE`, blink/transition times |
| `src/shared/libs/color.ts` | `hexToRgba` / `hexToHsv` (shader uniform helpers) |
| `src/shared/hooks/use-mic-level.ts` | Live mic metering (expo-audio, native + web) |
| `src/shared/hooks/use-theme-preference.ts` | Theme preference get/set |
| `src/shared/libs/theme.ts` | `NAV_THEME` + `BG_COLORS` (React Navigation) |
| `src/global.css` | OKLCH tokens + aliases + base/utilities |
| `src/app/_layout.tsx` | Root layout: theme init, `SystemBars`, `SessionGate`, guards native-only, Stack con crossfade (`fade`) + overlays globales (nav, confirm, toaster) |
| `CONTEXT.md` | Full project history and decisions |
