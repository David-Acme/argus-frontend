# CONTEXT.md — Argus Frontend project memory

> This file preserves the project's intent, decisions and state so context is
> never lost between sessions. Update it whenever a significant decision is made.

## What Argus is

- **Argus** is a 100% local AI platform for the home: intelligent security guard
  + virtual assistant. The mobile app is the client for the on-device backend
  (`/backend` in the parent repo: face auth, LLM, vision, STT/TTS, WebSocket sync).
- Product identity: security + AI + IoT, but the design is **premium, calm,
  professional, minimal, timeless** — NOT cyber-security clichés (no neon, no
  blue-hacker gradients, no glows, no sci-fi). References: Apple, Linear, Arc,
  Notion Calendar, Raycast, Threads.
- Cloud only transports packets; every model runs locally.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Expo SDK 57, React Native 0.86, React 19.2 |
| Language | TypeScript ~6.0.3, `strict: true` |
| Routing | Expo Router (file-based, `src/app`) — web in **SPA** mode (`output: "single"`, no SSR) |
| Styling | Tailwind CSS v4 via **Uniwind** (`src/global.css`), `tw-animate-css` |
| UI | React Native Reusables (`@rn-primitives/portal`, `slot`) + custom `button/text/icon` |
| Media | `@shopify/react-native-skia` (render), `expo-camera` (barcode/QR scan, mobile), `expo-audio` (record/playback), `expo-asset` |
| Platform | `common.constant.ts` → `IS_WEB` / `IS_NATIVE` / `IS_ANDROID` / `IS_IOS` / `IS_TAURI` |
| State | Zustand v5 (in use: `useQrScanStore` for the pairing-QR value; more planned) |
| Storage | `react-native-mmkv` (native) / localStorage (web) via `storageService`; **secrets** (caPem, JWT) via `secureStorageService` (`expo-secure-store` on mobile / `keyring` crate on Tauri) |
| Icons | `lucide-react-native` — **centralized** in `icon.constant.ts` only |
| System bars | `react-native-edge-to-edge` (official Expo API, `SystemBars` direct, no wrapper) |
| Package manager | bun (`bun.lock`) |

## Architecture (settled conventions)

- **3 buckets**: `src/app` (routes), `src/core` (infra: services/types/interfaces),
  `src/shared` (UI: components/constants/libs/hooks).
- **File naming is `kebab-case` everywhere, components included** (`orb.tsx`,
  `orb-shader.ts`, `use-mic-level.ts`, `qr-scan.store.ts`). Exported symbols stay
  PascalCase — only file names are kebab. Sole exception:
  `modules/argus-net/src/ArgusNet.nitro.ts` (nitrogen codegen requires it).
- **Constants** → `src/shared/constants/{domain}.constant.ts` + barrel `index.ts`.
  `common.constant.ts` centralizes the platform/Tauri flags (`IS_WEB`, `IS_NATIVE`,
  `IS_ANDROID`, `IS_IOS`, `IS_TAURI`) — use them for **logic branching**; `Platform.select`
  stays only for per-platform CSS classes.
- **Types** (aliases/unions) → `src/core/types/{domain}.type.ts` + barrel.
- **Interfaces** (`I*`) → `src/core/interfaces/{domain}.interface.ts` + barrel.
- **Services** → `src/core/services/{domain}/` with `{domain}.native.ts` /
  `{domain}.web.ts` (+ `.ios`/`.android` if needed) + typed `index.ts` barrel.
  Resolution: Metro (runtime) + `moduleSuffixes: ['.native', '.web', '']` (TS).
  Consumers only touch the barrel.
- **Icons**: only `icon.constant.ts` imports lucide. Everything else uses
  `<Icon name="kebab-case-key" />`.
- **Golden rule (structure)**: file = Imports → Types → Declarations; component
  = hooks/vars/useMemo → functions/callbacks → effects → render. See `AGENTS.md`.
- **React imports**: runtime imports are named (`useState`, `useEffect`, ...),
  never `import * as React`; `React.` namespace only in type positions (UMD global).
- **Official Expo/native APIs direct, no wrapper** (e.g. `SystemBars`).

## Native system bars

- `react-native-edge-to-edge` (installed via `bunx expo install`), config plugin
  in `app.json`: `parentTheme: "Default"` + `enforceNavigationBarContrast: false`
  (makes the Android **button** navigation bar fully transparent so it follows
  the app background; default is semi-opaque). Plugin options require a
  development build (not Expo Go) — `expo-dev-client` is installed.
