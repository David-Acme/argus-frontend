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
| Media | `expo-camera` (barcode/QR + face capture, mobile), `expo-audio`, `react-native-svg` + `qrcode` (QR rendering y avatar procedural). `@shopify/react-native-skia` eliminado (2026-10: dependencia, `postinstall` y `public/canvaskit.wasm`) |
| Platform | `common.constant.ts` → `IS_WEB` / `IS_NATIVE` / `IS_ANDROID` / `IS_IOS` / `IS_TAURI` |
| State | Zustand v5 — 8 stores: `auth`, `avatar`, `locale`, `onboarding`, `navigation`, `qr-scan`, `toast`, `confirm` |
| Local DB | **WatermelonDB 0.28** — `SQLiteAdapter` (JSI) on native, `LokiJSAdapter` (IndexedDB) on web/Tauri; 13 tables mirroring the role-scoped backend sync surface |
| Storage | `react-native-mmkv` (native) / localStorage (web) via `storageService`; **secrets** (caPem, JWT) via `secureStorageService` (`expo-secure-store` on mobile / `keyring` crate on Tauri) |
| Icons | `lucide-react-native` — **centralized** in `icon.constant.ts` only |
| i18n | Custom engine (`core/i18n`): typed keys, `useTranslation()` + imperative `t()`, `useLocaleStore` |
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
  in `app.config.ts`: `parentTheme: "Default"` + `enforceNavigationBarContrast: false`
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
- **Dark fills sit above the card (2026-10-03).** Dark `surface-secondary`
  was `#25231E`, one unit from `card` `#24231E`, so task rows, badges, icon
  circles, chips and dialog inputs vanished on cards. It is `#312E27`
  (`oklch(0.302 0.013 87.57)`, mirrored by `secondary`/`muted`/`input`): light
  keeps the fill 0.08 L below the card, dark 0.047 L above it. Text on it
  stays AA (foreground 11.8:1, muted-foreground 5.4:1). A card nested in a
  card uses `dark:bg-card-secondary`, since dark cannot show the shadow
  light separates it with.
- Radius scale (calm, 2026-10-04): base 12 / xs 2 / sm 6 / md 10 / lg 12 /
  xl 14 / 2xl 16 / 3xl 20 / 4xl 24 (was 20 / 14 / 18 / 24 / 32 / 40 / 48 /
  56). See "Calmer corners".

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

## Current state (docs resync 2026-08-23)

The app is built out end-to-end. Every signed-in screen lives in the
`src/app/(app)/` route group; its layout mounts the nav rail once
(`AppShell`) and is the session guard (`EntryGate`): signed in, it renders
the screen; loading, the branded splash; signed out, it resolves the entry:
unpaired → `/welcome`; no admin + native → `/welcome/face?mode=owner-enroll`;
paired → `/login` (desktop QR or mobile face login). Screens never redirect
on auth themselves. Each screen lays itself out with `AppScreen` (scroll,
max width, aside, bottom-nav claim) and, for detail screens, `ScreenHeader`.

- **Routes** (`src/app/`): `/` (entry router + dashboard: welcome header,
  activity, camera grid, projects carousel, agenda, notifications),
  `/agenda` (month/week/day calendar + event forms), `/projects`
  (projects + tasks), `/cameras` (+ `/cameras/[id]`: PTZ pad, zones CRUD,
  settings sheet, talk sheet), `/people` (Guard directory + portrait
  verification), `/users` (Owner management + single-display invitation QR),
  `/profile`, `/login` (desktop cross-device QR), `/approve` (mobile
  approval, native-only), `/qr` (reusable scanner, native-only) and the
  nested `/welcome/*` stack (`index`, `pairing`, `invitation`, `face`,
  `voice` — the last three native-only via `Stack.Protected`).
- **Core services**: `http.service` (envelope `{status, info, errors}`,
  single-flight refresh, multipart), `session.service` (serialized
  secure-storage queue, version-guarded refresh), `auth.service`
  (login/register/device-login), `invite.service`, domain services
  (`user*`, `person`, `camera*`, `zone`, `calendar-event*`, `project*`,
  `reminder*`, `event`, `notification`, `portrait-preview`, `view-cache`)
  and the autonomous sync engine (see "Local persistence" below).
  Voice: `voice.service.ts` streams ArgusMic PCM over the sync socket and
  plays TTS back.
- **UI primitives**: 26 components under `shared/components/ui/` (button,
  text, icon, input, textarea, form family, adaptive dialog/menu/select,
  sheet, popover, badge, card, qr-code, morph-icon, ...), plus feature
  families `dashboard/` (23), `calendar/` (12), `cameras/` (11),
  `projects/` (10), `qr/` (6), `layout/`, `toast/`, `confirm/`, `face/`,
  `avatar/` and `session/session-gate`.
- **QR scanner (2026-08, user-approved "bottom sheet" design)** — a **reusable**
  native-only scan route. Web/desktop can't enter it: `Stack.Protected guard={IS_NATIVE}`
  in `_layout.tsx` plus a `Redirect` fallback in the screen.
  - **`src/app/qr/index.tsx`** — the route: permissions, scanner lock, validation,
    torch, safe exit. Composition only; no visual internals.
  - **`src/shared/components/qr/`** — `qr-guide-frame.tsx` (corner-bracket frame),
    `qr-scan-sheet.tsx` (the sheet: status pill + title + description + action slot),
    `qr-manual-entry.tsx` (disclosure → `Input` + submit). They live in `shared/`
    because Expo Router would turn any file under `app/` into a route.
  - **The store is the two-way channel** (`useQrScanStore`): the caller sets the
    parameters with `open({ purpose, ...overrides })` and reads back `value` + `status`
    (`idle | scanning | scanned | cancelled`). `open()` clears the previous value, so a
    stale code can never be read as a fresh result, and `status` distinguishes
    "scanned" from "cancelled" (pairing needs that: autosubmit vs. stay on manual entry).
  - **`QR_SCAN_PURPOSES`** (`shared/constants/qr.constant.ts`) holds title / hint /
    manual-entry copy / validation `pattern` per purpose. A new use case is one entry
    there plus one member of `QrScanPurpose` — **the route never changes**.
  - **Detection does NOT follow `bounds`.** Verified in `expo-camera` 57's Android source
    (`BarcodeScannerResultSerializer.kt`): `bounds` is the min/max box of ML Kit's
    `cornerPoints` with the coordinates only divided by **screen density** — they are never
    mapped from the analyzer `InputImage` space to the preview view, and the image
    dimensions, although captured in `BarCodeScannerResult`, are **not serialized to JS**,
    so the mapping cannot be reconstructed from JS either. The result is a box in the wrong
    scale and with rotated axes (the analysis buffer is landscape while the preview is
    portrait). Expo's own docs add that `bounds` "in some case will be representing an
    empty rectangle", that it "doesn't have to bound the whole barcode", and that corner
    point **order differs between iOS and Android**. So the old animated dashed box was
    effectively an iOS-only effect. The frame now signals state by **colour**
    (`accent/70` → `accent` → `error`), identical on both platforms and dependent on
    nothing the camera reports.
  - **Detection gesture**: the four corners **converge diagonally inward**
    (`QR_SCAN_CONVERGE_RATIO` of the frame side, 260 ms, `Easing.out(cubic)`) while the
    frame does one scale pulse, then the whole frame fades out (delay 170 ms + 240 ms =
    410 ms, inside the 450 ms `QR_SCAN_CONFIRM_MS` so it never gets cut off mid-fade).
    It reads as "captured" without needing to know where the code is. Under **reduce
    motion** only the fade runs — displacement is the vestibular trigger, opacity is not,
    the same rule as `ORB_REDUCED_MOTION_SCALE`.
  - The scanned value is **never rendered**: it is a pairing secret. The pill says
    "Código detectado".
  - **Keyboard = the sheet grows over the camera.** `KeyboardProvider` in `_layout.tsx`
    plus `useKeyboardProgress` (`shared/hooks/`), which wraps
    `useReanimatedKeyboardAnimation` and adds the two JS flags derived with
    `useAnimatedReaction`. The keyboard's `offset`/`progress` are **native-driven shared
    values**, so the sheet tracks the keyboard frame-for-frame on the UI thread with zero
    JS per frame — `KeyboardAvoidingView` was replaced by this.
  - **Everything rises; nothing descends.** The card is one full-height
    (`height: windowHeight`) view pinned to `top: 0` and pushed down by `restOffset`
    (`windowHeight - contentHeight`), so at rest only its top strip shows as the sheet.
    Opening the keyboard drives that offset to `0` — the card **grows upward from the
    bottom**. A first attempt slid a separate cover *down* from above and the user
    rejected it: a panel dropping in does not read as a sheet expanding.
  - **The content travels with the card up under the top controls.** It is nested in a
    second animated layer moving `0 → controlsBottom + QR_SCAN_TYPING_GAP`. Since the
    card rises faster, the net motion is a straight upward glide from the bottom strip to
    just below the back/torch row, with real breathing room instead of the content
    staying glued to the bottom while empty card grew above it. `controlsBottom` is
    measured (`onLayout`), never assumed from the button height.
  - **Nothing that triggers layout is animated** (this was the fluidity requirement):
    both layers are `translateY` only, the corner radius collapses over the first 33 % of
    the progress and the top hairline fades by **colour** (`interpolateColor` to `card`).
    Animating a height, `borderTopWidth` or `paddingBottom` would re-run Yoga *and* refire
    `onLayout` every frame, re-rendering JS at 60 Hz — exactly the stutter to avoid. The
    radius collapses faster than the card arrives so the rounded notches never expose
    camera pixels mid-transition.
  - No keyboard-height lift is needed: the content ends near the top of the screen, far
    above the keyboard. The card's easing is the **system keyboard curve**, inherited for
    free from the native `progress`, which is what makes the motion feel connected.
  - **Cost while typing**: `onBarcodeScanned` is detached as soon as the keyboard starts
    opening (frame analysis is the dominant cost), and `active={false}` only once the
    cover fully hides the preview — so killing it is free visually, and it is warmed back
    up while the sheet is still coming down.
  - **The torch button morphs into a "back to camera" button**, both icons cross-fading
    with scale + rotation driven by the same keyboard `progress` value, so the morph is
    exactly in sync with the sheet.
  - `QrScanSheet` is **content only**; the route owns the animated chrome (background,
    radius, border, insets). The animated views take their colours inline from
    `colorTokens` rather than `className`, following `orb.tsx` / `_layout.tsx` — no
    component in this repo passes `className` to an `Animated.View`.
- **`Orb` — SUPERSEDED (2026-08) by the SVG avatar** (`AGENTS.md` rule 13):
  `useAvatarStore` replaced `useOrbStore`, the assistant states live in
  `src/shared/components/avatar/`, and Skia is gone from `src/`. Kept verbatim
  as history — the energy ring was in
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
  - **Depth**: sparse luminous **motes** (one splat per grid cell, two layers
    counter-rotating for parallax), counter-rotating **internal flow** through the
    band, a fresnel-like **inner rim**, **chromatic depth** across the band, and a
    faint interior volume. Coverage is **dithered** to kill 8-bit banding.
  - **`u_flow`** is the state cue that survives greyscale: listening draws inward,
    speaking radiates outward, idle/thinking circulate. `error` freezes rigid.
  - **Reduce motion** zeroes `u_motion` (all displacement) but keeps twinkle/hue.
  - States (`idle`/`listening`/`thinking`/`speaking`/`error`) driven by `useOrbStore`
    (zustand) with `withTiming` toward `ORB_STATE_PARAMS` (`orb.constant.ts`:
    `intensity/wobble/speed/brightness/pulse/spread/motes/flow/tint`). RN feeds only
    uniforms per frame (`useClock` + `useDerivedValue`, zero re-renders).
  - Cost: ~4 noise evals + 2 mote splats + ~4 `exp` per pixel, arithmetic hash, and
    an early cull outside `CULL_R` (deliberately cheap for low-end Android).
  - **Web**: `orb-loader.web.tsx` → `<WithSkiaWeb>` + **animated breathing-ring
    fallback** while CanvasKit loads; `canvaskit.wasm` copied to `public/` by
    `postinstall` (`bunx setup-skia-web`). Mic: `use-mic-level.ts` (expo-audio
    metering, native + web).
- **Navigation**: root `Stack` crossfades every route (`animation: 'fade'`,
  `animationTypeForReplace: 'push'`) with `headerShown: false`, themed
  `contentStyle` (no white flash); `GlobalBottomNav`, `ConfirmDialog`,
  `Toaster` and `PortalHost` render above the Stack in `_layout.tsx`. The
  welcome stack nests its own fade Stack (240 ms).
- **Storage**: platform-split, typed `IStorageService`.
- **i18n rebuilt** (2026-08) — custom engine in `src/core/i18n/` (see `AGENTS.md`
  rule 14): typed dictionaries per screen + shared `common`, `useTranslation()`
  (real-time) + imperative `t()` for `.ts`, `useLocaleStore` (zustand),
  `app.language` persistence, `es-*`/`en-*` prefix detection, es default + en.
- Core areas built since the reset: auth (`auth.service` + `auth.store`),
  session (`session.service`), http (`http.service`), sync
  (`core/services/sync/` + WatermelonDB mappers), view-cache (MMKV snapshots),
  voice (`voice.service`) and settings (`features/settings/` + `/settings`).
  Still pending: chat and workspace.
- **Android builds working**: `bunx expo run:android` compiles and installs on
  a physical device (Redmi Note 11, `spes_global`). See "Android development
  environment" below.

## Android development environment

- **Firebase (push).** `app.config.ts` sets `android.googleServicesFile` from the
  environment variable `ARGUS_GOOGLE_SERVICES_FILE`, which names the
  `google-services.json` on the developer's machine. Without the variable the
  Android build has no Firebase configuration: push (FCM) is off and prebuild
  warns through `process.emitWarning`, it does not fail. The file is never
  copied into the repository; prebuild writes its one copy into the gitignored
  `android/` tree. The FCM data message carries only `e` (base64 of the sealed
  envelope); urgency lives inside the sealed intent.

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
- ONLY ONE frontend worktree does Android/Gradle builds, with its own copy
  (`cp -a --no-preserve=links`), reused by whichever track needs Gradle. The
  other frontend worktrees, which only run bun/tsc/tests/e2e, keep the
  hardlinks, because none of those tools write into `node_modules`.

## Backend relationship

- Backend: `/backend` — C++20 + Drogon + SQLite, all AI on-device (face auth,
  LLM, vision, STT/TTS), WebSocket sync on `/sync`, JWT dual secrets.
- Backend conventions live in `backend/AGENTS.md` + `backend/CONTEXT.md`.
- The client's local network layer is fully implemented: pairing +
  strict-TLS HTTP, native WebSocket (`ArgusSocket` Nitro on mobile,
  `argus_socket_*` Tauri commands on desktop), the `http.service.ts`
  wrapper, the pairing-code QR, invite acceptance (trust-any + fingerprint)
  and the cross-device login QR flow.

## Local persistence (2026-08) — WatermelonDB

### Layering (user requirement)

```
core/database  ←  core/services/*.service.ts  ←  view-cache projections  ←  shared/hooks/use-cached-rows  ←  UI
```

The database is reached **only** from data services. There is deliberately **no
`DatabaseProvider` / `useDatabase`** — the UI has no way to hold a `Database`, so
query logic cannot leak into screens. `DatabaseService<K>` keeps its query
primitives `protected`, so WatermelonDB's `Clause` never crosses the service
boundary and each service's public surface is domain-named
(`observeByCamera`, `observeUnreadCountForUser`). Only the view-cache
projections subscribe to those observables; screens read MMKV snapshots.

### Why 0.28 and this shape

- 0.28.0 **is** the latest stable (`next` is a prerelease) — the same pin lynk
  uses, so there was nothing newer to adopt. The package declares **no
  peerDependencies** → zero React 19 conflict; lynk's conflict came from
  `@nozbe/with-observables`, which is **not** installed.
- Verified before writing code (not assumed): TS 6.0.3 compiles legacy decorators
  (probe with `@text/@field/@date/@json/@relation`, 0 errors); `babel-preset-expo`
  + decorators legacy + the three `loose: true` plugins transforms without the
  "loose mode configuration must be the same" error; the legacy output installs
  the getter on the **prototype** and `_initializerDefineProperty` becomes a no-op
  (which is exactly why `useDefineForClassFields: false` is mandatory);
  autolinking resolves `@nozbe/watermelondb → native/android`
  (`WatermelonDBPackage`, old architecture over the new-arch interop layer, as in
  lynk on RN 0.86).

### Schema decisions

- **13 tables** = the synced half of the backend's table surface
  (`SYNC_TABLE_KEYS` in `core/types/sync.type.ts`): `user`, `user_invitation`,
  `camera`, `zone`, `reminder`, `calendar_event`, `calendar_event_share`,
  `project`, `project_member`, `project_task`, `person`, `notification`,
  `conversation_message` (schema v14, "Conversations and the messenger"). The
  backend's `event` table has no local table any more and is not pulled
  (schema v10 drops it): nothing ever wrote it, the detections the screens
  show come from `GET /camera/overview`. `camera_stream` and `reminder_detail`
  went the same way (schema v11 drops both, a stray row included): neither has
  a writer on the server, and the camera row no longer carries a stream
  resolution. The backend keeps serving all three only for apps already
  installed (the plan's D8). `context_note` has no local table either (not
  synced). `person` carries household persons only, live: identity sends an
  `Add` with the household row on enrolment and a field diff on every update,
  in the same eleven fields the pull serves; visitors never travel in it.
- **snake_case columns, camelCase model properties.** `created_at`/`updated_at`
  are snake_case by hard requirement, and a schema with two snake columns among
  twelve camel ones is worse than one convention. This **reverses** decision 3 of
  the earlier `PLAN-DATABASE.md`; the cost is a DTO→row mapper in the sync phase.
- **`id` = `String(dto.id)`** (server id) → no `_id`/`local_id`/`version`, and FKs
  are indexed `string` columns that `@immutableRelation` resolves natively.
- **No `deleted_at`/`is_deleted`** — lynk's tombstones force
  `Q.where('is_deleted', false)` into every query.
- Timestamp columns store **epoch ms** (backend sends seconds); `0` = no value in
  `created_at`/`updated_at`, `null` in `completed_at`/`read_at`.
- **`camera.password` is not persisted.**
- `notification` has no `updated_at`, so `NotificationModel` must not declare
  `updatedAt`: `prepareUpdate()` touches `updated_at` whenever that property
  exists and `RawRecord._setRaw` destructures the missing column schema →
  TypeError on the first local update.
- Relations only toward `camera` / `reminder`. Toward `user` only the raw id: role
  filtering can leave that row absent locally and `Relation.fetch()` throws.
- `tables/{domain}.table.ts` holds schema **and** model together (lynk splits them
  across 24+24 files and the contract between them is checked by eye), and
  `tables/index.ts` is the single registry `appSchema`/`modelClasses` derive from
  (lynk lists every model in three places).
- JSON columns (`capabilities`/`config`/`points`/`file_paths`/`data`) are typed and
  sanitized via the shared `tables/sanitizers.ts` (`sanitizeStringArray`,
  `sanitizeObject`, `sanitizeZonePoints`), fail-safe to `[]`/`{}` so a mismatch is a
  typing fix rather than a crash. Hot columns (`capabilities`, `points`) use
  `@json(..., { memo: true })` to skip re-parsing the stored JSON on every read.

### Traps encoded in the code

- `query.observe()` does **not** re-emit when a field changes on a record already
  in the result set — only on enter/leave. Lists rendering fields use
  `observeManyWithColumns`.
- `migrations.ts` is wired from v1 while empty: bumping `SCHEMA_VERSION` without
  `migrations` on the adapter **wipes** the local database.
- **`project_task.due_at` is indexed (schema v7, 2026-10-03).** WatermelonDB
  0.28 has no add-index migration step (`addIndex` is listed as not
  implemented), so v7 is `unsafeExecuteSql('create index if not exists
  "project_task_due_at" ...')` with exactly the name `encodeSchema` gives the
  schema's `isIndexed` column, so a fresh install and an upgraded one end with
  the same index. `tests/unit/database-migrations.test.ts` builds a v6
  database with `bun:sqlite`, applies the encoded v6→v7 steps and checks the
  index and that the due-date range query plans through it. LokiJS ignores
  `sql` steps: a desktop database created before v7 keeps an unindexed
  in-memory `due_at` (queries unchanged, only a scan), and a fresh one gets
  the binary index from the schema.
- **`notification (user_id, created_at)` is indexed (schema v8, 2026-10-05).**
  The notification feed pages one user's rows newest first, so the index is
  composite. A `tableSchema` column can only carry a single-column
  `isIndexed`, so `NOTIFICATION_SCHEMA` appends the statement through
  `unsafeSql` (fresh installs) and v8 runs the same
  `NOTIFICATION_FEED_INDEX_SQL` (upgrades). Both end with the same
  `notification_user_created` index, and
  `tests/unit/database-migrations.test.ts` checks that the keyset page plans
  through it.
- **`conversation_message (user_id, counterpart_id, created_at)` is indexed
  (schema v14, 2026-10-19).** The same composite shape as the notification
  feed: `CONVERSATION_MESSAGE_SCHEMA` appends
  `CONVERSATION_THREAD_INDEX_SQL` through `unsafeSql`, and the v14
  `createTable` step carries the same `unsafeSql`, so a fresh install and an
  upgraded one end with the same `conversation_message_thread` index
  (`tests/unit/core/database/database-migrations.test.ts`).
- `jsi: true` is safe — it falls back to the async bridge with a warning.

### Verification

`bunx tsc --noEmit` 0 errors, `bun run lint` 0 errors, `expo export --platform web`
bundles the LokiJS adapter, autolinking resolves the Android module.
**The dev-client must be rebuilt** — native deps changed.

## Secure networking (2026-08) — local network layer

### Trust model
- The backend is its own per-instance CA (`ca.pem` + rotating leaf); every
  service is HTTPS on its own port. The client **pairs once** against identity's
  `POST /pairing` (2026-10: a nonce + HMAC proof of the random code both ways,
  the code never on the wire) and afterwards **trusts only that CA and
  `argus.local`** (hostname verified against the SAN), reaching each service on
  the port its `_argus-route._tcp` announcement gives (see AGENTS.md rule 11).

