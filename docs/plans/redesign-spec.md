# Argus app redesign: specification

Status: proposal, 2026-10-20. Research, design spec and static prototype only;
no app code changes. Companion files:

- `redesign-prototype/index.html`: static prototype (phone screens in light and
  dark, the details and states, one desktop layout with a dialog). Open it in a
  browser.
- `redesign-resumen-es.md`: one page in Spanish for the owner.

Inputs: the measured refactor plan and rules proposal
(`wt/frontend-plan/docs/plans/frontend-refactor-plan.md`,
`frontend-rules-proposal.md`), the UI map findings (`uiux-map/web/findings.md`,
40 items; `uiux-map/android/findings.md`, 25 items), the state inventory
(`wt/frontend-uimap/docs/ui-map/inventory.md`) and the captures under
`uiux-map/`. Screenshot paths below are relative to `/home/acme/Desktop/argus/`.

Owner direction (David, 2026-10-20): "algo sencillo, con algo del diseño de
Threads". New users must not find it hostile or hard to learn. Less UI code,
of higher quality: easy to audit, easy to test, and it works. Visual consistency
everywhere, with every component feeling natural on its platform. Native sheets,
modals and alerts where the platform expects them; the desktop equivalent on
web and Tauri. "Cuida los pequeños detalles."

How this spec feeds the refactor plan: **R5** (one token source) takes §3 as
the values of `shared/theme/tokens.ts`. **R6** (design system completion) takes
§4 as the primitive list and §5 as the patterns `ResourceView`, `Sheet`,
`Confirm` and `Toast` implement. The screens of §9 are rebuilt on those
primitives after R5/R6 exit (decision D7 of the plan).

---

## 1. What is wrong today, in one paragraph

The app works, but it shows too much at once. Inicio stacks nine cards
(alert, search, reminders, detections heatmap, today's timeline, projects,
cameras, security, summary, news) and spans 3,759 px on a 360 px phone
(`uiux-map/web/home/populated-full__phone__light__es.png`). The camera page is
4,566 px (`uiux-map/web/camera-detail/owner-connecting-full__phone__light__es.png`),
Profile about 6,200 px, and Settings opens on five utility cards before any
setting (`uiux-map/web/settings/simple-full__phone__light__es.png`). The bottom
bar has six icons with no labels plus a floating "+"
(`uiux-map/android/14-home-dark-bottom.png`). The measured failures follow from
that density: text truncated in 863 of 1,740 captures, small targets in 304,
words broken mid-word at font scale 1.0 (A2), segmented controls cut to "A."
(W3), and failure shown as empty (W6, about 14 findings). The code mirrors the
UI. There are 280 feature `.tsx` files (33,841 lines), 243 of them feature
components (26,976 lines): 26 bespoke dialogs, 30 panels, 20 cards, 17 rows and
9 forms, each re-deciding spacing, targets and states. On top of that sit 46 shared
primitives and 18 layout files.

## 2. Principles

