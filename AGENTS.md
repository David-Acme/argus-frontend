# AGENTS.md — Argus Frontend AI Agent Instructions

> This file is read by AI coding assistants before any code generation task.
> It defines the project's architecture, conventions, and constraints.

## Project Identity

- **Argus** — AI-powered video surveillance platform mobile app (security, computer
  vision, IoT, local AI). Premium, calm, minimal design language.
- **Stack**: React Native 0.86 + Expo SDK 57, TypeScript strict, Expo Router
  (file-based routing), Tailwind CSS v4 via **Uniwind**, React Native Reusables
  (`@rn-primitives`), `react-native-mmkv` (native storage), `lucide-react-native`
  (icons, centralized), `zustand` (global state, planned).
- **Media/Platform**: `@shopify/react-native-skia` (render), `expo-camera` (barcode/QR,
  mobile), `expo-audio` (audio). Platform/Tauri flags centralized in
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
src/shared/components/orb/orb.tsx          → export default function Orb()
src/shared/components/orb/orb-shader.ts    → export const ORB_SKSL
src/shared/components/orb/orb-loader.web.tsx
src/shared/components/ui/native-only-animated-view.tsx
src/shared/hooks/use-mic-level.ts
src/core/stores/qr-scan.store.ts
```

- Never `Orb.tsx`, `OrbShader.ts`, `OrbLoader.web.tsx`.
- Multi-word compounds split on `-`: `orb-shader`, `use-theme-preference`,
  `qr-scan.store`.
- Suffixed families keep their suffix after the kebab name:
  `{domain}.constant.ts`, `{domain}.type.ts`, `{domain}.interface.ts`,
  `{domain}.store.ts`, `{domain}.native.ts` / `{domain}.web.ts`.
- **Only documented exception**: `modules/argus-net/src/ArgusNet.nitro.ts`.
  Nitrogen requires the spec file name to match the HybridObject name declared in
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
  stays allowed only for per-platform CSS classes. If you mutate reanimated shared
  values in a component, disable `react-hooks/immutability` at the file level
  (`/* eslint-disable react-hooks/immutability */`) — known incompatibility.

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
- **WebSocket**: phase 2, always native (RN's JS `WebSocket` does not trust the CA).
- `http.service.ts` / `websocket.service.ts` will be the final wrappers the app uses.

### 12. Skia / WebGL (Orb shader)

- Skia components **must live outside `src/app/`** (`WithSkiaWeb` code-splitting can't
  lazy-load from the `app` dir in dev). They go in `src/shared/components/`.
- **Web loading**: `orb-loader.web.tsx` wraps the Skia component in `<WithSkiaWeb>`
  (loads CanvasKit, then `import('./orb')`). Native: `orb-loader.native.tsx` imports
  the component directly. Barrel `index.ts` re-exports `Orb` (platform-split,
  `moduleSuffixes`). **No `// @ts-ignore`.**
- **CanvasKit**: `bunx setup-skia-web` copies `canvaskit.wasm` to `public/` — already
  wired into `postinstall`. Run it again after upgrading `@shopify/react-native-skia`.
- **Shaders**: the SkSL lives in `orb-shader.ts` (`Skia.RuntimeEffect.Make` once,
  throw on null). The component updates **only uniforms** via `useDerivedValue`
  (Reanimated) + `useClock` — zero per-frame React re-renders. Mutating shared values
  → file-level `/* eslint-disable react-hooks/immutability */`. Validate SkSL edits
  by compiling with `canvaskit-wasm` in a node script (`RuntimeEffect.Make`).
  **Never** put backticks inside the SkSL template literal (breaks TS parsing) —
  this has bitten twice; note that a node render script may still pass, because the
  extraction regex skips backticks not followed by `;`. Only `tsc` catches it.
- **Validate renders at DEVICE resolution.** The orb is ~338dp on the target phone,
  which is **~930 physical px** at 2.75x. Judging sharpness on a 300px preview is
  meaningless — everything looks crisp scaled down 3x. Render at ~930px.
- The orb is a **glowing energy ring** (annulus): its radius is value noise
  sampled **on a circle** (`vec2(cos a, sin a)`) so the deformation is seamless
  by construction.
- **Band profile is flat-topped, not a bare gaussian.** A solid plateau
  (`HW_IN`..`HW_OUT`) gives the ring readable thickness; gaussian skirts keep both
  edges soft, asymmetric (outer ~2.5x wider) so the hollow stays clean. A plain
  gaussian has no solid core, only falloff — that is what made the orb read as
  **out of focus** on device.
