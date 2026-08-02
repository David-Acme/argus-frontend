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
- **Package manager**: **bun** (`bun.lock`). Path alias `@/* → src/*`.

## MUST-FOLLOW Rules

### 1. Folder structure

```
src/
  app/          expo-router pages (file-based routes)
  core/         infra: services, types, interfaces
  shared/       UI: components, constants, libs, hooks
  global.css    Uniwind/Tailwind tokens (source for styling)
```

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

- TypeScript strict. Run `npx tsc --noEmit` before committing — **0 errors**.
- Barrel imports only (`@/shared/constants`, `@/core/types`, `@/core/interfaces`).
- No unused imports (`npm run lint` must be clean).
- Keep design language premium/calm: warm neutrals, grafito actions + arena accent,
  hierarchical radii (sm 14 / md 18 / lg 24 / xl 32), soft shadows.
- **React imports**: runtime imports are **named** (`useState`, `useEffect`,
  `useContext`, `createContext`, `type ReactNode`) — **never** `import * as React`.
  The `React.` namespace is allowed only in **type positions** (e.g.
  `React.ComponentProps`, `React.RefAttributes`) as a UMD global.
- **Official Expo/native APIs are used directly, without wrapper components**
  (e.g. `SystemBars` from `react-native-edge-to-edge`).

## Commands

```bash
npm run dev          # expo start -c
npm run android      # expo start -c --android
npm run ios          # expo start -c --ios
npm run web          # expo start -c --web
npm run lint         # expo lint
npx tsc --noEmit     # typecheck (must be 0 errors)
npm run clean        # rm -rf .expo node_modules
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/shared/constants/color.constant.ts` | Canonical color palette (HEX) |
| `src/shared/constants/icon.constant.ts` | Centralized icon registry (lucide only here) |
| `src/shared/constants/theme.constant.ts` | `THEME_STORAGE_KEY`, `THEME_OPTIONS`, `THEME_ICONS` |
| `src/shared/constants/index.ts` | Constants barrel |
| `src/core/types/index.ts` | Types barrel (`IconName`, `ThemePreference`, `StoragePrimitive`, ...) |
| `src/core/interfaces/index.ts` | Interfaces barrel (`IStorageService`) |
| `src/core/services/storage/` | Platform-split storage (MMKV / localStorage) |
| `src/shared/components/ui/` | UI primitives (`button`, `text`, `icon`) |
| `src/shared/hooks/use-theme-preference.ts` | Theme preference get/set |
| `src/shared/libs/theme.ts` | `NAV_THEME` + `BG_COLORS` (React Navigation) |
| `src/global.css` | OKLCH tokens + aliases + base/utilities |
| `src/app/_layout.tsx` | Root layout (theme init, status bar) |
| `CONTEXT.md` | Full project history and decisions |