### Architecture: one JS API, two native backends
```
src/core/services/net/        → IArgusNetService (discover / pair / request / isPaired / instance / unpair)
  net.native.ts ──► Nitro module "ArgusNet" (JSI)
                     Android: Kotlin  (OkHttp + NsdManager + custom TrustManager/Dns)
                     iOS:     Swift   (URLSession + Bonjour + SecTrust)
  net.web.ts   ──► Tauri (Rust) commands: mdns-sd + reqwest/rustls + keyring
  net-persistence.ts  → pairing persistence (shared; the pairing in
                        instance-storage, the session tokens in secure-storage)
src/core/services/instance-storage/ → the pairing (caPem, fingerprint, host, IP, routes)
  instance-storage.native.ts ──► Android: MMKV (survives a reinstall); iOS: expo-secure-store
  instance-storage.web.ts    ──► Tauri command + keyring crate
src/core/services/secure-storage/   → secrets (JWT, device credential)
  secure-storage.native.ts ──► expo-secure-store (Keystore/Keychain)
  secure-storage.web.ts    ──► Tauri command + keyring crate (refuses in a plain browser)
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
- **Linux packaging**: `desktop:build` emits the `.deb`, the `.rpm`, the release
  binary **and** the AppImage. The AppImage leg is the one that fails on this
  Arch-era host: linuxdeploy's bundled `strip` refuses the binaries with
  `unknown type [0x13] section '.relr.dyn'` (the `.relr.dyn` section the bundled
  toolchain does not know), and the known incompatibility is swallowed by tauri —
  `tauri build --verbose` is what prints the strip line. The `.deb`, the `.rpm` and
  the release binary are the real desktop proof; a missing AppImage is not a
  desktop build failure.
- Socket payloads travel as a **raw Tauri Channel** (`Channel<InvokeResponseBody::Raw>`:
  1-byte kind + bytes) — no base64/JSON per frame; binary sends use a raw
  `invoke` body with the socket id in a header. Small frames (<1 KiB) are
  eval'd, larger ones go through the channel fetch path.

### WebSocket (shipped)
- Native as required (RN's JS `WebSocket` does not trust the CA):
  **`ArgusSocket`** HybridObject in `modules/argus-net` (OkHttp on Android /
  `URLSessionWebSocketTask` on iOS, both over the pinned-CA session) and
  Tauri commands `argus_socket_open/send_text/send_binary/close`. Consumed
  via `netService.openSocket()`.
- **Two sockets**: the sync engine owns `/sync` (sync + emits + voice PCM) and
  each camera live view owns one `/media` socket on argus-camera (camera
  media). The camera feature's media service
  (`features/cameras/services/camera-media.service.ts`) subscribes, parses the
  12-byte `0xA7` framing, reassembles the server's 16 KiB chunks into whole
  `moof`+`mdat` fragments, pushes them into the platform player and acks the
  server only when the decoder has drained below the credit threshold; its
  recovery rules are under "Cameras" below. Desktop/web decodes with
  WebCodecs + canvas, native with the `argus-camera` view. Both views open the
  stream only while their screen is focused and pause decoding when the
  document is hidden. `http.service.ts` is the HTTP wrapper; there is no
  separate websocket wrapper.

### Local-first route choice (D2, 2026-10-13)

The app reaches its home on the LAN when it can and through the cloud relay when
it cannot. Away from home every home service has its own device name,
`<service>--<home-id>.argus-tunnel.lynk.page` (argus-cloud `docs/protocol.md`,
section 2.4, and `docs/plan.md`, section 4b). On the relay the app's TLS still
ends at the home and still pins the home's CA. The relay forwards ciphertext by
the name alone.

What this step lands:
- **The route model.**
  - `HomeService` is the closed set of eight services the home client
    dispatches (auth, identity, sync, camera, productivity, notification,
    guard, settings).
  - `ARGUS_ROUTE_SERVICES` maps each route segment to the service that serves
    it.
  - `ARGUS_SERVICE_DEFAULT_PORTS` gives each service its default LAN port.
  - A unit test keeps both tables equal to `ARGUS_DEFAULT_ROUTE_PORTS`, so a
    segment, its LAN port and its device name cannot drift apart. The
    backend's route baseline is where the ownership was read: `/pairing` and
    `/invitation` belong to identity, and `/rtc` to sync.
- **The URL.** `serviceUrl` stays the one place a URL is built. It answers the
  device name, with no port (443), only when the instance's `route` is `relay`
  and it carries a usable `remote` profile: a 32-hex home id and a domain name.
  For anything else it answers the LAN URL it always did. That includes a
  segment no home service serves (`/health`), the LAN route, and a missing or
  malformed profile.
- **The heal.** `urlAt`, the address heal's port rewrite, never touches a
  relay URL. A device name has no LAN port to refresh.
- **The choice.** `chooseRoute` (`net/net-route-choice.ts`) is the rule. The
  LAN wins whenever it answers. The relay is used only when the LAN does not
  answer and the relay does. When neither answers the status is
  `unreachable`, and the LAN stays the route to retry.

- **The home id comes from the sync context** (ruled 2026-10-13, backend
  4ddb0fc7). `remote: {homeId, domain, link, since}` rides in `InitialInfo`'s
  `info.context` and in every `ContextUpdate`, once the home's tunnel client
  has reported (backend `services/sync/CONTEXT.md`, "Remote access in the
  context").
  - `readContext` (`core/contracts/context.contract.ts`) checks it like the
    backend does. The home id and domain must be usable (`usableRemote`),
    `link` one of `up`, `connecting`, `down`, and `since` a positive integer.
    Anything else reads as no remote, and the rest of the context stays.
  - `ContextEngine` hands a context's remote to `netService.rememberRemote`.
    `saveRemote` (`net-persistence.ts`) writes `net.remoteHomeId` and
    `net.remoteDomain` only for a paired app and only when they changed, and
    `loadInstance` reads them back into `NetPairedInstance.remote` at the
    next start. So an app paired before this field existed gets it the first
    time it connects at home. Away from home it then still knows the names to
    try.
  - A context without `remote` changes nothing kept. The field is absent
    until the tunnel reports, and absent again after argus-sync restarts.
  - A new pairing deletes both keys, and so does unpairing. One home's
    profile never outlives its pairing.
  - The native modules get the profile with the trust configuration
    (`configureRemote`). The desktop's Rust reads the same two keys from the
    keyring, and writing either one forgets its cached trust.
  - `link` and `since` are read, not kept. They describe the link right now.

- **The probes choose the route** (`net/net-route-probe.ts`).
  - `measureRoute` asks `/pairing/status` on the LAN first: the paired
    host and port, even while the route is the relay. The LAN gets a head
    start of `NET_ROUTE_RELAY_HEAD_START_MS` (1.5 s). The identity
    service's device name is asked only when the LAN fails, or when it has
    not answered by the end of the head start. A LAN that answers in time
    never touches the relay. So when everyone is at home, nothing crosses
    the cloud (argus-cloud `docs/plan.md`, section 0).
  - Each probe goes through the transport's own `probe` call (desktop
    `argus_probe`, Android and iOS `ArgusNet.probe`). It resolves the name,
    opens the TCP connection, makes the TLS handshake under the pinned CA,
    and sends `GET /pairing/status`. Any HTTP answer counts as `reached`.
    Otherwise it names the class of the failure (reviewer's ruling,
    2026-10-13):
    - `dns`: the name did not resolve.
    - `connect`: no TCP connection, refused or timed out before one existed.
    - `tls-peer-closed`: TCP worked, then the peer closed, reset or stayed
      silent during the handshake or the answer.
    - `pin`: the chain does not lead to the pinned CA, or the leaf does not
      name the host. The reply then carries the address and the SHA-256 of
      the leaf the peer presented.
  - The probe carries the device identity headers and never a credential:
    no `Authorization`, no cookie, no `X-Argus-Device-Credential`. The
    desktop command takes no headers at all. Android and iOS drop those
    three even if a caller passes them. `/pairing/status` needs none, so a
    stranger at the paired address learns nothing of value.
  - Each probe is bounded by `NET_ROUTE_PROBE_TIMEOUT_MS` (4 s), which the
    native call enforces per phase. A reply that never comes reads as
    `connect` one second later. `chooseRoute` decides. A LAN that answers
    within its 4 s still wins over a relay that answered first.
  - The clock is a parameter (`NetProbeTimings`), so the tests drive the
    head start with a fake clock.
  - `NetRouteKeeper` runs one probe at a time. It first waits for a
    rediscovery in flight: the native module holds one configuration, and
    a relocation and a probe must not reconfigure it under each other.
  - **A LAN that fails the pin.** Away from home, a foreign network that
    reuses the home's IP range is normal, so this counts as "the LAN did
    not answer", plus a warning in the log with the address and the
    fingerprint seen. The keeper remembers it. The route goes to the relay
    when there is a profile, even if the relay failed too, and never back
    to that LAN address until a later probe passes the pin. Without a
    profile the route stays unset and requests still go to the paired
    address. The pin stops them in the handshake before a byte of the
    request leaves, and they follow sync's reconnect backoff. They start
    no loop of their own: a certificate refusal is `CERT_NOT_TRUSTED`, not
    `NETWORK_ERROR`, so it never triggers a rediscovery. Each pin failure
    is logged once per change of state, never once per request.
  - The chosen mode is kept in memory only (`instance.route`). Every start
    decides again.
  - **A failed connect.** `refreshAddress()` first rediscovers the home on
    the LAN. A home found at a new address wins and the route is the LAN.
    Otherwise it probes, and answers true when the route changed. The HTTP
    wrapper then rebuilds the URL (`serviceUrl` follows the route), the
    sync reconnect dials the new route, and the desktop socket retry uses
    `rerouted`.
  - **The foreground.** The sync service probes when it binds with a
    session, at launch, and on every reconnect opportunity: a return to
    the foreground, and the network return the watch already had.
    `netService.instance()` and the native request and socket wait for a
    probe in flight, so the first URLs after launch already use the
    decided route.
  - When a probe moves the route while the sync socket is open on the
    other one, `SyncConnection.followRoute` recycles the socket, for
    instance back to the LAN when the home answers there again.
  - A relocation always checks its candidate on the LAN URL
    (`lanServiceUrl`), never through the relay.
  - None of this needs a network-type module.

- **The calm status** (argus-cloud `docs/plan.md`, section 4b, "Visible
  states"). The app shows a state in words, never a raw error. There are
  four, and `chooseRoute` gives each one:
  - `home`: the LAN answered. "Conectado en casa".
  - `cloud`: the LAN did not answer and the relay did. "Conectado por la
    nube".
  - `unreachable`: the LAN did not answer, and the relay reached the cloud
    but not the home (`tls-peer-closed`: the relay closes on the SNI of a
    home with no link, or the home never answers). "No puedo conectar con
    Argus en casa".
  - `remote-unavailable`: the LAN did not answer, and the cloud itself was
    not reached (`dns`, `connect`), or there was no relay to try because
    the app knows no usable profile. "Acceso remoto no disponible".
  - A relay that fails the pin is no calm state. It can be an attack, so it
    is never shown as unreachable. The choice carries `relayRefused`, the
    log carries an error once per change, and the app raises the existing
    fingerprint alert ("Este servidor no es el que vinculaste…") the way a
    request error is shown (`useRelayRefusalAlert`, a toast). The status is
    then empty.
  - The link state in the sync context never decides. Away from home it is
    as old as the last connection.
  - `NetRouteKeeper` keeps the last choice and tells its listeners when it
    changes (`netService.routeChoice`, `onRouteChoice`). A relocation
    found on the LAN records `home`. An unpairing forgets the choice.
  - `useRouteStatus` (`shared/hooks`) reads it. Profile, under "Servidor",
    shows the state as a row with its icon (`home`, `cloud`, `wifi-off`,
    `cloud-off`; `NET_ROUTE_STATUS_VIEWS`). The offline banner carries the
    two states without a connection instead of its generic "Sin conexión
    con Argus". The watchdog's silent notice still wins over both.
  - The sync service probes on every sign-in as well as at bind. A session
    restored after bind used to wait for a failed connect before the first
    probe, so a phone at home never learned it was at home.
  - `tests/e2e/route-status.e2e.ts` puts the app in each state at phone
    width. The Tauri shim cuts hosts off (`__e2e_unreachable__`), and the
    seed carries the remote profile. With `ARGUS_E2E_ROUTE_SHOTS=<dir>` it
    saves one screenshot per state.

The error mapping is unchanged (`readEnvelope`, `toNetError`).

#### Which names a transport admits

The rule is the same on every transport. Besides the paired host, a transport
admits a name only when it is exactly `<service>--<home-id>.<domain>`. The
service must be one of the eight, and the home id and domain must be this
instance's remote profile (`net.remoteHomeId`, `net.remoteDomain`). There is
never a wildcard and never a suffix match. The chain must still validate
against the pinned CA alone, and the system's trust store is never consulted.
`tests/vectors/relay-hosts.json` holds the vectors: 8 admitted names and 34
refused ones. The TypeScript, Rust and Kotlin tests read it, and the Swift
tests will once they can run.

- **Desktop (Rust).** `net/relay.rs` is the rule.
  - `Trust` carries the remote profile. It is read from the keyring beside
    the pinned CA, and only a usable profile is kept.
  - The webview writes the two keys. Writing either one forgets the cached
    trust.
  - `ensure_allowed_host` (HTTP) and `validate_target` (sockets) admit the
    paired host or a device name. Nothing else.
  - The paired host still dials its paired address. A device name is
    resolved by the system's DNS.
  - rustls checks the device name against a root store that holds only the
    pinned CA.
  - `net/probe.rs` is the probe (`argus_probe`). It goes step by step over
    std sockets and rustls in a blocking thread, so each step names its own
    failure. A verifier that wraps the pinned one records the leaf it was
    shown. Its tests and `http.rs`'s pin test run local rustls servers from
    `tests/vectors/tls.json` (`net/test_tls.rs`).
- **Android (Kotlin).** `RelayHosts.kt` is the rule, pure Kotlin with no
  Android import.
  - `configureRemote(homeId, domain)` (spec `ArgusNet.nitro.ts`) hands the
    module the remote profile. `net.native.ts` sends it with the trust
    configuration, from the instance's `remote`. Until an instance carries
    one it sends two empty strings, which admit nothing. A new pairing sends
    them too, so the old home's profile never outlives its pairing.
  - Before any strict request or socket, `targetAdmission` refuses with
    `HOST_NOT_ALLOWED` a URL that is not https or wss, or whose host is
    neither the paired host nor a device name.
  - The hostname verifier accepts the paired host as before. It accepts a
    device name only when the leaf certificate's SAN is exactly that name.
    The tunnel PKI issues one certificate per service with that single SAN.
    The trust manager still holds only the pinned CA.
  - The strict client follows no redirect, like the desktop's.
  - The paired host still dials its paired address. A device name is
    resolved by the system's DNS.
  - `RelayHostsTest.kt` reads the vector file through the
    `argus.relayVectors` system property that `build.gradle` sets. Run it
    with `./gradlew :argus-net:testDebugUnitTest` from `android/`.
  - The strict client and the probe live in `StrictTransport.kt`, plain
    JVM code the unit tests drive against local TLS servers. The TLS
    material is `tests/vectors/tls.json`: a test CA, a leaf it signs, a
    leaf from another CA and a leaf that names another host, also read by
    the desktop's tests (`argus.tlsVectors`). The paired host answers to
    the pinned CA alone, as the client always has. A device name must also
    be the leaf's exact SAN. A certificate refusal on the strict client is
    `CERT_NOT_TRUSTED` (`StrictTransport.codeOf`); it used to read as
    `NETWORK_ERROR`.
- **iOS (Swift).** `RelayHosts.swift` is the rule. It compares names byte
  for byte (UTF-8), so Swift's Unicode-aware string equality never enters.
  - `configureRemote` keeps the profile beside the paired host.
    `request` and `openSocket` refuse with `HOST_NOT_ALLOWED`, before any
    connection, a URL that is not https or wss or whose host is neither the
    paired host nor a device name. Sockets were not checked before.
  - `StrictDelegate` sets the SSL policy for the host it was asked about.
    The chain still anchors to the pinned CA alone. It follows no redirect,
    like `PinnedDelegate`.
  - `RouteProbe.swift` is the probe, over `NWConnection`. A failure before
    the TLS verify block runs is `dns` or `connect`, and one after it is
    `tls-peer-closed`. A verify block that refuses is `pin`. It is unbuilt
    on this machine, like the rest of the module.
  - Nothing builds or tests the iOS module on this machine. Once an iOS
    test target exists, its tests read the same vector file.

### Verification
- `bunx tsc --noEmit` and `bun run lint` → 0 errors. `cargo check` (src-tauri) → 0/0.
  `bunx expo prebuild --platform android` + `bunx expo run:android` → compiles and runs
  on the Redmi (Nitro module + nitrogen's C++). `expo export --platform web` → `dist/`.

## History log

- **2026-08** — Custom i18n engine implemented (no external library).
  Dictionaries in `core/i18n/locales/{locale}/` (route-folder convention:
  `common/`, `screens/{home,qr,not-found}/` each with `index.ts`; kebab-case
  keys). `TranslationKey`/`TranslationParamsOf` derived from the `es` literal in
  `locales/schema.ts`; `{name}` interpolation with per-key typed params enforced
  via `TranslationParamsRest` rest-tuples (keys without placeholders reject
  params, keys with them require them); `en` forced to the `es` shape by
  `satisfies` on the registry. `useTranslation()` (reactive through
  `useLocaleStore`) + `t()`/`setLanguage()`/`getLanguage()` imperative for `.ts`.
  Preference persisted under `app.language` via `storageService`; `system`
  resolves the device locale by prefix (`es-*`/`en-*`), stored preference wins.
  Migrated all hardcoded copy (home, qr route + components, not-found, mic hook);
  `QR_SCAN_PURPOSES`/`QR_SCAN_FEEDBACK`/`QrScanConfig` now carry keys, not text.
  Validated: `tsc`/`lint` 0 errors + negative type probes (wrong key, invalid
  params, missing `en` key all fail to compile).

- **2026-08** — **WatermelonDB implemented** (persistence only; the
  autonomous `/sync` layer landed afterwards — "Local-first views, granular
  audits and responsive UX", below).
  7 tables mirroring `SynchronizedDto`, schema+model co-located per table, single
  `TABLES` registry, platform-split adapters (SQLite/JSI + LokiJS/IndexedDB), typed
  `collection()`. Architecture set by the user: **the database is read only through
  `core/services/*.service.ts`** — no `DatabaseProvider`, `Clause` stays inside the
  services, `use-observable.ts` (`useSyncExternalStore`) is the sole bridge to
  React. Decisions and verified findings in the section above and in
  `PLAN-WATERMELONDB.md`. Reversed the earlier camelCase-columns decision of
  `PLAN-DATABASE.md` in favour of snake_case throughout.
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
- **2026-08** — Orb **depth + particles pass**, informed by a research sweep of what
  shipping voice orbs actually do (Siri's reverse-engineered SkSL, the ElevenLabs
  Orb source, Gemini, plus motion-accessibility literature). Added:
  - **Motes**: sparse luminous particles inside the orb, two layers counter-rotating
    for parallax. First attempt used thresholded value noise and looked like **dirt**
    — value noise makes diffuse clumps, not points. Replaced with **one splat per
    grid cell** at a hashed offset, radius kept inside its own cell so no neighbour
    lookups are needed (2 hashes + 1 exp + 1 sin per layer).
  - **Energy flow direction** (`u_flow`) as the primary state cue: listening draws
    inward, speaking radiates outward, idle/thinking circulate. Chosen because it
    survives greyscale and colour-blindness — hue cannot express direction, and the
    warm monochrome palette has no hue to spare. `error` now also **freezes**
    (wobble ~0) so it is not signalled by colour alone (WCAG 1.4.1).
  - **Internal flow** through the band (counter-rotating noise), a **fresnel-like
    inner rim**, **chromatic depth** across the band thickness, and a faint interior
    volume — the hollow no longer reads as dead black.
  - **Dither** on the coverage: a smooth warm monochrome ramp bands visibly at 8-bit.
  - **Quasi-periodic drive**: idle motion is now a *product* of two sines with an
    irrational-ish ratio (effective period of minutes) instead of a sum, which loops
    visibly in ~2s.
  - Loudness rebalanced toward **light rather than size** (jump brightness gain
    0.5 → 1.1, radius gain 0.075 → 0.065).
  - **Accessibility**: `ORB_REDUCED_MOTION_SCALE` is now `0` and gates a new
    `u_motion` uniform that zeroes every displacement channel (rotation, wobble,
    drift, breathing, jump) while keeping twinkle and hue — vestibular triggers are
    movement/direction/distance, not opacity or colour. `Orb` also takes an
    `accessibilityLabel`, since the orb is the only indicator of assistant state.
  - Performance: `hash()` switched to the arithmetic "hash without sine" (the old
    one cost a transcendental per lookup, four per `noise()`), plus an early return
    outside `CULL_R` that discards ~36% of the canvas. Roughly cost-neutral versus
    the previous version despite doing considerably more — **estimated, not measured
    on device**.
- **2026-08** — **File naming normalized to kebab-case** (user convention, now rule 1
  in `AGENTS.md`): `Orb.tsx` → `orb.tsx`, `OrbShader.ts` → `orb-shader.ts`,
  `OrbLoader.{native,web}.tsx` → `orb-loader.{native,web}.tsx`. Exported symbols stay
  PascalCase; only file names are kebab. Sole exception is
  `modules/argus-net/src/ArgusNet.nitro.ts` — nitrogen requires the spec file name to
  match the HybridObject declared in `nitro.json`. Cleanup in the same pass: removed
  the dead `ORB_STATES` const (it also violated the rule that `*.type.ts` holds only
  types), reordered `orb.tsx` to the golden rule (`handleLayout` was declared after
  the effects), refreshed stale prop/state copy.
- **2026-08** — **DB layer quality pass**: shared `@json` sanitizers extracted to
  `tables/sanitizers.ts` (`sanitizeStringArray`, `sanitizeObject`, `sanitizeZonePoints`)
  — removes the per-table duplicate functions; `{ memo: true }` on hot JSON columns
  (`capabilities`, `points`). `no-console` silenced per-line in the DB adapter error
  handlers. `react-hooks/immutability` **disabled in `eslint.config.js`** (known
  Reanimated shared-value false positive) and all file/per-line disables for it removed.
  Verified: `tsc` 0 errors, `lint` 0 errors/0 warnings.
- **2026-08** — **Database layer simplified**: `ModelMap`/`TableName`/`ModelOf` moved
  from `core/database/index.ts` to `core/types/database.type.ts` (imports are
  `type`-only, no runtime cycle). `DatabaseService.findById` now uses the primary-key
  `collection.find()`. Deleted the temporary `core/database/self-check.ts` + the whole
  `src/app/(test)/` route group (`database.tsx`, `index.tsx`, `_layout.tsx`, `orb.tsx`),
  and reset `src/app/index.tsx` to a clean shell (the DB config is verified when real
  sync data lands). Trimmed comments across the database layer to only the
  necessary "why/trap" notes. AGENTS.md rule 12 updated accordingly.
- **2026-08** — **QR scanner rebuilt as a reusable "bottom sheet" screen**
  (design chosen by the user out of three mockups). The screen is now driven entirely by
  `useQrScanStore`: the caller passes the parameters via `open({ purpose, ...overrides })`
  and reads `value` + `status` back, so `/qr` is reusable for any future scan without
  editing it. New files: `core/types/qr.type.ts`, `shared/constants/qr.constant.ts`
  (`QR_SCAN_PURPOSES` / `QR_SCAN_FEEDBACK` / timings), `shared/components/qr/*`
  (guide frame, sheet, manual entry), `shared/hooks/use-reduce-motion.ts`.
  Nine defects fixed in the process, three of them able to strand the user:
  (1) **navigation depended on an animation callback** — a second QR entering frame
  restarted the `withSequence`, the old callback fired with `finished === false` and
  `finishScan` never ran, leaving the scanner open forever. Detection now locks the
  scanner (`onBarcodeScanned={undefined}`) and a `setTimeout` drives the exit.
  (2) **`router.back()` with no history check** in both exits → a deep link into `/qr`
  trapped the user; now `canGoBack() ? back() : replace('/')`.
  (3) **Android hardware back never resolved the session** — the caller would wait on
  `scanning` forever; an unmount cleanup now emits `cancel()`.
  (4) `bounds` tracking dropped — on Android the coordinates are the analyzer image's,
  only divided by density, and the image size is not exposed to JS (see the section above).
  (5) no payload validation → `pattern` per purpose, reported **inside** the scanner,
  resuming after `QR_SCAN_RETRY_MS` instead of navigating away.
  (6) the pairing secret was rendered on screen; it no longer is.
  (7) permanently-denied permission had a dead "Permitir cámara" button and **no way out**
  → `Linking.openSettings()` and the close button now exist in every state.
  (8) hardcoded `rgba(0,0,0,0.9)` + `text-white` (violated rule 7) and invisible against
  dark scenes → semantic tokens only. The overlay uses `accent`/`error` deliberately,
  since `foreground` flips to near-black in the light theme and would vanish on camera.
  The pill avoids white-on-arena (≈2.3:1): `accent` tone is `bg-accent-soft` +
  `text-foreground`, and the error tone reuses the already-validated
  `bg-error` + `text-destructive-foreground` pair (AA in both themes).
  (9) icon-only buttons had no `accessibilityLabel`; the status pill is now
  `accessibilityLiveRegion="polite"` and the confirm delay dropped 1800 ms → 450 ms.
  Verified: `tsc` 0, `lint` 0, and `KeyboardControllerPackage` confirmed present in the
  installed debug APK's `classes2.dex` — **no rebuild needed**, Metro reload is enough.
  Not yet validated on device.
- **2026-08** — **`Cannot assign to read-only property 'NONE'` fixed at the root**
  (`babel.config.js`). Symptom: an uncaught runtime error on device, invisible in the
  Metro terminal, thrown from `Event.js:53` whenever `WebSocket.js` built
  `new Event('error')` on `websocketFailed`.
  Root cause: **Babel plugin ordering.** Top-level `plugins` run *before* presets, so
  the global `['@babel/plugin-transform-class-properties', { loose: true }]` (added for
  WatermelonDB's legacy decorators) also processed `node_modules/react-native`. In loose
  mode a class field declared without an initializer compiles to a plain assignment
  (`this.NONE = void 0`) instead of `Object.defineProperty`; in spec mode
  `flow-strip-types` would have erased it, because `+NONE: 0;` is a Flow *type-only*
  declaration (`0` is a literal type, not a value). RN also defines those same names on
  `Event.prototype` with `Object.defineProperty(..., { enumerable: true, value: 0 })` —
  no `writable: true`, so they are read-only and the assignment throws in strict mode.
  Fix: the four decorator/loose plugins moved into a Babel **`overrides`** entry whose
  `test` matches only `<root>/src`, which is the only place using decorators (verified:
  no decorators under `modules/argus-net`). No `patch-package`, nothing patched in
  `node_modules`, so it survives reinstalls and RN upgrades.
  Verified by compiling the real files with the project config: RN `Event.js` went from
  **4** `this.<PHASE> =` assignments to **0** while keeping its `defineProperty` calls,
  and `user.table.ts` still emits legacy `applyDecoratedDescriptor` ×8 +
  `_initializerDefineProperty` with no per-field spec `_defineProperty` (which is what
  would break WatermelonDB). Plus a full `expo export --platform android` bundles clean
  (6.2 MB hbc). The underlying WebSocket failure was only the trigger — Metro's dev
  socket reconnecting — and is now harmless instead of fatal.
- **2026-08** — QR scanner **typing mode** (user request: it looked bad and the phone
  stuttered while typing over a live camera). The sheet now **grows over the camera** as
  the keyboard opens instead of just being pushed up: `KeyboardAvoidingView` replaced by
  `useKeyboardProgress` over `useReanimatedKeyboardAnimation`, so the whole transition is
  native shared values on the UI thread. Only transform + colour + radius animate — the
  cover has a fixed height and slides via `translateY` — because animating height, border
  width or padding re-runs Yoga and refires `onLayout` every frame, dragging JS along with
  it. Barcode analysis is detached the instant the keyboard moves; the preview is only
  switched off (`active={false}`) once it is fully hidden, and rewarmed before it is
  revealed. The torch button morphs into a "back to camera" button off the same `progress`
  value. `QrScanSheet` became content-only and the route took over the animated chrome.
  Verified: `tsc`/`lint` 0 and an Android bundle. **Pending device validation**: the
  `useResizeMode()` that `useReanimatedKeyboardAnimation` applies sets Android
  `adjustResize`, and its interaction with edge-to-edge should be eyeballed on the Redmi —
  if the sheet ever double-offsets, switch that hook to `useGenericKeyboardHandler`.

- **2026-08** — **Capa de servicios reutilizables (HTTP · Sesión · Sync autónomo)** —
  `PLAN-SYNC-SERVICES.md` define y documenta la fase (lynek como guía, no copia).
  - **Tipos/interfaces**: shapes de wire (`ISocketEmitDto`, `ISynchronizedDto`,
    `IResponseLoginDto`, `IAuthUser`, `IServiceResponse`, ...) en `core/interfaces/`
    con barrel; aliases/uniones (`HttpMethod`, `SyncTableKey`, `SyncCursors`,
    `SyncOperation` derivada de `SYNC_OPERATION` en `shared/constants/sync.constant.ts`)
    en `core/types/`. `socket-emit.type.ts` quedó solo con la derivación de tipo.
  - **`http.service.ts`** (clase concreta, sin interfaz): wrapper sobre `netService`
    que **devuelve** `IServiceResponse<T>` (nunca lanza), Bearer desde
    `useAuthStore`, refresh 401 **single-flight** (`PATCH /auth/refresh-token` con
    promise compartida) + retry único (`skipAuthRetry`), `baseUrl` cacheada por
    instancia, `postMultipart` (body → part `payload` + archivo, contrato nativo
    verificado). Multipart login/register usan el campo `image` del backend.
  - **`auth.store.ts`** (zustand): sesión `{status, user, accessToken, refreshToken}`
    con **auto-bootstrap al cargar el módulo** (`void bootstrap()` — sin `hydrate()`
    desde la UI), tokens en secure-storage (`NET_STORAGE_KEYS`), `user` persistido
    internamente vía `storageService` (`app.session.user`) en cada `setUser`;
    `clear()` solo borra y el sync se desconecta solo (suscripción al store).
  - **`auth.service.ts`** (`login/register/hasAdmin/status/logout`) e
    **`invite.service.ts`** (`create`; `accept` pre-CA por `netService.requestTrustAny`
    TOFU + fingerprint, host/port desde el QR — fase 2). Solo llaman al API.
  - **Nitro**: `ArgusSocket` HybridObject (`sendText/sendBinary/close` + callbacks
    `onOpen/onMessage/onError/onClose`), `openSocket(options)` y `trustAny` en
    `NetHttpRequest` — regenerado con `bunx nitrogen`, implementado en
    `ArgusSocket.kt` (OkHttp sobre el cliente CA cacheado, callbacks al main looper,
    `NullType.NULL` — el constructor es privado) y `ArgusSocket.swift`
    (URLSessionWebSocketTask con la sesión anclada, `asType()` en los variants).
    `IArgusNetService.requestTrustAny` + impl native/web (web lanza
    `NOT_SUPPORTED`; desktop diferido).
  - **Sync autónomo** (`core/services/sync/`): `synchronize.service.ts` posee el
    socket único (backoff 2s→30s, `UNAUTHORIZED` → `authStore.clear()`), se
    auto-suscribe al store (`bind()` idempotente, `IS_NATIVE` guard), en
    `InitialInfo` (op 0) hace `setUser` + `syncOnce()`. El primer `Synchronize`
    construye la proyección completa; después sus páginas normales (200 filas,
    pausa 150ms, máx 20) usan cursores `createdAt` en storageService para altas y
    bajas. Los cambios parciales llegan en páginas de `audit_log` y
    `user_audit_log`, acotadas por `{lastId, watermarkId}` y aplicadas sólo con
    `changes[field].current`. `entity-mappers.ts` conserva su whitelist por
    tabla y conversión `×1000` seg→ms; escrituras usan
    `prepareCreateFromDirtyRaw` (id = server id string, verificado en
    `sanitizedRaw`) + actualizaciones parciales + `prepareDestroyPermanently` en
    `chunkedBatch(100)`. Add/Delete/Log en vivo se aplican directo o se encolan
    durante sync en ese orden; la fila `user` propia se fusiona en
    `auth.store.setUser`. Exposición pública para fase voz:
    `send/sendBinary/on/onBinary/onConnect/onDisconnect` y `syncOnce()` manual.
    Socket platform-split (`sync-socket.native/web.ts`) para no romper el bundle
    web.
  - **Wiring mínimo**: `index.tsx` gate de 3 estados (splash mientras
    `status === 'loading'`), sin efectos ni hydrate. i18n `common.errors.*` es/en.
  - Validado: `tsc` 0, `lint` 0, `web:build` OK, `app:compileDebugKotlin` OK
    (Redmi rebuild pendiente — el dev-client cambió por `ArgusSocket`).
    Swift no compilable en Linux (pendiente validación en macOS).
- **2026-08** — **Pantalla de registro facial reescrita** (`welcome/face/index.tsx`
  + `face-guide-overlay.tsx` + `use-face-guide.ts`), flujo **100% automático**
  (decisión del usuario: sin confirmación, "todo automático, nada de complejidad").
  - **Distribución**: el bug raíz era que el sheet (único hijo "en flujo" del
    `flex-1`, sin `justify-end`) se renderizaba ARRIBA, tapando la frente del óvalo;
    ahora `justify-end` + sheet `w-full max-w-md self-center` (tablets OK). El óvalo
    se ajusta al **área de cámara medida** (`onLayout` del sheet, nunca adivinada):
    `area = [insets.top, sheetTop]`, `ovalH = min(0.52·H, 0.8·areaH)`,
    `ovalW = min(0.64·W, 1.3·ovalH)`, pill y flecha con posición explícita y clamps.
    En pantallas ≤700dp el óvalo/pill ya no se solapan con el sheet (antes sí: sheet
    de altura variable por fase cubría el pill en 360×640).
  - **Sheet de esqueleto estable**: título + hint (2 líneas máx) + slot de mensaje
    reservado (`min-h-6`) + slot de acción fijo (`h-11`) → la altura no salta entre
    fases → el área de cámara (y el óvalo) no se mueven. `maxFontSizeMultiplier 1.25`.
  - **Flujo**: guía → cara estable 800ms → vibración → **countdown 3-2-1 cancelable**
    (cualquier drift vuelve a guía y rearama) → foto (quality 0.9, `shutterSound:false`
    vía `takePictureAsync`, no prop del `CameraView`) → **envío automático** → validación
    del servidor. Tras fallo: cooldown 6s antes de rear mar + desarme tras 3 fallos
    consecutivos (solo manual). Cámara apagada en `submitting` y con notice
    (`active` condicional). `Linking.openSettings()` si el permiso se deniega
    permanentemente (antes: callejón sin salida).
  - **Fix de bugs**: el cleanup del redirect de `alreadyRegistered` se perdía (return
    desde async callback) → ahora ref + cleanup en unmount; el countdown usaba `h2`
    (heredaba `border-b`) → texto plano; `FACE_OVAL_RATIO` muerto eliminado;
    colores del overlay → `colorTokens` (antes hex hardcodeados fuera de tema).
  - **Pattern**: el cancel del countdown por drift es un **evento** del hook
    (`onDrift`, disparado en el loop de muestreo ante transición ready→no-ready), no un
    efecto que pollee — evita `react-hooks/set-state-in-effect` y el problema de deps
    inestables (`captureNow` dependía de `guide`, objeto nuevo por render → el timer
    se reiniciaba en cada snapshot). Callbacks estables vía refs (`resetGuideRef`,
    `phaseRef`). i18n: quitadas `confirm-*`, añadidas `hold-still`/`sending`/
    `permission-*`. Validado: `tsc` 0, `lint` 0. **Pendiente: validación en el Redmi**
    (flujo completo auto + posiciones del óvalo en 393×873 y una pantalla corta).
  - **Óvalo redondeado (decisión del usuario)**: `FACE_OVAL_RATIO` reintroducido como
    **width:height del óvalo** (1.1, casi circular) y el overlay lo mantiene en todos
    los dispositivos: `ovalW = min(0.8·W, 0.8·areaH·ratio)`, `ovalH = min(ovalW/ratio,
    0.8·areaH)`. El óvalo anterior (fracciones fijas 0.64W × 0.52H) renderizaba una
    píldora estrecha en pantallas altas (252×454 en el Redmi, ratio 0.55) donde la
    cara no cabía en horizontal; ahora 314×285 (ratio 1.1). Consecuencia geométrica:
    el óvalo redondo es más bajo, así que `FACE_CLOSE_MIN_HEIGHT` bajó de 0.58 a 0.40
    para que "too close" dispare antes de que la cara desborde el óvalo (banda ready
    0.24–0.40 de frame). Eliminadas las constantes muertas `FACE_OVAL_W/H_RATIO`.
- **2026-08** — **Auditoría responsive + guards de plataforma en todas las vistas**
  (pedido del usuario: mobile/tablet/laptop/desktop).
  - **Guards verificados** — solo móvil: `/qr` (Stack.Protected + `IS_WEB` Redirect,
    doble), `/approve` (Stack.Protected), `/welcome/face` (WebOnlyNotice),
    `/welcome/voice` (WebOnlyNotice). Solo web/desktop: `/login` (`IS_NATIVE` →
    Redirect al face login). Universales: `/`, `/welcome`, `/welcome/pairing`,
    `+not-found`.
  - **Patrón responsive**: las vistas en flujo (no cámara) ahora usan columna
    centrada con ancho limitado — hero (`welcome`, home) `max-w-lg`, formularios
    (`login`, `approve`, `pairing`, `voice`, `WebOnlyNotice` de cara) `max-w-md`,
    siempre `w-full self-center` + insets. En el home el contenido va en un wrapper
    `max-w-lg` para que el `AvatarFab` (absolute) siga anclado al borde de pantalla.
    En `+not-found` no había nada: rediseñado con tokens (bg-background, h4, muted,
    link accent) y centrado con max-w-md.
  - **WebOnlyNotice de cara**: era dead-end en web para enroll (sin botón) → ahora
    botón "Volver" (`common.back`) en enroll y "Ir a login" en login.
  - Verificado: `tsc` 0, `lint` 0, `web:build` OK y clases generadas en el CSS
    (`max-w-md`/`max-w-lg`/`self-center`/`w-full`/`underline-offset-4`). Los flujos
    de cámara (face/qr) quedan full-screen por diseño (portrait). Pendiente:
    validación visual en web (ventana landscape) y en el Redmi/iPad.

## Avatar reactions driven by the backend (2026-08-20)

The avatar now plays a **semantic reaction** the backend derives from each voice
turn, animated by the prosody of Argus's own reply. Two orthogonal layers: the
reaction picks the pose, the voice envelope gives it life.

- **Wire** — `voice:event` (the constant `VOICE_EVENT_TYPE` existed with no
  handler; this is what it was reserved for):
  `{ reaction, intensity, because }`. The backend sends **meaning**, never an
  expression name, so retargeting the face is a change to one TS table.
- **`REACTION_SEMANTIC_KEY`** (`reaction.constant.ts`) maps the 10 reactions to
  calibrated `semanticKey`s already in `avatar.constant.ts`
  (`recognizing → joyful-down-right`, `uncertain → skeptical-right`,
  `alarmed → surprised-left`, …). `idle → null` keeps the phase pose.
  `getAvatarExpressionBySemanticKey` returns `undefined` for an unknown key, so
  a backend that learns a new reaction before the app does degrades to the phase
  pose instead of throwing.
- **`useAvatarStore`** gained `reaction` + `intensity` and a `react()` action.
  A reaction is punctuation, not a mood: it expires after `REACTION_HOLD_MS`
  (4.2 s) via a store-scoped timer, so the face never stays stuck on a surprise
  from four turns ago. `Avatar` prefers `reaction → phase` for its target pose,
  and `intensity` scales the ambient-motion ramp.
- **Voice envelope** (`shared/libs/voice-level.ts`) — `voiceLevel` is a
  module-level `makeMutable`, not a hook: the producer is a service (not a
  component) and the consumer is the render worklet, and it updates ~30x/second
  so it must never cause a render. `voice.service.ts` computes `pcmEnvelope()`
  over the PCM it **already buffers** before playback and walks it in step with
  the player; the worklet multiplies ambient motion by it and injects a little
  extra movement on loud syllables.
- **Why client-side** — a pose per frame would be ~60 WebSocket messages per
  second. The client already holds the audio, so the envelope costs one pass
  over memory plus a 32 ms timer: no extra network, no model, nothing per frame
  beyond a shared-value read.
- Dial `VOICE_ENVELOPE_PEAK_GAIN` to 0 for intensity-only modulation if the
  peaks read as a tic on device; `VOICE_ENVELOPE_MOTION_GAIN` controls how much
  the voice drives ambient motion at all.

Validated: `tsc --noEmit` 0, `expo lint` 0. Backend side documented in
`backend/CONTEXT.md` → "Reactions".

## Local-first views, granular audits and responsive UX (2026-08-23)

The app is real-time without behaving like a remote dashboard. On entry, a
signed-in view reads its last authorized snapshot from MMKV synchronously; a
central coordinator has already kept that snapshot current from the local
projection. This eliminates a view-level loading state for local data without
duplicating resource arrays in React.

### Read path and cache ownership

```
backend /sync → WatermelonDB durable projection → ViewCacheCoordinatorService → MMKV snapshot → route
                                                        │
                                                        └─ local filter/query inside *.service.ts
```

- `viewCacheService` is serialized storage plus a revision signal only. It does
  **not** retain row arrays in JS and `view-cache-memory.ts` was removed. The
  key format is `view.cache.v2.<userId>.<viewKey>[.<scope>]`; session changes
  namespace and clear the cache before another user can render it.
- Routes consume `useViewCacheRows` / `useViewCacheValue`; they never import
  Watermelon or maintain their own observable. `useCachedRows` is compatibility
  code, not the pattern for new screens.
- `ViewCacheCoordinatorService` is the sole owner of Watermelon subscriptions
  for view data. `sessionService` starts it after restore/establish and stops it
  before local cleanup. It is a registry of per-domain projections
  (`core/services/view-cache/*.projection.ts`: cameras with zones, projects and
  tasks, people and invitations, notifications, activity, summary, today's
  agenda, calendar), each a pure function over its own sources.
- Ordinary lists are bounded at `VIEW_CACHE_PAGE_SIZE = 40`. Calendar is
  paginated by the visible semantic period: day/week filters read the active
  cached range and a month cache contains its 42-day grid. The active month and
  its neighbours are retained. New views must define their constants in
  `shared/constants/cache.constant.ts`, their snapshot interfaces in
  `core/interfaces/`, and their type unions in `core/types/`.
- The people search filters the cached directory in memory. The coordinator
  refreshes date-derived dashboard/day data at local midnight.
- Server-only work may show `Button.loading` on the initiating control. It must
  not replace locally cached content with a full-screen spinner.

### Sync contract: creations/deletions plus partial update logs

- First `Synchronize` is a full local projection bootstrap for all
  `SYNC_TABLE_KEYS`. Thereafter the normal stream is **creation-only** and uses
  `createdAt`; deletes use their existing tombstone stream. It must not depend
  on `updatedAt`/`syncAt` to transport updates.
- Updates flow through global `audit_log` and recipient-scoped
  `user_audit_log`. The client first asks each log for an id watermark, then
  consumes the bounded interval `afterId < id <= endId` in ascending pages. Its
  persistent cursor is `{ lastId, watermarkId }`; it advances only after that
  page has been applied. `afterId = 0` deliberately establishes an empty audit
  baseline so the first later log is not lost.
- An audit row is a field diff. `audit-log-patch.ts` maps only
  `changes[field].current` to partial Watermelon props; omitted columns are
  never defaulted. The processor batches compatible updates and requests a
  context recovery if the target row is absent.
- During initial synchronization, live `Add`, `Delete` and `Log` messages are
  queued and replayed in that order so an audit patch cannot run before its
  creation.
- **Grants pull their scope (2026-10-03).** A `project_member` or
  `calendar_event_share` row naming the signed-in user (from a pull page or a
  live `Add`) records its parent id in `app.sync.grants.<userId>`
  (`SyncCursorStore.loadGrants/saveGrants`, cleared with the cursors). Each
  sync, after the creation pages, `GrantScopePager` pulls the pending parents
  in chunks of 50 with `{requiredCreate, scope}` on `project` + `project_task`
  or `calendar_event`, pages them by `(createdAt, id)` from zero, upserts the
  rows and only then drops the chunk from the pending set. A live grant asks
  for a sync at once. `sweepRevokedGrants` then destroys every project or
  event the user neither owns nor holds a grant row for, with its tasks and
  grant rows; it also runs after a live batch that deleted a grant row. So a
  member added or removed while offline converges on the next connect, and
  the backend no longer sends a frame per task on a grant (backend
  `services/sync/CONTEXT.md`, "Grants"). Pure helpers in
  `core/services/sync/grant-scope.ts`, unit-tested in
  `tests/unit/grant-scope.test.ts`. The coordinator observes the resulting projection and refreshes
  MMKV before the user enters a view.

### Sharing: project members and event shares (F6, 2026-10-13)

- The owner alone manages a share. The backend checks `ownerId == actor` for
  every create, update and removal of a `project_member` or a
  `calendar_event_share` row, and the screens follow it: the Members button and
  the agenda's Share action appear only to the owner.
- The picker lists the household directory, which only the Owner reads, so the
  owner-only check is also gated by `peopleAccessOf(view).receivesDirectory`. A
  Resident who owns a project therefore sees no picker. The backend would accept
  an add by id, but the app has no list to pick from; that is an owner decision,
  not a bug.
- A grantee receives its own grant row, not the others' (R21). `projectAccessOf`
  reads that row to decide edit, view or none, which drives the read-only notice
  and the hidden controls.
- Changes are optimistic: `runOptimistic` with `project_member` or
  `calendar_event_share` intents, shaped by `projectMemberLens` and
  `calendarShareLens`. A pending row is dimmed and refuses actions. The two view
  caches are `project.members` (scope: project id) and `calendar.event.shares`
  (scope: event id, tracked so a scope left with no rows is emptied).
- One dialog serves both: `shared/components/sharing/share-members-dialog.tsx`.
  Each feature supplies its labels, its candidates (`shareCandidates`, which
  checks the table's read permission) and its mutations.
- `CalendarEntry.ownerId` is set for events only, so the Share action can tell the
  owner from everyone else.

### Deleting a notification (F6, 2026-10-13)

- Each row of Novedades (a thread) has a delete button, a ghost icon button beside the
  row rather than inside its pressable, so it stays a control of its own for a screen
  reader; its name carries the title ("Delete notification: …"), so two rows never share
  one. The bell's preview is unchanged. The button shows while `can('notification',
  'delete')`, which every role holds (`role-access.ts`, mirroring the backend's
  `kTableAccess`).
- Deleting a thread is one request, behind the Undo toast reminders, events and tasks
  use:
  - A thread with a key sends `DELETE /notification/thread/{threadKey}`, with the key
    URL-encoded (`notificationService.removeThread`, `threadRemovalPaths`). The server
    deletes every live notification of the caller in that thread, the entries past the
    loaded page included.
  - A row without a key is its own thread and sends `DELETE /notification/{id}`.
  - The thread key is `notificationThreadKey`: `data.threadKey` as a trimmed, non-blank
    string. It is the rule the Novedades grouping (`threadKeyOf`) and the server both
    apply.
- The rows leave at once through delete intents on `NOTIFICATION_LENSES`
  (`threadDeleteIntents`).
- A 204 is done. So is a 404 whose body is the Argus envelope carrying `NOT_FOUND`: the
  server has no live row of that thread left for the caller, because another device got
  there first (`removalSettled`). On either answer the service forgets the thread's local
  rows, every one including those past the loaded page (`belongsToThread`), so the thread
  cannot come back when its intents expire. The Delete frames that follow then find
  nothing, which is a no-op.
- Any other refusal brings the whole thread back with the error toast, and Retry when
  it is retryable. That includes a 404 without the envelope (an HTML page, a proxy's
  page, an empty body): it is `UNREACHABLE_ROUTE` (see "Only the Argus envelope speaks
  for the server"), so its toast says the server did not answer as Argus.
- A server older than the thread route answers with the envelope, never with an HTML
  page: every service has answered a route it does not have through backend
  `ErrorHandler::unmatchedRoute` since 2026-09-21. Since the backend's ROUTE_NOT_FOUND
  change (2026-10-13, backend `packages/lib/http/CONTEXT.md`, "An unmatched route answers
  ROUTE_NOT_FOUND") that answer carries `ROUTE_NOT_FOUND`, which the app reads as
  `UNREACHABLE_ROUTE`: the thread comes back with the error toast. A server between those
  two dates answers `NOT_FOUND` "Path not found", the code the thread route answers for
  a thread with no live row (`NotificationNotFound`), so it still reads as done and the
  thread is forgotten on this device only. The app does not match on the message text;
  the upgrade order in "Only the Argus envelope speaks for the server" closes that case.
- Other devices drop the row on the `Delete` frame (the generic delete path) or on the
  user-audit diff that comes before it. `planAuditEntries` treats a diff whose current
  `deletedAt` is set as a removal, for the tables whose pull has no deletion leg
  (`SYNC_TABLES_WITHOUT_DELETIONS`, only `notification`). Those tables learn of a deletion
  only this way, live or on the paged catch-up. It is still a removal when argus-sync's
  compaction merged it with other fields. A removal of a row the device no longer has
  is a no-op, never a missing target, so it asks for no context recovery. Whichever of
  the two frames arrives first removes the row, and the other then finds nothing.
  Patches of the same row before the removal are dropped, and later ones are ignored.

### Reading a whole notification thread (D14 follow-up, 2026-10-16)

- The tap in Novedades used to read a thread through `PATCH /notification/read`
  with the ids the page had loaded, so the entries of that thread past the loaded
  page stayed unread on the server. The backend now marks a whole thread
  (`PATCH /notification/thread/{threadKey}/read`, D14), and the app sends that one
  call per thread: the URL-encoded key in the path and the empty JSON body the
  route's `ValidJsonFilter` asks for (`notificationReadCalls`,
  `notificationService.markRead`). The server marks every unread row of the caller
  in that thread, loaded or not.
- A row without a key is its own thread and has no key the server knows, so the
  by-id route stays for it, batched like before. `notificationReadCalls` is the one
  place that decides which route a read takes, the way `threadRemovalPaths` does for
  a delete.
- The optimistic side is unchanged in shape: `notificationReadIntents` gives one
  `notification` update intent per unread row the page shows, and a confirmed intent
  leaves only on evidence (its patch is a no-op on the synced row). A refusal rolls
  the intents back and the toast offers Retry with the same idempotency key; a PATCH
  the server never received is named by the write-refusal copy (see "A write the
  server never received is named, never queued").
- The bell keeps reading every unread row of the user by id, not per thread: it is a
  read-all that spans threads the device has not loaded (`unreadIdsForUser` plus the
  window's unread ids).
- The answer is 200 `{"updated": true}` for every key. An unknown key and a thread
  already read change nothing and are not an error, and a key past the route's 128
  characters is a validation refusal like `PATCH /notification/read`'s, so a stale
  tap is a no-op, never a failure.

### Recurring reminders and repeating events (F6, 2026-10-13)

- **The household zone** is the context's `timeZone` (the IANA name the backend host
  runs in, sent on `InitialInfo` and `ContextUpdate`). `readContext` reads a blank or
  non-string value as `null`, and `AppAccess.timeZone` is optional, so an access cached
  before the field existed stays valid. `contextEngine.onChange` and `applyCachedAccess`
  hand it to `viewCacheCoordinatorService.setHouseholdZone`, and sign-out clears it.
  Without it, or with a zone this runtime does not know, the device zone is used.
- **One occurrence math, the backend's.** `shared/libs/recurrence.ts` ports
  `services/productivity/src/shared/services/recurrence/recurrence.cc`:
  - The grammar is the same: uppercase `FREQ` (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`),
    an optional `INTERVAL` from 1 to 999, each key at most once, and no trailing `;`.
  - The steps are the same. Each occurrence keeps the anchor's wall clock, a day past
    the end of a month clamps to its last day and comes back the next month, and
    29 February clamps in common years.
  - The search is the same: "the first occurrence strictly after", estimated and then
    walked.
  - Wall time in the device zone goes through `Date`. Any other zone goes through
    `Intl.DateTimeFormat.formatToParts`, sampling the offset a day before and a day
    after. A repeated hour takes the earliest instant, and a skipped hour moves
    forward, as `mktime` and `Date` do.
  - **Each zone caches its offset changes** (`intlClockOf`). The offset is sampled
    once per UTC day (`RECURRENCE_OFFSET_STEP_MS`). Where two neighbouring samples
    differ, a bisect places the change to the second. Both are cached per zone for
    the session, cleared past `RECURRENCE_OFFSET_CACHE_LIMIT` sampled days.
    `offsetAt` is then two map lookups, and `wallOf` is the instant shifted by its
    offset; the formatter runs only to fill the cache. This assumes no zone changes
    its offset twice within one day, which holds for every zone in use; Casablanca's
    two Ramadan changes are a month apart.
  - `recurrence.test.ts` checks the cached clock against the formatter itself:
    every ~97 minutes over 2026–2027 in Madrid, New York, Lord Howe (a 30-minute
    change), Kathmandu (+05:45), Chatham (+12:45/+13:45), Casablanca and São Paulo,
    plus each change placed to the second.
  - `tests/unit/shared/libs/recurrence.test.ts` runs every case of the backend's
    `scripts/fixtures/recurrence/cases.json` through both clocks. It reads
    `ARGUS_RECURRENCE_FIXTURE`, or else the backend root (`ARGUS_BACKEND_DIR`, or
    `../backend/` beside this repo), and fails
    naming the path when the file is missing. So a change to the backend's math fails
    here until the app follows it.
- **The agenda expands repeating events.**
  - `calendarEventService.observeRecurring()` (the rows with a rule, one shared
    `series` source) and the household zone feed the today, month and agenda-feed
    projections. `toCalendarEntries` expands each event whose rule parses into the
    occurrences that start inside the window, in the household zone. Entries carry
    instants, so they are shown in the device zone.
  - The expansion is lazy and windowed: only the requested window is computed,
    nothing ahead of it. Each request carries its own guard, `occurrenceLimitFor`:
    the window's days at one occurrence a day (daily is the finest rule) plus a
    margin of 7. So no window the app requests is ever cut, however far the agenda
    list has been extended. Reaching the guard would mean a rule finer than daily;
    the projection then keeps the first occurrences and says so through
    `log.debug('calendar', …)`, in dev builds only.
  - The agenda list is cumulative: every "load more" recomputes from the first day to
    `weeks × 7`. The cost of recomputing a two-year window (735 days) with 20 series
    was measured on the development laptop (AMD Ryzen 7 5825U, 16 threads, bun
    1.3.14, median of 15 runs after a warm-up run). The table gives it before and
    after the zone-offset cache:

    | Rules, zone | Before | After |
    |---|---|---|
    | 20 mixed rules, household zone = device zone | 2.1 ms | 2.4 ms |
    | 20 mixed rules, another household zone (Intl) | 13.8 ms | 2.9 ms |
    | 20 daily rules, household zone = device zone | 8.8 ms | 9.1 ms |
    | 20 daily rules, another household zone (Intl) | 49.7 ms | 10.3 ms |

    - The first, cold run of the worst case takes about 41 ms; the device zone's
      cold run takes about 31 ms, so most of that is first-run JIT.
    - Of the warm 10.3 ms, about 5.2 ms computes the 14,700 occurrences, 4.2 ms
      builds their ISO ids and 0.8 ms sorts them.
    - `bun run test:bench` (`tests/bench/agenda-recurrence.test.ts`, run by the
      integration build) holds the mixed case and the worst case (20 daily rules
      in another household zone, 735 days, median of 9 runs) at or under one 16 ms
      frame.
    - `bun run verify` stays deterministic on a busy machine. It keeps the cached
      clock's agreement test and a loose 100 ms sanity bound on the same worst case
      (`calendar-recurrence.test.ts`).
    - Paging the agenda stays the conditional follow-up F6c in the plan.
  - An event whose rule the app cannot read is one plain entry at its start. Since
    2026-10-13 the backend answers a 422 on create and edit to a non-empty rule the
    reminders' parser cannot read (backend `services/productivity/CONTEXT.md`, "Event
    repeat rules"), but rows stored before that can still carry one. An empty rule is
    still stored, and reads as no rule. A range row without a rule wins over a stale
    series row.
  - An occurrence's id is `event:<id>@<ISO start>`. `calendarEntryRecordId` drops the
    suffix, so edit, share and delete address the event, and `CalendarEntry.series`
    keeps the series' own start, end and rule.
  - The agenda feed has more while a series continues, which is always, because the
    grammar has no end.
- **An occurrence edits the series; there are no single-occurrence exceptions.**
  Exceptions are a recorded follow-up.
  - The form opens on the series' own start, so saving a new title does not move the
    series to the tapped day. Its title is "Editar la serie", and its hint reads
    "… Lo que cambies se aplica a toda la serie."
  - In the menu, "Editar la serie" and "Eliminar todas las repeticiones" both carry
    the line "Se aplica a toda la serie".
  - Deleting a series asks first, in a danger confirm whose text reads "Se aplica a
    toda la serie: se eliminan todas sus repeticiones, también las pasadas."
    (`seriesDeleteConfirm`). The Undo toast still follows. A single event keeps going
    straight to Undo.
  - An optimistic patch of an occurrence changes only its text fields. Its times come
    back when the event row changes and the series re-expands.
  - Reminders are not expanded: the agenda shows a reminder once, at its current time.
- **Reminder repeat.**
  - The edit dialog has a repeat picker (No se repite, Cada día, Cada semana, Cada mes,
    Cada año) and, when it repeats, an interval field with the backend DTO's own check
    (a whole number from 1 to 999, `isIntervalText`).
  - The body carries `recurrenceRule` only when the picker changed. A rule the app
    cannot read therefore survives an edit of the title.
  - "No se repite" sends `null`, which the backend reads as "stop" while keeping
    `scheduledAt`. "Dejar de repetir" is in the row menu (immediate, with a toast), and
    the dialog has a shortcut that sets the picker to none.
  - Rows show the rule ("Cada semana") with a repeat icon.
- **Completing a recurring reminder** still sends `{isCompleted: true}`. The backend
  rolls it to `firstOccurrenceAfter(rule, recurrence_anchor, max(scheduledAt, now))`
  and keeps it open.
  - The optimistic intent shows that roll at once, with the same math in the household
    zone and a toast ("Hecho. Próxima vez: …").
  - `recurrence_anchor` is not synced, so the prediction anchors on the row's
    `scheduledAt`. After a clamp (a monthly rule on the 31st, a yearly one on
    29 February) it can land on a clamped day the backend would not pick. The audit
    diff of the real row then replaces it, because the intent drops on the server's row.
    `reminders.test.ts` plays both cases, from the prediction to the correction: after
    February the 31st is predicted as the 28th, and in the next leap year 29 February is
    predicted as the 28th.

### Snooze (F6, 2026-10-13)

- An open reminder that is due today or overdue has a snooze button beside its menu
  (`alarm-clock`). Its name carries the title ("Posponer …"), so two rows never share
  one. It opens the presets 10 minutos, 30 minutos, 1 hora and Mañana, each with the
  time it lands on.
- Each preset calls `POST /reminder/{id}/snooze` with `{minutes}` or `{tomorrow: true}`,
  exactly one of the two, as the backend DTO demands. The backend counts minutes from
  its own now, and tomorrow is the same wall time on the next day of the later of the
  reminder's time and now, in the host's zone.
- The row moves at once. Minutes are added to the device's now, and tomorrow uses
  `sameTimeTomorrow` (`shared/libs/recurrence.ts`, the backend function of the same
  name) in the household zone. The audit diff of the real row replaces the
  prediction.
- **No snooze moves a reminder earlier.** A minute preset shows only when it lands
  after the reminder's own time, so a reminder due in five hours offers only Mañana.
  A reminder due on a later day, or a completed one, shows no snooze; it is edited
  instead.
- A completed reminder answers 409 `CONFLICT`, because another device completed it
  first. `isAlreadyDone` recognises that answer, and `runOptimistic`'s
  `refusalNotice` turns it into a calm info toast ("Ya estaba hecho"), with no error
  and no retry. The row's time comes back, and the completion arrives through sync.

### People and access surfaces

- `/profile` is the personal, Threads-inspired but Argus-adapted account view:
  calm identity hierarchy, role/status and a neutral empty user icon. It is a
  future profile-settings surface; the user cannot change a portrait there yet.
- Owner sees **People and access** (`/users`): a locally cached user directory,
  invitation metadata, narrow edit/create dialogs and a QR preview. Invitation
  roles are preselected as resident/guard/guest. The QR contains the opaque
  token and the pinned local Argus identity, but the token is held only in React
  state. Closing/unmounting its preview revokes that invitation immediately.
- Guard sees a separate **People** directory (`/people`), not the owner
  management UI. It is synced locally with names, roles, active status and join
  date, offers local search/role filters, and starts with neutral user icons.
  Selecting a person opens a restrained details dialog.
- Portrait verification is intentionally remote and explicit. A Guard presses
  the verification action; `portraitPreviewService` obtains and consumes the
  one-use backend capability. Its returned image data URI exists only in that
  dialog's React state and is cleared on close/new selection. Portraits are
  never added to WatermelonDB, MMKV, a list, a profile or an image cache.
- `peopleAccessForRole` is the shared frontend policy: Owner receives users and
  invitations, Guard receives the directory only, Resident/Guest receive only
  their own profile. `AuthContextChanged` updates the local auth context and
  triggers sync after a server role change without logging the user out.

### Interaction and layout decisions

- The design remains warm-neutral, quiet and functional. No screen may feel
  empty (owner decision, 2026-10-03): a section keeps a steady height whether
  it holds one row or many, its empty state is as tall as a typical populated
  state and says what will appear there or offers the action that fills it
  (a dashed create tile, a free hour that opens a new event), and on wide
  windows side-by-side columns end on the same line, the last panel of the
  shorter column stretching to meet the other. Free space is filled with
  useful content (summaries, recent activity, role permissions), never with
  decoration, and no section stretches in the middle of a column.
- Phone actions use native-feeling sheets. Tablet long-press actions use the
  anchored context menu at the press position. Web/desktop uses the pointer
  overflow menu. Confirmation and detail dialogs remain intentionally narrow
  on wider screens.
- Screens must be validated across phone, portrait/landscape tablet, laptop and
  desktop. Prefer Uniwind/Tailwind v4 for layout; `StyleSheet` is a narrow
  exception for React Native APIs that require it. Motion follows the platform
  and honors reduced-motion settings.
- Date formatting is centralized through `date-fns`/`useDateFormatter` and
  device locale/hour-cycle settings. Do not hand-format dates or bake Spanish,
  AM/PM or 24-hour assumptions into a component.

### Optimistic UI (2026-10-03)

The write path stays HTTP → backend → `/sync` → WatermelonDB → view cache, so
an action used to look idle until the sync round trip landed. The UI now shows
the result of the user's action at once and reconciles with the synced row.

- **Intents, not cache writes.** `shared/libs/optimistic.ts` keeps an
  in-memory registry of entity-level intents (`table`, `kind`, `recordId`,
  `values` in the HTTP body's shape). It knows no feature and is never
  persisted: an action is fire-and-forget, and an intent that outlived its
  request would be a lie after a restart. The view cache stays the single
  record of synced truth; CORE did not add a cache overlay (orchestrator
  decision), so there is one implementation.
- **Lenses live in the feature that owns the view.** A view-cache row is a
  projection (a `CalendarEntry` is an event, a task or a reminder), so each
  view declares how an entity intent lands on its row: agenda
  (`features/agenda/model/calendar-optimistic.ts`, events + tasks, reused by
  home's "Hoy"), projects (`project-optimistic.ts`), people
  (`people-optimistic.ts`), home notifications (`notification-optimistic.ts`).
  `useOptimisticRows(rows, lenses, compare?)` merges them; the result keeps
  the input reference when nothing applies, so memoized children do not
  re-render.
- **Reconciliation without double rows.** A create shows under a temporary
  id, dimmed and without actions; the HTTP answer's `info.id` re-keys it, and
  from then on the synced row with that id wins. If the sync `Add` lands
  before the HTTP answer, a pending create whose lens rebuilds exactly the
  synced row is hidden. A confirmed intent leaves on evidence only — its patch
  is a no-op on the synced row, or the created id is present — in per-record
  order (a later toggle never settles before the earlier one), after a short
  grace so every projection catches up; a delete, whose absence proves
  nothing, and any intent the sync never proves, expire after 60 s. A user
  change clears the registry (session boundary, like the view cache).
- **The server's own word on a record ends the overlay at once.** Waiting for
  the patch to become a no-op was too patient: a remote change to the same
  record — another member editing the same task, another device marking the
  same notification read — left the synced row carrying values the local
  intent kept overwriting, so the other side's change stayed invisible for up
  to the 60 s fallback. Every applied audit-log update now names the records
  it wrote (`AuditLogProcessorService.prepare` → `updated`, the one seam both
  the live frames and the paged catch-up go through), and
  `optimisticRegistry.serverRows(...)` drops the *confirmed* intents for those
  records. A pending intent keeps its optimistic display — its request is
  still in flight — and its own echo comes back as one of these updates, so
  nothing relies on the 60 s window any more.
- **Refusals.** `runOptimistic` rolls the intent back and toasts the reason;
  a network, timeout or 5xx refusal carries a Retry action that replays the
  same request (forms close on valid input, so Retry is what keeps the typed
  values from being lost). Deletes of events and tasks are deferred behind an
  Undo toast (6 s, the toast's own lifetime) instead of a confirm dialog;
  project deletion (cascades), user deactivation and invitation revocation
  keep their confirm.
- **Notifications.** Opening the bell reads every unread row of the user in
  WatermelonDB, not only the cached window (owner decision 2026-10-04,
  reversing the 2026-10-03 "a preview is not a read"); there is no "Marcar
  todo como leído" button any more. A tap on a thread in Novedades reads that
  thread. Both go through `runOptimistic`.
- **Motion.** Rows enter without per-item animations; feedback comes from the
  pressed control and the dimmed pending state. Reanimated 4.5 on Fabric keeps
  the old frame of a `layout={LinearTransition}` view when Reduce Motion is on
  (software-mansion/react-native-reanimated#10395), so layout transitions are
  not used for list reflow. The task drag (projects, side-by-side boards only:
  pointer drag on web/desktop, long press on touch) lifts the card and rings
  the target lane; reduce motion removes the springs, not the feedback. The
  status menu remains the keyboard and screen-reader path.

### Voice settings: previews and install states (2026-10-03)

The TTS owner's engine, Spanish variant and voice settings render as an
option list (`features/settings/components/setting-choice-list.tsx`)
instead of a segmented control or a select. Each option has a preview
button, its install state and, for `jean`, a "non-commercial use only"
note. The owner asked to hear an option before installing it, so the clips
are bundled static assets, not server audio: they play offline and
instantly. The backend's `services/tts/tools/tts-preview/make-previews.sh`
regenerates them reproducibly (fixed seed, the production engines) into
`src/assets/audio/tts-previews/`. The three `jean` clips carry that voice's
CC BY-NC 4.0 terms: drop them, with the voice, before any commercial
distribution of the app.

- **Two encodings, one per bundle.** `tts-preview-clips.web.ts` imports Opus
  in Ogg and `tts-preview-clips.native.ts` imports AAC in M4A; Metro bundles
  only the platform's set. The desktop WebView (WebKitGTK) decodes Ogg/Opus
  with stock GStreamer but has no MP4 demuxer or AAC decoder, and iOS's
  AVPlayer does not play Ogg. Metro needed `ogg` added to `assetExts`;
  `audio-assets.d.ts` types the imports as asset ids. Those files import with
  a relative path (`../constants/tts-preview-clips`), because eslint's
  resolver does not apply `.web`/`.native` suffixes to `@/` aliases.
- **Playback** is expo-audio's `useAudioPlayer` (an `HTMLAudioElement` on
  web/Tauri; CSP `media-src 'self'` already allows bundled assets). One
  player per settings panel (`useVoicePreview`), so starting one preview
  stops the other. The audio session mode is left alone, so a call's session
  is never reconfigured.
- **Which clip an option plays** (`model/tts-preview.ts`, unit-tested) is
  what the house would say with it: the engine option plays the configured
  variant and voice, the variant option the configured voice, and a voice
  option the configured variant. A test pins that every bundled file is
  referenced and every option has both encodings.
- **Install states** come from argus-settings' optional `choiceStates`
  (`installed`, `installable`, `installing`, `failed`, `hostOnly`, size in
  MB, host command). Uninstalled options read "No instalada · ~N MB".
  Choosing an installable option persists it, and argus-tts installs it in
  the background while speaking with its fallback. The selected option shows
  "Instalar" again after a failure. A host-only option cannot be chosen;
  tapping it reveals the exact command to run on the server. While anything
  installs, `useSettings` reloads every 4 s.

### Settings profiles (2026-10-03)

Configuración opens with a "Perfil" section: three cards, "Máximo
rendimiento", "Equilibrado" and "Máxima calidad", from argus-settings'
`GET /settings/profiles`. The profiles themselves are server data
(`services/settings/profiles.json`); the app only names them by `labelKey`
(`screens.settings.profiles.items.<labelKey>`) and never hard-codes a key or a
value.

- **Recommendation.** The card the server recommends carries "Recomendado
  para este equipo" and a short reason the app writes from the reason code
  and the hardware facts (`model/profile-text.ts`: `meets`, `cores`, `ram`,
  `isa`); the facts themselves (cores, threads, RAM, ISA, GPU) sit beside the
  section title. The card whose every key already holds its value says
  "Activo".
- **Preview first.** A card opens `ProfilePreviewDialog` (rendered beside
  `AppScreen`, rule 12d): per service, each key that changes with its current
  and target value (choice labels from `screens.settings.choices`, `_px` keys
  in pixels), the download it starts, host-only installs with the exact
  command, keys that already match, services that do not answer, and whether
  something applies on restart or on the next call. Applying is disabled when
  nothing can change (everything matches, or only host-only installs remain).
- **Optimistic apply.** `runOptimistic` gained `refusals(info)`: a 200 can
  still refuse some records, which are rolled back and named in one toast
  ("2 ajustes no se aplicaron" with the setting and the reason), while the
  rest confirm. The registry's `table` is now `TableName | RemoteRowTable`
  (`'setting' | 'session'`): a setting row's record id is `owner:key`, and
  `SETTING_LENSES` overlays the intents on the settings overview in
  `useSettings`, so every changed row shows its new value at once. The
  apply's answer carries each answering owner's fresh catalog, which
  replaces those owners in the view cache; the intents then settle on
  evidence and the profiles reload.
- **Paint first.** Profiles are a `useRemoteResource` under
  `settings.profiles`: the last answer paints at once, a first visit shows
  three placeholder cards, a failure shows a retry row. Per-key fine-tuning
  below is unchanged.
- **Layout.** Phone: stacked compact cards (name, summary, recommendation,
  cost) with a chevron. Medium: three cards in a row. Expanded: the cards
  also list up to four of the profile's target values.

### Configuración: simple and advanced modes (2026-10-03)

David found the advanced mode "not working" and asked for a more technical
Configuración with a simple and an advanced mode, the machine's
recommendation by default, and the advanced mode as a direct view of every
microservice's `.toml`.

- **Why "advanced" showed nothing.** Reproduced on the desktop against the
  sandbox: `GET /settings` answered `owners: []`, so both levels rendered the
  same empty state and the switch looked dead. No owner was wired: the
  running deploy's owner configs predate argus-settings (no `[rpc]` listener,
  no settings caller, no `config.settings.toml`) and the native templates
  leave `rpc.address` empty. With scratch owners wired, the old switch did
  work. The backend now lists every owner, `configured: false` included, and
  the app names them ("Sin conectar a Configuración: …" with the
  re-provisioning hint) instead of painting nothing; backend
  `argus-deploy/CONTEXT.md` has the operator path. A second defect made
  some advanced keys unusable: a stepper over `llm.seed` (0..2^31) or the
  `gpu_layers` keys (-1..999) needed hundreds of taps. Ranges over 400 steps
  are now a numeric field.
- **Two modes, persisted per viewer** (`useSettingsMode`, MMKV/localStorage
  key `settings.mode`, default `simple`). Sencillo: the first-run banner, the
  connection notice, the Perfil cards and each connected service's basic
  keys (the old Básico). Avanzado (`components/technical/`): every key of
  every owner, with search (key, label, hint, service, accent-insensitive),
  view chips (all, changed from factory, restart keys), service chips and a
  summary line. Each service header shows its status, the `.toml` path
  (selectable), the GPU capability, the profile marker, export/import and,
  when restart keys were saved, how many wait for `argus-<service>` to
  restart. Each row shows label, mono key, hint, type, unit, range and step,
  factory value, when it applies, "Cambiada" and "Espera un reinicio"
  badges, its control and "Volver a <factory>" (a PATCH with the fallback).
  Choice install states keep their option list.
- **No restart from the app.** The architecture has no safe restart path
  (the deploy's containers restart on crash, a native run has no
  supervisor), so a restart key says "Se aplica al reiniciar el servicio"
  and, once saved, "Espera un reinicio" until the owner boots with it.
- **Export/import** (`model/settings-catalog.ts`, unit-tested): export is
  `{ format: "argus.settings/1", service, exportedAt, settings }` for one
  service (catalog keys only, so never a secret), shown as selectable text
  with Copy on web/desktop. Import parses a pasted export, refuses another
  service, a foreign format or more than 64 changes, ignores unknown keys,
  previews from → to and applies one PATCH (the owner validates all or
  nothing). No clipboard or file-picker module was added for this.
- **First run.** argus-settings applies the recommended profile once per
  owner on a fresh installation (state in each owner's `[settings_profile]`,
  see backend `services/settings/CONTEXT.md`). `GET /settings/profiles`
  carries `firstRun`; the banner says what was applied and when, with
  "Deshacer" (`POST /settings/profiles/recommended/revert`), which restores
  the factory value of each key that still holds what the recommendation set.
- **Configuración is owner-only again**; sessions moved to the profile
  (SESSIONS2). The screen enables its hooks from `role === 'owner'`.

### Voices: learned by Argus, never enrolled (2026-10-03, revised)

The first cut had a "Tu voz / Your voice" section in the profile with a
consented, phrase-by-phrase enrollment and "Try it". David decided that the
user must not see it: voice recognition is an internal capability of a
system whose data never leaves the user's computer, so nothing is asked,
enabled or shown to the person. `features/voiceprint` (the panel, the
enrollment reducer, the WAV encoder, the recorders, the problem copy and
their tests) and the `/voiceprint/me` routes are gone; argus-identity now
learns each holder's voice passively from their own calls (the gates live
in `backend/services/identity/CONTEXT.md`, "Voiceprints"). `argus-mic`
stays: the call uses it.

What is left in the app is the owner's view, minimal on purpose: in
Personas y accesos the per-user access dialog (`UserSessionsDialog`'s
`extra` slot, filled by `users-screen.tsx`) shows "Argus reconoce su voz ·
Desde el <fecha>" with "Olvidar voz" when, and only when, Argus already
recognizes that person (`features/people/components/voice-recognition-row`,
`hooks/use-voice-recognition`, `services/voiceprint.service`). The directory
is `GET /voiceprint/users` through `useRemoteResource`
(`VIEW_CACHE_KEYS.voiceprintUsers`), parsed by
`core/contracts/voiceprint.contract.ts` (unit-tested); forgetting confirms,
removes the row from the cached directory at once, rolls back on a refusal,
and treats 404 (nothing learned) as done. There is no learning state and no
enrollment anywhere.

### Cameras: live view, recovery and edits (2026-10-03)

- **What the stream carries.** argus-camera muxes the camera microphone as a
  FLAC track beside the H.264 video, one `moof`/`mdat` per sample and per
  track, and splits each fragment into 16 KiB WebSocket messages. The web
  player used to take the last `trak`'s timescale (the audio's 8 kHz), feed
  every fragment's first `traf` to the video decoder (FLAC samples are sync
  samples, so they arrived as "key" frames and closed the decoder on the first
  one) and parse each 16 KiB message as a whole fragment (every keyframe, being
  larger, parsed as nothing). The desktop view therefore never painted a frame.
  Now `model/fmp4.ts` reads the video `trak` (by `hdlr`) for its track id,
  timescale and `avcC`/`hvcC`, `parseFragment` only reads that track's `traf`,
  and `model/fragment-assembler.ts` rebuilds whole fragments before any player
  sees them (the native ExoPlayer pipe gets the same bytes, whole).
- **The web player** recreates a decoder that errors (WebCodecs closes it),
  waits for a keyframe after every (re)configure or dropped frame, decodes
  with `optimizeForLatency` and paints each frame on arrival, so there is no
  playout buffer between the socket and the canvas. It asks the server for
  `fastStart`: an upstream that is already live replays its current GOP at
  once and the first frame paints in about 0.1 s instead of waiting up to a
  GOP for the next keyframe. The native view does not ask for it: ExoPlayer
  schedules frames by timestamp and would keep the replayed GOP as latency.
- **WebKitGTK needs a system H.264 decoder.** WebCodecs on the Linux desktop
  decodes through GStreamer; without `gst-libav` (or a VA-API/openh264
  plugin) `VideoDecoder.isConfigSupported` answers false and the view says so
  ("unsupported" with its hint) instead of showing a black frame.
- **Recovery is explicit.** `model/stream-recovery.ts` classifies a refused
  subscribe (403/404 final, 429 busy, anything else retried), backs off from
  1 s to 15 s with jitter, and turns three misses into `offline`. A
  `camera:closed` (the upstream died, e.g. go2rtc restarted) resubscribes on
  the same socket; a socket error or close reconnects; an expired token
  refreshes the session once and reconnects; eight seconds without media while
  the decoder is drained, or eight seconds after a subscribe that never
  received any, counts as a stall and resubscribes. Measured live (the app's
  own media session in headless Chromium against the sandbox, test source
  stopped at 8 s and restarted at 30 s): reconnecting at 16 s, offline at
  28 s, picture back at 33.1 s; a steady session paints 15 of 15 frames per
  second and its first frame about 0.1 s after opening on a warm camera. Handlers of a
  replaced socket are detached and ignored, so a late `onClose` cannot tear
  down the current connection. States: `connecting`, `live` (first media
  fragment), `reconnecting`, `offline`, `unavailable`, `closed`.
- **The view tells the user.** `CameraLiveStatus` paints a placeholder on the
  surface colour (never text over black) while there is no picture, with a
  Retry button when offline, and a small "Live"/"Reconnecting…" badge over the
  last frame once one has painted. `CameraLiveView` (exported from the feature
  index for the voice call card) takes `overlay` (the zones) and `fill`.
- **Detail layout.** Expanded windows put the live panel and the zones under
  it on the left and the device panel (status, address, integration, model,
  firmware, recording) with the PTZ panel on a 340 px right column; medium
  windows put the video full width and the two panels side by side; compact
  stacks them. The last panel of each column grows so both columns end on the
  same line. The PTZ panel only exists when `/capabilities` says `ptz: true`;
  RTSP and ONVIF cameras answer `streamOnly: true` and the device panel says
  the camera is video only. Zones draw over the live picture (toggle), and the
  zone editor draws on a live view of the same camera with the other zones
  faintly behind, instead of a grey box.
- **Edits are optimistic.** Camera create/edit, enable/disable and delete,
  and zone create/edit/delete go through `runOptimistic` with the feature's
  lenses (`model/camera-optimistic.ts`): `useCameraRows()` overlays camera
  intents on `camera.list` and zone intents on the flattened zones, then
  regroups them by camera. A zone patch keeps the row's own `points` array when
  the values are equal, so the synced row settles the intent instead of the
  60 s TTL. Passwords never enter an intent. Camera device settings (privacy,
  LED, motion, auto-track, day/night) flip at once through the remote
  resource's `mutate` and roll back if the camera refuses.
- **Addresses and paths.** The form accepts only a literal private IPv4/IPv6
  address (`model/camera-address.ts`, the same ranges argus-camera enforces),
  and RTSP/ONVIF cameras get main/sub stream path fields (empty = the Tapo
  `/stream1`, `/stream2`); the paths reach the row through the projection as
  `streamPath`/`subStreamPath`.
- **Online means seen.** `isOnline` is written by argus-camera's health
  monitor (one frame online, two misses offline) and arrives as an ordinary
  audit patch.
- **Thumbnails.** Each online camera card shows the camera's last still
  (`GET /camera/{id}/snapshot`, a JPEG data URI), refreshed every 30 s while
  the grid is focused by `CameraThumbnailPoller`, one camera at a time. The
  pictures live in React state only: never in MMKV, Watermelon or an image
  cache, the same rule the people portraits follow.

### Current validation baseline

On 2026-08-23, `bun run lint`, `bunx tsc --noEmit` and `bun run web:build`
succeeded. `git diff --check` also passed, and a static scan confirmed no
`src/app` route imports WatermelonDB or a direct observable. Device-level
validation still requires a real paired session; do not fabricate people or
camera rows merely to make a screen appear loaded.

## Core hardening (2026-10)

A review of `core/` and `src-tauri/` against the backend contract, fixed
with tests. The decisions that outlive the commits:

- **One optimistic layer, in `shared/`.** The pending-intent overlay lives
  in `shared/libs/optimistic-action.ts` + `shared/hooks/use-optimistic-rows.ts`
  (UIUX). Core gives it what it needs and nothing parallel: a toast action
  slot (`show(intent, title, description?, action?)`, 6 s when it carries an
  action), `IHttpConfig.headers`, and every productivity write answering
  with the id it touched (create/update: the row; delete: `{deleted, id}`).
- **A 401 refreshes only the token that failed.** Requests carry the
  `SessionCredential` they were sent with; a late 401 for an already rotated
  token retries with the current one, a 401 from a previous session neither
  refreshes nor clears the new one. Before, parallel screen loads turned one
  expired token into a chain of rotations that invalidated each other's
  retries.
- **Refusals carry the backend's vocabulary.** `readEnvelope` names an
  envelope-less refusal by its status (a proxy 502 is `BAD_GATEWAY`, an empty
  503 `SERVICE_UNAVAILABLE`), a refresh that is only unavailable surfaces as
  503 instead of a misleading 401, and desktop errors are `CODE|message`
  (`TIMEOUT` is a code now; the old `'401'` substring rule is gone). Since
  2026-10-13 only the transport statuses keep a name; every other
  envelope-less refusal is `UNREACHABLE_ROUTE` ("Only the Argus envelope speaks
  for the server").
- **Rust owns whom the desktop trusts.** `argus_pair` checks the QR's
  fingerprint before it pins anything and writes the four trust keys itself;
  relocation goes through `argus_relocate`. A compromised WebView can still
  re-pair through `argus_pair` with a code it chose, so this closes the cheap
  path (two `argus_secure_set` calls), not every path; that would need a
  native confirmation. **Closed since (2026-10-03):** `argus_pair` compares the
  new CA fingerprint with the pinned one, and when they differ it shows a
  native dialog (`src-tauri/src/net/confirm.rs`, `rfd` 0.15 over GTK, parented
  to the main window, Spanish or English from `LC_ALL`/`LC_MESSAGES`/`LANG`)
  naming both fingerprints and the host; only "Confiar en el nuevo servidor"
  pins the new trust, anything else answers `PAIRING_DECLINED` (the pairing
  screen says the previous server is kept). A first pairing and a re-pairing
  to the same CA ask nothing. The WebView may no longer delete a trust key
  either (`argus_secure_delete` → `delete_from_webview`), so it cannot clear
  the anchor and then pair as if for the first time: unpairing the desktop
  forgets the session and the pairing metadata (`clearInstance(NET_TRUST_KEYS)`
  keeps the four trust keys), and the CA it trusted stays pinned until a
  confirmed re-pairing replaces it. `rfd` was chosen over
  `tauri-plugin-dialog` because the plugin pulled tauri 2.12 and 54 other
  crate upgrades into the lock; `rfd` alone adds one crate. The dialog runs
  from a blocking thread (`spawn_blocking`), never the main one, as the plugin
  itself does.
- **The desktop proves it drew the login QR** (`pollHash` + `X-Argus-Login-Proof`).
- **The projection knows its owner** (user id + role in WatermelonDB's own
  local storage); a mismatch at InitialInfo wipes and bootstraps. Existing
  installs bootstrap once after this landed.
- **A sync request left unanswered for 10 s recycles the socket**, because
  replies are matched by type only and a late reply would answer the next
  request.
- **Days are calendar days** (`addDays`, `startOfNextDay`); the dashboard
  trend counts events with COUNT queries instead of a 300-row sample; the
  camera list watches the columns its projection declares
  (`CAMERA_SOURCE_FIELDS`); early migration steps name the columns later
  steps add, and a replay test guards it.
- **Closed since** (see "Sessions and devices" below): the invitation
  `resolve` call is pinned to the QR's CA fingerprint and host before the
  token leaves the device, and every transport sends a stable
  `User-Agent: Argus/1 (<platform>)`; the backend moves each existing
  session to it once, on its next refresh.

### Only the Argus envelope speaks for the server (2026-10-13)

A refusal is the server's own only when its body is the backend's envelope,
`{status, info, errors}` with `errors` carrying a code (one error, or a list whose
entries all have a code and a message). Then `readEnvelope` passes that code through,
`NOT_FOUND` included. A body that is not that envelope never yields a code of the
server, on every call:
- 408, 429, 502, 503, 504 and the other 5xx keep their transport names (`TIMEOUT`,
  `TOO_MANY_REQUESTS`, `BAD_GATEWAY`, `SERVICE_UNAVAILABLE`, `DEADLINE_EXCEEDED`,
  `INTERNAL_ERROR`), retryable as before (`foreignRefusalCode`);
- every other status is `UNREACHABLE_ROUTE`: something answered, but not the Argus
  route the app called. A proxy's page and an empty 404 land here, never on `NOT_FOUND`,
  and so would Drogon's own HTML 404 page, which no Argus service has sent since
  2026-09-21. The toast says "The server did not answer as Argus. It may need an
  update.", and it is not retryable;
- a 2xx whose `errors` carries no code is `INVALID_RESPONSE`, like any 2xx body the app
  cannot read.

So a rule that reads a server code (`removalSettled` on `NOT_FOUND`, the snooze's
`CONFLICT`, a module request's `CONFLICT`) can no longer be met by a page the server did
not write.

A server answers a route it does not have with the envelope itself
(`ErrorHandler::unmatchedRoute`, every service since 2026-09-21). Since the backend's
ROUTE_NOT_FOUND change (2026-10-13) it carries `ROUTE_NOT_FOUND` "Path not found", and
`readEnvelope` turns that code into `UNREACHABLE_ROUTE`, never `NOT_FOUND`. A server
from before that change answers `NOT_FOUND` "Path not found", which reads as the
server's `NOT_FOUND` ("Deleting a notification" says what that leaves open).

Upgrade the server before the app: a new app against a server that predates ROUTE_NOT_FOUND reads a missing route as NOT_FOUND.

The call grant reads `UNREACHABLE_ROUTE` like the envelope 404: a server without the RTC
route falls back to the PCM call. Tests: `http-envelope.test.ts`, and
`http-foreign-refusal.test.ts`, which runs the real http service over three fakes of the
net layer: Drogon's HTML 404, a handler's envelope 404, and the envelope
`ROUTE_NOT_FOUND` of a server that has no such route. Only the envelope 404 is
`NOT_FOUND`, and only it settles a thread delete.

## Calls with Argus (2026-10-03)

The call (`features/voice`) runs on every platform that has a microphone
path, knows the house it is talking about, and reports what it did.

- **Microphone and player.** `IVoiceMic` (`core/interfaces/voice.interface.ts`)
  is the contract; native is the `argus-mic` Nitro module, web/desktop is
  `voice-mic.web.ts`: `getUserMedia` with echo cancellation, noise
  suppression and automatic gain, and two AudioWorklet processors served
  from the app's origin (`public/voice/voice-worklets.js`, allowed by the
  desktop CSP's `script-src 'self'`) that cut 20 ms PCM16 frames and play
  the server's PCM16 with played-sample accounting. `voiceCallSupported()`
  decides where the call screen, the compose entry and the call pill show.
  Linux desktop also needs the shell's WebKitGTK media permission and
  GStreamer's pipewire/pulse sources.
- **Context.** While a call is live the bridge (`use-call-bridge.ts`, mounted
  by `CallPill` on every platform) sends the camera names once and a
  `situation` note whenever it changes: guard mode in words, today's pending
  agenda, camera alerts of the call and offline cameras, all from the user's
  own view cache. No clock: the model must not quote a stale time. Camera
  notifications become spoken offers; guard episodes, tamper alerts and the
  camera fallback are offered with their own localized copy, the daily
  digest never.
- **Actions.** `voice:action` runs one at a time, a repeated id is ignored,
  and each outcome goes back as `voice:action_result {id, ok, detail}` so
  argus-voice corrects a failure aloud. The call surface shows them as
  chips (pending, done, failed). `app.show_camera` opens the camera as a
  live card inside the call when the call screen is on top
  (`CameraLiveView` from `features/cameras`), and navigates otherwise.
- **Lifecycle.** Mute is sent to the server (`voice:mute`), which drops the
  half-said utterance. The service counts the stops it sent and ignores the
  previous call's frames until its `voice:done` (3 s grace), so a quick
  retry is not killed by a late done. A lost socket puts the call back in
  `connecting` for up to 15 s and resumes it with
  `voice:start {resume: true}` (no second greeting); the bridge then
  resends the camera names and the situation.

## History log — prior docs resync (2026-08-23)

- Documentation-only pass, before the local-first/audit work documented above:
  CONTEXT/AGENTS brought back in
  sync with the code. Corrections: the "Current state" section no longer
  describes the post-reset empty shell — it documents the full route map,
  core services and UI families; WatermelonDB documented
  at its real **14 tables** matching `SYNC_TABLE_KEYS` (this section still
  said 7); networking phases closed (native WS `ArgusSocket` + Tauri socket
  commands, `http.service`, pairing/invite/login QR all shipped); root
  navigation corrected to the actual `fade` crossfade (the doc claimed
  `flip`); orb marked SUPERSEDED by the SVG avatar; Zustand store list
  updated to the real 8 stores; Skia noted as no longer imported in `src/`.

### Security: the place, its cameras and episodes (2026-10-03)

The guard now understands what kind of place it protects and what each camera
looks at, and it reports visits as stories instead of rows per detection
(backend `services/guard/CONTEXT.md`, "Site, camera context and episodes").
The owner's Security screen (`features/security`) carries three new panels:

- **Tu lugar** (`site-panel`): the profile (Casa / Oficina / Local), whether
  the hours apply, the hours themselves (rest for a home; staffed and open
  for a business), what happens when a business is closed (Away or Armed)
  and the hour of the one daily summary. Hours are edited as windows of days
  and half-hour times (`hours-fields`, `model/hours.ts` parses and writes
  the backend's `"mon-fri 08:00-19:00"` syntax, splitting non-contiguous days
  into one window per run because the backend accepts one range per window).
  "Usar horario de ejemplo" fills the profile's presets (`model/site-presets.ts`);
  the backend never assumes hours from the profile, the owner confirms them.
- **Qué mira cada cámara** (`camera-context-panel` + editor): role (entrance,
  outside, garage, living area, kitchen, office, register, storeroom, dining
  room), indoor/outdoor, whether anyone can walk by (street, hallway,
  customers) and the camera's own hours. Cameras come from the existing
  `camera.list` view cache; the guard keeps only the context.
- **Lo que ha pasado** (`episode-list` / `episode-card` / `episode-timeline`):
  one card per visit with who, where (camera name), when and how long, its
  state (ongoing, left, someone from home), whether Argus alerted (and how
  many times), grouped it, kept it for the summary or treated it as routine,
  the reasons in words, whether it spoke or sounded the alarm, an expandable
  timeline loaded on demand (`guard.episode` cache, scoped by id) and, for
  episodes that alerted, the review chips (Útil / Falsa alarma / Ahora no).

The place and camera panels and the review chips are owner-only, like the
decision review they replace (the per-decision review UI and its
`guardService.decisions/feedback` calls are gone: reviewing an episode
labels its notified decisions server-side). Residents and guards read the
same episode list without the review chips or the timeline (backend
8dc2856c grants them `GET /guard/episodes`; the detail stays owner-only), so
the old per-detection incident list and its service call are gone too.

Edits are optimistic over the remote-resource caches: `use-guard.ts`'s
`optimisticRemote` writes the new value into the view cache at once, calls
the service, settles the cache with the server's answer, or restores the
snapshot and shows the refusal toast. Editors are mounted only while open,
so their draft state is initialised from props without effects.

### Notification threads, the Security layout and the core follow-ups (2026-10-03)

**Notifications without noise.** Guard and the camera fallback send
notifications whose `data` carries `threadKey`, `urgency` (`passive`,
`active`, `time_sensitive`, `critical`), `phase` (`opened`, `escalated`,
`daily`, `after_quiet`; `resolved` is understood but guard never sends it),
`kind`, `episodeId`, `cameraName`, `reasons` and `lang` (backend
`services/guard/CONTEXT.md`, "Notifications people read"). The bell popover
and the Novedades card group them (`features/home/model/notification-threads.ts`,
unit-tested; the row is `notification-thread-row.tsx`):

- Rows sharing a `threadKey` are one thread led by its newest row; a row
  without one is its own thread, so older notifications render as before.
  Threads keep the order of their newest row (the projection's rows arrive
  newest first).
- The title and body are the server's words in the reader's language. The
  app adds only the time, the latest phase (shown for a thread of several
  rows, or when it is not the first alert) and the count: "19:12 · Empeoró ·
  3 avisos".
- Urgency is the highest the thread reached and styles the icon tile only:
  critical red with an "Urgente" label (colour is never the only signal),
  time-sensitive amber, active neutral, passive quiet (muted icon and
  title). The icon names the kind: an episode is a shield, tamper a warning,
  a summary history (a moon after quiet hours), the camera fallback a video,
  anything else the bell.
- Read state is per thread: a thread is unread while any of its rows is.
  Opening the bell reads every unread notification of the user (revised
  2026-10-04, see "Calmer corners"); pressing a thread in Novedades marks it
  read and, when it has more than one row, unfolds its timeline
  (`TimelineItem`, `shared/components/ui/timeline.tsx`, shared with the
  episode timeline). Both go through `runOptimistic`, one `notification`
  update intent per row.
- The badge and the popover summary count unread threads plus the unread
  rows beyond the cached window, each counted once because its thread is
  unknown (`unreadThreadCount`). The window is `VIEW_CACHE_PAGE_SIZE` rows
  (it was 8) so four threads keep their history, and the cache rows carry
  `createdAt` in ms.
- The sandbox has no supported way to seed guard notifications
  (`CreateNotifications` is guard's gRPC call under guard's own credential),
  so the visual check used a temporary local patch with demo rows, reverted
  before the commit. Echoing the updated ids from `PATCH /notification/read`
  was left out: a read intent already settles on evidence (its patch is a
  no-op on the synced row), so the echo would change the contract without a
  visible gain.

**Security layout.** On wide windows the owner's columns are hero, mode and
place on the left, and episodes, cameras and expected visits on the right;
the last panel of each column takes the slack (rule 12d). The episode feed
used to be the stretched first panel of its column, so an empty feed pushed
the visits below a tall blank card and a long one stretched the other column
into blank space. The feed shows three cards to the owner (their review chips
make them tall) and five to residents and guards, behind "Ver N más".
Residents and guards see no "Por revisar" tile or count, since they cannot
review. The screen hides the bottom nav, so its scroll view pads 24 px, not
the nav inset. Mode cards nested in the Mode panel use
`dark:bg-card-secondary`, and the `radio` and `menuitem` roles get the same
focus ring and pointer cursor as buttons (`global.css`).

**Phone width.** UIUX's 209b8a7 (dialogs beside `AppScreen`) holds: home,
agenda, projects, people and access, settings and profile at 420 px show no
stray gaps. The members panel's dashed invite tile now sits 12 px inside its
card (at 6 px its corners crossed the card's), and an off switch in dark mode
draws its knob in `foreground-secondary`.

**Core follow-ups.**

- Transport refusals read like people: `INVALID_RESPONSE`,
  `CERT_NOT_TRUSTED`, `FINGERPRINT_MISMATCH`, `STORAGE_ERROR` and a calmer
  `TIMEOUT` (`shared/libs/service-error.ts`). The face screens map any code
  they do not know to that vocabulary or to a calm generic line, never to
  the backend's wording.
- Edit forms clear: an emptied due date, end time, place or note is sent as
  `null` when the saved row had one (omitted otherwise), the lenses read
  `null` as cleared, and a task's due date can be cleared at any time.
- `runOptimistic` draws one idempotency key per user action and hands it to
  every attempt (`call(idempotencyKey)`; Retry reuses it). `useFormSubmit`
  passes it to `request(values, key)` and the productivity creates send it
  (backend 52cf522d).

## Sessions and devices (2026-10-03)

Every role can see where its account is open and close any of it, in real
time, from Configuración ("Sesiones y dispositivos") and from the profile.
Backend contract: argus-auth `GET /auth/sessions`, `DELETE
/auth/sessions/{id}`, `DELETE /auth/sessions?scope=others|all`; a session is
one refresh-token family with an opaque 32-hex id.

- **Client identity on every request.** The backend binds a session to
  `HMAC(User-Agent|IP)`, so the agent string must not change with an OS or
  library update and must be byte-identical on HTTP and on the `/sync`
  upgrade. Mobile sends it from JS (`core/services/net/client-identity.ts`,
  unit-tested; `net.native.ts` merges it into every request, the pinned
  request and every socket, overriding any spelling a caller passed):
  `User-Agent: Argus/1 (android|ios)`, `X-Argus-Client:
  <platform>/<expoConfig.version>`, `X-Argus-Device: <encodeURIComponent of
  Constants.deviceName>` (control characters collapsed, 64 characters). JS
  is enough on mobile because OkHttp and URLSession take the header as
  given, so no native rebuild was needed for it and expo-constants was
  already a dependency. The desktop's identity belongs to Rust
  (`src-tauri/src/net/identity.rs`): `Argus/1 (desktop)`, the crate version
  and the machine's pretty hostname (`/etc/machine-info`, else the kernel
  hostname; `scutil` on macOS, `COMPUTERNAME` on Windows), set as reqwest
  default headers, on the WebSocket handshake and on pairing; the WebView
  cannot override them. The desktop says `desktop`, never `web`. Existing
  sessions migrate once: the first request with the new agent gets a 401,
  and the normal one-refresh-on-401 is accepted by the backend as a legacy
  → stable transition from the same address.
- **The section** (`features/settings/components/sessions/`,
  `hooks/use-sessions.ts`, `hooks/use-session-labels.ts`, `model/sessions.ts`,
  `services/sessions.service.ts`): "Este dispositivo" first, as a card with
  "Cerrar sesión en este dispositivo"; then "Móviles" (android, ios) and
  "Escritorio" (desktop, web), each row with the device name or a platform
  fallback, the platform, the last activity ("Activo ahora" under two
  minutes, then minutes, hours, days, then a date) and since when; an
  unidentified platform gets its own group only when it has rows. Wide
  windows put the card and the bulk actions in a 300 px column beside the
  list; phones stack card, list, actions. The list is a `useRemoteResource`
  under `auth.sessions` (paints the last answer, refetches on focus), parsed
  with the zod schema in `core/contracts/session.contract.ts`.
- **Closing.** One row closes at once, without a dialog: the row leaves
  through the shared optimistic layer (table `session`, a delete intent),
  and a refusal brings it back with the toast; closing your own phone from
  the desktop is the safe direction and easy to redo. "Cerrar las demás
  sesiones", "Cerrar todas (incluida esta)" and closing this device confirm
  first. Closing this device is the profile's logout with a notice
  (`authService.logout('closed-here')`); "all" is
  `authService.logoutEverywhere()`, which the profile also offers under
  "Cerrar sesión".
- **Real time.** `AuthContextChanged` frames that carry a `reason` are
  session signals, read by `readSessionSignal` in the router (role changes
  keep their path). `sessionsChanged` reaches `synchronizeService
  .onSessionsChanged`, and an open section refetches. `sessionRevoked`
  ends the session through `sessionService.endSession('closed-here')`:
  the calm toast "Se cerró la sesión de este dispositivo", the same clear as
  a local logout, and the entry gate lands on the login screen. The notice
  shows once even when the HTTP answer and the frame both arrive.
- **Configuración for every role** (reverted the same day: the section moved to the profile, see "Sessions in the profile" below). `/settings` was open to all roles
  (`settingsAccessForRole`: the catalog stays owner-only, the sessions
  section is for everyone), mirrored from the backend's `kSessionAccess`
  by `tests/unit/role-access-contract.test.ts`. Non-owners see only the
  sessions section, and the owner-only loads do not run for them.
- **Invitations are pinned before the token leaves.** `invite.service`
  sends `resolve` through `netService.requestPinned(request, { caFingerprint,
  host })` (`invitationResolveRequest`, unit-tested); `trustAny` is gone
  from the Nitro spec. Android checks, inside the TLS handshake, that a
  certificate in the presented chain has the QR's SHA-256 fingerprint and
  that the chain validates to it alone, and the hostname verifier requires
  the QR host among the leaf's DNS SANs; iOS does the same with
  `SecTrustSetAnchorCertificates` + `SecPolicyCreateSSL(true, host)`. A
  refusal happens before any byte of the request is written and surfaces
  as `FINGERPRINT_MISMATCH`, which the invitation screen explains ("Este
  servidor no es el de la invitación… No se envió nada"). The desktop has
  no invitation path (enrolment is mobile-only), so it never sends a token.

## Dialogs, the agenda and the desktop shell (2026-10-03)

**Dialogs own their scroll.** A focused input inside a dialog lost the sides
of its focus ring: the form scrolled inside `FormScrollView`, a scroll
container exactly as wide as the inputs, and a scroll container clips what
overflows it, so the 3 px ring (and the buttons' 2 px outline at a 2 px
offset) was cut on both edges. The fix is in the primitives, so every dialog
gets it:

- `AdaptiveDialog` renders its children in `OverlayBody`
  (`shared/components/ui/overlay-body.tsx`): one scroll view that spans the
  dialog's full width (negative margin equal to the dialog's own padding,
  `DIALOG_INSET` / `SHEET_INSET`, given back as content padding) with a
  vertical `OVERLAY_RING_GUTTER`, so a ring is never at a scroll edge. The
  header and the actions stay put (sticky) and long content scrolls between
  them; a hairline appears above and below the body only while it really
  overflows (on web it reads `scrollHeight` from the DOM node, because
  `onLayout` uses `getBoundingClientRect`, which the opening zoom animation
  scales). `scroll-py-6` keeps a focused field clear of the edges when the
  browser scrolls it into view. On native the body height comes from
  `useOverlayBodyHeight`.
- A `FormScrollView` inside an `AdaptiveDialog` no longer scrolls itself: it
  joins the dialog body through `OverlayBodyContext` (registers that scroller
  for `scrollToFirstError` and its offset), so there is never a scroll inside
  a scroll; its `maxHeight` only applies outside a dialog.
- Keyboard: Radix gives the focus trap, Escape (refused while a dialog is not
  dismissible, `onEscapeKeyDown`) and the first focusable field. The optional
  `onSubmit` makes Enter submit on web (`dialog-submit-key.ts`, unit-tested:
  Enter in a field or the dialog submits, a textarea needs Ctrl/Cmd+Enter,
  buttons, switches, tabs, options and links keep their own Enter, IME
  composition never submits). It listens in the capture phase because
  react-native-web's `TextInput` stops the propagation of its key events, and
  it prevents the event, so a field's own `onSubmitEditing` does not submit a
  second time. Agenda and project forms pass it; the other features' forms
  can pass `onSubmit={submit}` the same way.
- The close button is a 32 px round button with the caller's `closeLabel`
  (it used to be an English "Close" at 70 % opacity), the overlay keeps 24 px
  around the dialog from `sm` up, and the Radix wrapper that takes focus on a
  click in the empty part of a dialog no longer draws WebKit's focus outline.

**Entry state follows the clock.** The cached `CalendarEntry.status` is the
time-free fact the sync knows (a reminder completed, a task's own status); an
event's cached status said nothing, so every event and every open reminder
read "Próximo" all day. What a row shows is `calendarEntryState(entry, now)`
(`core/services/view-cache/calendar.projection.ts`, unit-tested), resolved at
render with the screen's `useNow` ticker, so labels change without a new
projection or a cache write: an event is `upcoming` → `ongoing` → `ended`
(no end time counts as one hour, `CALENDAR_OPEN_EVENT_MS`, the usual default
duration of a calendar event); an all-day event is `today` on its days and
`ended` after; a reminder is `upcoming`, `overdue` once past, `done` when
completed; a task keeps its own status (`todo`, `doing`, `done`). Labels are
`screens.agenda.state-*`, and the rail colour comes from
`features/agenda/model/entry-state.ts` (overdue is the warning fill, ended the
border colour). The home "Hoy" timeline, every agenda mode and the detail
dialog read the same function.

**Agenda.** The Agenda mode was a stack of one dashed "Nada este día" row per
empty day. It is now a schedule:

- `model/agenda-rows.ts` (unit-tested) turns the range into rows: a day with
  entries (all-day first, then by time), today always (empty or not), one
  collapsed row per run of empty days ("Sin planes · 4–9 oct", split at a
  month boundary) and a month label when the list crosses into another month.
  It receives the date formatter's day math, since features may not import
  date-fns. `formatDayRange` names the month once ("4–9 oct", "Oct 4–9").
- A day is a date badge (weekday + number; today filled, with "HOY") beside
  its entries; an entry row (`agenda-entry-row.tsx`) is a time column (start
  and end, or "Todo el día"), the title and a meta line with the source icon
  (event, task, reminder), place and a non-default status. The list ends with
  "Seguir en {mes}", and the arrows move a month at a time (to today when the
  target month is the current one). The range (30 days from the anchor) reads
  the anchor's month cache and the next one, both already kept by the
  coordinator.
- Wide windows (medium and expanded) put `AgendaSidePanel` beside Agenda and
  Day: a mini month (`CalendarMonthView mini`, a dot marks busy days; a tap
  moves the view there), the period's counts by source and its days without
  plans, and "Lo siguiente" (the first entry still ahead, with "Hoy"/"Mañana"
  or the date) or, when nothing is pending, a create button. Month keeps its
  own day column; Week needs the whole width.
- The header controls are one cluster that matches the view switcher (same
  height, same `surface-secondary` track): previous, "Hoy", next. "Hoy" is a
  raised chip with an accent dot when the visible period does not contain
  today, and flat when it does; the arrows' labels name their step (day,
  week, month). The subtitle names the period ("3 oct – 2 nov") in Week and
  Agenda. Moving a month in Month also moves the selected day to the 1st (or
  today), so the day column never shows a day of another month.
- Day: all-day entries sit in their own row on top instead of being drawn at
  the hour their timestamp happens to have, every entry of an hour is shown
  (the old timeline showed only the first), the current hour is marked with
  an accent rule, and an empty hour creates an event at that hour (the event
  form keeps a non-midnight time it is opened with).

**Desktop context menu.** The WebView's own right-click menu (Back, Reload,
Inspect Element, and Cut/Copy/Paste/Insert Emoji in fields) is refused
across the window. Tauri 2 has no switch for it (the maintainers point to
the DOM `contextmenu` event); `src-tauri/src/context_menu.rs` is a small
plugin whose `js_init_script` prevents it in the capture phase before any
page code runs, in every webview and on every platform. Selection and the
keyboard shortcuts (Ctrl+C/V/X/A) are untouched, because only the
`contextmenu` event is cancelled.


## Sessions in the profile, the owner's access view, single-use invitations (2026-10-03)

David moved "Sesiones y dispositivos" out of Configuración into the profile
and asked for an owner view of who is signed in where, with the power to
close sessions and turn accounts off; and for invitations without an
expiration date.

- **`features/sessions`** is the slice now (it was `features/settings`'
  sessions folder): the own-sessions section, the owner's connected-devices
  panel and per-user dialog, their hooks, model and service. Its `index`
  exports `SessionsSection`, `ConnectedDevicesPanel`, `UserSessionsDialog`,
  `useConnectedDevices` and `useSessionLabels`; profile and people compose
  them. `/settings` is the Owner's again (`route-access`, nav).
- **Profile.** Identity header and the sessions section in the main column,
  appearance, language and server in the aside on wide windows (stacked on a
  phone). The section carries the three actions: close this device, close
  the others (one by one on each row, or all), close everywhere; on a phone
  it also offers "Conectar otro dispositivo". The old sign-out buttons and
  the link to Configuración are gone, and "Tu voz" left the profile
  (VOICEPRINT2).
- **Owner: Personas y accesos.** Each member row says how many devices the
  person has open (or "Cuenta desactivada") and opens the access dialog:
  their sessions (from `GET /auth/users/{id}/sessions`, painting the
  overview's rows first), close one, "Cerrar todas sus sesiones", and
  "Desactivar cuenta" / "Reactivar cuenta" (confirmed; never offered for
  yourself, and the server refuses it for yourself and for the last owner).
  "Dispositivos conectados" lists every user with an open session (`GET
  /auth/users/sessions`, view cache `auth.user-sessions`), most recently
  active first, with the platforms they use. Everything is optimistic:
  closing or disabling removes the rows at once through `session` delete
  intents and a `user` update intent, and a refusal brings them back.
- **Real time.** `userSessionsChanged` (sent to the owners' room on every
  login and revocation) refreshes the owner's views
  (`synchronizeService.onUserSessionsChanged`). `sessionRevoked` now says why:
  `revokedByOwner` ends the session with "El propietario cerró la sesión de
  este dispositivo", `accountDisabled` with "Tu cuenta fue desactivada…"
  (`session-end-notice.ts`), which is also the notice for an
  `AuthContextChanged` with `isActive:false` and for a refresh refused with
  `ACCOUNT_DISABLED` (`readRefreshResponse`). A face login refused that way
  says so instead of "rostro no reconocido".
- **Invitations.** The dialog asks for the role only and says the QR is
  single use; the preview shows the QR while it waits, and turns into "used"
  (no revoke on close then), "closed" or "lapsed" from the synced row. The
  list shows each invitation's state and when it was created. The server
  keeps a 30-minute lifetime as a safety net for a revoke that never
  arrives (backend `services/identity/CONTEXT.md`).
- The four owner routes are not in `HTTP_CONTRACTS` yet: their zod schemas
  (`userSessionsOverviewSchema`, `authSessionListSchema`,
  `sessionRevokeResultSchema`) are registered once MAIN records the goldens.

## Security by environment (2026-10-04)

Guard posture is per environment now (backend 2f669111, `services/guard/CONTEXT.md` "Environments"): a home, a restaurant, an office, each with its own kind, mode, hours, closed mode, daily summary and quiet hours, and every camera in exactly one (unlisted cameras live in the default environment).

- **Data.** One remote resource, `guard.environments` (`GET /guard/environments`, zod-checked in `guardService`, contract `guardEnvironmentSchema`), carries config, live posture and `cameraIds`; it replaces `guard.mode` and `guard.site`. `POST /guard/mode {mode, environmentId?}` answers the whole list, so `setMode` applies `withMode` optimistically and settles from the answer. Episodes are a scoped cache (`guard.episodes`, scope `all` or the environment id) loaded with `?environmentId=`.
- **Screens.** `/security` is the overview: the hero (stats and "Todos los entornos", the all-environments mode chips, shown only with several environments), the environment cards (kind, effective mode, posture, hours, cameras, ongoing episodes; owners get the dashed "Nuevo entorno" tile) and the episodes and expected visits. `/security/[id]` is one environment: mode cards, cameras and what each looks at (owner), its episodes, and "Horario y resúmenes" (hours, closed mode, daily summary, quiet hours inherit/custom/off), read-only for residents and guards; edit and remove live in the header menu (the default cannot be removed). `routeFallback` applies a route's rule to its nested paths, so a guest cannot open `/security/3`.
- **Camera detail.** `CameraEnvironmentPanel({ cameraId, className })` ("Entorno y vigilancia") and `useCameraEnvironmentIndex()` (camera id → environment badge, `several` false with one environment) are exported for features/cameras (CAMERA2 hosts them); the camera context editor gains the environment choice.
- **Expected visits** can be scoped to one environment from the form when there are several.
- **Voice.** The call situation lists each environment's posture when there are several ("Vigilancia por entorno: Casa, modo noche; Trattoria, abierto al público"). `app.set_guard_mode` may carry `environment` (a name or a place word from the call); `matchEnvironment` resolves it by exact name, then name words, then kind words, refuses an ambiguous or unknown place (the call corrects itself aloud with the names it knows) and treats a command with no place as every environment.
- **Why "entorno".** The owner's word for it; "lugar" stays in hints where it reads more naturally.
- Golden fixtures for the new routes are recorded by MAIN; `HTTP_CONTRACTS` gains `GET /guard/environments` once they exist (the test needs a recording).

### Cameras: a model catalog, a connection test, a screen that fills, and calls through a camera (2026-10-04)

- **Creating a camera is four steps** (`components/camera-form.tsx`, `model/camera-form-steps.ts`):
  model, connection, test, details; an edit starts at the connection. The model step is
  a searchable grid of `GET /camera/catalog` (`hooks/use-camera-catalog.ts`, a cached remote
  resource) with brand, form and feature chips (`model/camera-catalog.ts`, unit-tested).
  Picking a model fills the driver, port, user, paths and `catalogId` (kept in the camera's
  `config`, projected as `catalogId`). The test step calls `POST /camera/probe` and words each
  step for the user (`model/camera-probe.ts`): unreachable, port refused, wrong user, wrong path,
  no cloud password for the speaker. A failed test does not block saving ("Continuar de todos
  modos"): a camera may be installed before it is plugged in. Save stays optimistic.
- **Product pictures are our own drawings.** `components/camera-illustration.tsx` draws each
  form factor (pan-tilt, outdoor pan-tilt, cube, bullet, turret, dome, doorbell) as line art in
  `react-native-svg` from the theme tokens, so it follows light and dark. No vendor image is
  copied or hot-linked.
- **The cameras screen** (`screens/cameras-screen.tsx`) reads `GET /camera/overview` every 15 s
  while focused (`hooks/use-camera-overview.ts`): per camera last seen, picture health, sub-stream
  size/fps/bitrate, viewers and last detection, plus the recent detections (the synced `event`
  table that used to feed that list has no writer). A toolbar searches, filters by status, sorts
  (name, status, recent activity) and switches grid/list (remembered in storage); the grid picks
  the column count that leaves the fewest empty slots (`gridColumns`), and one camera on a wide
  window is a featured card. On wide windows the right rail is the summary with a per-camera
  status list and stretches to the grid's height; the detections panel ends the main column.
  The "add camera" tile and the activity mosaic are gone from this screen (the mosaic moved to
  `features/home`, its only reader). GUARD2's `useCameraEnvironmentIndex` puts the environment
  on each card when the install has several, and `CameraEnvironmentPanel` sits in the detail.
- **Calls through a camera** (`services/camera-call.service.ts`, `hooks/use-camera-call.ts`,
  `components/camera-call-panel.tsx`): "Llamar por la cámara" (full duplex), "Solo enviar audio"
  (hold to talk, the camera's sound ducked while held), "Escuchar" (listen only) and the typed
  announcement. The talk leg is its own `/media` socket: `camera:talk:start {cameraId,
  sampleRate: 16000}`, then binary frames `[0xA8, 0x01, 0, 0] + PCM16LE`; mute sends silence so
  the line stays open. The listen leg subscribes to the sub stream and decodes the camera's FLAC
  track itself (`model/camera-audio.ts`: go2rtc writes verbatim 16-bit frames, so no codec is
  needed on any platform; checked against a live capture: 660 Hz in, 660 Hz out). Capture and
  playback reuse the voice feature's mic (`createVoiceMic` from `features/voice`): echo
  cancellation on web (`getUserMedia`), Android `VOICE_COMMUNICATION` + AEC, iOS voice chat, with
  the camera audio played through the same path so the canceller has the reference. The
  microphone only starts from a button press (or the card's mic button, which opens the detail
  with `?talk=1`), never while an Argus call is live, and not where `voiceCallSupported()` is
  false (listening still works). Who may talk is `cameraActionAccessForRole` in
  `shared/libs/role-access.ts`, mirrored from `kCameraActionAccess` and pinned by
  `tests/unit/role-access-contract.test.ts`. Levels, mute, volume (0-200 %), listen toggle and a
  latency hint (queue + packet) are on the panel.
- **Device controls no longer need PTZ**: a bullet camera keeps privacy, LED, night vision and
  motion; motion sensitivity (low/normal/high) is in the settings sheet, saved PTZ positions are
  buttons under the pad with "save position", and the device panel shows the SD card.

## Short screens end together, and their slack carries facts (2026-10-04)

At 1366×900 three screens showed big empty cards: the wide `AppScreen`
row was as tall as the window, so on a short page the last panel of each
column (`flex-1`, rule 12d) stretched to the window's bottom, empty. Two
fixes:

- **Columns end at the taller column, not at the window.** `AppScreen` takes
  `fillHeight` (default `true`: the projects board and the dashboard still
  fill the window). The people screen passes `false`, so the shorter column's
  last panel stretches only to the other column's natural end. The security
  screen's expanded row likewise no longer takes `flex-1`; Entornos and
  Visitas esperadas stretch only to match their sibling column.
- **What remains carries information.** `SessionInsights`
  (`features/sessions/components/session-insights.tsx`, model
  `sessionInsightsOf`, unit-tested) shows open sessions, sessions active
  today, the nearest expiry and the latest sign-ins (device, person, date and
  time). It sits under the session list in Perfil and under the user rows in
  "Dispositivos conectados", where it reads every user's sessions and names
  the person on each sign-in.

**An owner Configuración cannot reach yet (2026-10-04).** The simple mode no
longer says "Configuración no tiene su dirección ni su credencial": it says
what the owner sees ("Aún no puedes ajustar {names} desde aquí"), that the
service keeps running with its current settings, and what to do (run the
server setup again), with "Ver detalles" switching to Avanzado. There the
owner's header names the missing address and credential of
`argus-<service>`, the `.toml` that still holds its settings, the scripts to
run and the two services to restart.

## Calmer corners, and the bell reads what it shows (2026-10-04)

**Radius scale.** David found the app "demasiado bordeado". The old scale
(`sm 14 / md 18 / lg 24 / xl 32 / 2xl 40 / 3xl 48`) put 48 px on every
`Panel`, 40 px on the cards nested in it, 32 px on hover rows and 18 px on
44 px controls, so a button was almost a pill and a panel an oval at its
corners. The scale is now, in `global.css` `@theme` (one change, every
`rounded-*` class follows):

| Token | Old | New | Used by |
|---|---|---|---|
| `xs` | 2 | 2 | mosaic cells |
| `sm` | 14 | 6 | week-grid events, menu items without padding |
| `md` | 18 | 10 | items inside a padded menu (`OptionRow`, context menu), small buttons, a card inside a `p-3` card |
| `lg` | 24 | 12 | controls: `Button`, `Input`, `Textarea`, `SelectField`, `Select`, segments |
| `xl` | 32 | 14 | hover rows, nav rail items, small icon tiles, dashed fill tiles, task rows, select and context-menu popups |
| `2xl` | 40 | 16 | cards nested in a panel, icon tiles, video surfaces, menus, toasts, segmented tracks |
| `3xl` | 48 | 20 | top-level containers: `Panel`, dialogs, popovers, standalone cards |
| `4xl` | 56 | 24 | sheets, the brand mark, the QR pane |

- Sources: Apple's concentric rule (WWDC25 "Get to know the new design
  system", `ConcentricRectangle`: inner radius = outer radius − padding),
  Material 3's shape scale (8 / 12 / 16 / 20 / 28 for small → extra-large),
  shadcn/ui's default (`--radius` 10 px, `md` 8, `xl` 14, `2xl` 18) and Radix
  Themes (6–16 px at the default scaling).
- Nesting follows the concentric rule where the gap is small: a menu (16)
  with `p-1.5` gives its items 10, a segmented track (16) with `p-1` gives
  its segments 12, a home project card (20) with `p-3` gives its inner block
  10. A card nested in a `p-4` panel keeps 16 rather than the strict 4, since
  a corner that sharp reads as a different language.
- Round stays only where the shape means something: icon-only buttons, the
  FAB, avatars, status badges, counts, filter chips, switches, progress bars,
  the floating bottom nav and the dashboard search field. The pill segmented
  groups (agenda view switcher and header, language switch, `SegmentedControl`)
  became rounded rectangles, and the activity card's button lost its
  `rounded-full` override.
- No literal `rounded-[Npx]` is left in `src/`; a new surface picks a token
  by its role in the table.

**The bell reads what it shows.** Opening the notifications popover marks
every unread notification of the user read (`readAll`: the unread ids in
WatermelonDB plus the visible threads', one `runOptimistic` with an intent
per row and one `PATCH /notification/read`). The badge clears at once. The
popover keeps the highlight of what was new while it stays open: it takes a
snapshot of the unread ids when it opens and overlays it on the rows
(`withUnreadSnapshot`, unit-tested), and its summary says "N nuevas" from
the badge count at that moment; closing drops the snapshot, so the next open
shows them read. A notification that arrives while the popover is open stays
unread until the next open. The bell's rows are no longer pressable and the
"Marcar todo como leído" button is gone; the bell carries the hint "Al
abrirlas quedan leídas". Novedades keeps the tap that reads a thread and
unfolds its timeline.

## The camera live view: full quality, honest frame rate, explicit audio, fullscreen (2026-10-04)

- **Capabilities arrive with the camera row.** argus-camera now stores the
  camera's capabilities in the `capabilities` column as a list of names
  (`["ptz","presets","talk","microphone",…]` or `["streamOnly"]`), rewrites it
  whenever the driver, model, catalog entry or cloud password changes, and
  audits it, so the row the sync delivers is enough. The projection carries it
  as `ICameraCacheRow.capabilities`; `model/camera-capabilities.ts`
  (`resolveCapabilities`) prefers the synced list and falls back to
  `GET /camera/{id}/capabilities` only while the row's list is empty (a server
  that has not reconciled it yet). The detail screen also reloads the device
  status and capabilities when the row's driver, address, catalog or
  capability list changes, so switching a camera from RTSP to Tapo shows the
  PTZ pad and the talk controls without reopening the screen.
- **Quality.** "Alta" is the camera's main stream (what argus-camera's
  LiveView role serves) and "Fluida" the sub stream. Phones start on Fluida,
  every other window on Alta; a choice is remembered per device and camera
  (`cameras.quality.<id>` in storage, `hooks/use-camera-quality.ts`). Two
  stalls within a minute on Alta switch to Fluida for this visit with a note
  and a "Volver a Alta" action (`model/camera-stream-quality.ts`, unit-tested);
  the stored choice is untouched. The app cannot tell mobile data or the
  tunnel apart yet: no network-type module is linked, and adding one needs a
  dev-client rebuild.
- **What the picture is.** `model/stream-meter.ts` reads the size from the
  init segment's `tkhd` and the frame rate from the video samples' durations
  (their mean, because Tapo timestamps are irregular: a capture of the C225
  sub stream has a most common gap of 50 ms but 15.1 fps on average), and
  whether the stream carries audio. The media session reports it through
  `events.onStats`; the video shows it as a chip ("2688×1520 · 15 fps").
- **Frame rate, read-only.** The C225 has no frame-rate setting Argus can
  use (argus-camera CONTEXT: the setters are missing or unsupported, and the
  one the camera accepts is stored without changing the stream), so the
  detail shows the measured rate under the video ("Esta cámara emite a N
  fps") and offers no choice.
- **The camera is heard by default.** The live view plays the camera
  microphone from the fMP4 it already receives (the FLAC track argus-camera
  muxes beside the video), so listening opens nothing: no second stream, never
  the 8800 talk line, and nothing a viewer does can hold the line Argus needs
  for guard announcements or a call. On the web and desktop
  `components/web-camera-audio.ts` decodes the verbatim FLAC frames
  (`model/camera-audio.ts`) and schedules them on its own `AudioContext`
  (≤ 0.6 s ahead, reset when late); on Android the native view's new `muted`
  prop sets ExoPlayer's volume; iOS's `AVSampleBufferDisplayLayer` renders no
  audio yet. A mute button sits on the video, remembered per device
  (`cameras.audio.muted`, `hooks/use-camera-live-audio.ts`), shown only when
  the stream carries audio and the view that is playing can sound it:
  WebRTC everywhere, and the fMP4 player on the web, the desktop and Android,
  but never on iOS while its native player renders no audio
  (`liveAudioPlayable` with `CAMERA_FRAGMENT_AUDIO`). The native view's
  `muted` comes from `nativePlayerMuted`: silent while the camera's audio is
  off, and while the WebRTC view is the one playing, so the camera is never
  heard twice. Both decisions live in `model/camera-live-audio.ts` and are
  unit-tested (2026-10-13, F1). The camera is silenced while the user is in a
  call with Argus (`useVoiceCallActive` from `features/voice`) or in a call
  through the camera (that call plays its own echo-cancelled copy), with a
  chip saying why, and comes back after (`model/camera-live-audio.ts`,
  unit-tested). If the WebView refuses to start audio (autoplay policy), the
  video shows "Toca para activar el sonido" and the tap resumes it.
  WebKitGTK on the desktop allowed it without a tap.
- **Talking.** "Hablar" (hold to talk) and "Llamada" (full duplex) appear only
  with `talk` (Tapo plus the cloud password) and the role's
  `cameraActionAccessForRole(role).talk`; a Tapo camera without the cloud
  password says how to enable talking. The separate "Escuchar" action is gone.
- **Controls on the video.** The PTZ pad sits on the picture (hidden by
  default on phones, toggled by "Mover"); saved positions and "Guardar
  posición" are under the video. A tap is a 10° step (`motorMove`, relative
  degrees: right `+x`, left `-x`, up `+y`, down `-y`); holding an arrow for
  350 ms starts a continuous move (`relativeMove` 0/90/180/270) and releasing
  sends `stop` (`model/camera-ptz.ts`, `hooks/use-camera-ptz.ts`, unit-tested;
  calls are queued so a stop never overtakes its start). When the server
  answers `limit: true` that arrow dims and the video says the camera cannot
  turn further.
- **A hold that outlasts the camera's lease** (reviewer ruling, 2026-10-13,
  option a). An ONVIF move carries a 2-second timeout, so the camera stops by
  itself when a `stop` is lost (argus-camera CONTEXT, the ONVIF driver). Such
  a camera announces `holdRenewMs` on `GET /camera/{id}/capabilities`, the
  same answer the app already reads `catalogId` from (the synced row's list
  holds only flag names). While the hold lasts the app re-sends the same
  `{angle}` every `holdRenewMs`. A camera that announces nothing, Tapo among
  them, gets today's single move. The release sends `{stop: true}` and
  cancels the interval. Leaving `active` (any other state, `inactive`
  included) ends the hold the same way: the interval is cancelled and a stop
  goes out best-effort through the same queue. Coming back to `active`
  restores nothing, and the user presses again (reviewer ruling,
  2026-10-13). The camera's own 2-second timeout stays the safety net if
  that stop never arrives. A release after the hold has ended sends nothing
  and raises no error, because the stop already went out. Unmounting cancels
  the interval and sends the stop directly, as before. A renewal is
  silent: no toast and no `moving` flicker, so an
  offline camera does not raise one error a second. It is skipped while the
  previous move is still in flight, so renewals never queue up ahead of the
  stop. The value is honoured only as a finite number between 250 ms and
  60 s (`ptzHoldRenewMs`), because a tiny or overflowing interval would flood
  the camera. The driver is `model/ptz-hold.ts` (`createPtzHold`, timers
  injected), unit-tested in `tests/unit/features/cameras/ptz-hold.test.ts`. There is no "Centrar": the C225 exposes no home position
  locally (argus-camera CONTEXT, "Pan and tilt, measured"). The device
  settings (privacy, motion and its sensitivity, auto-tracking, LED, night
  vision) are inline in "Ajustes de la cámara".
- **Fullscreen.** The button on the video opens the same stage (badge, stats,
  PTZ, quality) in a full-window `Modal`; on the desktop it also makes the
  Tauri window fullscreen (`core:window:allow-set-fullscreen`), on the web the
  document; Escape, the browser's own exit or the button closes it
  (`services/window-fullscreen.{web,native}.ts`). The modal and the stage
  state (`hooks/use-camera-live-stage.ts`) live in the detail screen, beside
  `AppScreen`: going fullscreen resizes the window, the screen switches layout
  and remounts the live panel, and a modal inside the panel closed itself the
  moment it opened from a 420 px window. On a phone (shortest screen
  side under 600) entering fullscreen locks landscape with
  `expo-screen-orientation` and leaving it locks portrait; the previous lock
  comes back when the detail screen unmounts. Tablets rotate freely. The
  stage's overlays sit inside the safe-area insets in fullscreen.
  `expo-screen-orientation` and the `muted` prop are native changes: the
  Android/iOS dev client must be rebuilt.

## The camera live view over WebRTC, the WebSocket as fallback (2026-10-05)

David asked that the live view always try WebRTC first; the fMP4 `/media`
socket stays, and is used only when WebRTC cannot be established or drops
for good. The picture comes straight from argus-camera's go2rtc (backend
`services/camera/CONTEXT.md`, "The live view prefers WebRTC"); argus-camera
only answers the offer (`POST /camera/{id}/webrtc`, `cameraControlService.webrtc`,
answer checked by `cameraWebRtcAnswerSchema`).

- **Who decides the transport.** `services/camera-live.service.ts`
  (`cameraLiveService`, `ICameraLiveService`) is the only caller of both
  transports: it opens a WebRTC session first when the platform has one and
  no recent failure is cooling down (`model/camera-transport.ts`,
  unit-tested), and the fMP4 session (`camera-media.service.ts`, unchanged)
  otherwise. WebRTC that paints no frame within 5 s, a refused or failed
  offer, or a peer that ends `failed`/`closed` falls back to the WebSocket at
  once. A WebRTC view that drops after painting reconnects over WebRTC once
  (state `reconnecting`), then falls back. Each failure moves the next try
  out (30 s doubling to 5 min, process-wide), so the next views open on the
  WebSocket straight away; a view already on the WebSocket tries WebRTC again
  in the background when that time comes and hands over without a blank
  frame when WebRTC paints (the socket closes only then). A success clears
  the backoff.
- **Platforms.** `services/camera-rtc/` is platform-split:
  `camera-rtc.web.ts` uses the browser's `RTCPeerConnection` (feature
  detected; Tauri on Linux runs WebKitGTK, which has none without GStreamer's
  `webrtcbin`, so the desktop goes straight to the WebSocket and never shows a
  failure — measured: the chip says "WS" and Alta and Fluida play as before;
  WebView2 and WKWebView have it), `camera-rtc.native.ts` loads
  `@livekit/react-native-webrtc` lazily and answers unsupported while the dev
  client lacks `WebRTCModule`. `camera-rtc-session.ts` is the shared session:
  two `recvonly` transceivers, one HTTP exchange, then `getStats` every
  250 ms until the first decoded frame and every second after that for the
  size, the frame rate (decoded frames over time) and whether audio packets
  still arrive; five seconds without a decoded frame is a stall.
- **What renders.** `components/camera-rtc-video.{web,native}.tsx`: a muted
  `<video>` on the web (the camera's audio goes through the same
  `WebCameraAudio` context as the fMP4 audio, via `attachStream`, so mute,
  level and "Toca para activar el sonido" are unchanged), `RTCView` on
  phones (audio plays through WebRTC's own output; mute disables the remote
  audio track). The live views keep the canvas/native player mounted and
  show whichever transport is live, so the zones overlay, PTZ, quality,
  fullscreen and mute work the same on both.
- **The chip says which.** The stats chip on the video adds "· WebRTC" or
  "· WS" (`screens.cameras.live.transport-*`, with a spoken hint), from
  `ICameraLiveStats.transport`.
- **Remote.** Through the tunnel WebRTC has no route (no TURN yet), so the
  first view of a session waits up to 5 s before playing over the WebSocket;
  later views skip WebRTC until the backoff ends.
- **Phones not verified here.** The native path type-checks and shares the
  session code the browser test exercised, but no phone ran it in this
  change; Android's audio routing for a camera stream (no `AudioSession`
  is started) is the first thing to check on a device.
- **Tests.** `tests/unit/camera-transport.test.ts` (choice, backoff, stats
  reading), `tests/unit/camera-live-transport.test.ts` (the coordinator
  against fake transports: unsupported, live, refused, no frame, drop and
  reconnect, background upgrade), and the role mirror now covers
  `CameraAction::Watch`.

## Calls over WebRTC (2026-10-04)

David decided that Argus's voice travels over WebRTC through a self-hosted
LiveKit SFU (backend `RTC-CONTRACT`, owned by argus-sync and argus-voice);
the `/sync` socket keeps data sync and the "Argus is calling" ring. The PCM
call over `/sync` stays as the fallback until WebRTC is proven on every
platform, then leaves in its own change.

- **One interface, three clients.** `IRealtimeCall` (`core/interfaces/rtc.interface.ts`:
  `join`, `setMicrophone`, `send`, `leave`, events `state | agent | data |
  level | agentAudio`) is implemented in `features/voice/services/rtc/`:
  `rtc-call.native.ts` uses `@livekit/react-native` 3.0.0 +
  `@livekit/react-native-webrtc` 144.2.0 (loaded lazily, and
  `rtcCallSupported()` answers false while the installed dev client lacks
  `WebRTCModule`, so a JS update before a native rebuild keeps the PCM call);
  `rtc-call.web.ts` uses `livekit-client` 2.22.3 in a browser and the Rust
  client in Tauri. `rtc-livekit.ts` is the shared `livekit-client` adapter.
- **The desktop call is native.** WebKitGTK has no `RTCPeerConnection`, so
  `src-tauri/src/rtc/` runs the call with the LiveKit Rust SDK (`livekit`
  0.9.3, `livekit-net` 0.1.3) behind `argus_rtc_join/microphone/send/leave`
  (events on a Tauri `Channel`). Audio is `PlatformAudio`: WebRTC's own audio
  device module (PulseAudio/PipeWire on Linux) with its software echo
  cancellation, noise suppression and gain control, so the reference signal
  of the canceller is exactly what plays, and the agent's track plays as it
  arrives with only WebRTC's jitter buffer in between. The WebView only draws
  the call. `ARGUS_RTC_FAKE_MIC=<pcm16 48 kHz mono file or wav>` replaces the
  microphone with that file and opens no audio device at all (testing
  without a microphone).
- **Trust.** The LiveKit front (wss 7046) presents the instance leaf. The app
  dials the token's `url` on the pinned host (`pinnedRtcUrl` /
  `protocol::pinned_url`, keeping the port). Desktop registers
  `livekit_net::set_ws_client/set_http_client` with the pinned rustls
  connector (`net::socket::connect_pinned`, `net::http::pinned_client`).
  Mobile routes only that origin's WebSocket through `PinnedWebSocket`
  (`rtc/pinned-websocket.ts`), a browser-shaped socket over the native
  `ArgusSocket`, so neither OkHttp's nor SocketRocket's trust store is
  touched and no native change was needed for trust. Media is DTLS with the
  fingerprints from that signalling, so no CA is involved there.
- **Call flow** (`voice.service.ts`). `start({callId?, reason?})` asks for the
  microphone (not on the desktop, where the native ADM needs no WebView
  permission), then `POST /rtc/token` (`rtc/rtc-token.ts`, answer read by
  `readTokenAnswer`): a grant joins the room; 404 without a code or 503
  `RTC_UNAVAILABLE` falls back to `voice:start`; `CALL_TAKEN`,
  `CALL_EXPIRED`, `CALL_NOT_FOUND` are outcomes the call screen words. The
  agent's `lk.agent.state` attribute drives the visible phase (`rtcPhase`:
  initializing reads as connecting; `reconnecting` is a new phase). Room
  data uses the topics `argus.*`, mapped onto the existing `voice:*`
  handlers, so transcript, actions, reactions and context notes are the same
  code on both transports. Mute mutes the track and sends `argus.mute`; hang
  up sends `argus.hangup` then leaves; a removed participant ends as a
  revoked session; a lost room resumes with `{callId, resume: true}` for 15 s.
  Barge-in is the agent's: the microphone stays open while Argus speaks and
  echo cancellation keeps Argus out of it.
- **Argus calls you.** `call_incoming` (operation 8, option `notification`)
  is never answered on its own. With no call live, the service holds it in the
  waiting state (`holdWaiting`) and the global `IncomingCallSurface` (mounted in
  the root layout, so it shows on any screen except `/call`) shows "Argus te
  llama · <reason>" with "Contestar" and "Rechazar". Only "Contestar" calls
  `answerWaiting`, which claims the token and joins; the microphone opens only
  then. "Rechazar" calls `declineCall`. A critical ring (`urgency: critical`)
  shows its reason prominently under "Alerta crítica" and vibrates until it is
  answered or ends, without the user opening the mic. A `call_cancel` (9) only
  matters before the claim. The push deep link
  `argus://call?callId=<id>` passes the allow-list with its call id only
  (`+native-intent.ts`), and a missed call's notification (`kind: "call"`)
  reopens it from Novedades (`missedCallId`). Native CallKit /
  ConnectionService and a microphone foreground service on Android are a
  later phase.
- **Consent.** The microphone is asked for only when a call starts; the first
  call shows "Argus usa tu micrófono solo durante la llamada…" under the
  status (storage `voice.mic-consent-shown`). `app.config.ts` gives iOS
  `UIBackgroundModes: audio` and the microphone text, Android
  `BLUETOOTH_CONNECT`, `WAKE_LOCK` and `ACCESS_NETWORK_STATE`, and the LiveKit
  Expo plugin's `communication` audio type. A dev-client rebuild is required.
- **Live findings (2026-10-04).** argus-notification fans `call_cancel
  {answered_elsewhere}` out as soon as a call is claimed, and it reached the
  claiming desktop before its own token answer, so a cancel is ignored while
  this device's claim is in flight. The manual interrupt control was removed
  on 2026-10-11 — interruption is by voice alone, through the server's VAD
  barge-in — and the hang-up control keeps its slot so it never moves under a
  finger. A ring during a live call (the user turned `liveAnnounce` off) is
  held as a banner, 'Argus tiene otra llamada para ti', with Atender (ends the
  current call, answers the new one) and Ahora no.
- **Llamadas de Argus** (`components/call-preferences-section.tsx`, a panel in
  Perfil under the sessions): argus-notification's `GET/PATCH
  /notification/call-preferences`, one row per user, edited optimistically
  through the remote-resource cache and rolled back with a toast. Each option
  explains itself in one line; the per-person timings RTC-CALLS added
  (agenda lead, ring length, phone delay, call language, live news, quiet
  days) are optional in the contract and render once the server sends them.
- **Tests.** `tests/unit/rtc-protocol.test.ts`, `pinned-websocket.test.ts`,
  `voice-rtc-call.test.ts` (the service against a fake room) and the Rust
  units; `src-tauri` carries two ignored live tests
  (`rtc::call::live_tests`) that join a real LiveKit with a bot posing as
  `argus-voice` (synthetic tone or a recorded clip, data both ways, mute,
  leave) and through the pinned TLS front.

## Privacy consent before anything is processed (2026-10-04)

David asked for a clear consent notice before Argus processes anything about
a person, with Peru as the target market (Ley N° 29733, its reglamento D.S. N°
016-2024-JUS and the videovigilancia Directive N° 01-2020-JUS/DGTAIPD) and a
pre-beta "tal cual" disclaimer accepted in the same flow. The backend side is
identity's `/privacy` surface (`backend/services/identity/CONTEXT.md`,
"Privacy choices"); the host-level notice lives in the setup scripts.

- **`features/privacy`** is the slice: the consent form, the full notice and
  terms dialog, the per-signal toggle list, the profile section, the in-app
  gate, the owner's household panel with the visitor-recognition
  acknowledgement, and the per-person row of the owner's access dialog. Copy
  is `screens.privacy.*` (es first, en). The country's laws, authority and
  retention days are data (`constants/privacy.ts`, `PRIVACY_JURISDICTIONS`),
  pinned against the backend's `scripts/privacy/jurisdictions.tsv` by
  `tests/unit/privacy-consent.test.ts`, which also pins the notice version
  against identity's `kPrivacyNoticeVersion`.
- **Onboarding.** Owner enrolment and invitation enrolment now pass through
  `/welcome/privacy` (step 2 of 4) before the face step. The choices are held
  in memory (`consentDraft`, never persisted) because there is no account to
  store them on yet; the face step refuses to open without a draft, and right
  after registration succeeds `submitConsentDraft` sends `PUT /privacy/me`.
  Until that write lands the server treats the person as undecided, which
  means every signal off, so nothing is processed before consent. "No acepto"
  drops the draft (and the held invitation token) and returns to the welcome
  screen without creating an account. If the write fails, the person is told
  and the gate asks again with the same choices.
- **The gate.** `PrivacyGate` wraps the signed-in shell: when `GET
  /privacy/me` says undecided or an older notice, it shows the consent form
  full screen instead of the app (existing accounts meet it once). Declining
  there signs the device out. The answer is cached like any remote resource
  (`privacy.me`), so a decided user paints the app at once.
- **Perfil > Privacidad.** Every role reviews and changes the four choices
  (presence, recognition on cameras, voice learning, camera audio) with one
  honest line each, sees when they accepted, and opens the full notice and
  terms. Turning off voice learning or presence confirms first, because the
  server erases what it learned. A signal the owner switched off for the
  household shows as off and disabled, with the reason.
- **The owner.** Personas y accesos gains "Privacidad de la casa": the four
  household switches (turning one off confirms and applies to everyone), how
  many people have not decided, whether camera audio is held and by how many
  people, and "Reconocer visitantes recurrentes", which opens an
  acknowledgement (outside people's faces, camera signs, limited retention)
  before it is enabled. The per-person access dialog shows that person's
  choices read-only: the owner can never change them on someone's behalf.

## Safety nets: dead man's switch, panic, duress (2026-10-04, WATCHDOG)

- **The PIN memo never outlives a change made elsewhere** (2026-10-12). 
  `safetyService` caches the last `GET /guard/safety` answer so a disarm does not
  pay a round trip, and that cache is what told a desktop "no PIN is set" after the
  phone had set one: it disarmed without asking and the server refused the mode
  change. The cache is now forgotten by `{guard, safety_pin}` and `{guard, duress}`
  notices (the same resource notices every other screen rides), by a reconnect -
  a notice missed while the socket was down cannot leave it stale - and by nothing
  else; `disarmNeedsPin()` answers "ask for the PIN" whenever it has to ask the
  server and cannot (a refusal, a missing answer, or a thrown transport), because
  skipping the question is the one wrong answer.

- **Dead man's switch** (`core/services/heartbeat/`). argus-sync sends
  `Heartbeat` (operation 11) after `InitialInfo`, answers the app's
  `{type:"heartbeat"}` (sent every `intervalSeconds`, 60) and pushes one
  when the user's presence changes; `GET /sync/heartbeat` answers the same
  for the background task. `HeartbeatEngine` keeps the last one (MMKV
  `app.watchdog.last-heartbeat`) and hands `planFor()` to the platform alarm:
  on native, `expo-notifications` keeps ONE local notification
  (`argus-deadman`) scheduled `graceSeconds` (45 min) after the last
  heartbeat while `armed`, and cancels it when not. `armed` is true only
  when presence says *away*; home or unknown never arm, so a phone at home
  next to a server stopped on purpose never alarms. The text is calm and
  opens the app: "Argus no responde" / "No sé nada de Argus desde las 03:12.
  Abre la app para comprobarlo." (Android channel `argus-watchdog`, high
  importance; iOS `timeSensitive`).
- **Background limits.** A phone that is away rarely has a live socket, so
  the reschedule also comes from `expo-background-task` (`argus-heartbeat-check`,
  every 15 min at best: WorkManager on Android, BGTaskScheduler on iOS,
  which runs when the system decides) and from a data push
  (`argus-heartbeat-push`, `Notifications.registerTaskAsync`) once the relay
  has an APNs/FCM leg. 45 minutes tolerates two missed wake-ups; a
  force-quit iOS app hears nothing and may alarm, and opening the app
  settles it. **New native modules (expo-notifications, expo-background-task,
  expo-task-manager) and their config plugins: a dev-client rebuild is
  required.**
- **Desktop/web** has no background: `OfflineBanner` switches its text to
  "Argus no responde desde las HH:MM" once the socket has been down for
  `socketGraceSeconds` (180 s), measured from the later of the last
  heartbeat and this disconnect, so a Wi-Fi blip or a server restart says
  only the usual "Sin conexión" (`watchdogNotice`, unit-tested).
- **Panic** (`features/safety`, `PanicButton` in Perfil > Seguridad
  personal, every role). A 2-second hold with a filling bar (`PANIC_HOLD_MS`),
  released early it does nothing; screen readers use the long-press action.
  `POST /guard/panic`; the device plays nothing and only says "Aviso enviado
  en silencio". The backend never rings the person who pressed it.
- **Duress codes.** The owner switches them on in the same panel; Owner and
  Residents then set a normal and a duress code (`PinSetupDialog`). When the
  user has codes, switching any environment to En casa asks for one first
  (`askDisarmPin` + the global `DisarmPinDialog` in the root layout) and
  sends it as `pin`; the duress code produces exactly the same result on
  screen, and the backend alerts the rest of the household silently
  (backend `services/guard/CONTEXT.md`, "Panic and duress", for the threat
  model). Arming never asks.

### The duress phrase, the reach of an alert and the withheld turn (F4, 2026-10-13)

Backend: `services/guard/CONTEXT.md`, "The duress phrase (voice, 2026-10-13, F4)" and
"A household of one"; `services/voice/CONTEXT.md`, "The correction frame (frontend
contract)".

- **The phrase.** While the duress switch is on, the Owner gets "Elegir / Cambiar la frase
  de coacción" and, once one is set, "Quitar la frase de coacción" in Perfil > Seguridad
  personal.
  - Each sends `PATCH /guard/safety {duressEnabled: true, duressPhrase}`, with a string to
    set and `null` to clear. Like the PIN dialog, the caller's own code is asked first
    when they have one (`confirmCurrentPin`), because the backend demands it to change or
    clear the phrase while duress is on.
  - `PhraseDialog` checks what the backend DTO checks, before sending
    (`phraseProblem`): 3 to 12 words (letters and numbers, NFC), no ASCII digits, no
    control characters, at most 200 UTF-8 bytes.
  - Residents who hold `safety.duress` see a read-only row saying whether a phrase is
    set: they say it, and the Owner tells them what it is.
  - Switching duress off deletes the phrase with the codes, and its confirmation now
    says so.
- **The phrase is never kept on the device.** It lives only in the dialog's state,
  cleared when the dialog closes and after a save. It travels in one request body. The
  safety status the app caches (view cache `safetyStatus`, and `SafetyService`'s memo)
  is the zod-parsed answer, which strips every key it does not name. So even an answer
  that echoed the phrase would leave no copy. `hasPhrase` is the only trace, and the
  backend sends it only to holders of `safety.duress`.
- **Who an alert would reach.** `alertsReach` is shown in the panel:
  - `nobody` is a warning: no one else in the household and no emergency contact;
  - `contacts`: a panic reaches the emergency contacts, a duress alert reaches nobody;
  - `unknown`: it could not be checked;
  - `others`: nothing is said.

  An older server without the field claims nothing. A value the app does not know reads
  as `unknown`. Turning duress on while it is `nobody` or `contacts` asks first, and
  "Activar igualmente" goes ahead: the backend keeps that terminal alert as designed
  (guard's DESIGN FORK (a)). On `contacts` the warning and the notice say the difference
  plainly (2026-10-13): a panic reaches the emergency contacts, which Argus shows to the
  actor because it cannot dial them, while a duress code or phrase only alerts the
  household, which here is nobody (guard's "A household of one": the actor's phone must
  not change). `enableReachWarning` picks the warning and `ENABLE_REACH_WARNING_COPY`
  its words; `safety-model.test.ts` checks both reach values in es and en.
- **The withheld voice turn.** When argus-llm withholds a turn (the duress screen), the
  app never keeps the words. There are two paths:
  - *Direct*: the server sends `…` as the final transcript, and it is shown like any
    other turn.
  - *Correction*: words already shown are followed by `voice:stt_correction` on `/sync`,
    or by LiveKit topic `argus.stt_correction`, both carrying `{text}`. The app replaces
    the most recent final user line in place (`correctLastUserLine`; a blank text still
    becomes `…`), never adds a bubble, and overwrites the live caption (`sttText`) when
    it still holds those words. A correction before any final transcript of the call is
    ignored.
  - The transcript lives only in `VoiceService` memory, so nothing on disk ever held
    the words.
  - *A second unheard turn in a row* gets no `voice:stt`: the app receives `voice:event`
    alone, or a correction followed by `voice:event` when the words were shown. Argus
    stays silent then. On the socket transport, which has no agent state, the app went
    to "thinking" on the shown words, so a `voice:event` that follows a correction of
    the current turn returns it to listening. On LiveKit the agent state already does.
- **The alert's two times (2026-10-13).** Every safety alert's notification carries
  `deliveredAt`, when guard received it, and `saidAt`, when the words were heard: a
  number for a spoken duress alert, `null` for a panic or a duress code (backend
  `services/guard/CONTEXT.md`, "Two times per spoken alert"). Both are epoch seconds in
  the notification's `data`, kept verbatim by argus-notification and read from `/sync`.
  - The Novedades row and the bell's preview show both for a spoken duress alert,
    labelled, "Dicha 14:32 · Recibida 14:35" ("Said … · Received …"), because a retried
    raise can arrive minutes after the words. An alert with only a receipt shows that one
    time, unlabelled, like any other row. A row without `deliveredAt` keeps its
    `createdAt`.
  - `alertTimesOf` reads the two (a whole positive number, or absent), and `rowTimes`
    builds the labels for the row and for each entry of its history
    (`notification-threads.ts`); `notification-threads.test.ts` covers both, the
    malformed values and the es and en labels.
- Tests: `safety-model.test.ts` (the phrase rules, the reach, the contract stripping an
  echoed phrase), `safety-phrase.test.ts` (the body sent, and no trace in the answer or
  the memo, including a refusal), `voice-transcript.test.ts` (the in-place correction),
  `voice-rtc-call.test.ts` (both paths, the ignored early correction, the second unheard
  turn, the socket transport back to listening). The e2e spec `duress-phrase.e2e.ts` is
  written and not run: it sets a phrase with no copy in `localStorage`, and warns before
  turning duress on with nobody to reach.

## Intruder response: who is told, who is attending, is it real (2026-10-04, RESPONSE)

The backend decides who an alert reaches and in what order: argus-guard owns
the per-environment list, and the notification call engine runs the steps
(`backend/services/guard/CONTEXT.md`, "Who is called";
`backend/services/notification/CONTEXT.md`, "Intruder response"). The app
does three things.

**The list, in Seguridad → environment.** `ResponseRecipientsPanel` and
`EmergencyContactsPanel` (`features/security`) read
`GET /guard/environments/{id}/response` through `useRemoteResource`, scoped
by environment, so the last answer paints first.
- The Owner edits: per person, Llamar / Solo avisar / Nada, and earlier or
  later. Moving someone who shares a step gives them a step of their own;
  someone alone joins the neighbouring step (`model/response-recipients.ts`,
  unit-tested).
- The Owner also sets a guard's duty, the wait between steps, the emergency
  number and up to ten contacts.
- Every edit is optimistic, saved as one `PUT` of the whole list, then
  reconciled with the server's answer, or reloaded with a toast.
- Residents and Guards see only their own row and the contacts. A Guard
  toggles their own duty (`POST …/duty`). During staffed hours the switch
  shows "En horario de personal: de guardia" and is locked on.
- The add-contact dialog renders beside `AppScreen` (rule 12d).

**The live response.** `features/response` holds a small zustand store of
`IncidentResponse` rows.
- It is fed by `/sync` operation 10 (`response_update`, subscribed once from
  the feature with `synchronizeService.on`) and by `GET
  /notification/responses` on focus.
- A frame never replaces a newer one (`updatedAt`).
- The store resets when the signed-in user changes.
- Open responses, and closed ones for fifteen minutes, show as
  `ResponseStrip` at the top of Inicio.
- `ResponseCard` is exported for the call surface (RTC-APP renders it
  `compact` when a call carries a `responseId`).
The card shows:
- the kind and the place;
- who is attending ("Pedro está atendiendo", "Lo estás atendiendo tú"), the
  step being called, or "Nadie ha contestado";
- the live camera, behind a button so it never streams on its own;
- for a discreet member, "Quédate dentro y no abras";
- Es real / Falsa alarma.

**The verdict.** "Falsa alarma" asks for confirmation first, because it
stops everyone else's ring, and is then applied optimistically. The
optimistic row keeps the server's `updatedAt`, so the server's answer always
wins the merge. "Es real" reaches everyone left at critical urgency
(server-side). Once confirmed or unanswered (`showContacts`), the card shows
the emergency button, which opens the phone with `tel:`, and each contact
with one-tap call and SMS. Argus never places a phone call itself.

Tests: `tests/unit/response-model.test.ts` (headlines, tones, who may
decide, the optimistic merge, contacts gating, phone links, visibility, the
zod contract) and `tests/unit/response-recipients.test.ts` (steps, moves,
modes, duty, the saved body, phone validation). The HTTP schemas live in
`core/contracts/response.contract.ts`; they join `HTTP_CONTRACTS` once MAIN
records the goldens for the five new routes.

### Presence in People and access (2026-10, safety wave)

argus-guard keeps, per user and environment, whether they are home, away or
unknown, and only for users who consented (backend `services/guard/CONTEXT.md`,
"Presence"). The Owner's `/users` list shows it as a chip under each active
member (`features/people/components/presence-chip.tsx`): a dot and "En casa
desde las 18:42", "Fuera desde el 3 oct" or "Desconocido". The time appears
when the change happened today, the day otherwise (`model/presence.ts`,
`presenceOf`, unit-tested). The chip is deliberately coarse: no source, no
environment breakdown, no place. Someone without a row (no consent, or no
signal yet) reads unknown, never away. The answer of `GET /guard/presence`
comes through `useRemoteResource` (view cache first, refetch on focus) and
is read-only, so it has no optimistic layer. `ListRow` gained an optional
`footer` (and `footerLabel` for its spoken label) so a chip sits under the
subtitle without competing with the row's actions on a 420 px phone.

## People seen: the Owner's gallery of recurring visitors (2026-10-04, STRANGERS)

identity remembers faces that come back and are not the household's
(`backend/services/identity/CONTEXT.md`, "Recurring visitors"). The app side
is `features/visitors`:

- **Where**: a "Personas vistas" section on `/users` (the latest six, a "Ver
  todas" action) and two Owner routes, `/users/visitors` (the gallery) and
  `/users/visitors/[id]` (one person). `/users` is already Owner-only in
  `route-access.ts`, so the routes inherit it. Guard may read named visitors
  through the API (`kVisitorAccess`); the app does not show them to a Guard yet.
- **Off by default**: while `household_privacy.visitor_recognition` is off
  the section and the gallery show why and an "Activar" button that opens
  ONBOARD-CONSENT's `VisitorAcknowledgementDialog` and calls
  `useVisitorRecognitionSwitch().enable()` only from its confirmation, the same
  record the Privacidad panel writes.
- **Data**: the gallery is a server-paged feed (`visitorFeed`, view cache
  `visitor.feed.<filter>|<search>`, see "Lists that end only when the data
  does"); the settings and each detail are server-only answers read with
  `useRemoteResource` (`visitor.settings`, `visitor.detail.<id>`), so the last
  answer paints first.
  Visitors are not in WatermelonDB on purpose: they are never synced.
  Renaming, typing, merging, deleting a person or a sample and changing the
  retention update that cache optimistically and roll back on a refusal;
  merge and split reload once the server answers, since they create or
  remove people.
- **Faces**: `useVisitorCrop` asks a one-use capability and keeps the data URI
  only in that component's state, gone when it unmounts or the key changes —
  the portrait rule (12c). No image is cached or persisted.
- **Gallery**: search (name, note, number), filter chips (todas, con nombre,
  sin nombre, en vigilancia), a responsive grid (2–6 columns from a 150 px
  tile), a merge mode (tap the person to keep, then the ones to fold into it)
  and the retention control (7/15/30/45/60 days, the server allows 1–60).
- **Detail**: the face, visits, first and last seen and the visit pattern
  ("Suele venir los martes hacia las 10:00"); a form for name, type (chips,
  watchlist warns it alerts at once) and note; the saved faces, with select →
  "Separar en otra persona" and per-face delete; the visit timeline with the
  camera names from the cached camera list.
- **Zone editor**: a fourth zone type, "Máscara de privacidad", drawn like the
  others, with a hint, and shown on the live overlay as an opaque dark polygon
  (`PRIVACY_MASK_COLOR`). The camera blanks it out of every analysis frame and
  stored picture.
- **Seguridad**: an Owner's expanded episode can be kept as an incident for
  120 days (`POST /guard/episodes/{id}/retain`), the rest expire after 30; the
  `watchlist` reason reads "en tu lista de vigilancia".

## Lists that end only when the data does (2026-10-05, INFINITE)

David asked for long lists that never show their end until there really is
nothing more, that paint local data at once and load more as you scroll, and
for one reusable piece instead of a copy per screen. The layering stays the
one in rule 12: services own every query, cursor and fetch; hooks hold the
window, the end detection and the loading/error state; components render.

### The pieces

- **Keyset paging in the service base.** `DatabaseService.observeKeysetPage`
  and `nextKeysetWindow` (`core/services/database.service.ts`, clauses in
  `core/services/paging/keyset.ts`) page a local query over a stable order:
  the sort column, then `id` as the tie-break. A window is either the first
  page (`take(pageSize + 1)`, so `hasMore` is known without a count) or
  "everything up to the cursor" (`keysetThrough`) plus a one-row probe beyond
  it (`keysetAfter`). The window is held by a cursor value, never a row count.
  A row synced in above the cursor joins the window, and nothing the user is
  looking at drops off the bottom. There is no offset/skip anywhere.
  `tests/unit/infinite-paging.test.ts` runs the real clauses through
  WatermelonDB's matcher. It covers both orders, every pivot, ties broken by
  id, page-by-page traversal across equal timestamps, and inserts while a
  window is open.
- **Paged views in the coordinator.** A windowed list is still a view-cache
  projection, so MMKV keeps painting the first frame. `PagedView`
  (`core/services/view-cache/paged-view.ts`) holds one window per scope. It
  opens the projection, reopens it on `extend`, counts watchers, and on the
  last release shrinks a warm scope back to its first page (so MMKV holds one
  page, not everything ever scrolled) or closes a cold one. The coordinator
  exposes `watchPages` / `extendPages` / `releasePages`. Watch requests made
  before a session starts are replayed when it does. Two views use it today:
  `notification.feed` (keyset) and `calendar.agenda` (a span of weeks).
- **Remote feeds.** `RemoteFeed` (`core/services/paging/remote-feed.ts`) is
  the same idea for server-only lists. It stores `{rows, next}` in the view
  cache per scope. `refresh` re-reads the head and keeps the pages already
  scrolled (and their cursor) unless the head says there is nothing more,
  which drops a stale tail. `loadMore` is single-flight, appends, dedupes by
  key and re-sorts. A page that brings nothing new ends the feed instead of
  looping. `focus(scope)` keeps only the current scope and the pinned ones in
  MMKV, so a search does not leave one cache entry per keystroke.
  `mutateAll` applies an optimistic edit to every cached scope and returns
  its undo. Pure merges (`mergeHead`, `mergeTail`) are unit-tested.
- **One hook file** (`shared/hooks/use-infinite-list.ts`):
  `useInfiniteList({count, hasMore, loadMore, endAfter})` is the state
  machine: in flight, failed and retry, and it settles only once the rows
  actually arrive, so one scroll never fires two pages. `usePagedView` and
  `useRemoteFeed` adapt the two sources. The footer decision is the pure
  `infiniteFooter` (`shared/libs/infinite-list.ts`): `loading` while more may
  exist, `error` with a retry after a failed page, and `end` only when the
  source is exhausted and the list is long enough for an end marker to mean
  something (`endAfter`).
- **`InfiniteList`** (`shared/components/ui/infinite-list.tsx`, replacing
  `VirtualList`) wraps LegendList. It renders only what is visible. The footer
  shows skeleton rows while more may exist, an error with "Reintentar", or the
  end line ("No hay más", or the screen's own `endLabel`). It fills its parent
  by default, or takes its natural height up to `maxHeight` for a list inside
  a panel on a phone. It accepts columns, a header and a custom skeleton.
  Rows are not recycled unless the caller says they are stateless (`recycle`),
  because a recycled episode or notification card would carry another row's
  expanded state.

### Traps found on the desktop

- `flex: 1` is `flex-basis: 0%`, and in a column whose height is not definite
  the browser falls back to the content size: the list grew to its content
  and the page scrolled instead of the panel. Every fill chain uses a definite
  zero basis (`basis-0`, `flexBasis: 0`), the same fix the zones panel had.
- LegendList fires `onEndReached` once and then gates it until the user
  scrolls out of the zone, and on web it never calls `onContentSizeChange`.
  A list whose new page still does not fill the viewport would have waited
  forever. `InfiniteList` listens to the list's own `isNearEnd` state and
  re-checks it whenever a load settles.
- A capped list sized from the first content estimate clipped real rows that
  were taller. Capped lists use `maxHeight` and keep their natural height.
- LegendList pads every column of a grid by half the gap and never
  compensates, so a multi-column list is wrapped in a view that bleeds the
  gap back. A page-level grid moves its web scrollbar gutter into the page
  margin.

### What each list does now

- **Novedades** (home): the notification feed, 40 at a time, grouped into
  threads over the loaded window. It fills the aside on wide screens and is
  capped on a phone. The same projection writes the dashboard's top 40 and
  the unread count, so the separate notifications query is gone.
- **Lo que ha pasado** (Vigilancia and each environment): the guard episode
  feed, 30 per page with the server's `nextBefore`. The server cursor is a
  strict `last_seen < before` in seconds, so the client asks for
  `before + 1`: it overlaps by one second and dedupes, and an episode sharing
  the boundary second is never skipped. The panel fills the column (the
  expanded layout now fills the screen) and is capped on a phone. The old
  "Ver N más" button and its badge are gone. The badge counted episodes to
  review while the button counted hidden ones, so they disagreed. The count
  to review stays in the hero.
- **Zones** (camera detail): all of the camera's zones are already in the
  camera snapshot, so this is virtualization only, no paging. The list fills
  the column on wide layouts and is capped at 440 on a phone.
- **Tasks**: each lane is a virtualized list that fills the board on side-by-
  side layouts (the board fills the screen) and is capped on a phone, with
  "Añadir tarea" pinned below it. The "Terminadas" lane grows forever, which
  is why this was worth doing. A scrolling lane clips a row dragged out of
  it, so dragging now lifts a ghost into a board-level layer (`TaskGhostLayer`)
  while the original row is hidden. The ghost's origin comes from the gesture
  itself (`absoluteX - x`), and its width from the row's layout.
- **Projects** (aside): the in-memory project list, capped at 420 so many
  projects scroll above "Próximas fechas" instead of stretching the column.
- **Personas vistas** (gallery): a server-paged grid (60 per page) with the
  filter and the search on the server (identity's keyset `GET /visitor`).
  While a new search or filter is on its way, the cached first page is
  filtered locally so the grid never goes blank, and typing is debounced
  (250 ms). The preview row in People reads the same feed's first page.
- **Agenda list**: the agenda feed starts at the anchor day for five weeks
  and grows by four as you scroll. It ends ("No hay nada más previsto") when
  no event, reminder or due task exists after the window, so an empty future
  is not an endless list of "Sin planes". The month grid keeps its date
  window and its neighbour months.
- Not paged on purpose: environments, household users, settings, presets and
  the dashboard's counts and top-N. They are small and bounded. The people
  directory moved to `InfiniteList` only because `VirtualList` is gone.


## Backend audit follow-ups: media access, viewer limits, retention, biometric erase (2026-10-05)

The backend audit branch (`claude/argus-backend-audit-l5zqp4`) changed several
contracts the app reads; the app follows them as below.

- **The `/media` socket renews its access in band.** argus-camera re-checks
  every live-view socket and closes it with 1008 `session_expired`,
  `role_changed` or `slow_consumer`. `services/camera-media-session.ts` (the
  session, with its dependencies injected so it is unit-tested against a fake
  socket) watches the access token in the auth store and, while a socket is
  open, sends `{"type":"camera:auth","payload":{"token":…}}` after each
  rotation, at most once per 10.5 s (the server allows one per 10 s; later
  rotations within the window send only the newest token). `camera:auth:ok`
  adopts the token, `camera:auth_error` 429 waits out the window and sends
  again, 400/409 are left alone (the socket keeps playing). A
  `session_expired` close refreshes the token the socket was opened with
  (`refreshSession(failed)`, so a token that already rotated is not rotated
  again) and reconnects at once; a rejected refresh ends the view with
  "Tu sesión terminó". `role_changed` and `slow_consumer` reconnect at once
  without a refresh: the new socket is judged with the new role, so a role
  that lost the camera ends on the subscribe's 403. Two quick reconnects
  without media fall back to the normal backoff. Pure rules:
  `model/media-access.ts`. The renewal itself is one class,
  `services/media-access-renewal.ts`, used by both `/media` users: the live
  view session and the talk line (`services/camera-call-session.ts`, the call
  with injected dependencies; `camera-call.service.ts` only wires them). The
  talk line reopens after `session_expired` (refresh first) or `role_changed`
  while a call or a held push-to-talk wants it, at most twice before
  `camera:talk:ready`, and a rejected refresh ends the call as
  "Tu sesión terminó".
- **Notices.** `CameraLiveNotice` (`camera-disabled`, `viewers-total`,
  `viewers-camera`, `viewers-user`, `session-ended`) travels beside the stream
  state (`onNotice`) and replaces the placeholder copy while there is no
  picture. `camera:subscribe` 409 is a disabled camera (final, no retries); a
  429 `too_many_viewers[_for_camera]` keeps the busy retry and names the
  limit. A WebRTC offer refused with `too_many_viewers*` keeps the reason
  (`rtcRefusalReason`), announces it and falls back to the WebSocket; the
  notice clears once a picture plays.
- **Connection test and edits.** `POST /camera/probe` answers 422 when stored
  passwords would be used against another address and 429 while a test runs;
  the test step words both (`probeRefusalOf`). Because `PATCH /camera` with a
  new `ip` and no password clears both passwords, the edit form keeps the
  stored address (`storedIp`/`storedPort`) and, when the address changes,
  requires the password again and the cloud password (Tapo), with a note
  explaining why (`credentialsToRetype`). "Esta cámara no usa contraseña" (and
  "No usar la contraseña de la cuenta Tapo") opt out explicitly: the field
  stays empty and the save clears the stored password; the connection test,
  which cannot tell an intended empty password from "use the stored one",
  then says it cannot check the new address and lets the user continue. A 500
  "could not be encrypted" is renamed `CAMERA_SECRET_NOT_SEALED` and gets its
  own toast copy.
- **Retention.** The details step has "Conservar evidencias (días)" (new
  cameras start at 30) and "Hay un incidente documentado": 0-60 days, 0-120
  with the incident; clearing the incident brings a longer value back to 60,
  as the server does. The flag lives in the camera's `config` and is projected
  as `retentionIncident`.
- **Guard and Guest camera rows** arrive without address or user
  (`ip ""`, `port 0`, `config "{}"`): `cameraAddressLabel` hides the address
  row and the header drops the empty IP.
- **Biometric erase** (Owner, in the per-user access dialog of `/users`):
  `DELETE /user/{id}/biometrics` behind a danger confirmation that says the
  person stays and can sign in by QR until they register their face again;
  the button shows progress (not optimistic) and the toast gives the counts.
  The voice directory cache drops the person at once.
- **Calls.** `POST /rtc/token` 429 (two calls per user) and an unanswerable
  `RTC_UNAVAILABLE` have their own call-screen copy; an outgoing call still
  falls back to the `/sync` PCM path on 503.
- **Sync during shutdown.** A `<type>_error` 503 rejects the pending request
  and the sync retries with backoff (`retriesSyncFailure`: everything but 401).

## First-run welcome and selectable modules (2026-10-05, WELCOME)

David asked for a first-run welcome that is warm, clear, concise and very
attractive, data-driven steppers for a new Owner and for invited people, and
module selection with hardware limits, dependencies and real install
progress that survives leaving the app. Backend contract:
`backend/docs/history/plans/modules-and-welcome-plan.md` (argus-settings is
the module manager; `/modules` REST; `/sync` operation 12 `module_update`).

### What the research changed

- **Short, skippable, one idea per screen.** Current onboarding guidance
  (Apple's HIG summaries, Appcues, NN/g) converges on 3–7 steps with visible
  progress and only the steps that need a decision; teaching happens later
  and in context (progressive onboarding). So the flows stay at five and four
  steps, the module and "meet Argus" steps are skippable, and what the user
  learns afterwards lives in a getting-started checklist on Inicio rather
  than in more welcome screens. Checklists measurably lift completion
  (Hotjar's segmented checklist, +26 %), and each module brings its own
  first steps from the catalog.
- **Lead with the privacy promise.** Local-first security brands (eufy's
  "your data stays on your device") put local processing in the first
  sentence; Argus's promise card on the welcome says "Todo se queda en tu
  casa" with the concrete what (cameras, voice, face, on your server).
- **Long waits.** NN/g: show percent done for anything over ~10 s, never let
  the bar go backwards, give time remaining generously, let long work run in
  the background and announce completion. Hence: a determinate bar with
  percent, MB of MB, speed and a rounded ETA ("unos 7 min"), a merge that
  never decreases progress within a job, installs that run on the server
  while the flow continues, and a toast plus the server's notification when
  a job ends or fails. Pause, resume and cancel are always next to the bar.
- Sources: nngroup.com/articles/progress-indicators,
  nngroup.com/articles/designing-for-waits-and-interruptions,
  smashingmagazine.com (animated progress indicators),
  appcues.com/blog/mobile-onboarding-best-practices,
  eufy.com/privacy-commitment, home-assistant.io/getting-started/integration.

### The welcome

- The hero is a mascot drawn in code (`features/auth/components/welcome-mascot/`:
  body, eyes, props, figure, orbit chip and track as views and code paths — no
  image assets): it greets with a hello bubble, dresses itself (hat and lens),
  then tours its three module chips — Seguridad (escudo), Productividad and the
  coming-soon Agronomía — leaning in to inspect each one before settling into
  the orbit. The whole play is data (`welcome-choreography.ts` steps) run by
  one timer book that keeps only live handles, so a screen left open stays
  bounded; `use-frame-budget` measures the first frames and rests the mascot
  when the phone cannot hold the animation, and reduce motion starts at that
  same rest pose (hat on, lens up, every chip revealed). The screen sizes the
  stage from the room the copy leaves (its height measured with `onLayout`,
  the side layout from the window width). No glows: fills and borders only, in
  both themes.
- Known follow-up, deferred at the demo freeze (2026-10-10): one `accessible`
  stage in `welcome-hero.tsx` hides the module chips, the hello bubble and the
  unlabeled replay from screen readers; the frontend pass takes it.
- Copy: "Hola, soy Argus", one line of what it does, the promise card (lock
  tile + "Todo se queda en tu casa" + what stays), one primary "Comenzar",
  "Tengo una invitación" on phones, and the network requirement. Staged
  `BlurReveal` entrances as before. Phones stack hero over text; landscape
  tablets (≥ 900) and desktops put the hero left and the text right.

### Flows as data

`features/auth/model/onboarding-flow.ts` (unit-tested in
`tests/unit/onboarding-flow.test.ts`). The pairing, invitation, privacy,
face, modules and call screens ask it for the next route and render
`OnboardingSteps flow step`, which now shows the segments (done, current
wider in arena, upcoming) and "Paso 4 de 5 · Módulos". The face step
continues to `modules` for an Owner and to `meet` for an invited person; the
entry gate's "server without an owner" redirect is the step after `pair`.
The desktop sees only `pair`, so no stepper there. The old
`ONBOARDING_STEPS` constant is gone.

### Modules

- **State.** `ModuleEngine` (`core/services/modules/`) keeps the catalog in
  the view cache (`modules.catalog`, per user), so every screen paints the
  last answer at once. It refetches on start, on every socket reconnect and
  when the app returns to the foreground, applies `module_update` frames
  (a full module, or `{modules:[{id,enabled}]}` for the enabled set, ignored
  while `settled:false`), and polls `GET /modules` every 3 s only while a job
  runs and the socket is down. A 404 marks the server as not offering
  modules: the step and the settings page say so and nothing is hidden.
- **Monotonic progress.** For one job id, `bytesDone` and `progress` only
  grow; a job the app saw `done` is not reopened by an older answer;
  failures and cancellations are taken as the server says.
- **Choosing.** Cards show icon, name, one-line value, the size still to
  download (or "Sin descargas"), the hardware verdict ("Tu servidor lo mueve
  bien" / "Funcionará, pero más despacio" / "Tu servidor no alcanza…") with
  its reasons worded from codes (or shown as given when the server already
  sends a sentence), requirements that are still off, and badges (Incluido,
  Activo, Recomendado, Próximamente). Recommended modules (verdict ok) start
  selected. Selecting a module selects what it needs ("Lo necesita
  Informes, así que también se instala"), deselecting drops what needs it.
  The footer sums the bytes, shows the free disk (red when it would not fit
  with 10 % headroom, which also disables the button) and says the install
  continues on the server. "Instalar y continuar" queues one install per
  module in dependency order and moves on; refusals are named in a toast and
  retried from Configuración.
- **Settings › Modules** (`/settings/modules`, Owner; reached from a summary
  card at the top of Configuración and from the home chip): the same cards
  with live progress and their actions — Pausar/Cancelar while installing,
  Reanudar, Reintentar on failure (with a human message per reason code),
  and the lifecycle actions below. Wide
  windows add "Tu servidor" (free disk, memory each module asks for) and
  "Cómo funciona". Provisioned components show the server command to run.
- **Inicio.** `ModulesProgressChip` (Owner, while a job runs, is paused or
  failed; opens Settings › Modules) and `GettingStartedCard` (the enabled
  modules' first steps plus "Elige qué hará Argus" while only the core is
  on; a tap marks a step done and opens its route; "Ocultar" hides the
  current items, and new items of a module enabled later bring it back).
  State per user in storage (`app.modules.getting-started.<userId>`).
- **Gating.** Cameras, Seguridad and visitors belong to `surveillance`;
  Agenda and Proyectos to `productivity`. Disabled modules disappear from
  the nav, the compose button, the home sections (activity card, cameras
  aside, guard card, Hoy, proyectos, the response strip) and the people
  page's visitors; their routes redirect home; their synced rows stay.

### Lifecycle: disable, uninstall, purge, reinstall (owner requirement, spec 8cceef29)

- **Four states, said plainly**: "No instalado", "Activo", "Desactivado ·
  tus datos se conservan" (hint: it comes back at once, no downloads) and
  "Desinstalado · tus datos se conservan" (hint: reinstall and your data
  comes back, also shown on the welcome cards). An older server without
  `lifecycle` is read as active / disabled (files present) / not installed.
- **Actions** (`lifecycleButtons`): active → Desactivar, Desinstalar;
  disabled → Activar (the install route, instant), Desinstalar;
  uninstalled with data → Reinstalar, Borrar mis datos; not installed →
  Instalar. `POST /modules/{id}/release` is gone.
- **Uninstall.** Refused locally before asking for `core`, a module an
  enabled one requires ("Primero desactiva Informes…", the same words for a
  server `MODULE_REQUIRED_BY`) and a running job. The app asks `GET
  /modules/{id}/data`: nothing held → one confirmation; data held (or the
  answer failed, so it errs on keeping) → a dialog listing it ("3 cámaras,
  128 eventos, 2,1 GB de evidencias y archivos") with "Conservar mis datos"
  selected and "Borrar también mis datos" beside it. Choosing to delete
  shows that it is irreversible, asks for the module name typed (case,
  accents and outer spaces ignored). The request goes without a PIN; only
  when the server answers 403 `PIN_REQUIRED` does the shared PIN prompt
  open, and the request is repeated with `{pin}` (`PIN_INVALID`: "Ese
  código no es correcto", ask again; 429 `PIN_LOCKED`: wait). An Owner
  without a code confirms with the typed name alone; the app no longer asks
  `/guard/safety`, which belongs to the surveillance module. The purge is a
  server job (`kind: purge`; uninstalls are `kind: uninstall`) with its own
  wording ("Borrando tus datos", "Datos borrados"), and Reintentar repeats
  the kind that failed.
- **Local purge.** `dataPurgedAt` newer than this device's stamp → drop the
  module's WatermelonDB tables, forget their sync cursors and pull them
  again (rows created after a reinstall come back; purged ones do not). A
  device offline during the purge does it on its next `GET /modules`.
  Every role receives `dataPurgedAt` and `lifecycle` (non-owners in the
  brief list `[{id, name, enabled, lifecycle, dataPurgedAt}]`, and purge
  updates reach every socket as a module or enabled-set frame), and a merge
  never lowers a stamp, so every device drops the purged tables.
- **Re-enable re-pulls.** While a module is off the server skips its tables
  in the audit pulls, but the audit cursor is one watermark for every table
  and keeps advancing, so an edit made in that window would never reach the
  device. When a module goes from off to on (a `module_update` frame, a
  context, or a cached catalog that last saw it off), `ModuleEngine` drops
  that module's local tables and their cursors and pulls them again from
  zero, the same path as the local purge. The rows come back in their
  current state, so no diff from the window is needed, and the shared audit
  watermark carries on from there. A module seen for the first time already
  enabled is a bootstrap and re-pulls nothing
  (`tests/unit/core/services/sync/module-reenable-window.test.ts`).

### Aligned with argus-settings' final shapes (services/settings/CONTEXT.md, "Modules")

- Uninstall body `{keepData, pin?}`; jobs `{id, kind, state, progress,
  bytesDone, bytesTotal, bytesPerSecond, etaSeconds, reason, owner}` with
  the states `removing` ("Liberando espacio") and `purging` ("Borrando tus
  datos"); `freeDiskMb` may be null (shown as "—"). The four owner failures
  name the part of Argus involved (`ownerName`: camera → "Las cámaras", vlm
  → "La visión", stt → "El oído de Argus", tts → "La voz de Argus", llm →
  "El asistente", …; an unknown owner reads "Una parte de Argus").
- `GET /modules/{id}/data` owners carry `reachable`/`reported`; any owner
  that did not answer makes the uninstall offer the keep/delete choice, so
  data is never assumed absent.
- A component with `source: provisioned`, reported, not `installed`, shows
  "Una parte se instala en el servidor" with its `hostCommand` selectable
  and, where the WebView has a clipboard, a Copiar button
  (`HostCommandNote`). Only the Owner's catalog carries components.
- `/modules` is served by argus-settings, so `ARGUS_DEFAULT_ROUTE_PORTS`
  gains `modules: 7045` (the route-baseline mirror test caught it).

### What a module holds, in words

`dataSummary` (`model/module-lifecycle.ts`) words every kind
`GET /modules/{id}/data` reports, plural-aware in es and en, summed across
owners (evidence photos come from both camera and guard): cameras, zones,
evidence photos, camera actions, environments, recorded visits, saved
incidents, surveillance decisions, expected guests, people seen, saved
visitor faces, visitor passes, projects, tasks, project members, calendar
events, shared events and the change history (owner `sync`, "El historial
de cambios"). An unknown kind becomes "N elementos", listed last. `bytes`
counts database rows only, so it reads "aprox. 2,1 GB en la base de datos"
and is omitted at 0. The dialog also says that personal-safety history
(panic, duress), codes and reminders are always kept.

### Pending

- `GET /modules` (owner, resident and guest recordings) and
  `GET /modules/{id}/data` (the Owner's answer for `productivity`) are in
  `HTTP_CONTRACTS` and checked against backend
  `scripts/fixtures/http/settings.json`.
- The `POST /modules/{id}/{install,pause,resume,cancel,disable,uninstall}`
  actions stay out of `HTTP_CONTRACTS` on purpose: they change the server's
  state, so recording a success would make the goldens depend on the order
  they run in. Their answers are parsed by `moduleActionResultSchema` and
  covered by `tests/unit/modules-contract.test.ts` with documented shapes.
- `tests/unit/wire-vocabulary.test.ts` (`ModuleUpdate = 12`, the `/modules`
  port) and `tests/unit/modules-contract.test.ts` (`MODULE_API_PREFIXES`
  against `kModuleRoutes`) pass against the committed backend.
- Hardware reason and job failure codes are the ones argus-settings
  confirmed (board, 22:20): hardware `ram_below_minimum`,
  `ram_below_recommended`, `disk_insufficient`, `cpu_feature_missing`,
  `gpu_missing`; jobs `hardware_insufficient`, `host_only`,
  `health_check_failed`, `dependency_failed`, `owner_unreachable`,
  `interrupted`, `disk_full`, `network`, `source_unavailable`,
  `checksum_mismatch`. A code the app does not know reads as a calm generic
  line. Enabled-set frames may carry a `version`; an older one than the
  last applied is dropped.

## Live context, capabilities and roles that grow (2026-10-06, CONTEXT wave)

Backend plan: `backend/docs/history/plans/context-roles-tools-quality-plan.md`.
The app stopped reading modules over HTTP and stopped guessing what a person
may do; both come from the socket, and the app only hides what the server
already refuses.

### The context

- `InitialInfo.info.context` (and `ContextUpdate`, operation 13, whenever the
  role, a module or a capability changes) carries `{userId, role, roleActive,
  capabilities[], roles[{id, module, active}], modules[{id, name{es,en},
  summary{es,en}, intro{es,en}, roles[], enabled, lifecycle, dataPurgedAt}],
  ownerCatalog?}`. `readContext` is tolerant (an `id` for `userId`, a `context`
  wrapper, an absent `roleActive` reads as active so a missing flag never locks
  anyone out); an unknown role reads as `role: null` and is granted nothing.
- `ContextEngine` caches it per user (`app.context`) and the cache survives a
  context resync (`viewCacheService.clear(ACCESS_CACHE_KEYS)`), because a role
  change makes the server send the context and the resync wipe in an order the
  app cannot rely on. A frame for another user, a malformed one or one older
  than the last `version` is ignored. A 403 `MODULE_DISABLED` turns that module
  off locally until the server's frame arrives.
- **A context that names another role requests the same resync the role-change
  frame does** (R17's client half). The server's `AuthContextChanged{resync}` is
  best effort: when that call fails, the 60 s revalidation still applies the new
  role and sends the context alone, and without this leg the app would keep the
  old role's routes and a projection built for the old role. `onContextUpdate`
  in `synchronize.service.ts` reads the context of operation 13 (and of
  `InitialInfo`'s wrapper) through `contextRoleChange`
  (`core/services/sync/context-role-change.ts`, pure and unit-tested), stores the
  role with `updateUser` and then resyncs - once per change, because the store
  is written before the resync, so a repeated frame finds no difference and a
  frame for another user, an unknown role or a context with no role is not a
  change at all.
- `GET /modules`, its focus refetch and its 3 s poll are gone (the 404
  "server without modules" state with them). Progress for the Owner still
  arrives as `ModuleUpdate`; actions stay HTTP. Names and summaries keep both
  languages in `ModuleRecord.texts` and are resolved at read time, so a
  language change needs no frame.
- Before any context exists only the core shows (`coreCapabilities(role)`,
  a pinned copy of the baseline), and `EntryGate` holds the splash for up to
  3 s on a module route so a deep link is not lost to a context that is
  about to arrive.

### Capabilities

- `useCapabilities()` replaces `usePermissions`, `people-access` and the
  per-role guard and camera helpers. The vocabulary is `CAPABILITY`, pinned
  to the backend table by `capability-contract.test.ts`, which also pins every
  role x module grant and the core fallback, so a capability added or moved in
  the backend fails here.
- Panic (`safety.panic`), `safety.read` and `safety.respond` are baseline
  (the backend moved `safety.read` from surveillance to core): panic is always
  on the profile and on the inactive-role screen. Duress and codes need `safety.duress` and the module.
  `reminders.read/write` are baseline for every role and mean the person's own
  rows only (another user's reminder answers 404, no Owner override), so the app
  offers no view of other people's reminders.
- Call: the in-call context (camera names, guard situation, today's agenda)
  and the assistant's actions follow `camera.view`, `guard.read`,
  `agenda.read`, `guard.mode.set`; `app.open` accepts the `notifications` screen
  (backend `e433e571`: arguments `{screen: "notifications"}`, a `module` key is
  ignored; it opens Inicio at `/?panel=notifications`, which opens the bell's
  panel once and then clears the param so back and a reload never reopen it
  (`panelRequestOf` decides, `useNotificationPanel` clears it with
  `router.setParams`, `NotificationPopover` opens through its trigger ref after
  a frame); it follows `notifications.read`, so every role gets it, an
  inactive one included. Only the decision and the route are tested; the ref
  wiring (the trigger ref reaching the bell through React 19's ref prop) and
  the one-frame delay before the panel opens have no test, because the project
  has no component renderer and no emulator may run, so where the panel lands
  on a freshly mounted Inicio is unverified) and the new `modules` screen
  (`?module=<id>` focuses a module and opens its data screen when it is
  uninstalled with data kept) and `app.show_camera` accepts `view: snapshot`
  (a still instead of live video). `/call` needs `assistant.voice`, or
  `calls.join` when it answers a call.
- Which module a notification kind, a settings owner, a privacy signal or a
  call trigger belongs to is data in the app (`notification-modules.ts`,
  `settings-modules.ts`, `PRIVACY_SIGNAL_MODULE`, `TRIGGER_MODULES`). The
  kind map is one constant, `NOTIFICATION_KIND_MODULES`, and
  `tests/unit/notification-kind-contract.test.ts` reads the backend's
  `services/notification/src/shared/vocabulary/notification-kind.hxx` and fails
  when the two differ: seven kinds belong to a module (six to surveillance,
  `agenda_event` to productivity) and every other kind, `agenda_reminder` and
  `guard_duress` included, is core, so the feed hides only the kinds of an
  inactive module and reminders and duress alerts are always shown.
  `assistant_task` (the result of a request the assistant kept while a module
  was off: type and kind `assistant_task`, data `{kind, commandId}`, title and
  body already in the user's language) is core too and is a plain text row: it
  has no `threadKey`, so each one is its own thread, and no action. A row of a
  type or kind this build does not know renders the same way (bell, the
  row's own title and body); nothing in the feed switches on `type`
  (`tests/unit/notification-threads.test.ts`). The
  privacy flag `applicable` is read when the server sends it and derived from
  the active modules otherwise; stored choices are never changed by it.

### The inactive role

A role whose module is off keeps its account and the server grants it the
baseline only. Inicio becomes `features/access`' screen: the shared `OrbitHero`
(the ring the welcome used before the mascot, with the module's icon and a
moon), "Tu rol
de Guardia se activará cuando la casa vuelva a usar Vigilancia", panic, the
person's own reminders (the same `RemindersSection` as Inicio: read, complete,
edit, delete, owner decision), a request to the Owner, the profile and
sign-out. Everything on it is gated by a baseline capability
(`inactiveRoleOffers(view, inactive)`: `reminders.read` shows the section,
`reminders.write` makes it editable, `safety.panic`, `modules.request`), and
the backend keeps all four for an inactive role (`roleGranted` lets a mask with
the baseline bit through while its module is core, which is always enabled).
Nothing module-bound is offered, and the tabs, compose button and call route
close.

### Alerts raised for the user, whatever the role or module state

Answering a raised alert (acknowledge, "voy en camino", resolve, the
`guard_response` verdict, `GET /guard/safety`) is scoped to the recipient, not
to the role: the server returns 404 to anyone the alert was not delivered to,
and the backend keeps those routes reachable with surveillance off and for an
inactive role (`safety.respond`, `safety.read` and `safety.panic` are core
baseline capabilities, `kCoreRoutes` holds `POST /guard/panic` and
`GET /guard/safety`). The app therefore gates the alert strip by
`safety.respond` and by the existence of an alert addressed to the user
(`alertsFor(view, responses, now)`), never by `guard.read` or a role check: it
is on Inicio and, first thing, on the inactive-role screen. `/call` for a role
whose module is off follows `calls.join` (`routeFallback`), so the call an
alert rings can be answered; the call screen still asks `assistant.voice` for
a call the user starts. A live camera in an alert card needs `camera.view`.
`guard_panic` and `guard_duress` kinds are core, so their notifications are
always visible.

### Reminders on Inicio

`features/reminders`: pending first and overdue marked, done ones folded,
create, edit, complete and delete (undo toast) through `/reminder`, optimistic.
The projection `reminder.list` is core and never gated. The agenda keeps
showing reminders with productivity; Inicio's Today no longer repeats them.

### Impact, requests, invitations and the activity

- `DisableDialog` and the uninstall dialog start from `GET
  /modules/{id}/impact` (what stops, who holds the role, invitations revoked,
  data kept). Reassignment is sent as `reassign` and `MODULE_ROLES_HELD`
  reopens the preview. The envelope reader keeps the list form of `errors`.
  `impact.keepsRunning = [{id, text: {es, en}}]` (the same for disable and
  uninstall; surveillance says that panic and duress alerts already raised keep
  going until someone attends them) is shown as "Sigue funcionando" from the
  JSON in both dialogs, in the app's language with the other as fallback, and
  no sentence of it is written in the app. A missing or malformed field reads
  as nothing to keep. `impact.unreachable` (the owners that did not answer)
  shows a "this preview may be incomplete" notice in both dialogs, so a partial
  preview is never presented as complete.
- Verified against the committed backend (settings `f809d687`, identity
  `bd8e71ff`, notification `2b547bb5`, `response-module-impact-dto.cc`,
  `module-engine-impact.cc`, `uninstall-module-dto.cc`): the impact answer
  (`stops` in the module's `effects` order with `count` null when no owner
  reported it, `roleEffect` none/inactive/reassign_required, `refusal` MODULE_CORE,
  MODULE_REQUIRED_BY or MODULE_JOB_RUNNING), `reassign` as `{ "<userId>": "<role>" }`
  with no Owner role, the 409 `MODULE_ROLES_HELD` list (`ROLE_HOLDER`
  `<userId>:<role>` per holder), the request answer `{moduleId, requested: true,
  duplicate}` and its refusals (409 `MODULE_COMING_SOON`, `MODULE_JOB_RUNNING`
  shown as "it is being installed", `CONFLICT` already on, 503), the Owner's
  `module_request` notification (type and kind `module_request`, data `moduleId`,
  `requestedByName`, `action: enable_module`; the Enable button posts the
  install; the kind is core, `kModuleKinds` has no request kind), the 410
  `INVITATION_MODULE_DISABLED` list (`MODULE_ID` entry) on resolve and
  register, the invitation rows' `revokedReason`/`revokedModule`, the privacy
  `applicable` object on `GET /privacy/me` and `/privacy/users`, and
  `GET /sync/activity` (module, userId, action, from, to in seconds, limit up
  to 200, cursor, items and `nextCursor`).
- Activity sentences (`features/activity/model/activity-text.ts`, R19b
  2026-10-12): productivity now journals every create, update and delete of
  projects, tasks, memberships, events, shares and reminders, each with who,
  kind, table, record and time and no content. A shared project, task or event
  may carry its `title` in `newData`, and only then does the line name it ("Ana
  creó el proyecto «Mudanza»", `screens.activity.named.*`); any other table, or
  a title that is not text, falls back to the generic thing, so the client never
  shows more than the server's allowlist lets through.
- Goldens (backend `b6cf00ce`, `592a205d`): every route above is recorded and
  checked field by field in `tests/unit/http-contract.test.ts`: the impact
  answers (surveillance disable and uninstall, one with a real holder and a
  pending invitation, productivity disable, the refused core), the request 200
  and its 409s, the uninstall 409 `MODULE_ROLES_HELD` (a list, which
  `envelopeSchema` now accepts) and the 202 (the bare job with `roleMoves`),
  `GET /sync/activity`, the privacy `applicable`, `PATCH /user/{id}` with
  `roleActive`, the module-revoked invitation row and the reminder rows, which
  carry every field the sync mapper reads. The test fails if a reader drops an
  item of any list. Not recorded: `POST /invitation/resolve` 410 (needs the
  paired flag in the sandbox; verified in code) and request 409
  `MODULE_JOB_RUNNING`.
- People an uninstall already moved (backend `e8f34ba1`): the roles are
  persisted before the job exists and never rolled back. The job carries
  `roleMoves [{userId, name, from, to}]` and, when it failed or was cancelled,
  `roleMovesNote {es, en}`, a sentence the card and the failure toast show as
  written (`roleMovesNoteOf`, the app's language first); the impact carries
  `roleMoves` too (the moves of an unfinished uninstall) and the dialogs list
  them under "Ya cambiaron de rol". Both are read tolerantly (absent reads as
  none) and nothing offers to undo them.
- Role pickers (supervisor decision): invitations list an off module's roles
  disabled with "needs X, which is off" and explain a 409 `ROLE_INACTIVE`;
  role change lists them selectable, after the active ones, and says the role
  will be on hold. An invitation closed by a module shows its reason to the
  inviter and, through 410 `INVITATION_MODULE_DISABLED`, to the invitee.
- Requests: any non-Owner asks (`modules.request`) once a day per module; the
  Owner's `module_request` notification offers "Activar X" (POST install).
- Activity (`/settings/activity`, Owner): period presets and a custom range,
  module, person and action filters, keyset paging with the cursor the server
  returns, sentences built from `{table, action, module, newData.event}`.

### Welcome order (final, accepted by the owner)

Owner: `pair -> privacy (notice, face consent and core signals, surveillance sent off) ->
face -> modules -> module-privacy (only the signals of the modules chosen,
second PUT /privacy/me) -> meet`. Consent stays before the biometric step
(Ley 29733); the second step drops out, and its count, when no chosen module
has signals. Invited: unchanged, all four signals, privacy before the face.

### Local plumbing

- Database version 9 adds `user_invitation.revoked_reason/revoked_module`
  (migration tested on a version 8 database). The typed-routes file
  `.expo/types/router.d.ts` is generated and ignored; the routes added here
  (`/welcome/module-privacy`, `/settings/activity`) were added to it by hand in
  this tree and a dev server regenerates them.
- `shared/components/ui/orbit-hero.tsx` and `brand-mark.tsx` serve the
  inactive-role screen; the welcome left the ring for the mascot on
  2026-10-10.

### Navigation names its destination (2026-10-07, order from David)

A navigation entry opens a view, never a form: the compose "+" menu, the home
cards and every other cross-screen shortcut say where they go and push that
route alone. An explicit create control inside its own screen (the "+" of
Agenda, Proyectos and Cámaras, a board create tile, a form title) keeps
opening its form, and the edit entries (`?edit=`, `?task=` from the entry
menus) keep opening the form of the row the user tapped.

- `COMPOSE_ACTIONS` (`shared/constants/dashboard.constant.ts`) carries plain
  destinations (`/agenda`, `/projects`, `/cameras`, `/call`).
  `SCREEN_TITLE_KEYS` is the one source of the three destination titles — the
  Agenda, Proyectos and Cámaras screens render it as their own header, the nav
  labels Agenda and Proyectos with it, and the Inicio shortcuts that name a
  destination read it too (the projects empty-state action, the free-hour cell
  of Hoy, the camera-activity card) — and `COMPOSE_ACTION_LABEL_KEYS` names each
  compose entry with the key of the screen its route opens
  (`screens.agenda.schedule`, `screens.projects.title`, `screens.cameras.title`;
  `voice` keeps `screens.home.talk`).
  `tests/unit/shared/constants/compose-actions.test.ts` pins that: no route
  carries a query, and each entry's label key is the `SCREEN_TITLE_KEYS` key of
  the screen at its route slug, so a header rename cannot leave the "+" naming
  another screen.
- The Inicio projects grid has no trailing create tile: a "+" always means
  create, and the section header's "Ver todos" already opens `/projects`.
- Inicio follows the same rule: the free-hour cell of Hoy opens the agenda
  (`TodayAgenda` prop `onOpenAgenda`, the label is the agenda title), the
  projects card and its empty-state action open `/projects` named "Proyectos".
- `?new=` is gone: no route produces it and the agenda, projects and cameras
  screens no longer read it. `?at=` stays, because
  `calendarEntryEditHref` still sends `/agenda?edit=<id>&at=<startsAt>` so an
  event opens on the day it happens.

### The compose menu belongs to the route (2026-10-07, U10 fix)

The compose FAB is one instance owned above the navigator
(`GlobalBottomNav` in the root layout, `NavRail` in `AppShell`), so its local
`open` state used to survive every navigation: leaving a screen with the menu
open carried the menu — and its "x" — into the next screen, where nothing was
open. `ComposeFab` now reads `usePathname()` and renders the menu component
keyed by the pathname, so a route change unmounts the menu and its state and
the arrived screen always mounts the closed glyph ('plus'). The spring still
plays for an in-screen open/close; a navigation always cuts it, which is the
point ("never leave a frozen mid-spring"). On the web build the morph cannot
paint at all — `react-native-svg`'s `WebShape.setNativeProps` drops the incoming
`d` (it merges only `props.style`) — so there the glyph only ever changes on a
mount, which is exactly what the route key guarantees; the web morph paints
again since the U12 fix (next section).

### The morph paints on the web again (2026-10-07, U12 fix)

`react-native-svg`'s web `WebShape.setNativeProps` merges only `this.props`,
`lastMergedProps` and `props.style`, so the `d` a caller passes is never part of
the merged props: every frame of the morph repainted the mount-time path (U10's probe recorded
94 such writes on open, all byte-identical to the plus; the U12 pre-fix re-run recorded 47–48
per open/close, again all identical).
The web build could therefore change the glyph only on a mount. The wrapper is
now platform-split under its own folder (`shared/components/ui/morph-icon/`, the
`index.ts` barrel in front of the pair — the alias `@/…/morph-icon` needs a
module without a platform suffix to resolve, and eslint's import resolver does
not apply `.native`/`.web`; that missing barrel is the cause the lint failure
named, "Unable to resolve path to module '@/shared/components/ui/morph-icon'",
until it existed, and the pair imports each other relatively):
`morph-icon.native.tsx` is the morphicons React Native component, byte-identical
to the old shared file; `morph-icon.web.tsx` renders `Svg`/`Path` with the `d` of
React state and drives it with `morphicons/dom`'s `createMorph`
(`morph-icon-driver.ts`) over a sink that writes through the state setter — one
re-render per animation frame instead of `setNativeProps`. The driver drops a
value identical to the one already painted, so the mount write is a no-op, and a
reduced-motion snap (`reducedMotion="user"` reads `prefers-reduced-motion`,
`"always"` always snaps) lands in a single paint with no frames in between. The
web wrapper's imperative `morphTo` falls back to the `spring` prop through
`springRef`, as the native library does, so a ref call without a spring is not
`snappy` on web while it is `smooth` on native. Rejected alternative: morphicons'
own DOM renderer (`morphicons/react`) on web, which would have swapped
react-native-svg for a raw `<svg>` in the web tree (a different DOM and a11y
shape from every other icon in the app) to spare the per-frame re-render. The
behaviour is pinned by
`tests/unit/shared/components/ui/morph-icon/morph-icon-driver.test.ts`: the
driver must paint many distinct paths into the callback and settle on the
target's canonical `d`, must snap under reduced motion, and must let `set` cancel
a flight in progress. The wrapper itself is covered in that file only by a source
scan (it renders `d` from React state and never calls `setNativeProps`); this repo
has no DOM component harness, so the wrapper's runtime behaviour is left to the
committed e2e suite (U5).

### The paired address heals itself (2026-10-07, the 7024 face-login finding)

A device can carry a stored pairing whose route ports are stale (the emulator held
`routes.auth = 7024`, the retired gateway, and the face login dialled it). `portFor`
(`core/services/net/net-routes.ts`) reads `instance.routes[segment] ?? ARGUS_DEFAULT_ROUTE_PORTS`
`[segment] ?? instance.port`, so only the stored routes can carry a dead port: neither QR
carries one (the login QR is just the challenge id) and the defaults say auth 7042.

What the code does about it now:

- A refused request or socket open runs one rediscovery. When the announcement carries a
  different port for a segment, `relocatedInstance` merges — announced values win, and a
  segment the announcement merely omits keeps its stored port — and the write is committed only
  after `/pairing/status` answers over the stored CA (`holdsPairedCa`). The request and the
  socket are then retried at the refreshed port (`urlAt` rewrites the port of the caller's URL,
  keeping its scheme, host and path, and only for a segment the route table names: a segment it
  does not name — an external or relay URL — is left exactly as the caller built it, and the
  first attempt is never rewritten at all, only the retry after a rediscovery); the http layer
  repeats the same heal for a transport failure that proves the connection was never
  established (`addressUnreachable`), which is what covers the Tauri transport.
- A rediscovery that just failed is not repeated for `REDISCOVERY_MEMO_MS` (10 s), so a server
  that is simply off pays one discovery timeout before "the server is out of reach", not two.
- Residual exposure: the identity check proves the server, not the announcement's honesty, so
  an announced *wrong* port would still be adopted; an omitted one no longer is.

### The heal answers a connect timeout, and only a proven connect failure (2026-10-12, the demo-night network move)

The desktop kept keyring `argus:net.ip` on the old LAN address after the laptop changed
networks, and every request failed with "Could not prepare access." The heal chain was already
complete — `refreshAddress()` → `argus_relocate`, where Rust probes the candidate under the
pinned CA and `trust::relocate` writes `net.ip`, then the request retried with the trust
re-read — but it opened only for a failure classified `NETWORK_ERROR`. A stale address on a
network that drops the SYN rather than refusing or unrouting it produces a *connect timeout*
instead, and the desktop labelled every timeout `TIMEOUT`, so nothing rediscovered, the keyring
stayed stale and the failure repeated.

The gate now opens only on a failure that proves the connection was never established: a retry
may re-send a non-idempotent request, so a read or response timeout — the server may have
executed it — must never redial. Each transport reports that rule:

- desktop (`src-tauri/src/net/http.rs`): `is_timeout() && !is_connect()` is `TIMEOUT`; a connect
  failure, its own timeout included, is `NETWORK_ERROR`; certificate failures keep their code.
- Android (`modules/argus-net` Kotlin): a `SocketTimeoutException` is `TIMEOUT` — OkHttp's read
  timeout; its 4.12 jar ships no connect-timeout class and wraps connect failures as
  `ConnectException("Failed to connect…")`, which is a `NETWORK_ERROR` — and everything else
  keeps `NETWORK_ERROR`. The classification now covers the strict path too, which used to let
  the raw `IOException` through to the keyword fallback.
- iOS (`modules/argus-net` Swift): `NSURLErrorTimedOut` is `TIMEOUT` — URLSession cannot tell a
  connect timeout from a read timeout, so a timeout never heals there — and everything else
  keeps `NETWORK_ERROR`.

`addressUnreachable` (`net-routes.ts`) is the one predicate the gates read, and it names only
`NETWORK_ERROR`. The trigger is still wider than c127611's, so the desktop's `refreshAddress()`
keeps the memo and single-flight the native service always had (`mayRediscover`): a server that
is merely off costs one discovery per window, not one per request. Pinned by
`net-routes.test.ts` (the code table), `http-service.test.ts` (a read timeout is reported once,
unretried), `net-web.test.ts` and `net-native.test.ts` (a refused connection relocates and
retries, a read timeout and a certificate refusal do not, single-flight, both memo paths), and
`http.rs`'s own tests over loopback (a refused connection is `NETWORK_ERROR`; an answer that
never arrives is `TIMEOUT`).

Residual, named rather than fixed: a failure that is neither connect-phase nor a timeout — a
connection reset or a truncated body after the request was written — still reads
`NETWORK_ERROR` on all three transports, so it can still heal and re-send. That predates this
change, since the heal has matched `NETWORK_ERROR` from the start, and closing it means a
distinct code (`NetErrorCode`, the `net-persistence` list and `service-error.ts` together),
recorded here for whenever the plan wants it.

### The bundle probe: what chromium checks and Bun and Hermes do not (2026-10-12, H5)

A frontend unit headed for the desktop is accepted only after its exported bundle renders in a
real browser. `scripts/probe-web-bundle.ts` (`bun run check:bundle`, the last step of `verify`)
exports the bundle through `web:build`, serves `dist/` with the CSP **read** from
`src-tauri/tauri.conf.json` — one `Content-Security-Policy` header on every response, the way
the Tauri webview applies it, never a copy that can drift — loads `/` in `/usr/bin/chromium`
through playwright-core, and fails on three things: the root never renders, the root shows
expo-router's error boundary ("Something went wrong"), or a console error or page error fires
that the allowlist does not name. The allowlist is empty and an entry added later states its
reason in the code, so the gate never silences a class of message silently.

It exists because that class of bug is invisible to every other gate: `clock.setTimeout(...)`
invoked as a method threw `TypeError: Illegal invocation` in browsers and WebKit while Hermes
tolerated it, so Android painted while the desktop window stopped at the error boundary
(`e0e2abd` fixed it, and no gate could have caught it). Proven by reintroducing that line: the
probe exits 1 naming the boundary and the `Object.after` page error, and returns to 0 once it is
reverted, with the root's own text in the passing line ("Hi, I am Argus …"). Wall time on this
machine is about 7 s (a warm export ~3 s, the probe ~3 s), so it rides `verify` without a named
opt-out. `ARGUS_CHROMIUM` overrides the browser path; a missing one fails the probe rather than
skipping it. The static server binds `127.0.0.1` only, resolves every target under `dist/` and
refuses by construction anything outside it, and answers 404 for a missing file instead of
handing `Bun.file` a path that does not exist (a `Response` built from one throws, which served
as a 500). Residual: the probe renders the unpaired first screen (the welcome hero) only, so a
crash that needs a paired session — behind login, behind a role, behind a module — is not
exercised; extending it to a mocked paired session (mockIPC-style) is a candidate for the
frontend quality programme.

The probe also reads the welcome hero's accessibility tree (Q2 of the plan's section 6,
2026-10-12): the stage used to be one `role="image"` element, which hid the unlabeled replay
button inside it while the speech bubble still leaked through on the web. Now the mascot's
`Pressable` is the one accessible element (a button named by `screens.welcome.hero-label`, with
`hero-replay-hint`), and the ground, the orbit tracks, the chips and the bubble are `aria-hidden`
decoration whose content the label already says. The probe fails unless exactly one button carries
that label and neither the chips' "coming soon" nor the bubble's greeting reaches the tree.

### Resource changes: the client side (2026-10-12, the real-time plan's 2.2)

`ResourceChanged` (operation 14) is the one frame for state a screen re-reads
over HTTP. Its payload is `{domain, scope, ids?}`; `readResourceNotice`
(`core/services/sync/resource-signal.ts`) accepts only a pair this build knows
— `RESOURCE_DOMAINS` and `RESOURCE_SCOPES` in
`shared/constants/resource.constant.ts`, mirrored from
`packages/contracts/sync/src/sync/resource-change.hxx` and pinned by
`tests/contracts/resource-contract.test.ts` — so a newer server's frame is
ignored rather than misread.

`bindResourceSignal` (`core/services/sync/resource-signal-binding.ts`, started
once by `sessionService.startAccess` beside the other engines) subscribes the
frame through `synchronizeService.on` — the router already fans every
operation out to its subscribers, which is how `ResponseUpdate` is consumed —
and the connection's disconnect/connect pair as well. `createResourceSignal`
coalesces per domain and scope on a trailing edge (`RESOURCE_COALESCE_MS`,
300 ms), so a burst of frames — an episode touched many times, a module job —
costs one reload per device, and `createReloadGate` keeps at most one reload
of a hook in flight and turns anything arriving during it into exactly one
follow-up.

`useRemoteResource` takes `resources` — the `ResourceMatch` pairs (`{domain,
scope?, id?}`) the answer depends on, a pair without a scope matching the whole
domain and a pair with an `id` answering only a notice that names it or names
no ids at all (the scope-wide notice a purge sends) — and reloads when a notice
matches one of them; `useRemoteFeed` takes
the same as its fourth argument. Both also reload
when the socket reconnects after a disconnect — the frame is never replayed,
so reconnect is the catch-up — and not on the first connect, which would only
double the mount's own load. A hook that declares no resources is untouched. The
signal module is deliberately free of engine imports (the binding carries
those), so a screen that only wants the signal does not pull the sync engine
into its bundle. `tests/unit/core/services/sync/resource-signal.test.ts` and
`resource-signal-binding.test.ts` pin the coalescer against a fake clock, the
reload gate, the read of a frame, and both reconnect cases.

The clock the coalescer schedules with is guarded twice, because this failure
mode has reached a commit twice. The call site destructures the injected clock
and calls it as a plain function, the way `e0e2abd` fixed the welcome timers
(`const { setTimeout: schedule } = clock`), and the default clock hands over an
arrow that calls the global as a plain function as well. The structural guard
of record lives in `eslint.config.js`: a `no-restricted-syntax` rule fails any
member call of `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`,
`requestAnimationFrame` or `cancelAnimationFrame` whose object is not
`globalThis` or `window`, so the shape that threw `TypeError: Illegal
invocation` in WebKit and chromium cannot come back through a gate that only
runs bun, which does not enforce `this` on timers.
`tests/unit/core/services/sync/resource-clock.test.ts` runs the production
default clock under a global `setTimeout` that throws exactly like a browser
when it is called as a member, and `resource-signal.test.ts` pins the coalescer
over an injected fake. The shipped bundle is **not** exercised on this path:
no `ResourceChanged` frame reaches the unpaired welcome screen the chromium
probe renders, and dispatching one through the real signal in the page would
need a debug hook the shipped bundle must not carry. The lint rule, not the
probe, is the guard of record here, named so this residual is never mistaken
for coverage.

### Reconnect on the app's own terms (2026-10-12, R22 and R24 of 2.4)

The sync layer had no foreground and no network listener, so a socket that died
while the app was suspended waited out the backoff (up to 30 s, and a timer
frozen by the suspension resumes stale). `watchReconnectOpportunities`
(`core/services/sync/sync-reconnect-watch.ts`, installed once from
`synchronizeService.bind`) fires when AppState turns active — on the web that
is the visibility transition — and on the browser's `online` event, and calls
`synchronizeService.retryNow()`: the pending backoff is cancelled, the attempt
counter reset, `connect()` re-entered, and a catch-up sync requested, so a
device that missed frames while suspended converges at once. What keeps that
from opening a second socket is the one decision `connectGate` owns: an open
socket is reused, an attempt in flight is joined, a clearing session is
refused, and only an idle connection opens — pinned by
`tests/unit/core/services/sync/sync-connect-gate.test.ts`, with the watch's two
triggers and its idempotence pinned beside it. The desktop needs nothing on the
Rust side for this: the same AppState transition drives it.

R24 rides the same signal the frames do: the reconnect reload now fires for
every enabled mounted hook, resources or none, so the session hooks (through
`useRemoteResource`) and `use-responses` catch up without a second mechanism.
`use-responses` subscribes `resourceSignal.onReconnected` itself because it
keeps its own store instead of a view-cache key, so its refresh is one line
against the same signal.

### One network source, and the leak it removed (2026-10-12, U5b)

The first cut of the watch hand-rolled `window.addEventListener('online', ...)`
beside AppState, and stored the call's return value in a variable it then
tested: what the DOM's `addEventListener` returns is `undefined`, the test
never passed, and the cleanup never removed the listener — so after a logout
and a login a second one stacked. The gate kept it harmless, but a guard that
reads as if it works is worse than none. The hand-rolled listener is gone:
`expo-network` is the one network source on every platform, including the web,
where its shim re-emits `navigator.onLine` changes through the same
subscription, and what cleanup calls is that subscription's own `remove()`.
`expo-network` is installed through `bunx expo install` so its version tracks
SDK 57, and it is the reason the Android dev client has to be rebuilt once.

The rule it implements is the plan's: fire when the network becomes reachable
after it was not, and ignore repeats of the same state, so the 30 s the backoff
climbs to while a phone has no network is not paid again when the network
returns. Reachability keys on `isConnected` **alone**: Argus is local, so a home
whose WAN is down — or a LAN that never had internet at all — has the server
perfectly reachable while `isInternetReachable` reports false, and keying on it
would leave the watch silent exactly when it matters. A change of interface type
while connected (Wi-Fi to cellular, Wi-Fi to ethernet) counts as a return too,
because a new interface means the old socket is very likely dead; an emission
that carries no type is not a change. `getNetworkStateAsync()` seeds the
previous state and type at install, because an app that launched while offline
would otherwise never see its network return. The same once-only `watching`
guard covers AppState, the network subscription and a second install, and the
tests mock `expo-network` to pin the offline → online edge, the repeats, the
seeded install, a local network with no internet at all, an interface change, and
the cleanup (`tests/unit/core/services/sync/sync-reconnect-watch.test.ts`). The
on-device Wi-Fi-toggle timing measurement needs a reachable backend and is
pending; it rides the first two-device session, together with the rest of
section 0's acceptance tests.

## Testing (2026-10-12)

**A test that touches a service pulls its transport, and the transport has a
bun landmine.** `src/core/services/net/index.ts` re-exports `'./net'`, which
resolves only through tsconfig `moduleSuffixes` (`net.native.ts` /
`net.web.ts`) — and bun does not support `moduleSuffixes` yet (it says so on
every run). A test file that imports the safety service, or anything through
the `@/core/services/http` barrel, therefore drags in the real net barrel and
fails with `Cannot find module './net'`, or worse with a misattributed
`Export named 'httpService' not found in module .../http/index.ts` when a
dependent module links against the half-loaded barrel. It is order-dependent:
the file is green alone and red in the full suite, so it is easy to blame the
wrong thing. The house pattern is to mock the net layer —
`mock.module('@/core/services/net', () => ({ netService: { instance, refreshAddress, request } }))`,
exactly as `tests/unit/core/services/http/http-service.test.ts` does (it also
registers the http auth bridge with `registerHttpAuth`) — and mocking the http
barrel or injecting a transport into the service are both worse: the first
replaces every export of the barrel for the whole run, the second adds a seam
that exists only for tests. The durable answer, when a rule can be separated
from its transport, is to put the rule in a leaf module: `safety-memo.ts` holds
the PIN memo's rule and imports nothing but types and the signal, so its suite
needs no mock at all.

**A partial mock fixes a module's names for the rest of the run.** bun keeps the
export names of a specifier's first `mock.module`. A later file that imports a name
that mock left out fails to link with `Export named '…' not found`, and mocking the
module again with that name does not bring it back. Two suites did this
(2026-10-13):
- `optimistic-action.test.ts` mocked the http barrel with `newIdempotencyKey`
  alone, so the duress phrase suite, which bun runs after it, could not import
  `httpService`;
- the phrase suite mocked `resource-signal` with `resourceSignal` alone, so the
  `resource-clock`, `resource-signal` and `resource-signal-binding` suites could not
  import their factories.

Both now mock the net layer only, the house pattern above. The net barrel is safe to
mock because bun cannot load the real one anyway. bun's file order is not
alphabetical, so a leak like this shows only in `bun run test`, never in the file
alone.

**Tests that read the backend find it through one root.** Nine suites pin the
app to backend files: the wire vocabulary, the role-access, capability, resource,
modules and notification-kind contracts, the recorded HTTP fixtures, the privacy
notice and the recurrence fixture. `tests/support/backend-dir.ts` resolves the
root:
- `ARGUS_BACKEND_DIR` when it is set;
- otherwise the backend beside this frontend checkout (`../backend`).

A checkout with no backend beside it, such as a worktree, sets the variable:
`ARGUS_BACKEND_DIR=/path/to/backend bun run test`. When neither root
exists, every one of those suites fails with the same message naming the variable,
never with an `ENOENT` or a silent skip. A suite that skips because one file is
missing (an older backend without `capability.hxx`) still skips. The recurrence
suite keeps its own `ARGUS_RECURRENCE_FIXTURE`, which overrides the path to the
fixture file alone.

### End-to-end: two devices against a scripted Argus (2026-10-12, section 6 item 2)

`bun run test:e2e` (and the tail of `bun run verify`, which reuses the bundle the
probe just exported) runs `tests/e2e/` with tester-army's `e2e` runner and its
`@e2e-dev/web` engine, pinned exactly (`e2e@0.19.0`, `@e2e-dev/web@0.14.0`). The
pieces:

- **The app is the exported web bundle, signed in.** `support/tauri-shim.ts` is
  an init script that plays the Tauri IPC the desktop build speaks
  (`__TAURI_INTERNALS__`): secure storage lives in the context's `localStorage`,
  seeded once per device with a paired instance and an Owner session
  (`support/seed.ts`); `argus_request` becomes a same-origin `fetch` to
  `/__api<path>`, and `argus_socket_*` a WebSocket to `/__sync?device=<id>`, with
  the open, text, binary and close frames the real socket channel delivers.
- **Argus is scripted.** `support/serve.ts` (Bun) binds `127.0.0.1` on the port
  the runner allocates, serves `dist/`, and runs `support/fake-argus.ts`:
  `InitialInfo` with an Owner context (core and productivity), the `sync` pull
  with created-row cursors, empty audit watermarks, `POST /project` that stores
  the row and pushes the `Add` to every socket, and a 404 envelope for anything
  else. `/__e2e/*` is the test's control: drop a device's sockets, refuse its
  reconnects for a while, count its sockets, read the stored rows. Nothing
  reaches a real Argus service, and both devices abort and record every request
  that is not to `127.0.0.1` (the test asserts there were none).
- **Two devices.** The engine's `browser` is device A; the `second` fixture
  (`support/devices.ts`) opens device B as another context in the same Chromium,
  which `support/chromium.ts` starts from `/usr/bin/chromium` (or
  `ARGUS_CHROMIUM`) and hands to the engine over CDP, so the engine never
  downloads a browser.
- **The section-0 test** (`two-device.e2e.ts`): a project created through A's
  form appears in B's list within 2 s; with B hidden (page visibility) and its
  socket dropped while the change is made, it appears within 2 s of B coming
  back to the foreground; and after a reconnect that missed the change (B dropped
  and refused for 3 s), it appears within 2 s of B being connected again.
  Mutations that each break one link fail it: no live `Add` from the server fails
  the first leg, a client without the foreground reconnect (R22) fails the
  second, and a server whose pull returns nothing fails the catch-up.
- **No model, no telemetry.** The tests have no agent steps, so no model is
  configured. Telemetry is off three ways: `E2E_TELEMETRY_DISABLED=1` and
  `DO_NOT_TRACK=1` in the scripts, and `e2e telemetry disable` on this machine.
  The package's other network code is the PostHog telemetry client (off), the
  OAuth and model providers an agent step would use (none here), the readiness
  probe of the app URL (loopback) and the Playwright browser download, which the
  CDP connection avoids.
- **The section-2 flows** (item 3, each two-device, each with the mutation that
  fails it): `sessions.e2e.ts` (a session closed on A ends B at once and A's list
  updates; no `AuthContextChanged` frame fails it), `people.e2e.ts` (a member
  enrolled elsewhere appears on both People screens; the person row travels with
  it, though no screen reads the `person` table yet), `activity.e2e.ts` (A's
  project reaches B's activity history), `modules.e2e.ts` (productivity turned off
  on A leaves B's projects and agenda at once; an edit made to a project while it
  was off is on B after it comes back, which only the R26 re-pull delivers: the
  client without it fails), `guard.e2e.ts` (the mode chosen on A is B's mode; an
  episode a camera opens reaches both), `safety.e2e.ts` (codes created on A are
  known to B, so B asks for them), `presence.e2e.ts` (who is home changes on both
  People screens). Silencing `ResourceChanged` fails activity, mode, episodes,
  codes and presence; silencing `Add`, `AuthContextChanged`, `ModuleUpdate` and
  `ContextUpdate` fails people, sessions and modules. The fake answers each test
  from `RouteSpec`s (`/__e2e/routes`: an answer per method, path and device, the
  answers it replaces, the frames it pushes and the module flags it flips), and
  `/__e2e/reset` clears it before every test.
- **Critical screens** (item 4, one device each): `welcome.e2e.ts` (an unpaired
  desktop greets with exactly one labeled hero button, which replays, and Get
  started leads to the pairing step whose Continue waits for a code),
  `inactive-role.e2e.ts` (a guard whose module is off sees the on-hold home with
  what still works, the panic button among it, and reaches the profile),
  `response.e2e.ts` (an alert raised for the user sits on Home with its two
  answers; a false alarm is confirmed, sent and clears the card),
  `module-dialogs.e2e.ts` (uninstalling a module that holds data lists what it
  keeps, keeps it by default, and deletes it only once the module's name is typed
  - case and outer spaces ignored - sending `{keepData: false}`).
- **Visual regression** (item 6, `visual.e2e.ts`): Home, Projects and Security
  (populated: an environment, an episode, an alert, a project) and the welcome,
  each at phone (390x844), tablet (834x1112) and desktop (1280x800) width,
  compared with the PNGs committed in `tests/e2e/visual.e2e.ts-snapshots/`
  (named `<screen>-<width>-<os>-<arch>-chromium<major>-desktop-web-<os>.png`:
  each set belongs to one platform's Chromium and fonts; this machine's
  `linux-x64-chromium153` set is the reference). A platform with no set of its
  own skips the six tests with a message naming the command that records one, so
  `verify` stays green there; a platform that has a set and lacks one image
  fails, as it should. Determinism: a fixed clock (`support/clock.ts`), the
  browser started in `America/Lima`, `en-US`, reduced motion and no font
  hinting, the pointer parked away from tooltips, and the welcome's animated
  mascot masked. Tolerance is 40 pixels: three clean runs in a row pass, and a
  one-word label change on Home (239 pixels) fails. When a screen changes on
  purpose, or on a new platform, `bun run test:e2e:update-screens` rebuilds the
  bundle and writes this platform's set; look at each image before committing it.
- A module that is off vanishes from every screen live, not only from the
  navigation (2026-10-13): `hasCapability` grants a capability only while the
  module it belongs to is active in the context (`CAPABILITY_MODULE`, the client
  mirror of `capability.hxx`'s modules, pinned by the capability contract test).
  The server already drops a module's capabilities from the `ContextUpdate` it
  sends when the module goes off; the client no longer depends on that arriving
  with the same frame, so Home's Today and Projects sections leave on B as soon as
  the context says the module is off (`modules.e2e.ts`, which fails without the
  gate).
- **Accessibility** (item 5, `accessibility.e2e.ts`, read from Chromium's own
  accessibility tree over CDP - `support/accessibility.ts` - because Playwright's
  aria snapshot does not descend into these portalled dialogs, while the
  browser's tree, which is what a screen reader reads, does). Two checks: the
  project dialog names every field by its visible label, and on Home, Projects,
  Security, an environment, People, Profile, Settings, Activity and Modules every
  control has a name and no two different controls share one (radios in
  different groups and the two "New project" buttons, which do the same thing,
  excepted). What they found and what changed:
  - form fields were named by their placeholder or not at all: `FormControl` now
    hands its child `aria-labelledby` the visible `FormLabel` (plus
    `aria-describedby` and `aria-invalid` while the field has an error), and
    `SelectField` inside a form item speaks "Status: Active";
  - the hidden phone tab bar stayed in the tree and the tab order on desktop
    (every navigation button twice): `GlobalBottomNav` renders nothing where the
    navigation rail is used, and is `aria-hidden` whenever it is hidden;
  - repeated, ambiguous names: the module cards' actions say which module
    ("Turn off: Productivity"), a lane's add button says which lane ("Add task to
    To do"), Home's section links say which section ("See all: Today"), and the
    search field's filter button, which had no action and was announced as
    "See all", is gone until a filter exists.

### Device checklist (section 6 item 7, Q3; needs real phones, not run by agents)

What the web harness and the unit suites cannot prove, to be walked on hardware
before a release that touches these areas. Each line is pass/fail with the device,
OS version and build noted.

1. **Camera live audio, Android and iOS.** Open a camera with a microphone in
   Cámaras; audio stays off until the explicit toggle; turning it on plays within
   2 s with no echo from the phone's own speaker; muting and leaving the screen
   stop it; a backgrounded app releases the audio session.
2. **Camera live view over WebRTC, both phones, on Wi-Fi and on mobile data
   through the tunnel.** First frame within 3 s on the LAN; the WebSocket fallback
   takes over when WebRTC is blocked (deny UDP on the router) and the badge says
   so; quality switch main/sub and the stall fallback work; fullscreen rotates.
3. **Calls with Argus over WebRTC** from both phones: the call connects, the
   in-call camera card shows, and hanging up releases the microphone (the OS
   indicator goes off).
4. **The QR sheet with the keyboard open.** On a small Android phone and on an
   iPhone with the software keyboard up, the cross-device QR login sheet and the
   invitation sheet keep their QR and their primary button visible; the sheet
   scrolls rather than covering the input; dismissing the keyboard restores it.
5. **The iOS build of the camera media module** (`modules/`): a clean
   `expo prebuild` and a device build succeed, the live view and talk work on an
   iPhone, and the app does not crash when camera permission is denied.
6. **Screen readers on the welcome hero** (Q2): TalkBack and VoiceOver reach one
   element, the mascot button, read its label and hint, and a double tap replays
   the greeting; the chips and the bubble are not reachable.
7. **Two-device check on hardware** (section 0): phone and desktop side by side,
   same account, the change on one appears on the other within 2 s, after a
   background/foreground cycle of the phone, and after airplane mode on and off.
8. **Recording playback, the optional FLAC upgrade** (argus-recorder design note, fork 3). Only when
   FLAC is switched on as the recorder's audio codec: an fMP4 HLS clip with FLAC audio plays on
   Android (ExoPlayer / Media3), iOS (AVPlayer), the desktop webview (WebKitGTK) and Chromium. The
   default is AAC-LC at 64 kb/s, mono, which needs no device check. Chromium and WebKitGTK are also
   smoke-checked in the e2e harness for whichever codec ships. If any target fails, FLAC stays off.
9. **Camera live audio on iOS's native player** (F1, 2026-10-13). The native player in
   `modules/argus-camera` (`AVSampleBufferDisplayLayer`) renders no audio. Over the WebSocket, an
   iPhone therefore hears nothing and shows no mute control (`liveAudioPlayable`). Closing this
   needs native work: an audio renderer for the FLAC track that honours `muted`. It also needs an
   iOS build host. Once built, the check is item 1 on an iPhone over the WebSocket transport.

## Session tokens and the secure store (2026-10-16)

- The access token, the refresh token and the device credential live in `expo-secure-store` (`src/core/services/secure-storage/secure-storage.native.ts`). The app passes no options, so Android uses the library defaults (no user authentication required).
- The library deletes an entry it cannot read back and returns `null`: when the keystore key for the entry is missing (the "app reinstalled" branch), or when decryption fails with a bad padding, it removes the entry first. `KeyPermanentlyInvalidatedException` returns `null` without the removal. This is in `node_modules/expo-secure-store/android/.../SecureStoreModule.kt`, and it is the reason a restore can find a session half gone. Our own "never delete on a partial read" rule cannot stop a deletion that happens inside the library.
- We do not mirror the tokens elsewhere (no plaintext copy in MMKV, the file system or the sync cache). A plaintext copy would weaken the session for every user and was rejected. When the library removes an entry, the user signs in again.
- The restore trace names the stored keys that came back empty (`instance`, `access-token`, `refresh-token`, `device-credential`, `user`), never their values. When a restore is partial, the native logcat tag `SecureStoreModule` (the library's own warning, with the key name) says whether the library removed the entry or failed to decrypt it; since the keystore-loss unit the app logs the same warning and the key itself, so one `[session]` line carries both halves.
- A refresh with no token in memory, no paired instance or no answer from the server is `unavailable`. Only a server refusal (`rejected`) may clear the session (`src/core/services/http/refresh-response.ts`: `refreshOutcomeOf`, `mayClearSession`).

## A session lost to the keystore is recovered cleanly (2026-10-16)

- **Android Auto Backup excludes every store whose key lives in the Android Keystore.** `plugins/with-argus-backup-rules.ts` sets `android:fullBackupContent` and `android:dataExtractionRules` to its own `argus_backup_rules.xml` / `argus_data_extraction_rules.xml`, which exclude the `SecureStore` shared preferences (the entries `expo-secure-store` keeps, the name the library's own `SHARED_PREFERENCES_NAME` declares) and `argus_push_keyset_prefs` (the Tink keyset the push module masters with `argus_push_master_key`). A value mastered by a Keystore key cannot be decrypted once that key is gone, so restoring one only produces the library's unreadable-key error. The plugin is listed **before** `expo-secure-store` on purpose: mods run in reverse registration order, so the library applies its own rules first (with no warning) and our mod overwrites them with the rules that also exclude the push keyset. `argus.push.state` stays in the backup: its plain fields (the FCM token, the full-screen flag) are useful and `SecretBox` returns nothing for a sealed value it cannot open, so a restore never raises there.
- **Only the pairing's own MMKV instance travels in the backup.** The file domain carries exactly `mmkv/argus-instance` and its `.crc` companion (MMKV v2.4.1 writes one data file and one `<id>.crc` per instance, `Core/MMKV_IO.h`), never `mmkv/` itself: the shared `argus-storage` instance holds the view caches — cameras, people, activity, module catalogs — and stays on the device, as the local-only rule and the Ley 29733 consent require. expo-secure-store's own rules restrict the backup to shared preferences, so the include has to name the instance explicitly.
- **The pairing lives in a store that survives the key, the session does not.** `src/core/services/instance-storage/` is the pairing's store: on Android it is its **own** MMKV instance, `argus-instance` (never the shared `argus-storage`), on iOS and the desktop the unchanged keychain/keyring (`secureStorageService`). `net-persistence.ts` keeps `net.paired`, the CA PEM, its fingerprint, host, IP, port, instance id, routes and the remote profile there — nothing else, so the one store that reaches Google Drive holds no secret and no household data; the session secrets (`net.accessToken`, `net.refreshToken`, `net.deviceCredential`) stay in `expo-secure-store`. The pairing holds no secret (it is the pin that lets the app reach the instance at all), and it used to die with the keystore key that guards the tokens — the contradiction the unit removes. No secret is mirrored: there is still exactly one copy of the session, in the keystore-bound store. The Android store reads through, once per key, from the shared `argus-storage` an earlier build of this branch could have written and then from the keystore-bound store, deleting each source, so an update keeps the pairing without leaving a second copy behind.
- **When a stored session disappears, the cause is named.** `session-restore.ts` is the pure mapping, and `remembered` is the evidence a session existed before — a remembered user row (`app.session.user`) or a stored device credential. A device that remembers one of the two but whose session secrets came back empty is `vanished` (reason `keystore-lost-<keys>`); a refused read is `unreadable` (reason `securestore-<kind>-<key>`, the kind and the key parsed out of the library's own message); a lost pairing is `unpaired`; an empty store is `fresh`; and everything else still readable is `incomplete` — the reinstall, where only the pairing's own store comes back, and a paired device that never signed in look the same there, both without `remembered`. `session.service.ts` logs one warning per lost key naming the `SecureStoreModule` warning and the key (never a value) and emits one `restore` trace from the report. The read is bounded (`RESTORE_READ_ATTEMPTS`) and ends signed out instead of retrying a value that will never decrypt.
- **Re-entry after a restore is one step.** `EntryGate` asks `restoreEntryOf` (`session-restore.ts`) and sends a **paired** device to `/welcome/face?mode=login&restore=1` when its restore shows a session that existed before: `vanished`, `unreadable` (a refused read, the forced-unreadable-token case), or `incomplete` **with** `remembered`. The face screen shows "Vuelve a entrar con tu rostro" and opens the camera, and no pairing code is asked while the instance trust is intact. Everything else gets the plain first-login copy — an unpaired device, an unknown cause, or a paired device with no evidence of a session (the reinstall, and the device paired but never signed in) — and all of those still open the same face login. The cause is forgotten as soon as a session is established or cleared, so a deliberate sign-out shows the plain login copy.

## A write the server never received is refused, never queued (2026-10-16, the closing plan's Phase 4b)

- **The rule (owner, 2026-10-16).** Away from home with the relay down the app reads its cached data behind the offline notice, retries with exponential backoff (the 2 s → 30 s jittered `backoffDelay` the socket reconnect and the sync retry already share), and **refuses a write with a clear message**: nothing is queued silently and nothing is confirmed that did not happen. The read half already holds — a screen paints its view cache and `TopNoticeBar` carries the route's own words ("Mostrando lo último guardado en este dispositivo") — so the unit adds the write half.
- **What counts as a write.** `serverWrite` (`src/core/services/http/write-refusal.ts`) names the four verbs the app changes server state through: `POST`, `PATCH`, `PUT`, `DELETE`. A `GET` is no write; a read that never left is answered by the local view cache and the offline notice, and is never turned into a write refusal. The app has no outbound queue at all (there is nothing that "syncs later": every change is one HTTP call), which is what makes the refusal the honest answer rather than a policy choice.
- **The two refusals, and why there are two.** `writeRefusal` reads the answer and the code together. An answer from the server (any status above zero) keeps the server's own refusal — the envelope, its code and its copy. A transport failure at status zero is only classified when the code proves what the transport knew: `addressUnreachable` (i.e. `NETWORK_ERROR`, the connection was never established) is **`unsent`**, the change never left the device; `TIMEOUT` (the request left and its answer was lost, which is all three transports can say) is **`unconfirmed`**, so the copy asks the person to look at the value before repeating the action instead of promising it was not saved. A local refusal at status zero — `PAIRING_REQUIRED`, `STORAGE_ERROR`, `CERT_NOT_TRUSTED`, `HOST_NOT_ALLOWED` — is left exactly as it was: its own copy is more specific than either.
- **Where it is decided.** `http.service.ts` applies the rule in `change`, the path behind `post`, `patch`, `put` and `delete`. `get` and `postMultipart` deliberately do not pass through it: the face login and registration screens explain a lost connection in their own words (`faceErrorMessage` reads `NETWORK_ERROR` itself, and both screens drive their own phase), and a login is not a change the person expects to see persisted. Every other write path — `runOptimistic` and `runServiceAction`, the forms, and the call sites that toast `serviceErrorKey` directly — gets the new copy from the shared error vocabulary (`serviceError.ts`: `WRITE_NOT_SENT` → `common.errors.write-not-sent`, `WRITE_UNCONFIRMED` → `common.errors.write-unconfirmed`, es and en) without a line of its own.
- **A retry the person answers, never a background resend.** Both codes are retryable, so `runOptimistic` offers its Retry action, and the retry carries the same idempotency key as the first attempt. That is the only retry: nothing re-sends on its own, and the intent registry holds nothing while the app waits. `tests/unit/core/services/http/write-refusal.test.ts` pins the rule, `http-service.test.ts` pins which verbs pass through it (and that a multipart upload and a read do not), `service-error.test.ts` the copy in both languages plus the retry, and `optimistic-action.test.ts` that a refused write is said aloud and leaves no row behind.
- **Residual, named rather than fixed.** The invitation enrolment (`inviteService.accept`) posts through `netService.requestPinned`, not through the HTTP wrapper, because it must trust the QR's own CA before the pairing is adopted, so a write it loses keeps the generic connection copy its own screen explains. It is the only change path outside the wrapper.

## Argus calls on iOS: PushKit and CallKit, prepared (2026-10-16, the closing plan's Phase 2.4)

**Unverified until a Mac build.** No Xcode, no device and no compiler for Swift exists on this
machine, so nothing below was compiled, run or seen on screen. What was done here is the code,
the config, the JS seam and its tests; the Mac build verifies the rest.

- **The iOS side of `modules/argus-push/` is the mirror of the Android one** (`ios/`:
  `ArgusPush.podspec`, `Bridge.h`, `HybridArgusPush.swift`, `VoipPushRegistry.swift`,
  `PushRouter.swift`, `CallSession.swift`, `PushKeys.swift`, `SealedPushPayload.swift`,
  `SealedPushOpener.swift`, `PushIntent.swift`, `PushStore.swift`, `PushTrace.swift`). The Nitro
  spec now declares `ios: 'swift'` beside `android: 'kotlin'` and `nitro.json` registers
  `HybridArgusPush` for iOS, so `createHybridObject('ArgusPush')` resolves to the Swift class on
  an iPhone and to the Kotlin one on Android, exactly as before. `bunx nitrogen` was run and the
  generated `HybridArgusPushSpec` names every method by the same spelling the Kotlin class
  implements.
- **The sealed payload arrives as three base64 fields.** argus-cloud's APNs VoIP body is
  `{"prefix", "enc", "ct"}` (`src/feature/push/services/apns-message.cc`) — the same envelope the
  FCM leg carries as the single `e` field, split into its prefix and its HPKE output.
  `SealedPushPayload` parses the prefix with the Android bounds (16-byte delivery id, provider 3
  and kind 2 only, priority 0/1, ≤64-byte collapse id, 1…512-byte token, nothing trailing) and
  dedupes on `delivery:<hex>`, `intent:<id>`, `call:<id>` and `cancel:<id>` in `PushStore`, the
  same keys and the same 24-hour window as `DedupRules`.
- **The opener is the Android profile, spelled out.** HPKE base mode, DHKEM(X25519, HKDF-SHA256),
  HKDF-SHA256, ChaCha20-Poly1305, `NitroModules`-free: `SealedPushOpener` implements Extract,
  Expand and the two Labeled* functions over CryptoKit's HMAC/SHA256, builds the info
  `argus.push.v1 ‖ 0x00 ‖ keyId ‖ 0x00 ‖ prefix`, and opens with an empty AAD. The same algorithm
  in TypeScript decrypts all five cases of the tunnel's pinned `push-sealed.json` vectors on this
  machine, which is the only check of the cryptography that exists without a Mac (the vectors'
  recipient private key, `encHex`, `ciphertextHex` and `infoHex` reproduce their `plaintextHex`).
  The two traps the vectors proved: HKDF-Extract over an empty salt is HMAC with 32 zero bytes,
  never a library's "empty salt" shortcut, and the key and base_nonce expand **length-prefixed**
  (32 and 12).
- **The keys are a Keychain item, not a Tink keyset.** `PushKeys` holds one X25519 private key as
  a generic-password item (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`), answers the raw
  32-byte public key and `base64url(SHA-256(publicKey)[0…16])` as `keyId`, discards an item it
  cannot read back, and `deleteKeys` removes it — so `/notification-token` receives
  `{platform: "ios", provider: "apns_voip", publicKey, keyId}` with the same 43/22-character
  shapes the backend validates (`register-notification-token-dto.cc`).
- **A VoIP push becomes a CallKit incoming call.** `VoipPushRegistry` registers `desiredPushTypes
  = [.voIP]` and reports the token; `PushRouter` decrypts the intent and either rings
  (`CXProvider.reportNewIncomingCall`, caller name "Argus", handle = call id) or ends a ringing
  call for a `cancel` intent; the ring expires at the intent's `exp`, reported `.unanswered`.
- **Answer and end are the same JS events the Android module emits.** Answer fulfils the CallKit
  action and opens `argus://call?callId=…&outside=1` (the Android `PushActions.openCall` mirror,
  with `outside=1` when the app was not in the foreground), which the app's existing deep-link
  allow-list and `/call` screen already handle. Ending an answered call from the CallKit UI emits
  `hangup`; the mute control emits `mute-on`/`mute-off`; a route change emits `endpoints`; the app's
  own `setCallMuted`/`stopOngoingCall` stay silent, as on Android. A declined ring reaches the JS
  `onDecline` listener, or waits in the store until `drainDeclines()` — the same two paths the
  Kotlin module has.
- **CallKit owns the AVAudioSession while a call is up.** `provider(_:didActivate:)` sets
  `playAndRecord`/`voiceChat` and activates the session, `didDeactivate` deactivates it, and
  `telecomCallActive()` answers whether an answered CallKit call exists — so `rtc-call.native.ts`
  treats the system call exactly as it treats Android's Telecom call (the assistant's own call is
  registered as an outgoing CallKit call, and for `prepare`/`release` the CallKit session is the
  one that counts). **The LiveKit audio path itself is untouched:** `call-audio.native.ts` still
  selects `SessionCallAudio` on iOS, so the outputs list and the system route picker
  (`AudioSession.showAudioRoutePicker`) stay the ones the call screen has.
- **The JS platform split.** `src/core/services/push/push.ios.ts` is the iOS service and, like
  `push.web.ts`, it is chosen by Metro's platform resolution (`metro-resolver` tries
  `.{platform}{ext}` before `.native{ext}`), so `push.native.ts` — Android — is not loaded on an
  iPhone and `push.web.ts` still answers on the web. The service itself lives in
  `src/core/services/push/ios-push.ts`, takes its native accessor, its registration port (the HTTP
  wrapper), the session status and the language as one options struct, and answers the
  iOS-shaped questions (`isKeyguardLocked`/`overKeyguard` false, `outsideCallId` empty — CallKit
  draws over the lock screen itself — background and full-screen permissions true, the notification
  ones through `expo-notifications`).
- **`UIBackgroundModes` gains `voip`** in `app.config.ts` beside `audio`; no Info.plist is edited
  by hand. The alert leg on iOS stays where it is: alerts ride APNs and
  `UNUserNotificationCenter`, not the VoIP push, so `setAlertListener` exists for the shared spec
  surface and nothing in the Swift module delivers to it.
- **Pins.** `tests/unit/core/services/push/ios-push.test.ts` drives the service with a fake native
  port and pins the seam: the four call-control actions reach the listeners and anything else is
  dropped, a decline is delivered and acknowledged, the registration body is
  `ios`/`apns_voip`/the module's keys, a token rotation registers again, and unpair unregisters
  and deletes. `tests/contracts/push-contract.test.ts` already pins the provider vocabulary
  against the backend's.
- **What the Mac build must prove, in order.** (1) The Swift module compiles and `pod install`
  resolves `ArgusPush` with the regenerated `nitrogen/generated/ios` files; (2) PushKit delivers a
  VoIP push and the CallKit report shows; (3) the ring, the answer opening the call screen, the
  mute control and the hang-up reach `voiceService`'s handlers; (4) the audio flows with CallKit
  holding the session while LiveKit's outputs and route picker still work; (5) a killed app woken
  by a VoIP push still has its registry installed — the registry is created when the module object
  is first used, which the root layout's `usePushListeners()` triggers at JS start, and whether
  that is early enough for a cold launch (or whether an Expo AppDelegate subscriber is needed) is
  a Mac-build question; (6) the provider-side payload key (`prefix`/`enc`/`ct`) against the cloud
  sender.

## The app siren (2026-10-16, F5)

The owner's decision (2026-10-16) follows Arlo and Doro: tapping **Sirena** asks
once, confirming runs a five-second countdown with **Cancelar**, and Detener is
one tap while it sounds. The server side is argus-guard (`POST /guard/siren`;
`services/guard/CONTEXT.md`, "The app siren"); the app owns the countdown.

`features/cameras/model/siren.ts` is the pure flow — a reducer
(`sirenReducer(state, action)`: `ask`, `confirm`, `cancel`, `tick`,
`activated`, `stop`, `close`) over `{phase, secondsLeft, startedAt, until}`
from `core/types/siren.type.ts`, with `SIREN_COUNTDOWN_SECONDS = 5`,
`sirenSecondsLeft`, `sirenSounding` and `sirenRemaining` beside it. Closing the
sheet never silences the siren (`close` keeps `sounding`); `cancel` leaves the
confirmation or the countdown without ever reaching the network; and a tick
that changes no second returns the same state object, so the hook does not
re-render five times a second. `tests/unit/features/cameras/siren.test.ts`
drives the countdown, the cancel and the lease.

`features/cameras/hooks/use-camera-siren.ts` is the seam: it dispatches the
ticks every 200 ms, and when the countdown reaches zero it calls
`cameraControlService.siren({cameraId, enabled: true})` **once** (a ref guards
the activation) and adopts the `until` the server answers, so the app knows
when the camera's own lease turns the siren off. A refused call toasts and
returns to idle. Detener dispatches `stop` at once and sends `enabled: false`
without waiting for the answer — one tap.

`CameraSirenPanel` (camera detail, under the live view) shows the button, and
while it sounds shows the remaining seconds and the Detener button, so Detener
survives closing the sheet; `CameraSirenSheet` is the confirmation, the
countdown ("5" down to "1") and the sounding state. The button appears with
`has(CAPABILITY.cameraSiren)` (the camera action table's `CameraAction::Siren`,
Resident and Guard, mirrored by `cameraActionsOf(view).siren`) and the camera's
own `alarm` capability, which argus-camera maps from the catalog's `Siren`
feature. Nothing else gates it: the owner's `guard.app_siren_enabled` is read
by the server, so a press with the setting off answers 403
`APP_SIREN_DISABLED` and the toast says the owner can enable it
(`common.errors.app-siren-disabled`). The consent text the owner reads before
turning it on is `screens.settings.guard.keys.app_siren_enabled.hint` in both
locales.

The camera persists no `sounding` flag yet (backend R8), so the app's
sounding state is the lease it was answered, per device: a phone that did not
sound it does not know it is sounding.

## Conversations and the messenger (2026-10-19, T4: F8/F9)

Every person talks to Argus in their own conversation, and Argus carries
messages between the people of the house ("dile a David que venga a comer").
The app shows both as one inbox: `/conversations` lists one entry per
counterpart and `/conversations/{counterpartId}` is the thread. The backend
half is argus-llm's messenger and argus-notification's `/conversation`
routes (backend `docs/design/messenger.md`).

### The table

`conversation_message` is a synced table (`TableName::ConversationMessage` on
the wire, additive), own rows only: each person receives only the rows whose
`userId` is theirs. One message has two copies, the sender's (`direction:
'out'`) and the recipient's (`'in'`), joined by `messageKey`; clearing a
thread deletes the viewer's copies and the other person keeps theirs.

| Field | Meaning |
|---|---|
| `counterpartId` | `0` is Argus (the viewer's conversation with Argus and the notices from visitors); `> 0` is another member |
| `counterpartName` | the counterpart's name when the row was made (`""` for Argus) |
| `direction` | `out` said or written by the viewer, `in` received (Argus's replies are `in`) |
| `kind` | `turn` (a line of the conversation with Argus), `relay` (a message carried by Argus), `reply` (an answer to a relay, `replyToKey` names it), `visitor` (a visitor asked for the viewer at a camera) |
| `leg` | where a turn was said: `camera`, `phone`, `laptop`, `null` for messages |
| `state` | the viewer's outgoing relay/reply: `sent`, `delivered` ("Se lo dije"), `notified` ("Le dejé el mensaje"), `answered`, `expired` ("Sin respuesta"); incoming copies are `received`, turns `delivered` |

The state is all a sender learns: nothing in the app says where the recipient
is. Local columns are snake_case (`counterpart_id` is a string like every FK,
`'0'` for Argus), times in milliseconds, `updated_at` with the `0` sentinel;
the vocabulary is sanitized at the mapper (`sanitizeConversation*` in
`tables/sanitizers.ts`: an unknown direction reads `in`, kind `turn`, state
`received`, leg `null`, so an unknown state never claims a delivery). It has
deletions, so it is **not** in `SYNC_TABLES_WITHOUT_DELETIONS`: the pull asks
for creations and tombstones by `(created_at, id)`, live `Add` frames carry the
full row and `Delete` frames `{id, deletedAt}` (a cleared thread, the
retention sweep), and `state`, `isRead`, `readAt` and `updatedAt` arrive as
recipient-scoped user audit diffs, applied by the generic audit path exactly
like notification read state. Nothing in the sync engine is specific to the
table beyond its field map in `entity-mappers.ts`.

The table is core: it belongs to no module, so `ModuleSourceGate` never hides
it, and `role-access.ts` mirrors the backend's `kTableAccess`: every
non-owner role reads, updates (marks read) and deletes (clears) its own rows,
and nobody creates them from the app. The table is in the backend's baseline
and own-row sets, so an inactive role keeps it and no module room carries it.

### The view

`conversation.projection.ts` reads every row of the user
(`conversationService.observeForUser`, `observeWithColumns` on the fields a
diff changes) and writes three things: `conversation.list` (one summary per
counterpart: name, last line, unread incoming count, and `lastSent`, the last
outgoing relay or reply whose state the row shows), `conversation.unread`
(the total, the badge of the Messages button on Inicio) and
`conversation.thread` scoped by counterpart, oldest first, tracked so a
cleared thread's scope is dropped. The list puts Argus first when it has rows
and then the members by their last line. A thread is a bounded list (one
household, and the server's retention removes old rows), written whole up to
`VIEW_CACHE_LIST_LIMIT` with the newest rows kept, so it is not paged.

Screens paint from the view cache only. `GET /conversation` exists
(`conversationService.list`, zod in `core/contracts/conversation.contract.ts`)
as a fallback and no screen calls it.

### The screens

`features/conversations`: the list (`ConversationsScreen`, `ListRow` per
counterpart with the time, an unread count and the delivery state of the last
outgoing message) and the thread (`ConversationThreadScreen`: messages grouped
by day with Hoy/Ayer/date separators, outgoing bubbles on the right, the leg
of a turn under it in micro text, the delivery state under each outgoing relay
or reply, the quoted line a reply answers, a visitor notice marked as such).
There is no composer: messages are sent by voice, so the thread ends in a hint
("Para escribirle, díselo a Argus: «dile a David que…»") with the Hablar con
Argus button when the person has `assistant.voice`.

- Opening a thread marks its unread incoming rows read with
  `PATCH /conversation/{counterpartId}/read` (body `{}`) through
  `runOptimistic` (one `conversation_message` update intent per row, the lens
  in `model/conversation-optimistic.ts`); each id is requested once per open
  thread, so a refused call does not retry in a loop, and the diffs that come
  back settle the intents.
- Clearing asks first (`danger` confirmation that says the other person keeps
  their copy), hides the rows optimistically, sends
  `DELETE /conversation/{counterpartId}`, removes the viewer's local rows of
  that counterpart on 204 (the `Delete` frames that follow are idempotent) and
  goes back to the list.
- Pure helpers, unit-tested in `tests/unit/features/conversations/`:
  `deliveryStateOf` (only outgoing relay/reply, only a delivery state),
  `legOf` (turns only), `groupByDay`, `dayKindOf`, `replyBodies`/
  `repliedBodyOf`, `unreadIncomingIds`, `counterpartNameOf` (Argus by id, a
  blank name reads "Alguien de casa") and `previewOf` ("Tú: …" for the
  viewer's lines). The projection is tested in
  `tests/unit/core/services/view-cache/conversation-projection.test.ts`, the
  sync handling (field map, pull body, live Add/Delete, audit diffs) in
  `tests/unit/core/services/sync/conversation-message-sync.test.ts`, and the
  list and thread end to end in `tests/e2e/conversations.e2e.ts`.

### Reaching it

- `/conversation` is served by argus-notification on its listener, so the
  route table maps the segment to `notification` (`ARGUS_ROUTE_SERVICES`,
  `ARGUS_DEFAULT_ROUTE_PORTS` 7028), the same on the LAN and through the
  relay.
- The capability is `messages.relay` (core, every registered role, in the
  baseline). The Messages button on Inicio and both routes follow it
  (`route-access.ts`: a segment rule, and a baseline segment for a role whose
  module is off, so an inactive role can still open a message it was told
  about).
- A relayed message Argus could not say inside the recipient's open
  conversation also arrives as a `notification` of kind `household_message`
  (`data: {kind, fromUserId, messageKey, counterpartId}`). It renders like any
  notification row; tapping it in Novedades or opening it from a push goes to
  `/conversations/{counterpartId}` (`messageCounterpartOf`,
  `notificationHrefOf`, falling back to `fromUserId`). The deep-link
  allow-list accepts `/conversations` and `/conversations/<digits>`.
- `voice:start` carries the leg the turn is said from: `phone` on the mobile
  app, `laptop` on the desktop and web builds (`voiceLegOf(IS_NATIVE)`, also on
  the resume frame); every other field is unchanged and the server ignores any
  other value. A camera leg is the server's own.
