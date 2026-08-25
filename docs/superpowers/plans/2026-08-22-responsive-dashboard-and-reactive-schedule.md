# Responsive Dashboard and Reactive Schedule Implementation Plan

> **For agentic workers:** Inline execution only for this task. Do not create a commit or push.

**Goal:** Make dashboard and schedule data paint from an in-memory MMKV snapshot before route entry while retaining WatermelonDB real-time updates, complete calendar actions, and remove responsive dead space.

**Architecture:** `ViewCacheService` becomes a two-tier cache: synchronously persisted MMKV data is primed into a process-memory map at session bootstrap, and local database observers stay the source that refreshes it. Calendar views emit the selected `CalendarEntry` to one screen-level action controller, which opens the existing adaptive menu/form/confirmation flow consistently across tap and long press.

**Tech Stack:** Expo Router, React Native, TypeScript, Uniwind/Tailwind v4, Zustand, WatermelonDB/RxJS, MMKV, react-native-reanimated.

**Spec:** `docs/superpowers/specs/2026-08-22-responsive-dashboard-and-reactive-schedule-design.md`

## Global Constraints

- Use semantic Uniwind classes and existing services/observable hooks.
- Preserve user-scoped cache data and clear it on session clear.
- No loading fallback or manual refresh for cached dashboard/schedule data.
- Destructive actions always use the existing confirmation dialog.
- Do not create a commit or push.

---

### Task 1: Prime dashboard and schedule snapshots before route rendering

**Files:**
- Modify: `src/core/services/view-cache.service.ts`
- Modify: `src/shared/components/session/session-gate.tsx`
- Modify: `src/shared/hooks/use-dashboard-data.ts`
- Modify: `src/app/agenda/index.tsx`

**Consumes:** MMKV `storageService`, existing `VIEW_CACHE_PREFIX`, `useCachedRows`, and `useCachedValue`.

**Produces:** `viewCacheService.prime(): void`, memory-backed `read`, `readValue`, `write`, and `clear` semantics.

- [ ] Write cache tests proving a primed snapshot reads before live data, writes refresh memory and storage, and `clear` removes both layers.
- [ ] Add a memory map to `ViewCacheService`; prime all `view.cache.*` MMKV objects, use it first for reads, keep it current on writes/removals, and clear it during session clear.
- [ ] Call `viewCacheService.prime()` in `SessionGate` before session initialization resolves.
- [ ] Scope dashboard Today snapshots with `userId + startOfDay`; scope schedule snapshots with `userId + view + range start`.

### Task 2: Keep bottom navigation mounted through a dashboard return

**Files:**
- Modify: `src/app/index.tsx`

**Consumes:** `authStatus` and `DashboardScreen`.

**Produces:** A signed-in root route that mounts the dashboard without an initial blank destination state.

- [ ] Write a pure destination helper test showing `signed-in` resolves to `home` synchronously and signed-out routes continue through async resolution.
- [ ] Extract the destination initial-state decision and render `DashboardScreen` immediately for `signed-in`; retain async pairing/admin resolution only for signed-out state.
- [ ] Run the focused test; expect pass.
- [ ] Return from Projects to Dashboard in the Android emulator and capture the 80 ms and settled frames; the global navigation must remain visible while content fades.

### Task 3: Make every schedule event editable and expose mobile long press actions

**Files:**
- Modify: `src/app/agenda/index.tsx`
- Modify: `src/shared/components/calendar/entry-actions-menu.tsx`
- Modify: `src/shared/components/calendar/calendar-day-list.tsx`
- Modify: `src/shared/components/calendar/calendar-agenda-view.tsx`
- Modify: `src/shared/components/calendar/calendar-day-view.tsx`
- Modify: `src/shared/components/calendar/calendar-week-view.tsx`
- Modify: `src/shared/components/dashboard/agenda-item.tsx`
- Modify: `src/shared/components/dashboard/schedule-timeline.tsx`
- Modify: `src/core/types/dashboard.type.ts`

**Consumes:** `CalendarEntry`, calendar-event REST service, permission checks, `AdaptiveMenu`, and global `confirm()`.

**Produces:** A controlled `EntryActionsMenu` that can be opened from a long press, and `onSelect`/`onLongPress` entry callbacks for every schedule layout.

- [ ] Write pure tests for source-prefixed IDs and action availability: events permit edit/delete, tasks permit toggle/delete, reminders expose no mutation actions.
- [ ] Extract source ID/action construction from `EntryActionsMenu`; add controlled mobile-sheet open support without changing desktop overflow-menu behavior.
- [ ] Pass an `onEntrySelect` handler to month, agenda, day, and week views. It opens `CalendarEventForm` for events only.
- [ ] Pass an `onEntryLongPress` handler to those views. It selects the entry and opens the controlled `EntryActionsMenu`; its delete operation still invokes `confirm()`.
- [ ] Carry stable entry IDs through `ScheduleTimeline` so day view never matches by title.
- [ ] Run the focused test; expect pass. Use the emulator to long press an event, edit it, then delete it after confirmation.

### Task 4: Restore content-driven compact panels and set a Cameras minimum

**Files:**
- Modify: `src/shared/libs/dashboard-section-layout.ts`
- Modify: `src/app/index.tsx`
- Modify: `src/shared/components/dashboard/camera-grid.tsx`
- Modify: `src/shared/constants/dashboard.constant.ts`

**Consumes:** `useWindowClass` and existing `CameraGrid` empty state.

**Produces:** `getDashboardSectionLayout` that only equalizes paired wide sections, plus a compact cameras minimum height.

- [ ] Update layout tests: compact sections return no fixed minimum; short/wide and wide/tall paired sections retain equalized fill; a camera empty layout returns the compact minimum.
- [ ] Remove fixed section minimum from compact dashboard panels; keep fill/minimum only on shared wide rows.
- [ ] Add `minHeight` support to `CameraGrid` and use its dedicated compact minimum for the dashboard Cameras panel.
- [ ] Run the focused test; expect pass. Capture phone portrait, phone landscape, tablet portrait, and tablet landscape to verify no dead canvas and consistent empty Cameras footprint.

### Task 5: Verify integration

**Files:**

- [ ] Run `bunx tsc --noEmit`.
- [ ] Run `bun run lint`.
- [ ] Inspect `git diff --check` and `git status --short`; keep all changes uncommitted.
