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
  15 tables), `rxjs` (service observables → view-cache projections → React via `useViewCacheRows`), `zod` +
  `react-hook-form` (forms), custom i18n engine (es/en). The React Compiler is on
  (`app.json` → `experiments.reactCompiler`).
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
  app/          expo-router pages (file-based routes); native-only routes via Stack.Protected in _layout.tsx;
                every signed-in screen lives in (app)/, whose layout guards the session and mounts the nav once
  core/         infra: services, types, interfaces, stores (zustand)
  features/     one folder per domain (a vertical slice): screens/ components/ hooks/ services/;
                its index.ts is the public API, and a route file is one line re-exporting a screen
  shared/       what 2+ consumers use: components (ui/ and layout/ are the design system), constants, libs, hooks
  global.css    Uniwind/Tailwind tokens (source for styling)
```

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
- **Text and icons meet WCAG AA (4.5:1) on `background` and `card`.** Status
  and accent colors are fills; their text/icon twins are `error-strong`,
  `warning-strong`, `accent-strong` (`text-error-strong`, never `text-error`).
  `success`, `foreground-secondary`, `muted-foreground` and `placeholder` are
  already text-safe in both themes. A new color that carries text gets a
  measured strong twin, not a guess.
- **Type scale.** `Text` variants are the scale: `display` (32/38),
  `title` (24/30), `headline` (20/26), `subhead` (17/24), `body` (15/22),
  `label` (14/20 medium), `caption` (13/18 muted), `micro` (11/14 muted).
  New UI uses them instead of `text-[Npx]`; `Text` caps OS font scaling at
  1.6x so layouts survive the largest accessibility sizes. The legacy
  `h1–h4`/`muted`/`lead`/`large` variants are gone, and lint rejects a raw
  `text-xs…text-9xl` or `text-[Npx]` in a `className` outside
  `src/shared/components/ui/` (the primitives that implement the scale).
- **Touch targets.** Buttons are at least 44pt tall on touch platforms
  (`default` 44, `lg` 48, `icon` 44; `sm` 40 plus hit slop) and compact on
  web/desktop where a pointer is precise.

### 8. Theme preference

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

- TypeScript strict with `noUncheckedIndexedAccess`. Run `bunx tsc --noEmit` before committing — **0 errors**.
- Barrel imports only (`@/shared/constants`, `@/core/types`, `@/core/interfaces`).
- No unused imports (`bun run lint` must be clean).
- Keep design language premium/calm: warm neutrals, grafito actions + arena accent,
  a calm radius scale (sm 6 / md 10 / lg 12 / xl 14 / 2xl 16 / 3xl 20 / 4xl 24,
  `global.css` `@theme`, never a literal `rounded-[Npx]`; see CONTEXT.md
  "Calmer corners"), soft shadows.
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

### 10b. No comments in code — measured, not reviewed

There are no comments in the code, without exception: not in TypeScript or
JSX (`{/* … */}` included), Kotlin, Swift, Rust, Gradle, C++, CSS, XML or the
config and ignore files, not as doc blocks, not as commented-out code, and not
as lint or type suppressions (`eslint-disable`, `@ts-expect-error`,
`//noinspection`). If code needs a comment to be understood, rewrite it (a
better name, a helper, a type); the "why" of a decision goes to `CONTEXT.md`.
What stays is what is not a comment: a shebang and the triple-slash
`<reference>` directives a tool generates. Every agent and subagent working on
this tree writes no comments, and a prompt that delegates work says so.

`scripts/check-comments.ts` (`bun run check:comments`) lexes every file git
tracks — TypeScript and JavaScript through the TypeScript parser, the
C-family languages through a lexer that knows nested blocks, raw strings and
Rust lifetimes — fails on any comment and on any file type it cannot classify,
and `--fix` removes what it finds. `uniwind-types.d.ts` is generated and
skipped.

### 10b-2. Import boundaries — measured, not reviewed

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

### 10c. Logging and tests

- `console` is allowed only in `src/core/services/log.ts` (`log.error`,
  `log.debug`; debug prints only in `__DEV__`) and in `scripts/`; the lint
  rule `no-console` is an error everywhere else.
- Pure logic is unit-tested with `bun test` under `tests/unit/`
  (`bun run test` type-checks the tests with `tests/tsconfig.json`, then runs
  them). `tests/setup.ts` stubs what the constants barrel pulls in
  (`react-native`'s `Platform`, the lucide icons read from
  `icon.constant.ts`, `window`). A fix to pure logic lands with its test.