- **NO hard edges, ever — user requirement.** Do not add a thin hot core line or
  any sharp gaussian on top: it reads as a drawn "guide" outline and destroys the
  floating-in-air feel. For the same reason `cover` is clamped **below 1.0**
  (`0.97`): if coverage saturates, the profile flattens and the hollow gains a
  hard rim.
- **Voice = `u_jump`, never deformation.** Audio drives a damped spring
  (`ORB_JUMP_*`) fed by **onset detection** (only a *rise* in the envelope injects
  velocity), so the orb keeps its silhouette and its rotation while it **bounces**
  to the beat. Coupling audio to the wobble amplitude instead churns the shape into
  a different blob on every syllable — explicitly rejected by the user.
- **Rotation must use a rotating frame**: `ra = a - u_phase`, and every angular
  feature (lobes, luminance, hue, saturation) is sampled at `ra`. Offsetting the
  noise *coordinates* by `u_phase` only translates the noise field — the shape
  morphs but nothing ever reads as rotating.
- **Wind**: the orb drifts on a slow Lissajous float with incommensurate
  frequencies (never looks like it loops), the wobble octaves evolve on their
  **own time base** independent of `u_phase` (so the outline keeps billowing
  even when idle and barely rotating), and the radius breathes.
- The palette is **procedural but anchored on theme tokens**: `hexToHsv`
  (`src/shared/libs/color.ts`) turns `accent` into the base hue/sat/val of an
  **analogous** sweep (biased warm — toward copper/rose, never up into
  yellow-green) and `error` gives the hue the sweep bends to via `u_tint`.
  Per-theme sat/val multipliers live in `ORB_PALETTE_ADJUST`
  (`orb.constant.ts`) — light needs a lighter, less saturated ring or it reads
  muddy on `#F4F1ED`.
- **Color must stay pure and all intensity variation must live in the coverage.**
  Modulating the color by the angular luminance noise paints that noise into the
  hollow center as dark petals.
- Rotation is **phase-integrated** with `useFrameCallback` (accelerates with audio
  without snapping). Output is **premultiplied alpha** (`color * cover, cover`),
  transparent outside the aura.
- Keep the wobble noise **low-frequency** (~1.7 / 3.1 around the circle): sampling
  the value-noise lattice too densely makes the outline crinkle instead of forming
  smooth rounded lobes. Budget is ~3 noise evals + 2 `exp` per pixel — the orb must
  stay cheap for low-end Android GPUs.

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

# Nitro module
cd modules/argus-net && bunx nitrogen   # regenerate bindings after changing the spec

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
| `src/core/types/index.ts` | Types barrel (`IconName`, `ThemePreference`, `StoragePrimitive`, ...) |
| `src/core/interfaces/net.interface.ts` | `IArgusNetService` |
| `src/core/interfaces/secure-storage.interface.ts` | `ISecureStorageService` (async) |
| `src/core/interfaces/index.ts` | Interfaces barrel (`IStorageService`, `IArgusNetService`, ...) |
| `src/core/services/storage/` | Platform-split storage (MMKV / localStorage) |
| `src/core/services/secure-storage/` | Secrets (expo-secure-store / keyring) |
| `src/core/services/net/` | `IArgusNetService` (native→Nitro, web→Tauri, `net-persistence`) |
| `modules/argus-net/` | Mobile Nitro module (spec `ArgusNet.nitro.ts` + Kotlin/Swift) |
| `src-tauri/` | Desktop (Tauri 2 + Rust: `mdns-sd`, `reqwest/rustls`, `keyring`) |
| `src/shared/components/ui/` | UI primitives (`button`, `text`, `icon`, `input`) |
| `src/app/qr/index.tsx` | QR scan route (native-only, `expo-camera`; web → redirect to `/`) |
| `src/core/stores/` | Zustand stores (barrel; `useQrScanStore`, `useOrbStore`) |
| `src/shared/components/orb/` | Procedural AI orb: `orb.tsx`, `orb-shader.ts`, `orb-loader.{native,web}.tsx` |
| `src/shared/constants/orb.constant.ts` | `ORB_STATE_PARAMS`, `ORB_PALETTE_ADJUST`, `ORB_JUMP_*` (voice spring) |
| `src/shared/libs/color.ts` | `hexToRgba` / `hexToHsv` (shader uniform helpers) |
| `src/shared/hooks/use-mic-level.ts` | Live mic metering (expo-audio, native + web) |
| `src/shared/hooks/use-theme-preference.ts` | Theme preference get/set |
| `src/shared/libs/theme.ts` | `NAV_THEME` + `BG_COLORS` (React Navigation) |
| `src/global.css` | OKLCH tokens + aliases + base/utilities |
| `src/app/_layout.tsx` | Root layout (theme init, status bar) |
| `CONTEXT.md` | Full project history and decisions |