- `SystemBars` is used **directly** in `src/app/_layout.tsx`:
  `<SystemBars style={isDark ? 'light' : 'dark'} />` — no wrapper component.
  Per the official docs, `SystemBars` **replaces** the deprecated
  `expo-status-bar` / `expo-navigation-bar` APIs in edge-to-edge apps: it
  controls the status bar (notification bar) and the Android navigation-bar
  buttons (`light-content`/`dark-content`), both reactive to theme changes.
- Related: edge-to-edge disables `adjustResize` — `react-native-keyboard-controller`
  and `react-native-safe-area-context` (both already installed) are the
  recommended solutions.

## Color & theme system (2026-08)

### Design decisions

- Warm neutral base (hue ~70-80°, low chroma). No pure black in dark (`#181816`),
  no pure white except `card` in light (`#FFFFFF`, kept by design for contrast
  on the warm background `#F4F1ED`).
- **Dual accent** (user-approved): **Interactive = grafito** (`#525252` light /
  `#E4E1DB` dark) for buttons/actions — sober, technical, WCAG-safe (button text
  ≈ 4.9:1); **Accent = arena** (`#B89A63` light / `#D9BC85` dark) for details,
  focus rings and "online" states.
- Palette extracted from the user's reference image (warm taupe/beige family),
  kept faithful; missing tokens (info, disabled, overlay, border-subtle,
  surface-secondary, etc.) were derived from the same family.
