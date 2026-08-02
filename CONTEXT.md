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
| Routing | Expo Router (file-based, `src/app`) |
| Styling | Tailwind CSS v4 via **Uniwind** (`src/global.css`), `tw-animate-css` |
| UI | React Native Reusables (`@rn-primitives/portal`, `slot`) + custom `button/text/icon` |
| State | Zustand v5 (planned; only `useI18nStore` existed, i18n removed) |
| Storage | `react-native-mmkv` (native) / localStorage (web) via platform-split service |
| Icons | `lucide-react-native` — **centralized** in `icon.constant.ts` only |
| System bars | `react-native-edge-to-edge` (official Expo API, `SystemBars` direct, no wrapper) |
| Package manager | bun (`bun.lock`) |

## Architecture (settled conventions)

- **3 buckets**: `src/app` (routes), `src/core` (infra: services/types/interfaces),
  `src/shared` (UI: components/constants/libs/hooks).
- **Constants** → `src/shared/constants/{domain}.constant.ts` + barrel `index.ts`.
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

- **Design system gallery** at `src/app/index.tsx` (the `/` route): ARGUS header
  + system/light/dark toggle, Typography, Buttons, Status pills, Icons. The color
  swatch dump was removed after visual review.
- **UI primitives**: `button.tsx` (7 variants on semantic tokens: default,
  secondary, outline, ghost, destructive, link, disabled), `text.tsx`
  (typography variants), `icon.tsx` (name-based registry wrapper).
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
  --no-bundler`, then `npm run dev`.

## Backend relationship

- Backend: `/backend` — C++20 + Drogon + SQLite, all AI on-device (face auth,
  LLM, vision, STT/TTS), WebSocket sync on `/sync`, JWT dual secrets.
- Backend conventions live in `backend/AGENTS.md` + `backend/CONTEXT.md`.
- Frontend integration is **not built yet** (no API/WS layer). Next steps:
  `core/services/http/http.service.ts`, auth, sync.

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