1. **Lo importante primero (one status, one action).** Every screen opens with
   one sentence that says how things are, and offers at most one primary
   action. Everything else is a row one tap away (progressive disclosure:
   [NN/g](https://www.nngroup.com/articles/progressive-disclosure/)).
2. **Calma, no alarma.** Ink on paper by default. Colour carries state only:
   green for calm, amber for attention, red only for a real alert that needs
   you. An alert always says what happened, where, and the one thing to do.
3. **Se aprende usando.** No tutorials or carousels. NN/g measured no benefit
   from tutorials on simple apps, and users who read them rated tasks harder
   ([NN/g](https://www.nngroup.com/articles/mobile-tutorials/)). Empty states
   teach and offer the first action
   ([NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)).
4. **Pocas piezas.** About 23 components with few variants, each with its
   states, labels and target size built in. A screen is composed of them and
   adds no styling of its own.
5. **Natural en cada plataforma.** One visual language, native mechanics:
   native sheets, alerts, haptics and press feedback on phones, dialogs and
   hover on desktop. Never a phone sheet stretched across a monitor.
6. **Honesto con el estado.** Loading, stale, offline, refused and failed each
   look different. A failure is never shown as "nothing here". This follows
   rule F11 of the rules proposal.
7. **Para todos.** 48 dp targets, AA contrast in both themes, text up to 200%,
   status never by colour alone, and dark mode designed, not inverted.

## 3. Tokens (the values R5 writes into `tokens.ts`)

### 3.1 Colour: near-monochrome, one accent, three status colours

Threads' approachability comes from a near-monochrome surface where content,
not chrome, carries the colour: black text on light surfaces, thin dividers and
line icons, with a single accent reserved for links and verification
([refero teardown](https://styles.refero.design/style/3b46c64e-b733-4d70-8cd0-531ca1f92937),
[visual review](https://medium.com/@photog-rahul/threads-visual-review-dc95adc6632a)).
Argus keeps its warm identity (the owner-approved taupe family) but drops the
dual accent. Actions become ink (Threads' black button). Arena remains the one
accent, used for unread marks, the current selection, the focus ring and
Argus' own presence.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FAF9F7` | `#121110` | screen background |
| `surface` | `#FFFFFF` | `#1B1A18` | grouped rows, sheets, dialogs |
| `fill` | `#F1EFEB` | `#262420` | inputs, chips, icon wells, secondary buttons |
| `fill-press` | `#E7E4DF` | `#312F2B` | pressed state |
| `line` | `#E4E1DC` | `#2E2C28` | hairline dividers, borders |
| `text` | `#161514` | `#F3F1EE` | primary text and icons |
| `text-2` | `#5C5852` | `#ADA79F` | secondary text (AA on bg and surface) |
| `text-3` | `#736E67` | `#8F8A82` | meta, placeholders (AA on bg, checked by test) |
| `ink` / `on-ink` | `#161514` / `#FFFFFF` | `#F3F1EE` / `#121110` | primary button, selected switch, checked box |
| `accent` | `#8C6B2E` | `#D9BC85` | unread dot, focus ring, selection, Argus |
| `accent-soft` | `#F4ECDD` | `#2E2618` | accent wells |
| `ok` / `ok-soft` | `#2E7D4F` / `#E5F1E9` | `#62C189` / `#16261C` | calm, online, done |
| `attn` / `attn-soft` | `#9A5B00` / `#FAEEDC` | `#E3AA52` / `#2E2314` | attention, review, stale |
| `alert` / `alert-soft` | `#C0362C` / `#FBE7E4` | `#F07B6F` / `#341A19` | real alerts, destructive |
| `scrim` | `rgba(20,18,16,.38)` | `rgba(0,0,0,.55)` | behind sheets and dialogs |

Rules:

- 16 colour roles per theme, down from 59 HEX constants and 62 OKLCH
  variables. Each status colour is text-safe itself (≥ 4.5:1 on `bg` and
  `surface`, by the luminance computed for this spec), so the separate
  `*-strong` twins disappear. A unit test computes every text/background pair
  from `tokens.ts` (rule F20).
- Event colours in the calendar map to five muted tints derived from these
  roles. The raw "blue" of W24 is gone.
- Dark mode: no pure black. Fills sit above surfaces, so checkboxes, empty
  cells and off switches stay visible (W37). Status colours are lighter, not
  inverted.
- Illustration colours (the mascot, procedural avatars) live in
  `tokens.illustration`, as the plan already says.

### 3.2 Type: six steps, two weights, system fonts

| Step | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 28 / 34 | 650 | screen title, onboarding headline |
| `title` | 20 / 26 | 650 | detail titles, sheet titles, status mode |
| `headline` | 17 / 24 | 600 | section headings, status sentence |
| `body` | 16 / 22 | 400 (500 for row titles) | all reading text, rows |
| `meta` | 14 / 20 | 400 | secondary lines, timestamps |
| `caption` | 12 / 16 | 500 | tab labels, chips, badges only |

This replaces today's eight steps (`display` 32 … `micro` 11). Body moves from
15 to 16 for older and non-technical readers. Fonts are the platform system
fonts (SF Pro on iOS and macOS, Roboto on Android, Segoe/Cantarell/system-ui on
desktop). That costs nothing in bundle size, follows the user's OS text
settings, and needs no licence. The Threads font itself is not confirmed by any
source, so it is not copied.

### 3.3 Spacing, sizes, radii, elevation

- **Spacing** (4-based, 7 steps): `4 · 8 · 12 · 16 · 24 · 32 · 48`. The screen
  gutter is 16 on compact and 24 on medium and up. Sections are 24 apart, rows
  have 12 internal gap and 16 horizontal padding.
- **Sizes:** touch target 48 (minimum 44 where the platform allows), row
  minimum height 56, icon 24 (20 inside rows and buttons), avatar 36/56,
  icon stroke 1.75 everywhere.
- **Radii** (4 steps): `8` (chips' inner, small wells) · `12` (buttons,
  inputs, groups, media) · `20` (sheets, dialogs, cards that float) · `full`
  (pills, avatars, switches). Down from nine steps.
- **Elevation** (2 levels): `0` for everything on the page (hairlines separate
  it, like Threads), `1` (one shadow token) for what floats: sheets, dialogs,
  menus and toasts. Cards do not cast shadows.
- **Motion:** `fast 120 ms` (press, toggles), `base 200 ms` (small
  enter/leave, cross-fades), `slow 300 ms` (in-app panels; native sheets and
  screens use the platform's own curves). One easing (`standard`, ease-out).
  Common ranges are 150–250 ms for UI transitions; M3 ships duration tokens
  ([M3 motion tokens](https://github.com/google-labs-code/design.md/issues/47)).
- **Breakpoints:** see §6.

## 4. Component inventory: the smallest set that covers every screen

Today: 46 shared primitives in `shared/components/ui` (3,986 lines), 18 layout
files (921 lines), and 243 feature components (26,976 lines). Of those, 141
are cards, dialogs, forms, sheets, panels, rows, sections, lists, pickers,
banners, chips, tiles, heroes and headers, about 17,000 lines. That is where
the redesign removes the most code.

Proposed: **23 components in four families.** Each has at most four variants,
and booleans only for accessories
([variant explosion](https://stevekinney.com/courses/enterprise-ui/maintaining-a-design-system)).
A new variant needs a design review and a `ui-lab` baseline (rule F19).

### 4.1 Foundations

| # | Component | Variants / props | Replaces today |
|---|---|---|---|
| 1 | `Text` | the 6 steps, `tone` (default, 2, 3, ok, attn, alert) | `text.tsx` (8 steps), ad-hoc `text-[Npx]` |
| 2 | `Icon` | `size` 20/24; one stroke | `icon.tsx`, `morph-icon` (the morph goes, §7) |
| 3 | `Pressable` (`PressableSurface`) | role, label (required), target size, platform press feedback, haptic preset | 104 raw `Pressable`s in features |
| 4 | `Screen` | `title`, `back`, `actions`, scroll, pull-to-refresh, safe areas, keyboard avoidance, max width | `app-screen`, `centered-screen`, `form-scroll-view`, `screen-header`, `edge-fade`, per-screen headers |
| 5 | `Nav` | bar / rail / sidebar chosen by window class; items from capabilities | `bottom-nav`, `global-bottom-nav`, `nav-rail`, `compose-fab`, `bottom-nav-metrics`, `use-bottom-nav` |

### 4.2 Content

| # | Component | Variants / props | Replaces today |
|---|---|---|---|
| 6 | `Section` | `title`, optional `action` link, `grouped` (rows on a surface) or `plain` | `panel`, `section-header`, `responsive-grid` uses, 30 feature panels, 8 sections |
| 7 | `Row` | leading (icon, avatar, check, media), title, meta, trailing (chevron, value, switch, chip, button); `danger` | `list-row`, `option-row`, `toggle-row`, `select-field`, `permission-list`, 17 feature rows, most of the 20 feature cards |
| 8 | `Status` | `tone` calm / attention / alert; icon, sentence, meta, up to one primary + one secondary action, optional media | alert card, response card (248 lines), vigilance hero, settings "applied profile" card, module notices |
| 9 | `Notice` | `info`, `attention` (offline, stale, paused); one action | `top-notice-bar`, offline icon and toast, parked error band, recording-paused banner, the 3 feature banners |
| 10 | `FeedItem` | icon/avatar, who, when, text, optional actions, unread | notification thread row (301 lines), activity rows, episode cards in their list form |
| 11 | `Chip` | `tag` (status, with tone and dot) / `filter` (selectable); wraps in a `Cluster` | `status-badge`, `filter-chips`, 4 feature chips and 2 badges |
| 12 | `Avatar` | person (initial or portrait), icon well; 36/56 | per-feature icon circles, presence dots |
| 13 | `Media` | camera `tile` / `stage` (live player slot, overlays, privacy and off states) | camera card (334), live panel/stage chrome, home camera tiles |
| 14 | `Check` | completion circle: open, overdue, in progress, done; haptic on toggle | reminder circles, task status pickers in rows |

### 4.3 Input

| # | Component | Variants / props | Replaces today |
|---|---|---|---|
| 15 | `Button` | `primary` (ink), `secondary` (fill), `ghost`, `danger`; `compact`; `busy` (single-flight) | `button.tsx` (166 lines, 7 variants, 5 sizes), `create-tile`, `icon-button` merged as `iconOnly` |
| 16 | `Field` | `text`, `multiline`, `secret`, `code`; label, hint, error; Return key action | `input`, `textarea`, `form-text-field`, the field halves of 9 feature forms |
| 17 | `Choice` | renders a segmented control when ≤ 4 short options fit, and otherwise a row that opens a list in a `Sheet` | `segmented-control`, `select`, `adaptive-select` (243), the truncating call-preference segments (W3) |
| 18 | `Switch` | one variant; always inside a `Row` | `switch.tsx`, raw `Switch`es |

### 4.4 Overlays and states

| # | Component | Variants / props | Replaces today |
|---|---|---|---|
| 19 | `Sheet` | `form` / `list` / `detail`; detents `auto`, `large`. Phone: native sheet. Medium and up: centred dialog (form, list) or side sheet (detail) | `sheet.tsx` (250), `adaptive-dialog` (139), `dialog` (176), `overlay-body` (110), 26 feature dialogs reduced to content |
| 20 | `Confirm` | `default` / `destructive`; names the object | `confirm-dialog`, ad-hoc confirm sheets (W7) |
| 21 | `Menu` | dropdown on pointer, sheet list on touch, context menu on long press and right click | `adaptive-menu`, `context-menu` (294), `popover`, single-item menus (W38) |
| 22 | `Toast` | `info`, `success`, `error` with Retry, `undo` | `toaster`, `toast-card` |
| 23 | `ResourceView` | renders `loading` (its `Skeleton`), `ready`, `empty` (its `Empty`), `stale` (`Notice`), `failed` and `refused` from a `Resource<T>` | `empty-state`, `infinite-list` states, the 42 `EmptyState` uses, spinners in lists |

Dropped without replacement: `orbit-hero`, `blur-reveal`, `brand-mark` variants
(one `Mark`, which sits inside `Nav` and onboarding), `timeline` (the agenda
uses `Row`), and `native-only-animated-view`.

Domain components that stay feature-owned: the camera player, the PTZ pad, the
zone editor, the calendar month grid, the voice orb, the QR code and scanner,
and the face capture. They compose the primitives for everything around their
core.

### 4.5 Expected code reduction

The method is an estimate from today's line counts, not a measurement:

| Area | Today | Target | How |
|---|---|---|---|
| Shared primitives + layout | 64 files, 4,907 lines | 23 components, about 2,600 lines | fewer variants; sheet, toast and keyboard mechanics move to maintained libraries (§8) |
| Feature cards, dialogs, forms, panels, rows, sections, lists, pickers, banners, chips, headers | 141 files, about 17,000 lines | about 55 files, about 6,500 lines | composed from `Section`/`Row`/`Status`/`Sheet`/`Field`; no own styling |
| Other feature components (player, avatar, mascot, wizards…) | 102 files, about 10,000 lines | about 75 files, about 8,500 lines | outer chrome only |
| Screens | 37 files, 6,865 lines | about 32 files, about 4,800 lines | fewer sections per screen; camera page split in two |
| **Total UI `.tsx`** | **about 39,000 lines** | **about 22,500 lines** | **about 40% less (range 35–45%)** |

Two further effects are not counted in that table: about 2,267 `className`
strings in features fall sharply, because spacing lives in the primitives, and
the number of states a reviewer must check per screen falls from "whatever the
screen invented" to "the five states of `ResourceView` plus the primitives' own
baselines". The R0 ratchet measures the result. The table is the forecast to
measure against.

## 5. Patterns (one per need)

1. **List / feed.** Grouped rows on a `surface` for things you manage
   (reminders, cameras, people, settings). A plain `FeedItem` list with
   hairlines for things that happened (Novedades, episodes, activity).
   Threads-style layout: icon or avatar on the left, "who · when" on one
   line, text below, actions under the text, unread as an accent dot. Infinite
   lists keep the existing keyset paging and `InfiniteList`.
2. **Detail.** A `Screen` with a title and meta under it, the one primary
   action, then `Section`s of rows. Anything that is configuration goes one
   level down ("Ajustes de la cámara"). On expanded widths, list + detail sit
   side by side (two panes), and the detail opens as a side sheet when the list
   is the main task.
3. **Compose.** Creation happens in a `Sheet` (`form`): title field focused,
   then chips for when, repeat and who, plus Guardar. The Return key saves
   when the form is valid. On the phone the sheet opens at `auto` height and
   grows to `large` with the keyboard. On desktop it is a 480 px centred
   dialog with Esc and Ctrl/⌘+Enter. Argus is the general compose: "Recuérdame
   pagar la luz el 30" creates the same row, and the reply shows it as a chip
   that opens it.
4. **States.** Every remote read is a `Resource<T>` rendered through
   `ResourceView`:
   - `loading`: a skeleton with the final layout's shapes; no spinner in a list.
   - `ready` / `empty`: one sentence that says what will appear here, plus one
     action that fills it. The empty view is as tall as a typical populated
     state (the owner's 2026-10-03 rule).
   - `stale`: the cached data stays, with a `Notice` such as "Sin conexión con
     Argus. Muestro lo de las 15:32."
   - `failed`: what failed and Reintentar, never the empty copy.
   - `refused`: what the role or module does not allow, and who can change it.
   - Offline: one `Notice` at the top of the content (not floating over the
     header, W10/W11) that appears within 3 s and names the right cause: "sin
     Wi-Fi" versus "fuera de casa" (A7).
5. **Confirm and undo.** Reversible actions (complete, delete a reminder, mark
   as read, archive) act at once and offer Deshacer in a toast for 5 s.
   `Confirm` is only for the irreversible or the loud: siren, panic, deactivate
   an account, uninstall with purge, sign out everywhere. Its button names the
   act ("Hacer sonar", "Borrar los datos") and its body says the consequence in
   the user's words. The destructive action starts only after confirmation
   (W7).
6. **Alerts.** Three tiers, mapped to the OS levels. Routine items stay passive
   in Novedades. Person or unknown-face events are active or time-sensitive.
   Panic and siren are the only critical alerts. In the app an alert is a
   `Status` in tone `alert` at the top of Inicio, with one primary action (Ver
   cámara), one secondary (Es alguien conocido) and the quiet "Es una falsa
   alarma" ([Android channels](https://developer.android.com/training/notify-user/channels),
   [SimpliSafe's status pattern](https://support.simplisafe.com/articles/using-your-system/how-to-arm-or-disarm-your-system)).

## 6. Responsive rules: one layout system

One set of breakpoints, the same names in CSS variants and `useWindowClass`
(rule F18). The values follow Material's window size classes, adjusted at the
top so laptops get the sidebar
([Android adaptive navigation](https://developer.android.com/develop/adaptive-apps/guides/build-adaptive-navigation)):

| Class | Width | Navigation | Content |
|---|---|---|---|
| `compact` | < 600 | bottom bar (labels always) | one column, 16 gutter |
| `medium` | 600–1023 | rail (icons + labels) | one column, max 640, centred |
| `expanded` | 1024–1439 | sidebar with labels | main column max 640 + aside 300, or list + detail panes |
| `wide` | ≥ 1440 | sidebar | the whole layout capped at 1200 and centred with the sidebar attached (fixes W33's 470 px gap) |

- Compact height (< 480, phone landscape) keeps the bottom bar. Material uses a
  bar when either dimension is compact, and that also fixes the clipped rail
  of A1.
- Tablet portrait (768) gets one centred column, never two narrow ones (W15).
- Chip and action rows wrap (`Cluster`) and never clip (W14). A `Choice` that
  does not fit becomes a select (W3).
- Overlays: compact uses native bottom sheets. Medium and up use a centred
  dialog (forms, lists, confirms; 480 px, 560 px for long forms) or a 400 px
  right side sheet (details opened from a list).
- Reflow: nothing scrolls in two directions at 320 px
  ([WCAG 2.2 reflow](https://www.w3.org/TR/wcag2mobile-22/)). No inner
  scrollbars inside the page (W29), except the calendar's week grid.

## 7. Motion

- Only what explains a change: a sheet rising, a row leaving after Deshacer
  expires, a check filling, a status changing tone. No decorative loops. The
  orbit hero, the compose-glyph morph and the mascot choreography leave the
  everyday screens. The mascot stays only in onboarding and in Argus' voice
  call, where it is the content.
- Native sheets, screen pushes and alerts use the platform's own animation
  curves, not ours.
- `fast 120 / base 200 / slow 300 ms`, one easing.
- Reduce motion (system setting, read through `AccessibilityInfo`,
  [RN docs](https://reactnative.dev/docs/accessibilityinfo)): every transition
  becomes an instant change or a 120 ms cross-fade, the skeleton stops
  shimmering and becomes a static fill, and the voice orb stops pulsing (the
  avatar reactions included).

## 8. Platform-native mechanics: libraries

All are checked against Expo SDK 57, the new architecture (Fabric), RN 0.86 and
react-native-web 0.21 inside Tauri 2 (WebKitGTK). Licences are all MIT.

| Need | Recommendation | Web / Tauri | Reduces our code? |
|---|---|---|---|
| Bottom sheets (phone) | **react-native-true-sheet v3** (lodev09): it presents the system sheet controller on iOS (detents, grabber), Material bottom-sheet behaviour on Android, built-in keyboard handling, is Fabric-only from v3, and supports RN 0.81–0.86 ([repo](https://github.com/lodev09/react-native-true-sheet), [docs](https://sheet.lodev09.com/)). Stay on v3. v4 is beta (Expo Router `Sheet` layout, Radix-based web). | Not used on web: `Sheet` renders `@rn-primitives/dialog` at medium and up and on every web build | **Yes.** Replaces the gesture, snap and keyboard code of `sheet.tsx` and `overlay-body.tsx` (about 360 lines) and the per-sheet keyboard workarounds behind A6 |
| Route-level sheets | Expo Router `presentation: 'formSheet'` with `sheetAllowedDetents` for sheets that need a URL (Android allows at most 3 detents; the grabber is iOS-only) ([Expo modals](https://docs.expo.dev/router/advanced/modals.md)) | a normal route | Neutral |
| Alternative sheet | `@gorhom/bottom-sheet` 5.2.14: one JS implementation everywhere (Reanimated), but not the system sheet, it needs its own text input, it officially supports only mobile web, and the maintainer has little time ([releases](https://github.com/gorhom/react-native-bottom-sheet/releases), [web](https://gorhom.dev/react-native-bottom-sheet/web-support)) | mobile web only | Yes, but less native |
| Dialogs, menus, popovers (web, Tauri, medium+) | **Keep `@rn-primitives`** dialog, alert dialog, dropdown menu and context menu (already installed, portal-based, accessible) | yes | Yes: the adaptive components become thin switches |
| Native confirm | RN `Alert.alert` on iOS and Android (it is a no-op in react-native-web, so web uses the `@rn-primitives` alert dialog) ([RNW source](https://raw.githubusercontent.com/necolas/react-native-web/master/packages/react-native-web/src/exports/Alert/index.js)) | via alert dialog | Yes: removes confirm sheets on phones |
| Native context menus | Optional later: `@expo/ui` (`ContextMenu` on SwiftUI, `DropdownMenu` on Compose) behind `Menu`. zeego is deferred until its pinned native versions are proven on RN 0.86 ([zeego](https://zeego.dev/start)) | — | No (adds code), so only if the native look is wanted |
| Haptics | **expo-haptics** through one `feedback(kind)` helper: `selectionAsync`, `impactAsync`, `notificationAsync`, and `performAndroidHapticsAsync` on Android (no VIBRATE permission, closer to iOS feel) ([Expo haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)) | no-op on WebKitGTK (no `navigator.vibrate`) | Small addition, about 30 lines |
| Press feedback | RNGH `Pressable` inside `PressableSurface`: `android_ripple` on Android, highlight on iOS, hover and focus ring on web; cancels when a parent scrolls ([RNGH Pressable](https://docs.swmansion.com/react-native-gesture-handler/docs/components/pressable)) | hover works | Yes: one place instead of 104 |
| Keyboard | **react-native-keyboard-controller** (already present): `KeyboardAwareScrollView` in `Screen` and forms, `KeyboardToolbar` for multi-field forms; `.web.tsx` passthrough ([Expo docs](https://docs.expo.dev/versions/v57.0.0/sdk/keyboard-controller.md)) | passthrough | Yes: one integration in `Screen` |
| Toasts with undo | **sonner-native** on iOS/Android, **sonner** on web, behind `Toast` (both MIT, the same API shape, action buttons) ([sonner-native](https://github.com/gunnartorfis/sonner-native)). Not burnt: it has no action button for undo ([burnt](https://github.com/nandorojo/burnt)). | sonner | Yes: replaces most of `toaster` and `toast-card` |
| Skeleton | Own 20–30 line `Skeleton` on Reanimated 4 CSS animations (they work on web) ([Reanimated CSS animations](https://docs.swmansion.com/react-native-reanimated/docs/css-animations/animation-name/)). Not moti: no stated Reanimated 4 support. | yes | Neutral |
| Formatting | `Intl` through the existing `useDateFormatter` + `date-fns` (es/en), with the hour cycle from expo-localization's `getCalendars().uses24hourClock` passed explicitly. Hermes delegates `Intl` to platform ICU, so results vary by OS; `formatToParts` is Android-only ([Hermes Intl](https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md), [expo-localization](https://docs.expo.dev/versions/latest/sdk/localization/)) | yes | Neutral |

Risks: TrueSheet v3 → v4 changes its web renderer, which we don't use, so the
impact is contained. Every library here needs its `.web` passthrough tested in
WebKitGTK through `check:bundle`. Re-check the peer ranges at the next SDK.
**A spike comes first:** TrueSheet v3 on the dev-client for both Android and
iOS, with a form sheet, the keyboard and Back. If it fails, gorhom is the
fallback.

## 9. Screens

Format per screen: purpose, the one primary action, what is removed or merged
(with today's capture), states.

### 9.0 Navigation (information architecture)

Five destinations at most, always visible, always labelled (hidden navigation
cut discoverability by more than 20% in
[NN/g's study](https://www.nngroup.com/articles/hamburger-menus/); icon-only
bars are hard for new users). The pattern follows Threads: four places plus
one central action. In Threads the centre is compose
([9to5Google](https://9to5google.com/2023/07/07/threads-android-app-brief-review/)).
In Argus the centre is **Argus**, because talking to Argus is how a new user
creates anything.

| Slot | Destination | Holds |
|---|---|---|
| 1 | **Inicio** | status sentence, "Ahora" (what is due), Novedades feed. Replaces the dashboard and the bell |
| 2 | **Seguridad** | mode, cameras, what happened, then visits, places and maintenance as rows. Shown when the surveillance module is active and the role has it |
| 3 | **Argus** (centre) | the Argus thread (text + voice) and, from its header, the conversations with people |
| 4 | **Agenda** | Hoy (reminders + events + tasks in one list), Calendario, Proyectos. Shown when productivity is active |
| 5 | **Tú** | profile, Personas, Visitantes, Módulos, Sesiones, Privacidad, Llamadas de Argus, Ajustes, Actividad, Apariencia, Idioma, Cerrar sesión |

- **Seguridad and Productividad coexist without competing.** Each owns one tab,
  and Inicio shows a single status sentence from Seguridad plus at most three
  items from Agenda. Nothing else from either module appears on Inicio. A
  module that is off removes its tab and its Inicio line. There is no empty
  card saying "module off".
- Tabs come from the capability list (`role_access::capabilitiesFor`), not from
  role names. Owner and resident with both modules get 5 tabs. With one module
  off they get 4. A guard (surveillance) gets Inicio, Seguridad, Argus and Tú.
  A guest gets Inicio, Argus and Tú. An unknown role gets Inicio (the inactive
  notice) and Tú, with no Argus and no compose (fixes W27). Tabs have a fixed
  width and stay centred, so three tabs never spread to the edges (W26).
- The floating "+" goes. Creation is the "+" inside Agenda and Proyectos, or
  Argus. A long press on the Argus tab opens the quick-create sheet
  (Recordatorio, Evento, Tarea) for people who prefer forms.
- Search: a search icon in the Inicio top bar searches reminders, events,
  projects, tasks, people and cameras.
- Panic: an "SOS" button in Seguridad's top bar (every role that has
  Seguridad) and in the guest's Inicio status. It is hold-to-confirm (1.5 s
  with haptic ticks) and also works from the lock screen notification, as
  today.
- Deep links keep working: every current route maps to a tab or a pushed
  screen. Cold deep links wait for the context instead of bouncing (W2), which
  is R1's `AppPhase` work.

### 9.1 Inicio

- **Purpose:** in three seconds: is everything fine, what is due, what's new.
- **Primary action:** none when calm. During an alert: Ver cámara.
- **Removed / merged:** the nine-card dashboard
  (`uiux-map/web/home/populated-full__phone__light__es.png`), the greeting
  header with three icon buttons that broke mid-word and overflowed at 320 px
  (W8, A2; `uiux-map/android/110-home-light.png`), the detections heatmap, the
  "Resumen" counts card (it repeated numbers shown elsewhere), the projects
  grid, the camera grid (it lives in Seguridad), the bell popover
  (`uiux-map/web/home/bell-popover__phone__light__es.png`; Novedades is the
  feed), the compose menu (`uiux-map/web/home/compose-menu__phone__light__es.png`)
  and the "Primeros pasos 0 de 7" checklist (A10). Its job moves to empty states.
- **Layout:** the Argus mark centred in the top bar (search on the right), then
  the `Status` ("Todo tranquilo en Casa · Modo En casa · 5 cámaras
  vigilando"), "Ahora" (up to 3 rows: overdue first, then the next by time;
  the link "Agenda"), and "Novedades" (the latest 5 feed items, inline
  actions such as "Activar", the link "Ver todo").
- **States:** calm; alert (a `Status` in tone alert with media and actions,
  `role="alert"`); new household (one empty state with one first step, "Conecta
  tu primera cámara" or "Crea tu primer recordatorio" depending on the modules,
  instead of four competing empties, W35); loading (skeleton); stale/offline
  (`Notice`); before the context arrives (skeleton, never "No tienes nada
  pendiente", W6); modules off (their lines simply absent).

### 9.2 Seguridad

- **Purpose:** know and change how Argus is watching; see the cameras; review
  what happened.
- **Primary action:** change the mode (a `Choice` of En casa / Noche / Fuera /
  Armado, which applies at once with Deshacer, or asks for the PIN when the
  place requires it).
- **Removed / merged:** the "Vigilancia" hero with four counters and a 2×2 grid
  of mode buttons, the "Entornos" panel with a dashed create tile, the episodes
  panel with its inner scrollbar and the "¿Acertó?" buttons inline, and the
  Maintenance and Expected visits panels on the main page
  (`uiux-map/web/security/populated-full__phone__light__es.png`). The Cameras
  screen as a separate destination
  (`uiux-map/web/cameras/populated__phone__light__es.png`) folds into this tab:
  four tiles here, "Todas (5)" opens the full list. Places ("Entornos" becomes
  "Lugares"), visits and maintenance become rows under "Más". Episode review
  ("¿Acertó?") moves into the episode detail. With one place, the mode control
  is right on the page (A18).
- **Layout:** title + SOS, the `Status` for the current place with the mode
  `Choice`, "Cámaras" (2×2 `Media` tiles with live thumbnails, privacy and off
  states), "Lo que pasó" (3 rows, "Revisar" chip on those pending review, "Ver
  todo"), and "Más" (Visitas esperadas, Lugares y modos, Mantenimiento,
  Personas vistas for the owner). With several places, the status shows the
  place picker as its title ("Casa ▾") and "Todos los lugares" in the sheet.
- **States:** calm; attention (an episode to review → the status says it);
  alert (same `Status` as Inicio); camera offline/privacy/off tiles labelled
  in words, not only an icon; guard role (no mode change where not allowed:
  the control shows the mode as text); stale; no cameras yet (the empty state
  "Conecta tu primera cámara" with the wizard as its action).

### 9.3 Cámara (en vivo)

- **Purpose:** see and talk.
- **Primary action:** hold to talk (one 88 pt button, haptic on press and
  release).
- **Removed / merged:** the 4,566 px page
  (`uiux-map/web/camera-detail/owner-connecting-full__phone__light__es.png`)
  becomes two screens. The live screen keeps the video, the overlay controls
  (sound, fullscreen; PTZ as a toggle overlay that never covers the "En vivo"
  chip, A17), Hablar, Llamar and Sirena (danger with `Confirm`), and three rows:
  Grabaciones, Zonas, Ajustes de la cámara. "Ajustes de la cámara" collects
  Privacy mode, Detección y sensibilidad, Argus escucha aquí, Mirada activa,
  Ronda programada, Lugares donde no mirar, Mantenimiento, Dispositivo and
  Avanzado, each a `Section` of rows. Controls that cannot apply are hidden,
  not just disabled: no talk, PTZ or quality in privacy mode, and no "Escuchar"
  switch under a badge saying it doesn't listen (W17). The microphone-denied
  state gets a button that asks again or opens Settings (A5).
- **States:** connecting (the stage shows the last frame or a calm placeholder
  above the controls, never text under a button, W13); live; privacy (a lock
  and "Privada: Argus no mira ni escucha"); off; unreachable (Reintentar);
  talking (the button fills, a level meter); in call.

### 9.4 Agenda (Hoy, Calendario, Proyectos)

- **Purpose:** what I have to do and when.
- **Primary action:** "+" (Nuevo: reminder, event or task in one sheet whose
  type is a chip, defaulting to a reminder).
- **Removed / merged:** the separate reminder list on Inicio and Agenda's four
  views (Día, Semana, Mes, Agenda list;
  `uiux-map/web/agenda/day__phone__light__es.png`,
  `uiux-map/web/agenda/week__phone__light__es.png`,
  `uiux-map/web/agenda/month__phone__light__es.png`) become "Hoy" and
  "Calendario". Hoy is one time-ordered list of reminders, events and tasks
  with a `Check` or an event mark. Calendario is the month grid with the
  selected day's list below on compact, and the week grid only at medium and up
  (40–50 px columns broke words, W12). The week starts at the first event or
  07:00, not at midnight. The hour gutter uses the device clock format and
  never wraps (A2). "Proyectos" is the third segment. The 12 h / 24 h mismatch
  between grid and forms goes (A12).
- **States:** today with items; nothing today (empty with "Nuevo
  recordatorio", as in the prototype); overdue (red meta, first); done (moved
  to "Hechas" with Deshacer); recurring (repeat icon; editing asks "solo
  esta" / "toda la serie" in a `Choice`); read-only guest; stale; failed.

### 9.5 Proyectos y tareas

- **Purpose:** shared lists of things to get done.
- **Primary action:** Nueva tarea.
- **Removed / merged:** the sideways kanban with 300 px dashed empty lanes on
  phones (`uiux-map/android/112-projects-light.png`,
  `uiux-map/web/projects/populated__phone__light__es.png`) becomes, on compact,
  a list grouped by state (Por hacer · En curso · Hechas, collapsed). The board
  stays at expanded widths. One vocabulary for states everywhere (Por hacer,
  En curso, Hecha; W19, A12). The project header card with three buttons
  (Miembros, edit, Nueva tarea) becomes a title + meta ("Ana, Luis · 3 de 8
  hechas") + progress, with Miembros and edit in the "⋯" `Menu`. A project with
  no tasks says "Aún no hay tareas", not "0 de 0 · 0%" (W36).
- **States:** list of projects (a row each with progress); project detail;
  empty project; view-only member (no add/edit); status change via `Check`
  long press or the row's menu.

### 9.6 Argus (chat y voz)

- **Purpose:** ask, tell, create; the same assistant by text or by voice.
- **Primary action:** the composer: a real text field and a mic button. The
  phone button in the header starts the full voice call.
- **Removed / merged:** the composer that looked like a text field but was a
  voice button (W23, `uiux-map/web/conversations/thread-argus__phone__light__es.png`);
  the in-call camera card covering the transcript (A4); the "Te escucho"
  call screen keeps its orb but loses the overlapping card (the camera opens as
  a result chip). The conversations list with people moves behind the header
  title ("Argus ▾" → Conversaciones), so the tab opens straight into Argus.
- **Layout:** bubbles (mine in ink, Argus' on surface), the source as meta
  ("por voz", "desde el portátil"), results as chips that open the created item
  or the camera, suggestion chips above the composer that change with context
  ("Muéstrame la cocina", "Recuérdame…", "Modo noche").
- **States:** empty thread (three suggestions, a one-line "Puedes escribirme o
  hablarme"); thinking (a three-dot bubble); voice listening/speaking/muted;
  mic denied (button to grant); Argus unreachable (the message stays as
  "No enviado · Reintentar", never silently lost); module-off request
  ("Activar Productividad" as a pending intent chip).

### 9.7 Personas

- **Purpose:** who lives here, who is home, who can do what.
- **Primary action:** Invitar.
- **Removed / merged:** the per-user cards with chips that truncated ("En casa
  des…", "Propietario · 4 disposi…"; A16, `uiux-map/android/113-users-light.png`,
  `uiux-map/web/users/populated__phone__light__es.png`) become rows: avatar,
  name, "Rol · en casa / fuera desde 09:10". Access, sessions and deactivation
  move into the person's detail. Destructive acts (Desactivar cuenta) sit at
  the bottom as a danger row with `Confirm` (W30). Invitations are a section
  below. Creating one shows the QR in a sheet with a quiet zone in both themes
  (A13). The button is single-flight, so a second tap cannot create a second
  invitation (A14).
- **States:** owner (full directory); guard (directory, no invitations);
  resident/guest (own profile only, reached from Tú); failed (never "Sin
  sesiones abiertas", W6); invitation pending/expired/used.

### 9.8 Novedades (notificaciones)

- **Purpose:** everything that happened that concerns me, newest first.
- **Primary action:** per item (Ver episodio, Activar, Responder).
- **Removed / merged:** the bell icon and popover, the red dot that counted
  hidden rows (W32), and the separate "notification link" waiting screen that
  waited forever (`uiux-map/web/notification-link/waiting-for-row__phone__light__es.png`):
  an unknown id shows "Este aviso ya no está" after the sync settles.
- **Layout:** the Inicio feed in full, with a `Choice` filter Todo / Seguridad /
  Pendientes. Threads become a `FeedItem` with a thread line to its replies.
  Swipe or menu deletes, with Deshacer.
- **States:** unread (accent dot, bold who); read; empty ("Aquí verás lo que
  pase en tu casa"); stale; failed.

### 9.9 Tú y Ajustes

- **Purpose:** my account, my household, how Argus behaves.
- **Primary action:** none (navigation hub).
- **Removed / merged:** the ~6,200 px Profile
  (`uiux-map/web/profile/owner-full__phone__light__es.png`) with call
  preferences in truncated segmented controls (W3) and the Settings page that
  opens on five utility cards (`uiux-map/web/settings/simple-full__phone__light__es.png`)
  both become grouped rows of one line each, each opening its own short screen:
  Casa (Personas, Visitantes reconocidos, Módulos), Tu cuenta (Sesiones y
  dispositivos, Privacidad, Llamadas de Argus), Argus (Ajustes, Actividad,
  Apariencia, Idioma), and Cerrar sesión. Ajustes opens on the recommended
  profile as a `Status` ("Equilibrado · Recomendado para este equipo"), then
  rows. The "Sencillo / Avanzado" toggle becomes one row, "Opciones avanzadas".
  Call preferences use `Choice`, which turns into a list when the values do not
  fit, so nothing reads "A." again. Module lifecycle (install, disable,
  uninstall, purge) stays in Módulos with `Confirm` copy that matches the
  choice (W4).
- **States:** each sub-screen uses `ResourceView`; failed service status says
  which service ("La transcripción no responde"), not raw keys (W5, A9).

### 9.10 Onboarding (bienvenida, vincular, entrar)

- **Purpose:** from a new phone to a working Argus in three steps, with
  nothing to learn first.
- **Primary action:** one per step: Comenzar → Conectar → (face) → Aceptar.
- **Removed / merged:** the 12 s mascot orbit choreography with labels the
  mascot covers (W34, `uiux-map/web/welcome/hero-still__phone__light__es.png`).
  The welcome becomes the mark (or a still mascot pose), "Hola, soy Argus", one
  sentence, the privacy promise as a chip, Comenzar, and "Tengo una invitación"
  as a ghost button. Pairing (`uiux-map/web/pairing/idle__phone__light__es.png`)
  shows a step indicator (1 of 3), six code boxes, and the discovery result as
  a fact ("Encontré a Argus de Casa en tu red"); the address is a secondary
  path. Copy is per platform: no "este teléfono" or "Escanea" on desktop (W20).
  Face login keeps the live guidance in one chip and the manual capture as a
  ghost button. Desktop login by QR (`uiux-map/web/login/qr__desktop__light__es.png`)
  sits in a centred 480 px card, not a small block in an empty canvas (W33).
  The privacy consent is one screen of rows with switches and a "Leer el aviso
  completo" sheet; a save failure stays on screen with Reintentar (W25).
- **States:** discovering, found, not found (address opens), invalid code,
  network, fingerprint mismatch (stop with a plain explanation), paired; face:
  permission denied (Settings button), guidance hints, already registered.

## 10. Details checklist (every screen must pass)

A screen is not done until each line holds on Android, iOS and the desktop
build. The checks marked (gate) become automated in R8 (layout audit, a11y tree,
visual baselines). The rest are a review list in the PR template.

**Touch and feedback**

- [ ] Every target ≥ 48 dp (44 pt minimum on iOS), ≥ 8 dp apart; 24 px minimum
      on pointer-only desktop (gate: `smallTargets` = 0 on touch viewports)
      ([WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html),
      [Android](https://developer.android.com/guide/topics/ui/accessibility/apps)).
- [ ] Press feedback from `PressableSurface` only: ripple on Android, highlight
      or opacity on iOS, hover and focus ring on web. No raw `Pressable` (gate).
- [ ] Haptics only on these, through `feedback()`: `selection` (switch, choice,
      check, tab re-tap); `success` (saved, mode changed, task done);
      `warning` (siren, panic confirmed, destructive confirmed); `impactLight`
      (hold-to-talk start/stop, long press opening a menu). Never on scroll,
      never on every tap. The "Vibrar al confirmar" setting turns them off.
- [ ] Single-flight on every mutation button (`busy`), so no double submit
      (A14, rule F13).

**Sheets, dialogs, alerts**

- [ ] Phone: forms and pickers in a native sheet (`Sheet`), with a grabber,
      detents `auto` → `large`, drag to dismiss, Back closes it (A15), and
      dismissal with unsaved text asks to discard.
- [ ] Medium+ and web: the same `Sheet` is a centred dialog or right side
      sheet, Esc closes it, focus is trapped and returned, Ctrl/⌘+Enter
      submits.
- [ ] Irreversible or loud actions use `Confirm` (native alert on phones) with
      a named verb; reversible actions use Deshacer instead.

**Keyboard and input**

- [ ] The focused field stays visible above the keyboard, in sheets too (A6).
- [ ] The Return key shows the next action ("Siguiente" between fields,
      "Guardar"/"Enviar" on the last) and performs it.
- [ ] Correct keyboard type and autofill per field (code → number pad with
      uppercase letters where needed, email, time).
- [ ] Errors appear under the field in words after the first submit, never as
      a grey placeholder inside a red border (W23).

**Layout and text**

- [ ] Safe areas respected. Edge-to-edge with the status bar tinted from
      `bg`, and a scrim where content scrolls under it (A20). Android nav bar
      transparent.
- [ ] No truncation of what matters: times, names, amounts and states wrap
      instead. Only secondary meta may truncate to one line, and its full text
      is available (gate: truncation count on key fields = 0).
- [ ] Holds at font scale 1.0, 1.3 and 2.0 (body and meta scale to 2.0;
      display and title cap at 1.5), at 320 px width, and in phone landscape
      (gate: the UI-map viewports plus font-scale states).
- [ ] Icons 20 or 24, stroke 1.75, from the registry only.

**States and data**

- [ ] Loading shows a skeleton with the final layout's shapes; no spinner in a
      list (gate: no `ActivityIndicator` in features).
- [ ] Empty shows one sentence and one helpful action, and only through
      `ResourceView` (gate, rule F11).
- [ ] Stale and offline are labelled with the time of the data; failure shows
      Reintentar; nothing failed reads as empty.
- [ ] Optimistic updates show the result at once and offer Deshacer (5 s); a
      write the server refused rolls back with a toast that names it ("No pude
      guardar «Pagar la luz»").
- [ ] Pull-to-refresh on feeds and lists that come from the server (Novedades,
      Lo que pasó, Personas, Sesiones). Not on forms or on screens painted only
      from local sync data, where it would do nothing.

**Language and formatting**

- [ ] Dates, times and numbers through `useDateFormatter` / `Intl` with the
      device locale (es-PE, es, en) and the device's 12/24 h setting; relative
      times ("hace 5 min") for the last hour, then the clock time; units in
      words ("1 hora", never "3590 s", W22).
- [ ] No raw keys or server vocabulary in the UI (gate: wire validation, R2).
- [ ] Copy follows §12.

**Theme and motion**

- [ ] Light and dark checked side by side; no control nearly vanishes (W37);
      visual baselines in both (gate).
- [ ] Transitions within §7's durations; none with reduce motion.
- [ ] Status never by colour alone: always an icon or a word.

## 11. Accessibility rules

- Text contrast ≥ 4.5:1, icons and control borders ≥ 3:1, in both themes,
  checked from `tokens.ts` by a unit test (WCAG 1.4.3, 1.4.11).
- Text scales with the OS: `allowFontScaling` stays on; `maxFontSizeMultiplier`
  2.0 for body/meta/caption and 1.5 for display/title. That meets WCAG 1.4.4's
  200% target where it matters
  ([RN Text](https://reactnative.dev/docs/text)). Today's global 1.6 cap goes.
- Every interactive element has a role and a label, required by the
  primitives' types; the tab bar uses `tab` roles with the selected state; the
  alert `Status` is announced (`role="alert"` / live region); toasts are
  polite live regions.
- Reading order follows the visual order; the screen title is the first
  heading.
- Focus is visible on web and desktop (2 px accent ring, 3:1) and never hidden
  by the sticky bar or a toast (WCAG 2.4.11).
- Reduce motion and reduce transparency are honoured (the tab bar blur becomes
  solid).
- Hold-to-talk and hold-to-confirm panic have tap alternatives for users who
  cannot hold: tap to start / tap to stop, and a two-step confirm.

## 12. Copy tone

Neutral Spanish for Peru and Latin America, using tú, short and calm. English is
second and is written natively, not translated word for word.

- Say how things are in one sentence: "Todo tranquilo en Casa", "Luis llegó a
  casa", "Sin conexión con Argus. Muestro lo de las 15:32."
- Start buttons with a verb and name the object: "Ver cámara", "Hacer sonar",
  "Borrar los datos". Never "OK", "Sí" or "Aceptar" alone in a confirmation.
- No technical words: "Argus" or "tu casa", not "servidor", "sync", "token",
  "endpoint", "módulo de vigilancia". "Lugares", not "Entornos".
- An error says what happened and what to do: "No pude guardar «Pagar la luz».
  Reintentar." Never "Error", never a code.
- No exclamation marks, no "¿Estás seguro?", no "¡Ups!". Argus does not start
  every reply with "Entendido," (A22).
- Avoid regionalisms that read as informal or foreign in Peru ("ahorita",
  "vale", "coger").
- Numbers keep their units, and dates are relative only when that is clearer.
- One name per thing everywhere, with a glossary kept in i18n: Seguridad (never
  Vigilancia/Surveillance in one place and Security in another, W19), Por
  hacer / En curso / Hecha, Recordatorio, Evento, Tarea, Lugar, Episodio ("lo
  que pasó"), Visita esperada.

## 13. Decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| R-D1 | Bottom bar: Inicio · Seguridad · **Argus (centre)** · Agenda · Tú, with Novedades inside Inicio and no bell | yes |
| R-D2 | Actions in ink (black/white), with arena as the single accent, replacing the grafito + arena pair | yes |
| R-D3 | Body text 16 and system fonts, no custom font | yes |
| R-D4 | Remove the floating "+"; create from Agenda/Proyectos "+" or by asking Argus; long press on Argus for quick create | yes |
| R-D5 | Merge Cámaras into Seguridad; split the camera page into live + Ajustes de la cámara | yes |
| R-D6 | Agenda views: Hoy + Calendario (month on phone, week from tablet up) + Proyectos; drop Day and Agenda-list views | yes |
| R-D7 | Projects on phone as a list grouped by state; board only on wide screens | yes |
| R-D8 | Native sheets with react-native-true-sheet v3 (spike first; gorhom as fallback); sonner for toasts; expo-haptics | yes, after the spike |
| R-D9 | Font scale cap raised from 1.6 to 2.0 for body text | yes |
| R-D10 | Panic as hold-to-confirm "SOS" in Seguridad (and in the guest's Inicio) | yes |
| R-D11 | The mascot only in onboarding and the voice call; the orbit hero and the "+" morph go | yes |
| R-D12 | Rename "Entornos" → "Lugares", "Vigilancia" → "Seguridad" everywhere | yes |
| R-D13 | The Argus tab opens the Argus thread directly; conversations with people sit behind its header | yes; alternative: a conversations list with Argus pinned first |

## 14. Order of work

1. R5 lands `tokens.ts` with §3's values (one edit later if R-D2/R-D3 change).
2. R6 builds the 23 components of §4 in `ui-lab` with baselines at three
   widths × two themes, plus the TrueSheet spike (R-D8).
3. Navigation (§9.0) and Inicio first: they change the first impression and
   remove the most code.
4. Then Seguridad + Cámara, Agenda + Proyectos, Argus, Tú/Ajustes/Personas,
   and onboarding last (it already works and is seen once).
5. Each screen lands only when it passes §10 and its UI-map states are
   re-captured. Deleted components go in the same change (no dead code).

## Appendix: sources

- Threads layout: [9to5Google hands-on](https://9to5google.com/2023/07/07/threads-android-app-brief-review/),
  [SamMobile on web](https://www.sammobile.com/news/instagram-threads-available-web/),
  [refero style teardown](https://styles.refero.design/style/3b46c64e-b733-4d70-8cd0-531ca1f92937),
  [visual review](https://medium.com/@photog-rahul/threads-visual-review-dc95adc6632a),
  [logo and type](https://www.logolounge.com/news/threads-distinguishes-itself-from-parent).
  Threads' current mobile tab set and font were not confirmed by a primary
  source; the spec does not depend on them.
- Disclosure and onboarding: NN/g
  [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/),
  [bottom sheets](https://www.nngroup.com/articles/bottom-sheet/),
  [mobile tutorials](https://www.nngroup.com/articles/mobile-tutorials/),
  [empty states](https://www.nngroup.com/articles/empty-state-interface-design/),
  [hidden navigation](https://www.nngroup.com/articles/hamburger-menus/).
- Security UX: [SimpliSafe modes](https://support.simplisafe.com/articles/using-your-system/how-to-arm-or-disarm-your-system),
  [Google Home redesign](https://blog.google/products/google-nest/google-home-app-gemini-redesign/),
  [Android notification channels](https://developer.android.com/training/notify-user/channels),
  [Parks Associates on false alarms](https://www.ravepubs.com/parks-associates-publishes-new-whitepaper-about-security-system-false-alarms).
- Accessibility: [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html),
  [2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html),
  [2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html),
  [Apple buttons](https://developer.apple.com/design/human-interface-guidelines/buttons),
  [Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps),
  [RN Text](https://reactnative.dev/docs/text),
  [RN AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo).
- Layout: [Android adaptive navigation](https://developer.android.com/develop/adaptive-apps/guides/build-adaptive-navigation),
  [Apple sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars).
- Design systems: [variant explosion](https://stevekinney.com/courses/enterprise-ui/maintaining-a-design-system),
  [shadcn model](https://vercel.com/academy/shadcn-ui/why-shadcn-ui-is-different).
- Libraries: see the links in §8.