- A11y note: light `muted-foreground` (#9D9792) is ~2.5:1 — reserved for
  captions/meta only; use `foreground-secondary` (#68635F, 5.27:1) for real
  secondary text. Dark `destructive-foreground` is a plomo-white (#D6D2CE).
- **Button visibility fixes (2026-08, user-validated)**: light
  `surface-secondary` is `#E9E4DC` (was `#F3F0EB`, ~1 unit from background →
  secondary/outline were invisible). It is `oklch(0.921 0.012 79.78)` and is
  mirrored by the `secondary`/`muted`/`input` aliases. Dark `error` is
  `#B94A44` (`oklch(0.556 0.145 25.99)`, was `#D87878`) so the destructive
  button reads darker/more red and the plomo-white label reaches 4.57:1 (AA).
  Outline pressed fallback: light `bg-surface-secondary`, dark
  `dark:active:bg-border` (was `dark:active:bg-surface-secondary`, a no-op).
- Radius scale (hierarchical): base 20 / sm 14 / md 18 / lg 24 / xl 32 /
  2xl 40 / 3xl 48 / 4xl 56.

### Sources of truth (two files, kept in sync)

- `src/shared/constants/color.constant.ts` — canonical **HEX** for JS/native.
- `src/global.css` — **OKLCH** tokens for Uniwind + shadcn aliases
  (`primary→interactive`, `destructive→error`, `muted→surface-secondary`,
  `ring→accent`, `input→surface-secondary`, `popover→card`, ...).
- Editing a color = change HEX in `color.constant.ts` AND OKLCH in `global.css`.
  Verified: Uniwind converts the OKLCH strings back to the exact HEX.

### Theme preference

- `ThemePreference = 'system' | 'light' | 'dark'` persisted under `app.theme`.
- `use-theme-preference.ts`: `getThemePreference()` / `setThemePreference()`.
- `_layout.tsx` applies the persisted preference on mount (`Uniwind.setTheme`),
  sets the root bg and the React Navigation theme (`NAV_THEME`).

## Current state

- **`src/app/index.tsx`** (the `/` route) is a bare **hello world** placeholder.
  The design-system gallery, theme toggle and the `/pairing` route were removed to
  rebuild the screens from scratch with scalable, maintainable code.
- **`src/app/pairing.tsx` was deleted** — the pairing UI will be rebuilt as part of
  the upcoming reorganization. The networking **core layer is intact** (services
  `net`/`secure-storage`, Nitro module `argus-net`, desktop `src-tauri`).
- **UI primitives**: `button.tsx` (7 variants on semantic tokens: default,
  secondary, outline, ghost, destructive, link, disabled), `text.tsx`
  (typography variants), `icon.tsx` (name-based registry wrapper), `input.tsx`.
- **`src/app/qr/index.tsx`** — QR scan **route** (native-only). On web/desktop it is
  unreachable: `Stack.Protected guard={IS_NATIVE}` in `_layout.tsx` redirects to `/`
  (fast), plus a `Redirect` fallback in the screen. Scan flow (original animated design):
  live `CameraView` (`barcodeTypes:['qr']`) with the **animated detection box** (dashed,
  near-black, spring on `bounds`, opacity fade via `withSequence`) + a **value bubble**
  (`FadeInDown`/`FadeOutDown`, dark pill). Once the box fades → auto `router.back()`
  with the value via `useQrScanStore` (zustand, `src/core/stores/qr-scan.store.ts`).
  Ready for the `pairing.tsx` rebuild.
- **`Orb` (2026-08, user-approved)** — procedural **AI energy ring** in
  `src/shared/components/orb/` (`orb.tsx` + `orb-shader.ts` + `orb-loader.*`),
  rebuilt from the animatereactnative orb reference. The whole effect is a **SkSL
  fragment shader**: a glowing **annulus** whose radius is value noise sampled *on a
  circle* (seamless by construction), giving a stable organic silhouette that rotates.
  - **Band profile is flat-topped**: a solid plateau (`HW_IN`/`HW_OUT`) with soft
    asymmetric gaussian skirts (outer ~2.5x wider). A bare gaussian has no solid
    core — only falloff — which is what made the orb look **out of focus** on device.
    `cover` is clamped to `0.97` so it never saturates into a hard rim.
    **Deliberately no hot core line**: any sharp gaussian reads as a drawn "guide"
    outline (user rejected it).
  - **Voice = micro-jumps, not deformation.** Audio drives a damped spring
    (`ORB_JUMP_*`, ζ≈0.47) kicked by **onset detection** — only a *rise* in the
    envelope injects velocity — so the orb keeps its shape and rotation while it
    **bounces to the beat**. Audio→wobble coupling is near zero (`0.008`).
  - **Rotation** uses a rotating frame `ra = a - u_phase`; every angular feature is
    sampled at `ra`. `u_phase` is integrated on the UI thread (`useFrameCallback`)
    and accelerates with the voice. Speed ladder per state: idle `0.45` → listening
    `0.85` → speaking `1.25` → thinking `2.2` rad/s.
  - **Wind**: slow Lissajous drift on incommensurate frequencies, wobble octaves on
    their own time base (independent of `u_phase`, so it billows when idle), radius
    breathing.
  - **Palette**: procedural but anchored on theme tokens via `hexToHsv` — `accent`
    seeds an **analogous warm hue sweep** (biased toward copper/rose, never
    yellow-green), `error` is the hue `u_tint` bends to. Per-theme sat/val
    correction in `ORB_PALETTE_ADJUST`. `u_pulse` is the thinking **comet head**.
  - States (`idle`/`listening`/`thinking`/`speaking`/`error`) driven by `useOrbStore`
    (zustand) with `withTiming` toward `ORB_STATE_PARAMS` (`orb.constant.ts`:
    `intensity/wobble/speed/brightness/pulse/spread/tint`). RN feeds only uniforms
    per frame (`useClock` + `useDerivedValue`, zero re-renders).
  - Cost: ~3 noise evals + 2 `exp` per pixel (deliberately cheap for low-end Android).
  - **Web**: `orb-loader.web.tsx` → `<WithSkiaWeb>` + **animated breathing-ring
    fallback** while CanvasKit loads; `canvaskit.wasm` copied to `public/` by
    `postinstall` (`bunx setup-skia-web`). Mic: `use-mic-level.ts` (expo-audio
    metering, native + web). Demo: `src/app/(test)/orb.tsx`.
- **Navigation**: root `Stack` uses `animation: 'flip'` (static for now; the slide
  animation will be evaluated later) with `headerShown: false` and themed `contentStyle`
  (no white flash) — see `_layout.tsx`.
- **Storage**: platform-split, typed `IStorageService`.
- **i18n was deleted** (2026-08) — the previous custom engine
  (`core/i18n` + `constants/i18n.ts`) was removed entirely. It will be rebuilt
  from scratch; `expo-localization` plugin remains in `app.json`.
- Empty placeholder folders / `.gitkeep` were removed for a clean, progressive
  build. Planned areas (auth, chat, workspace, settings, sync, http) will be
  created when built.
- **Android builds working**: `bunx expo run:android` compiles and installs on
  a physical device (Redmi Note 11, `spes_global`). See "Android development
  environment" below.

## Android development environment

Installed **without sudo** in the user home (Arch Linux, no system JDK/SDK):

- **JDK 17** (Temurin) at `~/.jdks/current` → `JAVA_HOME` (symlink to a specific
  `jdk-17.0.x` release).
- **Android SDK** at `~/Android/Sdk` → `ANDROID_HOME` / `ANDROID_SDK_ROOT`:
  - `cmdline-tools/latest` (sdkmanager), `platform-tools` (adb),
    `platforms;android-36`, `build-tools;36.0.0`.
  - **NDK `27.1.12297006`** + `cmake;3.22.1` (the NDK was broken at first —
    missing `source.properties` → `[CXX1101]`; reinstalled via sdkmanager).
- `android/local.properties` → `sdk.dir=/home/acme/Android/Sdk`.
- Env exports live in `~/.bashrc` (JAVA_HOME, ANDROID_HOME, PATH). Remember to
  `source ~/.bashrc` in new terminals before running Gradle.
- First build is slow (~10-20 min, Maven deps + native compile); later builds
  reuse the Gradle daemon. To build without Metro: `bunx expo run:android
  --no-bundler`, then `bun run dev`.

## Backend relationship

- Backend: `/backend` — C++20 + Drogon + SQLite, all AI on-device (face auth,
  LLM, vision, STT/TTS), WebSocket sync on `/sync`, JWT dual secrets.
- Backend conventions live in `backend/AGENTS.md` + `backend/CONTEXT.md`.
- The client's local network layer is **implemented and working** (pairing +
  strict-TLS HTTP). Pending phases: WebSocket (`/sync`), the final wrappers
  `http.service.ts` / `websocket.service.ts`, and the pairing-code QR.

## Secure networking (2026-08) — local network layer

### Trust model
- The backend is its own per-instance CA (`ca.pem` + rotating leaf); HTTPS-only on
  7024. The client **pairs once** (code = prefix of the CA's SHA-256) and afterwards
  **trusts only that CA and `argus.local`** (hostname verified against the SAN).
  Endpoint `POST /pairing` on the backend.

### Architecture: one JS API, two native backends
```
src/core/services/net/        → IArgusNetService (discover / pair / request / isPaired / instance / unpair)
  net.native.ts ──► Nitro module "ArgusNet" (JSI)
                     Android: Kotlin  (OkHttp + NsdManager + custom TrustManager/Dns)
                     iOS:     Swift   (URLSession + Bonjour + SecTrust)
  net.web.ts   ──► Tauri (Rust) commands: mdns-sd + reqwest/rustls + keyring
  net-persistence.ts  → pairing persistence (shared)
src/core/services/secure-storage/   → secrets (caPem, JWT)
  secure-storage.native.ts ──► expo-secure-store (Keystore/Keychain)
  secure-storage.web.ts    ──► Tauri command + keyring crate (localStorage fallback in a plain browser)
```
- `expo-secure-store` **does not support web** (official docs) → on desktop the
  **`keyring`** crate (Keychain / Secret Service / Cred Manager) is used via a Tauri command.
- secure-store keys are **separate** (~2 KB limit per value on iOS).
- The app never talks to the backend from the WebView: mobile → Nitro, desktop → Rust.

### Nitro module `modules/argus-net/`
- Spec `src/ArgusNet.nitro.ts` = **source of truth**; `bunx nitrogen` generates the
  Kotlin/Swift bindings in `nitrogen/generated/` (gitignored — regenerable).
- `HybridArgusNet.kt`: strict OkHttp (TrustManager with only the ca.pem, hostnameVerifier
  only `argus.local`, custom `Dns` `argus.local→IP` because Android does not resolve `.local`),
  `NsdManager` for mDNS, full HTTP (JSON + multipart by file URI).
- `HybridArgusNet.swift`: URLSession + `SecTrustSetAnchorCertificates(CA only)` (iOS
  resolves `.local` natively), Bonjour (`NetServiceBrowser`) for mDNS, manual multipart.
- **Performance**: TLS client/session **cached** by config fingerprint (OkHttp,
  URLSession by CA, reqwest by CA). `configure` is idempotent (invalidates only when
  changed) and `net.native.ts` skips it when the config is already applied;
  `net-persistence.ts` caches the bound instance in memory. File bodies are
  **streamed from disk** (okio on Android), not loaded fully into memory.
- **No deprecated APIs**: `RequestBody` is subclassed (`stringBody`/`streamBody`) instead
  of `RequestBody.create`/`MediaType.parse` (deprecation is an ERROR in OkHttp 4.12);
  API 30+ NsdManager overloads are used (`hostAddresses`, `resolveService`+Executor)
  with a guarded fallback for <30.

### Desktop `src-tauri/` (Tauri 2)
- Rust `src/net/`: `discover.rs` (mdns-sd `_argus._tcp.local.`), `pair.rs` (reqwest
  accept-any **only** on that call + fingerprint verification), `http.rs`
  (reqwest/rustls `add_root_certificate` + **pinned DNS resolver**
  `argus.local→IP` + `allowed_host` check), `secure.rs` (keyring).
- Commands: `argus_discover`, `argus_pair`, `argus_request`, `argus_secure_get/set/delete`.
- `tauri.conf.json` → `frontendDist: "../dist"` (generated by `bun run web:build`);
  requires `webkit2gtk-4.1` on Linux. Scripts: `bun run desktop:dev` / `desktop:build`.

### WebSocket (phase 2)
- Must be **native** (OkHttp WS / `URLSessionWebSocketTask` / `tokio-tungstenite`):
  RN's JS `WebSocket` **does not trust the CA**. Final wrappers
  `http.service.ts` / `websocket.service.ts` and the pairing QR → phase 3.

### Verification
- `bunx tsc --noEmit` and `bun run lint` → 0 errors. `cargo check` (src-tauri) → 0/0.
  `bunx expo prebuild --platform android` + `bunx expo run:android` → compiles and runs
  on the Redmi (Nitro module + nitrogen's C++). `expo export --platform web` → `dist/`.

## History log

- **2026-08** — Color & theme redesign: warm neutral palette, dual grafito+arena
  accent, canonical HEX in `color.constant.ts` + OKLCH mirror in `global.css`,
  theme preference system, `NAV_THEME`, platform-split storage, centralized icon
  registry, golden-rule component structure, named React imports (no
  `import * as React`), native system bars via `react-native-edge-to-edge`
  `SystemBars` (direct, no wrapper; `enforceNavigationBarContrast: false`).
  i18n removed (rebuild pending).
- **2026-08** — Button visibility fixes (user-validated): light
  `surface-secondary` → `#E9E4DC` (secondary/outline now visible), outline dark
  pressed fallback → `bg-border`, dark `error` → `#B94A44` (destructive darker +
  more red, label AA). Android toolchain installed (JDK 17, SDK 36, NDK
  27.1.12297006) and `bunx expo run:android` working on a physical device.
- **2026-08** — Local network layer (HTTP): pairing + strict-TLS client via
  **Nitro** (mobile) and **Tauri/Rust** (desktop). `secure-storage` (expo-secure-store /
  keyring), platform-split `net` service, `argus-net` module, `src-tauri/`, `pairing.tsx`
  screen, `input.tsx`. Validated: `tsc`/`lint` 0, `cargo check` 0/0, full Android
  build OK, E2E on the Redmi (discovers the server + pairing). Fixed: double-resume
  on iOS, `RequestBody.create`→streaming (0 deprecated), NsdManager API 30+
  overloads, TLS client cache, `unpair` re-triggers discovery.
- **2026-08** — Networking layer hardening (deep audit): (1) TLS cache now effective —
  `configure` idempotent in Kotlin/Swift, `net.native.ts` only reconfigures when the
  `caPem|host|ip` key changes, `net-persistence.ts` caches the instance in memory;
  (2) **cryptographic fingerprint verification** on all 3 natives
  (`SHA-256(DER)` vs the server's `caFingerprint`) → closes the TOFU gap of the
  pairing trust-any call; (3) `caFingerprint` is persisted (`net.caFingerprint`) and the
  UI shows the real fingerprint (previously `instanceId`); (4) structured errors
  `CODE|message` from the natives + context fallbacks
  (`pair`→`NETWORK_ERROR`, no more false "invalid code") + friendly per-code error
  messages in `pairing.tsx`; new code `FINGERPRINT_MISMATCH`;
  (5) desktop: pinned DNS resolver `argus.local→IP` (reqwest `dns_resolver`),
  now using the `ip` that was previously ignored; (6) `net.native.ts` imports the
  `argus-net` package (file: dep) instead of a relative path. `PLAN.md` removed
  (references removed from AGENTS.md).
- **2026-08** — Screen reset for reorganization: `index.tsx` → clean hello world;
  **`pairing.tsx` removed** (the pairing UI will be rebuilt scalable; the networking
  core layer stays intact). WhatsApp-style native navigation: `<Stack>` with
  `animation: 'ios_from_right'` (280ms), `headerShown: false` and `contentStyle` with
  the theme background (no white flash). *(Note: the code actually uses
  `animation: 'flip'` — drift corrected in this doc.)*
- **2026-08** — Dependency optimization (validated: `expo-doctor` 20/20,
  `install --check` clean): `expo install --fix` aligned `expo@~57.0.9`, RN `0.86.2`,
  RNGH `3.1.0`, reanimated `4.5.1`, worklets `0.10.1`, screens `4.26.x`, eslint-config-expo
  `57.0.1`; added `@shopify/react-native-skia` 2.6.2, `expo-audio` ~57.0.3, `expo-asset`.
  Removed: `expo-status-bar` (replaced by SystemBars), `tailwindcss-animate`
  (`tw-animate-css` is used), `expo-haptics`/`expo-updates` (unused). `expo-mcp` →
  devDependencies. **`postinstall`** (`scripts/link-argus-net.mjs`): symlinks `argus-net`
  in `node_modules` (bun copies the `file:` dep → expo-doctor saw it as duplicated).
  `expo-audio`, `expo-asset` and `expo-camera` plugins in `app.json`. Babel unchanged
  (babel-preset-expo already includes the worklets plugin).
- **2026-08** — `src/shared/constants/common.constant.ts`: `IS_WEB`, `IS_NATIVE`,
  `IS_ANDROID`, `IS_IOS`, `IS_TAURI` to centralize platform/Tauri checks. Migrated:
  `secure-storage.web.ts` (uses `IS_TAURI` instead of the manual check),
  `native-only-animated-view.tsx`, `dialog.tsx` and `context-menu.tsx`
  (`IS_WEB`/`IS_NATIVE`/`IS_IOS`). `Platform.select` kept for per-platform CSS classes.
  `scan-barcode` icon added to the centralized registry.
- **2026-08** — Web in **SPA** mode (`app.json` → `web.output: "single"`, no SSR/static).
  The Tauri web bundle (`dist/`) is a single `index.html` + assets; `+html.tsx` remains
  as the single shell. SSR guards removed (`typeof window` in `common.constant.ts`/`storage.web.ts`).
- **2026-08** — Navigation: `slide_from_right` (300ms) + `SlideInRight` on the scanner was
  tried, but **reverted to static `flip`** (the slide animation is pending evaluation).
  The `QrScanner` camera preview was not showing because the installed APK predated
  `expo-camera` (native module absent + manifest without `android.permission.CAMERA`).
  **Fix**: `bunx expo prebuild --platform android` applied the plugin → `CAMERA` is now
  in the manifest; `CameraView` uses `StyleSheet.absoluteFill` (official pattern).
  **Requires an APK rebuild** for the camera module to be included.
- **2026-08** — QR scanner converted from a component to a **route** (`src/app/qr/index.tsx`,
  native-only). Web/desktop can't enter it: `Stack.Protected guard={IS_NATIVE}` (fast
  redirect to `/`) + `Redirect` fallback. Value returned via the new zustand store
  `useQrScanStore` (`src/core/stores/qr-scan.store.ts`). Home button now `router.push('/qr')`.
  `src/shared/components/qr-scanner.tsx` deleted.
- **2026-08** — QR route **design reverted to the original**: the photo-freeze + static
  black guide + precise `bounds` frame were replaced by the original animated detection box
  (dashed, near-black `rgba(0,0,0,0.9)`, spring on `bounds`, opacity fade via `withSequence`)
  and the value bubble (`FadeInDown`/`FadeOutDown`, dark pill). Auto `router.back()` fires
  when the box finishes fading (guard `navigatingRef` to avoid double-back). The
  `react-hooks/immutability` eslint-disable is back (reanimated shared-value mutation).
- **2026-08** — QR references removed from the home screen (`src/app/index.tsx`): the
  "Escanear QR" button, the `useQrScanStore` subscription and the "Último código" label are
  gone. The `/qr` route stays intact (protected, native-only) and will be reached from the
  future `pairing.tsx`.
- **2026-08** — **AI Orb** implemented (`@shopify/react-native-skia` runtime shader):
  `orb/Orb.tsx` + `OrbShader.ts` (pure SkSL: fbm + domain warp + spherical shading +
  soft glow), state-driven via `useOrbStore` (`orb.store.ts`) with `withTiming` transitions
  toward `ORB_STATE_PARAMS` (`orb.constant.ts`), uniforms-only per-frame updates
  (`useClock` + `useDerivedValue`, `react-hooks/immutability` disabled). Audio reacts via
  `use-mic-level.ts` (expo-audio metering — **native + web**, `isMeteringEnabled` option,
  no `setMeteringEnabled` method). Web: `OrbLoader.web.tsx` → `<WithSkiaWeb>` +
  `canvaskit.wasm` copied to `public/` via `postinstall` (`bunx setup-skia-web`);
  `OrbLoader.native.tsx` imports directly. Colors from theme (`colorTokens` + `hexToRgba`).
  Demo in `(test)/orb.tsx` with state buttons + live mic. Validated: `tsc`/`lint` 0,
  `expo export --platform web` bundles the split `Orb` chunk and serves `canvaskit.wasm`.
- **2026-08** — Orb **visual + mic fixes**: (1) the "static" look was `useClock` feeding
  **milliseconds** into a shader expecting seconds (giant noise offsets → TV-static);
  shader now normalizes `t = u_time / 1000`. (2) The orb was translucent + low-contrast
  → looked like a white square; shader rewritten to the reference "fractal plasma" look
  (fbm + domain warp, dark body `ORB_BODY_COLOR` glowing from within, opaque output
  **sealed over `u_colorBg`** — no transparency artifacts anywhere; halo kept inside the
  square so corners stay pure background). (3) Mic now calls
  `requestRecordingPermissionsAsync()` before recording (expo-audio doesn't auto-request
  on native) and surfaces errors (`useMicLevel.error`). JS-only changes → Metro reload
  is enough (no APK rebuild).
- **2026-08** — Orb **integration + speaking interaction + UI**: the canvas is now
  **transparent outside the orb** (shader returns `alpha = smoothstep(0.76, 0.42, r)`,
  `u_colorBg` dropped) → no square, the orb floats directly on any background. The
  noise field **rotates internally and accelerates with `u_flow` + `u_audio`** (voice
  → faster warp/flow/brightness; the silhouette never scales). `speaking` has a faster
  attack (`ORB_SPEAKING_ATTACK_MS` 380ms vs 900ms). Mic envelope: fast attack /
  slow release (`ORB_AUDIO_ATTACK_MS` 70 / `ORB_AUDIO_RELEASE_MS` 220), polling 60ms,
  more sensitive mapping. Added `mic`/`mic-off` icons. Demo UI: segmented pill control
  for the 5 states, icon mic button, refined level bar.
- **2026-08** — Orb **rewritten to the reference "energy ring"** (animate-react-native
  orb shader, recreated in-house, no CLI package): full **HSV spectrum** around the
  annulus rotating slowly (`speed`), **hue-by-intensity** shift, **organic silhouette
  wobble** (value noise sampled on a circle — seamless — amplitude ∝ `intensity +
  audio`), thin gaussian hot line (white peaks) + wide soft glow, **premultiplied
  alpha**. Cheaper than the previous fbm plasma (2 noise evals/pixel vs ~24).
  `OrbStateParams` is now `{intensity, wobble, speed, brightness, hue, spread}`
  (`spread`≈0 anchors `hue` → red `error`); `ORB_BODY_COLOR` and the
  `coreColor`/`bodyColor` props + theme-color uniforms were removed (palette is
  procedural). Mic hook tuned: poll 40ms, floor −55 dBFS, gamma 1.5, attack 50ms /
  release 260ms. SkSL validated by compiling + rendering frames with `canvaskit-wasm`
  in node; `tsc`/`lint` 0 errors.
- **2026-08** — Orb **redesigned as "Eclipse" (movie black hole, user-approved)**:
  black shadow + edge-on accretion disk (squash tilt illusion) + **faked
  gravitational lensing** (circle inversion around the photon sphere → iconic arcs
  above/below; near side passes in front) + doppler beaming (bright left side) +
  white-hot photon ring with bloom. Palette back to **theme tokens**
  (`accent`/`interactive` polarity flip/`error` via `hexToRgba`) — monochrome-warm,
  elegant on both themes. `OrbStateParams` → `{intensity, wobble, speed, brightness,
  pulse, tint}`; `pulse` = thinking shimmer (wave spiraling inward). Swirl phase is
  **integrated per frame** (`useFrameCallback`) → rotation accelerates live with the
  voice. Web fallback is now an **animated breathing eclipse** (reanimated pulse).
  Debug note: canvaskit-wasm node previews render fine as long as uniforms are a
  **flat** float array and effects/paints are deleted only after `flush()`
  (deferred rasterization); a `hex()` helper missing `#` support caused a full
  "corrupted colors" false alarm. Validated: SkSL compiles (22 uniform floats),
  motion strip renders, `tsc`/`lint` 0.
- **2026-08** — Orb **rebuilt as the "energy ring"** (the Eclipse was replaced;
  reference: the animatereactnative orb, analyzed frame-by-frame from the demo
  video). Structure: annulus radius = value noise sampled **on a circle**
  (seamless), single wide **asymmetric** bloom, premultiplied alpha.
  Palette decision (**user-approved**): *analogous warm sweep* instead of the
  reference's full HSV rainbow — `hexToHsv(accent)` seeds the sweep, biased warm so
  it travels gold → amber → copper/rose and never drifts into yellow-green;
  `interactive` = hot core (polarity flip), `error` = `u_tint` hue.
  `ORB_PALETTE_ADJUST` corrects sat/val per theme (light needed a *lighter, less
  saturated* ring — at token value it rendered muddy olive on `#F4F1ED`; the fine
  grafito core line now carries the definition there). `OrbStateParams`:
  `pulse` is now the thinking **comet head** and `spread` (new) is the hue-sweep
  width; `hue` removed. Three bugs found by rendering, not by reading: (1) dark
  angular "petals" in the hollow center — caused by modulating the *color* with the
  angular luminance noise; fixed by keeping color pure and putting all intensity in
  the coverage; (2) crinkled outline — wobble noise frequencies were too high for
  the value-noise lattice (4.9 → 3.1); (3) `tsc` parse error from **backticks inside
  the SkSL template literal** (the trap AGENTS.md warns about). Web fallback is now
  a breathing ring.
- **2026-08** — Orb **"no guide lines" pass (user feedback)**: the audio-gated hot
  core line was removed entirely — the user read that thin bright/ink stroke as a
  drawn guide, breaking the "floating in the air" illusion. `u_hot` (and the
  `interactive` token in the orb palette) is gone; the ring is now a single soft
  bloom and loudness is expressed only as brighter/wider glow. Also found: letting
  `cover` reach 1.0 flattened the gaussian into a plateau and gave the hollow a hard
  rim, so it is clamped to `0.94`. **Wind** added so the orb feels air-borne: slow
  Lissajous drift on incommensurate frequencies, wobble octaves on their own time
  base (independent of `u_phase` → keeps billowing when idle), radius breathing.
  Light theme deepened (`ORB_PALETTE_ADJUST.light` sat 1.2 / val 1.02) now that the
  grafito core line no longer provides its definition. Validated: SkSL compiles
  (18 uniform floats), 4 render strips (5 states / audio sweep dark / audio sweep
  light / motion), `tsc`/`lint` 0.
- **2026-08** — Orb **clarity + rotation pass (user feedback on device)**. Two real
  bugs, one of them in the *validation method*:
  (1) **Renders were being judged at 300px while the device shows ~930 physical px**
  (338dp at 2.75x). Everything looks crisp scaled down 3x, so the blur was invisible
  in previews. Added device-scale render targets — this is now a documented rule.
  (2) The blur itself: the ring was a **bare gaussian**, which has no solid core,
  only falloff. Replaced with a **flat-topped profile** — solid plateau `HW_IN 0.016`
  / `HW_OUT 0.020` plus soft asymmetric skirts (σ ≈ 7px inner / 11px outer at device
  scale). Haze weight 0.13 → 0.10 and tightened; luminance floor 0.70 → 0.82;
  brightness floor 0.55 → 0.62 (the dim segments were what read as washed out).
  (3) **Rotation was never actually rotating**: the animation offset the noise
  *coordinates* by `u_phase`, which only translates the noise field. Introduced the
  rotating frame `ra = a - u_phase`, with every angular feature sampled at `ra`.
  Speed ladder raised (idle 0.45 → thinking 2.2 rad/s).
  Validated with a dedicated strip that freezes time and advances only `u_phase`,
  confirming rigid 30°/frame rotation.
- **2026-08** — Orb **micro-jump interaction (user request)**: voice no longer
  deforms the silhouette (audio→wobble `0.070` → `0.008`). New uniform `u_jump`,
  driven from `orb.tsx` by a **damped spring with onset detection** (`ORB_JUMP_ONSET`
  / `GAIN` / `STIFFNESS` / `DAMPING` / `MAX`): only a *rise* in the envelope injects
  velocity, so the orb pops on attacks instead of tracking loudness. Underdamped
  (ζ≈0.47, ω≈13.8 rad/s) so the overshoot reads as a jump, not a fade. Verified by
  simulating the spring in node against a synthetic 3.5 Hz syllable envelope (peak
  ~0.20 per syllable, slight undershoot, no saturation) and by a render strip that
  varies **only** `u_jump` — silhouette and hue positions stay identical while the
  radius pops.
- **2026-08** — **File naming normalized to kebab-case** (user convention, now rule 1
  in `AGENTS.md`): `Orb.tsx` → `orb.tsx`, `OrbShader.ts` → `orb-shader.ts`,
  `OrbLoader.{native,web}.tsx` → `orb-loader.{native,web}.tsx`. Exported symbols stay
  PascalCase; only file names are kebab. Sole exception is
  `modules/argus-net/src/ArgusNet.nitro.ts` — nitrogen requires the spec file name to
  match the HybridObject declared in `nitro.json`. Cleanup in the same pass: removed
  the dead `ORB_STATES` const (it also violated the rule that `*.type.ts` holds only
  types), reordered `orb.tsx` to the golden rule (`handleLayout` was declared after
  the effects), refreshed stale prop/state copy.

