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
| Local DB | **WatermelonDB 0.28** — `SQLiteAdapter` (JSI) on native, `LokiJSAdapter` (IndexedDB) on web/Tauri; 15 tables mirroring the role-scoped backend sync surface |
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
- **Dark fills sit above the card (2026-10-03).** Dark `surface-secondary`
  was `#25231E`, one unit from `card` `#24231E`, so task rows, badges, icon
  circles, chips and dialog inputs vanished on cards. It is `#312E27`
  (`oklch(0.302 0.013 87.57)`, mirrored by `secondary`/`muted`/`input`): light
  keeps the fill 0.08 L below the card, dark 0.047 L above it. Text on it
  stays AA (foreground 11.8:1, muted-foreground 5.4:1). A card nested in a
  card uses `dark:bg-card-secondary`, since dark cannot show the shadow
  light separates it with.
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
  (`core/services/sync/` + WatermelonDB mappers), view-cache (MMKV snapshots)
  and voice (`voice.service`). Still pending: chat, workspace and settings.
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

- **15 tables** = exactly the backend's sync surface (`SYNC_TABLE_KEYS` in
  `core/types/sync.type.ts`): `user`, `user_invitation`, `camera`,
  `camera_stream`, `zone`, `reminder`, `reminder_detail`, `calendar_event`,
  `calendar_event_share`, `project`, `project_member`, `project_task`,
  `event`, `person`, `notification`. `context_note` has no local table (not
  synced).
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
  net-persistence.ts  → pairing persistence (shared)
src/core/services/secure-storage/   → secrets (caPem, JWT)
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

- **2026-08** — **WatermelonDB implemented** (persistence only; sync still pending).
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
  creation. The coordinator observes the resulting projection and refreshes
  MMKV before the user enters a view.

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
- **Refusals.** `runOptimistic` rolls the intent back and toasts the reason;
  a network, timeout or 5xx refusal carries a Retry action that replays the
  same request (forms close on valid input, so Retry is what keeps the typed
  values from being lost). Deletes of events and tasks are deferred behind an
  Undo toast (6 s, the toast's own lifetime) instead of a confirm dialog;
  project deletion (cascades), user deactivation and invitation revocation
  keep their confirm.
- **Notifications.** Opening the bell marks the previewed items read at once
  (badge clears); the items stay highlighted for that open session so the
  user still sees what was new.
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

### Current validation baseline

On 2026-08-23, `bun run lint`, `bunx tsc --noEmit` and `bun run web:build`
succeeded. `git diff --check` also passed, and a static scan confirmed no
`src/app` route imports WatermelonDB or a direct observable. Device-level
validation still requires a real paired session; do not fabricate people or
camera rows merely to make a screen appear loaded.

## History log — prior docs resync (2026-08-23)

- Documentation-only pass, before the local-first/audit work documented above:
  CONTEXT/AGENTS brought back in
  sync with the code. Corrections: the "Current state" section no longer
  describes the post-reset empty shell — it documents the full route map,
  core services and UI families; WatermelonDB documented
  at its real **15 tables** matching `SYNC_TABLE_KEYS` (this section still
  said 7); networking phases closed (native WS `ArgusSocket` + Tauri socket
  commands, `http.service`, pairing/invite/login QR all shipped); root
  navigation corrected to the actual `fade` crossfade (the doc claimed
  `flip`); orb marked SUPERSEDED by the SVG avatar; Zustand store list
  updated to the real 8 stores; Skia noted as no longer imported in `src/`.
