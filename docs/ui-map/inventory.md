# UI map: state inventory

This is the contract for the UI map capture (`tests/e2e/ui-map.e2e.ts`, scenarios in
`tests/e2e/ui-map/*.ts`, helpers in `tests/e2e/support/ui-map/`). Every screen of the app is
listed with its route, its purpose, and every condition that changes what it renders, read
from the code (`src/app`, `src/features`, `src/shared/components`). Each condition is marked:

- **[captured: `state-id`]**: the capture spec drives the fake backend into it; screenshots
  land in `uiux-map/web/<screen>/<state-id>__<viewport>__<theme>__<lang>.png`.
- **[web: not reachable]**: the exported web bundle cannot show it, with the reason.
- **[not captured]**: reachable in principle, left out to stay tractable, with the reason.

Run it with `bun run ui-map` (Chromium) and `ARGUS_UI_MAP_ENGINE=webkit bun run ui-map` (WebKit,
the engine family of the Tauri desktop). `ARGUS_UI_MAP_SCREEN` and `ARGUS_UI_MAP_STATE` narrow a
run; both take a comma list, and a state is selected when its id contains one of the parts. The
spec is skipped unless `ARGUS_UI_MAP_DIR` is set, so `verify` never runs it.

`ARGUS_UI_MAP_VIEWPORTS=proto` swaps the viewport set for the redesign prototype's frames:
proto-phone 360×760, proto-1280 1280×820, proto-1920 1920×1080 and proto-2560 2560×1440, every
selected state in light/es and dark/es. The default set and its names are unchanged without it.
`ARGUS_UI_MAP_THEMES=both` keeps the default viewports and shoots every selected state in light/es
and dark/es (without it only the main state gets dark).
Every manifest row carries `masks`: the viewport rectangles of the canvas and video elements
(`canvas`) and of the images and background-image frames (`media`), so a comparison can leave
animation and photo content out.

## How the web harness sees the app

- The app under test is the exported web bundle with the Tauri IPC shim (`tests/e2e/support/tauri-shim.ts`):
  `IS_WEB` and `IS_TAURI` are true, `IS_NATIVE` is false. Every phone-sized capture is the
  desktop/web code path at a phone width, not the React Native app. Native-only routes and
  branches are listed below as not reachable.