- `bun run verify` runs every gate: comments, typecheck, lint, tests.

### 11. Networking layer (Nitro + Tauri + secure-storage)

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
  pairing port. Never concatenate `instance.port` by hand. A server mDNS cannot
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
    `configure` when the config is already applied (key `caPem|host|ip`); `net-persistence.ts`
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

### 12. Local persistence (WatermelonDB)

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
- Relations point at `camera` / `reminder` only. Toward `user`, expose the raw id:
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
  enabled? })` (`shared/hooks/use-remote-resource.ts`): it paints the last
  answer from the view cache, refetches on focus, ignores stale answers, and
  `mutate` updates the cache optimistically. `load` must be stable (a
  module-level arrow or a `useCallback`). A server action goes through
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

### 12c. People, invitations and portrait privacy

- Roles shape the local projection, not merely the buttons: Owner sees
  `/users` (users + invitation metadata); Guard sees `/people` (directory only);
  Resident/Guest see their own profile only. Reuse `peopleAccessOf(view)` from
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
  Owner also sees every user's sessions in `/users` ("Dispositivos
  conectados" and the per-user access dialog), closes them and turns
  accounts off or back on. `sessionAccessForRole` mirrors the backend's
  `kSessionAccess`, owner rows included (`manageOthers`).
- Which role may open which screen is one table, `shared/libs/route-access.ts`
  (`routeFallback(path, view)`): the `(app)` layout redirects with it and the
  nav hides the tabs it refuses. A screen never checks its own role. A role
  whose module is off reaches only Inicio (the calm inactive-role screen,
  `features/access`: panic, the person's own reminders, the module request,
  profile and sign-out, each by its baseline capability) and the profile.
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

### 12e. Onboarding flows and modules

- **A flow is data.** `features/auth/model/onboarding-flow.ts` declares each
  flow as steps `{ id, screen, label, when, skippable }`: Owner `pair →
  privacy → face → modules → module-privacy → meet`, invited `invitation →
  privacy → face → meet`. Screens never hard-code the next route or a step
  count: they call `nextHref(flow, step, { native, moduleSignals })` and
  render `<OnboardingSteps flow step />`,
  which hides itself when a platform sees fewer than two steps (the desktop
  only pairs). The flow travels in the route as `mode`
  (`owner-enroll`/`invite-enroll`, privacy and face) or `flow` (the rest);
  `flowOf` reads either. A new step is one entry in `ONBOARDING_FLOWS` and a
  screen.
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
  signals). Module cards carry the intro of the catalog.
- **Reminders and the activity.** Reminders are core: `features/reminders`
  (Inicio always; `/reminder` HTTP, optimistic, own rows only) and the Owner's
  `features/activity` (`GET /sync/activity`, keyset paging, filters) are
  slices of their own.

### 13. Avatar procedural (asistente visual)

- El avatar de Argus es un **bubble-head 2D procedural** renderizado con
  **react-native-svg** (cross-platform: native + web/Tauri, sin CanvasKit). NO hay
  loader platform-split (`avatar-loader.{native,web}.tsx` NO existe) — el barrel
  `src/features/voice/components/avatar.tsx` es un solo archivo y funciona en ambas.
- **Geometría pura sin React**: `src/features/voice/model/avatar-geometry.ts`
  (`computeFaceGeometry(size)`) — los consumidores la memorizan con `useMemo`
  (solo `size` cambia los paths; el resto del movimiento es transform/opacity).
- **Presets por estado**: `src/features/voice/constants/avatar.ts`
  (`AVATAR_STATE_PARAMS: Record<AvatarState, AvatarExpression>` — eyeOpen, pupilX/Y,
  browTilt/raise, headTilt, headBob, sparkle, driftSpeed) + `AVATAR_PALETTE`
  (light/dark) + tiempos de transición/blink.
- **Tipos en `src/core/types/avatar.type.ts`** (`AvatarState`, `AvatarExpression`);
  estado en `src/features/voice/stores/avatar.store.ts` (`useAvatarStore`, reemplazó orb.store).
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
  (`welcome/index`). Los estados `idle/listening/thinking/
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
- **Missing keys/params**: dev-only `log.error` + fallback to the default
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
bun run test           # unit tests (tests/unit, bun test)
bun run check:comments # rule 10b gate; --fix removes comments
bun run verify         # comments + typecheck + lint + tests
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
| `src/core/services/auth.service.ts` | Auth API: `login` (multipart `image`), `register`, `serverStatus` (`/pairing/status`), `status`, `logout` |
| `src/core/services/session.service.ts` | Ciclo de sesión: establish/refresh/updateUser/clear, cola serializada sobre secure-storage; inicia/detiene el coordinador de cache local |
| `src/core/services/view-cache.service.ts` | Valores serializados MMKV/localStorage por usuario + señal de revisión; no mantiene filas en memoria JS |
| `src/core/services/view-cache-coordinator.service.ts` | Registro de proyecciones: único suscriptor Watermelon, comparte las fuentes de la sesión y refresca derivados diarios |
| `src/core/services/view-cache/` | Proyecciones puras por dominio (`*.projection.ts`), `projection.ts` (`ViewProjection`, `applyWrites`, `startProjection`) |
| `src/core/interfaces/{view-cache,audit-log}.interface.ts` | Contratos de snapshots de vista y payloads de auditoría; siempre importar desde el barrel de interfaces |
| `src/core/types/{view-cache,audit-log}.type.ts` | Uniones y tipos auxiliares de cache/auditoría; siempre importar desde el barrel de tipos |
| `src/core/types/sync.type.ts` | `SYNC_TABLE_KEYS` (15 tablas) + cursores normales `createdAt` y de auditoría `{lastId, watermarkId}` por usuario |
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
| `src/features/reminders/` | Reminders on Inicio: list, create, edit, complete, delete |
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
| `src/shared/components/ui/` | Design system: `Text`, `Button`, `IconButton`, `Icon`, inputs and forms, dialogs/sheets/menus, `Panel`, `SectionHeader`, `EmptyState` (page/panel/inline), `CreateTile`, `ResponsiveGrid`, `ListRow`, `InfiniteList`, `FilterChips`, `StatusBadge`, `Switch`/`ToggleRow`, `TimelineItem`, `ConfirmDialog`, `Toaster` |
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
| `src/shared/components/ui/morph-icon.tsx` | Icono animado (morphicons): morphs por `setNativeProps`, `reducedMotion="user"`, ref `morphTo`/`set` |
| `src/core/types/qr.type.ts` | `QrScanPurpose`, `QrScanStatus`, `QrScanFeedback`, `QrScanConfig` |
| `src/shared/hooks/use-reduce-motion.ts` | OS "reduce motion" setting, live |
| `src/core/stores/` | Zustand stores (barrel): `auth`, `locale`, `onboarding`, `navigation`, `qr-scan`, `toast`, `confirm` (the avatar store lives in `features/voice/stores`) |
| `src/core/i18n/` | Custom i18n engine (barrel: `t`/`setLanguage`/`getLanguage`, `translate`, `locales/`) |
| `src/core/i18n/locales/schema.ts` | `I18nSchema`/`TranslationKey`/`TranslateFn` derivation from the `es` dictionary |
| `src/core/types/i18n.type.ts` | i18n public types (barrel surface) |
| `src/core/stores/locale.store.ts` | `useLocaleStore` — language preference/state, `app.language` |
| `src/shared/hooks/use-translation.ts` | `useTranslation()` reactive hook (real-time) |
| `src/shared/constants/i18n.constant.ts` | `I18N_STORAGE_KEY`, `I18N_DEFAULT_LANGUAGE`, `SUPPORTED_LANGUAGES`, `LANGUAGE_OPTIONS` |
| `src/features/voice/constants/avatar.ts` | `AVATAR_STATE_PARAMS`, `AVATAR_PALETTE`, blink/transition times |
| `src/shared/hooks/use-theme-preference.ts` | Theme preference get/set |
| `src/shared/components/layout/navigation-theme.ts` | `NAV_THEME` + `BG_COLORS` (React Navigation) |
| `src/global.css` | OKLCH tokens + aliases + base/utilities |
| `src/app/+native-intent.ts` | Deep-link allow-list: signed-in screens and `/cameras/<id>` pass (query and hash dropped), anything else goes to `/` |
| `src/app/_layout.tsx` | Root layout: theme init, `SystemBars`, `SessionGate`, guards native-only, Stack con crossfade (`fade`) + overlays globales (nav, confirm, toaster) |
| `CONTEXT.md` | Full project history and decisions |