- The fake Argus (`support/fake-argus.ts`) answers HTTP by method and path with the
  `{status, info, errors}` envelope and serves `/sync`. The UI map adds a role context per state
  (`support/ui-map/roles.ts`, capability lists mirrored from the backend's `capability.hxx`),
  seeded rows (`support/ui-map/data.ts`), a baseline of answered routes
  (`support/ui-map/backend.ts`) and a fixed clock (Monday 2026-10-12 15:00, America/Lima).
- Every GET is answered after 1.2 s (`ARGUS_UI_MAP_LATENCY_MS`). With no latency the app drops
  remote resources that answer while the session is still starting (see the findings,
  `home/populated-fast-server`).
- Signed-in screens are reached the way a user reaches them: the app opens at `/` and navigates
  in-app. A cold deep link to a module route bounces to Home (captured as `agenda/deep-link-cold`
  and `camera-detail/deep-link-cold`).
- Breakpoints (`use-window-class.ts`): compact < 640, medium 640–1023, expanded ≥ 1024; short
  height < 500. Compact uses the bottom bar and bottom sheets; medium and expanded use the
  navigation rail, centered dialogs and dropdown menus.
- Viewports: phone-small 320×568, phone 360×800, phone-large 430×932, tablet-portrait 768×1024,
  tablet-landscape 1024×768, laptop 1366×768, desktop 1440×900, desktop-large 1920×1080,
  wide 2560×1440. Every state is captured at phone, tablet-portrait and desktop in light/es;
  every screen's main state at all nine; the main state again in dark/es and light/en at the
  three core sizes. When content scrolls, a second `-full` capture grows the viewport to the
  content height (fixed overlays then sit at the bottom of the tall image).

## Conditions that apply to every signed-in screen

| Condition | Where | Status |
|---|---|---|
| Role: owner, resident, guard, guest | `shared/libs/capabilities.ts`, `route-access.ts` | captured on Home, Profile, Cameras, Camera detail, Security, Environment, People |
| Inactive role (module of the role off) | `features/access` | captured: `inactive-role/*`, `profile/inactive` |
| Unknown role (a role this build does not know) | `accessView` | captured: `inactive-role/unknown-role`, `profile/unknown-role` |
| Module off: surveillance / productivity / all | `MODULE_APP_ROUTES`, nav, home sections | captured on Home, Users, Privacy gate, Agenda, Watch |
| Agronomy "coming soon" | welcome orbit, module catalog | captured: `welcome/*`, `modules/populated` |
| Before the context arrives (core only) | `EntryGate`, `coreCapabilities` | captured: `home/before-context`, `entry-gate/context-pending-splash` |
| Offline toast, offline icon, reconnected toast | `TopNoticeBar` | captured: `home/offline-toast`, `home/offline-icon`; reconnected toast not captured (transient, 4 s) |
| Route unreachable / remote unavailable | `use-route-status` | captured: `home/route-unreachable`, `home/route-remote-unavailable` |
| Watchdog banner ("Argus hasn't answered since…") | `use-watchdog-notice` | not captured: needs 180 s offline (the fake heartbeat lacks the fields that would shorten it) |
| Privacy consent gate | `features/privacy` | captured: `privacy-gate/*` |
| Theme light/dark, language es/en | storage `app.theme`, `app.language` | main state of every screen |
| Toasts (success, error with Retry, undo) | `Toaster` | captured where an action fails (`*-error-toast`, `privacy-gate/accept-failed-toast`) |
| Parked error icon in the top bar | `TopNoticeBar` | not captured (needs an error toast with an action to time out) |
| Incoming call surface (normal, critical) | `IncomingCallSurface` | captured: `home/incoming-call`, `home/incoming-call-critical` |
| Call pill | `CallPill` | web: not reachable in a stable way (the shim's `argus_rtc_join` returns null; leaving `/call` ends it) |
| Watch pill | `WatchPill` | captured: `home/watch-pill` |
| In-app alert banner | `features/in-app-alert` | web: not reachable (fed only by the native push module) |
| Module job toasts (ready / failed) | `ModuleNotices` | not captured (needs a live job transition frame) |
| Nav rail tooltip | `nav-rail.tsx` | captured: `home/nav-tooltip` (rail widths only) |
| Compose menu | `compose-fab.tsx` | captured: `home/compose-menu` |
| Disarm / current-code PIN dialog | `DisarmPinDialog` | captured: `environment/mode-pin-dialog` |
| Confirm dialog | `ConfirmDialog` | captured in many flows (`*-confirm`) |
| Reduced motion | `use-reduce-motion` | all captures run with reduced motion except `welcome/hero-motion-*` |

## Native-only screens and branches (never on web)

| Route / branch | Guard | What it holds |
|---|---|---|
| `/qr` | `Stack.Protected guard={IS_NATIVE}` + `IS_WEB` redirect | QR scanner: requesting, searching, detected, invalid, camera blocked, manual entry, torch, purposes server/invite/login |
| `/approve` | `Stack.Protected guard={IS_NATIVE}` | Approve another device: idle, checking, confirm (origin, warning outside the LAN), approving, approved, expired, error |
| `/welcome/invitation` | welcome layout `Stack.Protected` | Invitation: idle, resolving, accepted, error, fingerprint mismatch, revoked by a module |
| `/welcome/privacy` | same | Onboarding consent (owner: core signal; invited: four signals), decline toast |
| `/welcome/face` | same | Face enrol/login: intro, permission denied, capture sheet, guide hints, manual capture after 8 s, stuck hint after 15 s, every face error, already registered |
| `/welcome/permissions` | same | Permission list, all granted |
| `/welcome/modules` | same | Module picker: loading, waiting for server, ready, disk does not fit |
| `/welcome/module-privacy` | same | Module privacy choices |
| `/welcome/voice` | same | First call with Argus |
| `ServerUnreachable` at entry | `EntryGate` returns `login` on web before probing | Native signed-out entry when `/pairing/status` fails |
| Welcome "I have an invitation" | `IS_NATIVE` | Second hero button |
| Native context menus, native sheets, long-press menus | `IS_NATIVE` | Agenda/projects long-press, adaptive menus on touch |
| Camera live view (native player), clip player (native) | `.native.tsx` | |
| Native push, call push, CallKit, vibration | native modules | |
| `/ui-lab`, `/camera-lab` | `if (!__DEV__) <Redirect href="/">` | Dev labs; the exported bundle redirects to Home |

## Screens

### Root: splash (SessionGate)
- Route: every route, before the session is restored. `features/auth/components/session-gate.tsx`, `brand-splash.tsx`.
- Purpose: branded splash while secure storage is read.
- Conditions: default (mark, title, spinner) [web: transient, under 100 ms]; slow after 6 s
  [captured: `splash/slow-keyring`]; slow + Tauri keyring hint [same capture: the hint is
  always shown under the shim].

### Entry gate and route fallback (`(app)` layout)
- `features/auth/components/entry-gate.tsx`, `shared/libs/route-access.ts`.
- Conditions: unpaired → `/welcome`; paired but signed out → `/login` on web; context pending on a
  module route → splash up to 3 s [captured: `entry-gate/context-pending-splash`, the splash itself is
  gone by the first screenshot and the capture shows the core-only Home it falls back to];
  route refused → `/` or `/profile` [captured as `*-redirect` states: `agenda/module-off-redirect`,
  `watch/module-off-redirect`].

### Privacy gate
- Route: wraps every `(app)` screen. `features/privacy/components/privacy-gate.tsx`, `consent-form.tsx`.
- Purpose: consent to the privacy notice before using the app on the device.
- Data: `GET /privacy/me` (fails open on error), `PUT /privacy/me`, `PATCH /auth/logout`.
- Conditions:
  - not decided → "Revisa tu privacidad" [captured: `privacy-gate/review`, main]
  - decided on an older notice → "El aviso cambió", choices pre-set [captured: `updated`]
  - a signal the Owner turned off for the household → disabled switch + hint [captured: `household-off-signal`]
  - surveillance off → only the core signal [captured: `surveillance-off`]
  - full notice dialog [captured: `notice-dialog`]
  - decline confirm [captured: `decline-confirm`]
  - save fails → toast, gate returns [captured: `accept-failed-toast`]
  - loading / submitting spinner [web: not visible; the optimistic mutate unmounts the form at once]

### Welcome (`/welcome`)
- `features/auth/screens/welcome-screen.tsx`, `components/welcome-mascot/*`.
- Purpose: first-run hero for an unpaired device.
- Conditions: layout stacked (narrow) vs side by side (expanded or landscape ≥ 900); intro
  choreography (12 s) vs reduced-motion still pose; language switch ES/EN; hero replay on press;
  agronomy "coming soon" chip; signed-in device can still open it.
- Captured: `hero-still` (main), `hero-motion-early`, `hero-motion-settled`, `hero-signed-in-device`.
- Not reachable: "I have an invitation" (native only).

### Pairing (`/welcome/pairing`)
- `features/auth/screens/pairing-screen.tsx`, `hooks/use-pairing-flow.ts`.
- Purpose: link the device to the home server by code (and address).
- Conditions: idle with manual entry open on web [captured: `idle`, main]; address field open
  [captured: `address-open`]; errors invalid code [captured: `error-invalid-code`], server not found
  (auto-opens the address) [captured: `error-not-found`], invalid address [captured:
  `error-invalid-address`], network [captured: `error-network`]; discovering spinner [not captured:
  needs the shim to hold `argus_discover`]; parsing / linking texts [dead: never painted]; success
  "Servidor vinculado" [web: not reachable, the shim does not implement `argus_pair`]; already
  paired / declined / fingerprint mismatch [web: same reason]; step indicator [hidden on web: one step].

### Login (`/login`)
- `features/auth/screens/login-screen.tsx`.
- Purpose: desktop sign-in by a QR the phone approves.
- Data: `GET /pairing/status`, `POST /auth/device-login`, poll `GET /auth/device-login/{id}`.
- Captured: `qr` (main), `loading` (status held), `waiting-owner`, `expired`, `denied` (the
  phone answered «No fui yo»), `error`, `error-unpaired-device`. Approved ("¡Listo!") [not captured: shows for 600 ms, then redirects].

### Not found (`+not-found`)
- Captured: `signed-in` (main), `unpaired`.

### Home (`/`)
- `features/home/screens/home-screen.tsx` and its components; `features/reminders`,
  `features/response`, `features/modules` chip and checklist, shell overlays.
- Purpose: the dashboard: alerts for the user, reminders, camera activity, today, projects,
  cameras, security, summary, notifications.
- Data: sync tables (reminder, calendar_event, project, project_task, camera, notification,
  conversation_message, user), `GET /notification/responses`, `/camera/overview`,
  `/guard/environments`, `/guard/proximity/me`, `/rtc/watch`, `PATCH /notification/read`.
- Conditions and captures:
  - populated [captured: `populated`, main]; same data with no latency [captured: `populated-fast-server`]
  - the populated data with no open incident [captured: `calm`]; Noche mode at 23:18 [captured:
    `night`]; one camera, nothing scheduled and the getting-started list [captured: `sparse`]
  - Ctrl+K on Inicio [captured: `command-open`]
  - new household (nothing synced, no environments) [captured: `empty-new-household`]
  - many items and long text: 14 projects, 46 notifications, 12 reminders, long name [captured: `many-long`]
  - before the context arrives [captured: `before-context`]
  - offline toast / icon, route unreachable / remote unavailable [captured]
  - bell popover with unread / empty [captured: `bell-popover`, `bell-popover-empty`]
  - compose menu [captured]; search with matches / no match [captured]
  - response card variants: active (in `populated`), unanswered with emergency contacts, attended
    + discreet note, confirmed panic, false-alarm confirm [captured: `response-*`]; camera inside the
    card [not captured: live view does not paint on web]
  - incoming call normal / critical [captured]; watch pill [captured]
  - module install chip downloading / failed, getting-started checklist, all modules off,
    productivity off, surveillance off [captured]
  - roles resident, guard, guest [captured]; inactive and unknown role → `inactive-role/*`
  - nav rail tooltip [captured]
  - reminders: done list open, snooze menu, options menu (series), edit dialog, dialog
    validation errors [captured: `reminders-done-open`, `reminder-snooze-menu`,
    `reminder-options-menu`, `reminder-dialog`, `reminder-dialog-errors`]; snooze/complete/delete
    toasts [not captured: transient]
  - notification thread expanded, thread actions (module request "Activar", watch "Continuar
    aquí", visitor reply, tamper answers) [partly in `populated`/`many-long`; expanded thread not captured]
  - notification delete undo toast [not captured: transient]

### Inactive role (Home when `roleActive` is false)
- `features/access/screens/inactive-role-screen.tsx`.
- Captured: `module-guard` (main), `module-already-asked`, `paused-resident`, `unknown-role`,
  `sign-out-confirm`. Request outcome toasts [not captured: transient].

### Novedades (`/notification`)
- `features/home/screens/news-screen.tsx`.
- Captured: `populated` (main), `many`, `filter-security`, `filter-pending`, `empty`.

### Notification link (`/notification?notificationId=`)
- Captured: `gone` (main): an id not among the synced rows reads «Este aviso ya no está» above
  the feed once the first sync settled. Redirects for found ids [not captured: they leave the
  screen at once].

### Agenda (`/agenda`)
- `features/agenda/*`. Productivity module; owner and resident.
- Conditions: default view by width (Day compact, Week medium, Month expanded); Day, Week, Month,
  Agenda list; empty and populated; other day ("Volver a hoy"); crowded day (32 events) and
  "+N" in month cells; entry states (upcoming, in progress, today, ended, overdue, done, task
  states); recurring series and occurrence options; detail dialog; options menu; create form,
  validation errors, all-day, day picker; edit form (deep link `?edit=`); share dialog; save
  error toast; read-only role; module off redirect; cold deep link bounce.
- Captured: `default-view` (main), `empty-default-view`, `deep-link-cold`, `day`, `week`, `month`,
  `agenda-list`, `month-empty`, `agenda-list-empty`, `day-next-not-today`, `day-crowded`,
  `month-crowded`, `entry-detail`, `options-menu`, `occurrence-options-menu`, `create-form`,
  `create-form-errors`, `create-form-all-day`, `day-picker`, `edit-form`, `share-dialog-empty`,
  `save-error-toast`, `read-only-guest`, `module-off-redirect`.
- Not captured: pending optimistic row (needs `info: null` answers held 60 s), undo toasts
  (transient), the "Loading more" footer of the list view (fires once and resolves).

### Projects (`/projects`)
- `features/projects/*`. Productivity module; owner and resident; per-project access owner/edit/view/none.
- Captured: `populated` (main), `empty`, `many-long`, `coming-up-empty`, `view-only-member`,
  `status-menu`, `new-project-form`, `new-project-errors`, `edit-project-form`,
  `delete-project-confirm`, `new-task-form`, `edit-task-form`, `members-dialog`, `save-error-toast`.
- Not captured: drag between lanes (pointer gesture), pending project (60 s optimistic window).

### Conversations (`/conversations`, `/conversations/[id]`)
- `features/conversations/*`. Core (`messages.relay`).
- Captured: `list-populated` (main), `list-empty`, `list-many-unread` (99+), `thread-argus`,
  `thread-member` (reply quote, long text), `thread-member-long-draft` (over 500 characters),
  `thread-actions-confirm`, `thread-empty`, `thread-invalid-id`, `mark-read-failed-toast`.
- Not captured: send failure toast (needs a typed send), voice composer without a microphone
  (the shim always offers voice).

### Activity (`/settings/activity`)
- `features/activity/*`. Owner (`activity.read`).
- Captured: `populated` (main, with every sentence kind and a next page), `empty`, `failed`,
  `loading`, `pick-dates`, `period-all-clear-filters`. "Could not load more" footer [not captured].

### Cameras (`/cameras`)
- `features/cameras/screens/cameras-screen.tsx` and components. Surveillance (`camera.view`).
- Conditions: populated with online, offline, disabled, privacy-masked cameras and health
  warnings; empty with and without the connect button; many cameras and long names; one camera
  (featured card); grid vs list density; sort menu; search with no match; recording paused
  banner; role guest; connect wizard model step and connection validation errors.
- Captured: `populated` (main), `empty`, `empty-guard`, `many-long`, `single-featured`,
  `list-density`, `sort-menu`, `search-no-match`, `recording-paused-banner`, `guest`,
  `connect-wizard-model`, `connect-wizard-connection-errors`.
- Not captured: connection test step (needs `POST /camera/probe` answers per outcome), details
  step, live previews (never paint on web), snapshot thumbnails (no image fixtures).

### Camera detail (`/cameras/[id]`)
- `features/cameras/screens/camera-detail-screen.tsx` and panels.
- Conditions: live stage states (connecting, reconnecting, offline, unavailable, too many
  viewers, disabled, privacy); panels by role and capability (call, siren, watch, info,
  environment, maintenance, aim, patrol, settings, zones, clips); dialogs (edit, zone, siren,
  typed announcement, patrol, place draft, fullscreen); cold deep link.
- Captured: `owner-connecting` (main), `deep-link-cold`, `live-offline`, `live-unavailable`,
  `live-too-many-viewers`, `disabled-camera`, `privacy-camera`, `offline-camera-onvif`,
  `resident`, `guard`, `guest`, `header-menu`, `edit-form`, `add-zone-form`, `siren-confirm`,
  `typed-announcement`, `patrol-dialog`, `add-place-draft`, `fullscreen`.
- Web: not reachable: the painted live picture, PTZ pad, stats pill, audio toggle, quality
  fallback notice (need binary fMP4 frames or a WebRTC answer the fake cannot produce); clip
  playback (MSE H.264 is not in headless Chromium); an active camera call (needs a microphone
  and media socket frames).

### Security (`/security`)
- `features/security/screens/security-screen.tsx` and components. Surveillance (`guard.read`).
- Captured: `populated` (main), `single-environment`, `empty`, `load-error`,
  `many-environments-masked` (4 environments, masked camera, paging), `resident`, `guard`,
  `new-environment-form`, `add-visitor-form`, `maintenance-dialog`.
- Not captured: episode timeline expanded (needs `GET /guard/episodes/{id}`), tamper evidence
  images, review toasts.

### Environment (`/security/[id]`)
- `features/security/screens/environment-screen.tsx` and panels.
- Captured: `owner` (main), `not-found`, `masked-cameras`, `response-load-error`, `resident`,
  `guard`, `actions-menu`, `mode-pin-dialog`, `add-contact-dialog`, `camera-context-editor`.
- Not captured: hours editor dialog, remove-environment confirm.

### Watch (`/watch`)
- `features/watch/*`. `assistant.voice` + surveillance.
- Captured: `live-speaking` (main), `empty`, `waking-discreet`, `resumable`, `visitor-device`,
  `ended`, `end-confirm`, `module-off-redirect`.

### Personas (`/users`, `/people/[id]`), Owner
- `features/people/screens/people-screen.tsx` (one screen for `/users`, `/people` and
  `/people/[id]`), its rows, invitations, person detail and sheets.
- Captured: `populated` (main: member rows with presence in words, invitations in every state,
  visitors row, household privacy; on desktop the first person beside the list), `only-owner`,
  `many-long`, `surveillance-off`, `panels-failed`, `new-invitation-sheet`, `invite-from-profile`
  (`?invite=1`), `invitation-qr`, `person`, `person-inactive`, `person-self`, `person-missing`,
  `person-sessions-failed`, `edit-person-sheet`, `deactivate-confirm`, `role-guard-paused`.
- Not captured: invitation used/closed live transitions, watchman/visitor acknowledgement
  dialogs, entrance sign dialog, minor/guardian confirms, biometric erase result toast.

### People directory (`/people`), Guard
- Captured: `guard-populated` (main), `guard-person`, `owner-directory` (the Owner reads the same
  Personas at `/people`). Portrait image [not captured: needs image fixtures].

### Visitors (`/users/visitors`, `/users/visitors/[id]`)
- Captured gallery: `populated` (main), `empty`, `recognition-off`, `merge-mode`.
- Captured detail: `populated` (main), `missing`, `loading`.

### Proximity (`/settings/proximity`, `/settings/proximity/people`)
- Captured devices: `populated` (main), `empty`, `failed`, `receiver-dialog-errors`, `radar-dialog`.
- Captured people: `populated` (main), `empty`.

### Settings (`/settings`)
- `features/settings/*`. Owner.
- Captured: `simple` (main: first-run banner, profiles, connection notice, owners), `advanced`,
  `advanced-mode-stored`, `failed`, `empty-owners`, `profile-preview`, `export-dialog`,
  `import-dialog-invalid`.
- Not captured: voice preview playback, install progress polling, profile apply result toasts.

### Modules (`/settings/modules`)
- `features/modules/*`. Owner.
- Captured: `populated` (main, detailed catalog), `brief-catalog-only`, `waiting-for-server`,
  `installing`, `install-failed`, `paused-insufficient`, `disabled-and-kept`, `disable-dialog`,
  `uninstall-dialog`, `uninstall-purge-typed`.
- Not captured: PIN prompt during uninstall (needs a 403 then a retry), cancel-install confirm.

### Profile (`/profile`)
- `features/profile`, `features/sessions`, `features/safety`, call preferences, privacy,
  proximity, module requests, preferences aside.
- Captured: `owner` (main), `resident`, `guard`, `guest`, `inactive`, `unknown-role`,
  `panels-failed`, `loading`, `only-session`, `sessions-empty-list`, `safety-reach-nobody`,
  `calls-off`, `privacy-undecided`, `sign-out-all-confirm`, `pin-setup-dialog`, `phrase-dialog`,
  `notice-dialog`, `unpair-confirm`, `theme-dark-selected`, `module-request-resident`.
- Not captured: panic press-and-hold states (2 s gesture), session revoke toasts.

### Call (`/call`)
- `features/voice/screens/call-screen.tsx`, `components/call-surface.tsx`.
- Captured: `mic-denied-error` (main), `connecting-rtc`, `listening-transcript` (a stub
  microphone, transcript lines and an action chip), `done`, `call-unavailable`, `settings-dialog`.
- Web: not reachable: thinking/speaking held (needs binary TTS frames), reconnecting (needs an
  RTC channel event), the in-call camera card painted, "Argus voice is on your phone" notice
  (under the shim WebRTC is always available).

## States the harness could not reach, and why

| State | Reason |
|---|---|
| Every native-only route and branch (table above) | `Stack.Protected guard={IS_NATIVE}` or an `IS_NATIVE` branch: the web bundle never mounts them |
| Pairing success, already paired, declined, fingerprint mismatch | the Tauri shim does not implement `argus_pair` (it answers `null`) |
| Live camera picture, PTZ pad, stats, audio toggle, quality fallback notice | needs binary fMP4 frames on `/media` or a WebRTC answer; the fake sends JSON only |
| Clip playback | MSE H.264 is not available in headless Chromium/WebKit |
| Camera call in progress, call thinking/speaking held, call reconnecting | needs microphone media and binary TTS frames or an RTC channel event |
| Call pill | the call ends when `/call` is left under the shim |
| In-app alert banner | fed only by the native push module |
| Watchdog banner | needs 180 s offline (the fake heartbeat lacks the fields that would shorten it) |
| Transient toasts (success, undo, reconnected), login "approved", pending optimistic rows | last 0.6–6 s or need 60 s held answers; not worth the run time |
| Portrait, visitor crops, camera thumbnails | no image fixtures |
| `/ui-lab`, `/camera-lab` | `__DEV__` only; the exported bundle redirects to Home |
