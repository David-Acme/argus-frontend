# Argus app redesign: specification

Status: proposal v3, 2026-10-20. Research, design spec and static prototype
only; no app code changes. Each version follows an owner review:

- **v1** set a calm, Threads-like base.
- **v2** responded to the review of v1 ("me agrada", but it must feel unique
  and new-era). It added the identity (§2b), the mascot as a living presence
  (§8b), the desktop and mobile idioms (§8c), the dismissal rule (§5.7), the
  error surfaces (§5.8) and the performance budget (§7b).
- **v3** responds to the review of v2: it felt too simplistic. David likes
  how today's app looks, so v3 takes **the existing design as its reference
  and improves it** (§1b): today's warm charcoal and sand palette, cards,
  chips, cream buttons and mascot, with the findings fixed and the new-era
  layer on top. v3 also specifies sheet + keyboard behaviour (§5.9) and
  chooses the sheet library on evidence (§8).

Companion files:

- `redesign-prototype/index.html`: static prototype. Each main phone screen
  shows **today's real capture next to the redesign**. It also has the
  identity, the mascot's eleven states, phone screens in dark and light, the details and
  states, and four interactive desktop screens with a dialog that closes when
  you click outside it and a ⌘K palette. It has toggles for reduced motion and
  reduced transparency. Open it in a browser.
- `mascot-proposals/index.html`: six mascot proposals for a male voice, with states, sizes and screens (v3.2).
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

Owner direction on v1 (David, 2026-10-20): it is above average, but it does not
feel like trying something unique, modern, "la nueva era". Keep the Argus
mascot and make it a native, living presence across the app. Desktop and
mobile must both feel right in their own idioms. Dialogs close when you click
or tap outside them. Every "wow" element must be one reusable primitive, not
per-screen code, and must add no code weight.

How this spec relates to the refactor plan and the rules: the owner decided
(2026-10-20) that the rules, the refactor and the redesign are implemented
**together**, after he approves the final design, so nothing is built twice.
This document is the design source those phases implement:

- §3 is the value set of `shared/theme/tokens.ts` (the plan's R5, rule F16).
- §4 is the primitive list of `shared/ui` (R6, rules F19/F20).
- §15 lists where this spec departs from the plan and the rules.
- §5 holds the patterns that `ResourceView`, `Sheet`, `Confirm`, `Toast` and
  the error surfaces implement (R1, rules F11/F13).
- §7b is the animation performance budget (R9, rule F27).
- The screens of §9 are rebuilt on those primitives in the same pass.

Nothing here is implemented yet.

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

## 1b. What today does well, and keeps

From the real captures (`uiux-map/android/02-fresh-start.png`,
`14-home-dark.png`, `30-security-dark.png`, `52-call-connected.png`,
`84-users-dark.png`, `110-home-light.png`), these are what make Argus look
good today. v3 keeps all of them:

- **The palette.** Warm charcoal `#181816` with `#24231E` cards in dark, warm
  paper `#F4F1ED` with white cards in light, cream (dark) or grafito (light)
  primary buttons, and arena/gold for icons and accents.
- **The cards.** Large rounded cards (about 24 dp) and rounded-square icon
  wells with gold line icons. Sections have bold headings ("Recordatorios",
  "Hoy", "Usuarios") with a quiet "Ver todo" link.
- **The chips.** The language chips (ES/EN), the status chips ("En casa",
  "1 en curso"), the count badges.
- **The mascot.** The white figure with the deerstalker, the lens and small
  arms. The large one in the call, the hero one on the welcome.
- **The calm, premium tone of the copy** («Hola, soy Argus», «Todo se queda
  en tu casa»).

What v3 fixes, and where:

| Problem in the captures | Fix |
|---|---|
| The greeting breaks mid-word beside three icon buttons (A2, W8) | the greeting becomes a meta line; the bell and calendar buttons go; the hero sentence wraps on words |
| Nine cards on Inicio; detection heatmap; empty states as tall as cards | Inicio becomes hero + chips, Ahora, a camera strip and Novedades (§9.1) |
| Six unlabelled icons + floating "+" | five labelled tabs in a floating pill, with the mascot in the centre (§9.0) |
| Truncated chips and counters ("Visitas acti…", "En casa des…") | chips wrap (`Cluster`); counters become sentences |
| Camera page 4,566 px; PTZ pad over "En vivo" | live screen + Ajustes de la cámara (§9.3) |
| Landscape rail clipped; font scale 1.3 clips | one layout system (§6), font-scale rules (§11) |
| Sheet rises over the status bar with the keyboard | §5.9 |

On top of that sits the new-era layer of §2b: the Aura, glass on what floats,
spring motion and the living mascot.

## 2. Principles

1. **Una presencia, no un tablero.** Argus is someone who lives with you, not
   a control panel. Every screen opens with one sentence that says how things
   are, spoken by Argus and coloured by the home's state (the Aura), and offers
   at most one primary action. Everything else is a row one tap away
   (progressive disclosure:
   [NN/g](https://www.nngroup.com/articles/progressive-disclosure/)).
2. **Calma, no alarma, con el calor de hoy.** Today's warm charcoal and sand.
   Colour carries state only:
   green for calm, amber for attention, red only for a real alert that needs
   you. An alert always says what happened, where, and the one thing to do.
3. **Se aprende usando.** No tutorials or carousels. NN/g measured no benefit
   from tutorials on simple apps, and users who read them rated tasks harder
   ([NN/g](https://www.nngroup.com/articles/mobile-tutorials/)). Empty states
   teach and offer the first action
   ([NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)).
4. **Pocas piezas, y lo especial también es una pieza.** About 26 components
   with few variants, each with its states, labels and target size built in.
   The identity (Aura, Presence, the glass material, springs, ⌘K) consists of
   primitives like any other. A screen is composed of them and adds no styling
   or animation of its own.
5. **Natural en cada plataforma.** One visual language, native mechanics. The
   phone gets thumb-reach actions, native sheets, gestures, alerts, haptics and
   press feedback. The desktop gets a sidebar, ⌘K, shortcuts, hover,
   multi-column layouts and pointer-sized dialogs. Never a phone sheet
   stretched across a monitor.
6. **Honesto con el estado.** Loading, stale, offline, refused and failed each
   look different. A failure is never shown as "nothing here". This follows
   rule F11 of the rules proposal.
7. **Para todos.** 48 dp targets, AA contrast in both themes, text up to 200%,
   status never by colour alone, and dark mode designed, not inverted.

## 2b. Identity: Argus as a presence

### The concept

Argus does not look like a dashboard. It looks like a calm presence that
lives in the home. At the top of the main screens a soft light field, the
**Aura**, breathes slowly in a colour taken from the home's state:

- warm sand when all is calm;
- indigo while Argus is on watch at night or while you are away;
- amber when something needs a look;
- a faster red pulse for a real alert;
- grey and still when the app cannot reach Argus.

Inside the Aura, Argus itself (the mascot) says how things are in one large
sentence: «Todo tranquilo.», «Buenas noches.», «Alguien en el patio.» Argus
wears its detective hat whenever it is on watch.

Talking to it is one signature gesture everywhere: **hold the centre of the
bar**. The screen's edge lights up, the mascot leans in to your voice, and you
let go to send.

Everything else keeps today's warm cards and chips, with more care. Glass appears only on
what floats: the bar, sheets, the desktop sidebar and the palette.

The novelty lives in four primitives:

- `Aura`;
- `Presence`;
- the `material` token;
- the springs.

None of it lives in screens, and each one has a still, solid fallback for
reduced motion and reduced transparency.

### What makes the admired 2025–2026 apps feel new (research)

- **Apple's Liquid Glass (iOS 26).** A translucent material for the
  *functional layer* only: controls, bars and transient UI. Bars float, shrink
  on scroll, and are concentric with the device's corners.
  - Apple's guidance: use a single floating pane, no glass on glass, and keep
    glass out of scrolling content.
  - Reduce Transparency frosts it and Increase Contrast makes it solid.
  - NN/g criticised legibility over noisy backgrounds, and Apple added a
    "Tinted" option in 26.1.
  - Lesson: take the floating, concentric depth; never put glass behind
    reading text. Sources:
    [Apple press release](https://www.nasdaq.com/press-release/apple-introduces-delightful-and-elegant-new-software-design-2025-06-09),
    [WWDC25 group lab](https://developer.apple.com/forums/thread/791070),
    [legibility settings](https://mobilesyrup.com/2025/06/10/how-apple-is-making-sure-liquid-glass-as-legible-as-possible/),
    [NN/g critique, summarised](https://anderegg.ca/2025/10/12/nielsen-norman-group-on-ios-26-usability),
    [26.1 Tinted](https://gulfnews.com/technology/companies/apple-yields-tinted-control-in-ios-261-beta-4-tones-down-liquid-glass-after-backlash-1.500315176).
- **Material 3 Expressive.** Google reports 46 studies with more than 18,000
  participants, and key elements found up to 4× faster, with older users as
  fast as younger ones. These are Google's own figures and have not been
  replicated.
  - The gain is credited to size, colour, shape and containment on the one
    thing that matters. Spring motion and shape morphing are the feel layer.
  - Lesson: make the important thing bigger, and let motion add feel rather
    than meaning. Sources:
    [9to5Google](https://9to5google.com/2025/05/05/material-3-expressive-leak/),
    [Dezeen](https://www.dezeen.com/2025/05/28/google-ushers-in-age-of-expressive-interfaces-with-material-design-update/amp/).
- **Linear, Raycast, Things 3, Arc to Dia.** They feel new because of speed,
  one signature interaction and restraint everywhere else.
  - Linear: "don't compete for attention you haven't earned"; themes from
    three inputs (base, accent, contrast).
  - Raycast: a big search bar, and shortcuts shown next to actions so users
    learn them.
  - Things 3: physical delight in small touches.
  - Arc paid a "novelty tax"; Dia hides power behind familiar UI.
  - Lesson for non-technical users: novelty in feel, never in navigation.
    Sources: [Linear redesign](https://linear.app/now/how-we-redesigned-the-linear-ui),
    [Linear refresh](https://linear.app/now/behind-the-latest-design-refresh),
    [Raycast](https://raycast.com/blog/a-fresh-look-and-feel),
    [Things 3](https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/),
    [Arc → Dia](https://every.to/podcast/inside-the-browser-company-why-they-killed-arc-to-build-dia).
- **AI assistants.**
  - Siri's edge glow responds to the voice and leaves the UI usable underneath.
  - ChatGPT moved voice *into* the chat with a live transcript and cards.
  - Claude's voice mode highlights key points as it speaks.
  - Gemini Live dims the camera image and outlines what it means.
  - Humane and Rabbit failed on latency, unreliability and trying to replace
    the phone.
  - Lesson: a living state signal that follows the audio, a live transcript,
    and grounding ("this camera, this reminder"). Reliability beats spectacle.
    Sources: [Siri glow](https://9to5mac.com/2024/11/03/new-apple-intelligence-siri-looks-different-works-the-same/),
    [ChatGPT voice in chat](https://www.androidauthority.com/chatgpt-voice-mode-in-chat-3619633),
    [Claude voice](https://ppc.land/claude-adds-voice-mode-to-mobile-apps/),
    [Gemini Live overlays](https://www.androidauthority.com/gemini-live-visual-overlays-audio-model-3586419),
    [Humane post-mortem](https://medium.com/@bossaresearch/anatomy-of-a-failure-the-humane-ai-pin-and-the-misfit-future-of-wearable-ai-04feedd82903).
- **Premium smart home.**
  - Apple Home: category summaries on top, up to four live cameras, and a
    floating glass bar in iOS 26.
  - Google Home (October 2025): three tabs, an "Ask Home" bar and a daily
    "Home Brief".
  - Ring: natural-language video search.
  - Lesson: calm status as one sentence, and history told as a story, not a
    log. Sources: [Apple Home iOS 16](https://www.macstories.net/stories/everything-new-coming-to-the-home-app-in-ios-16-and-macos-ventura/),
    [Google Home redesign](https://blog.google/products/google-nest/google-home-app-gemini-redesign/),
    [Ring search](https://9to5google.com/2024/10/09/amazon-ring-ai-video-search/).

### The levers, each one primitive

| Lever | Primitive | What it does | Reduced motion / transparency / contrast | Cost |
|---|---|---|---|---|
| The ambient status | `Aura` (tone: `calm`, `duty`, `attn`, `alert`, `off`, `listen`; `mode`: `field` / `band` / `edge`) | A 2–3 blob gradient field at the top of Inicio and Seguridad (field), a rounded band on desktop (band), or the screen-edge glow while listening (edge). Tempo per tone: 14–18 s drift calm, 3–4 s alert | Static gradient; with Increase Contrast, no field and a 3 px tone border on the edge mode | about 150 lines; `expo-linear-gradient` or a blurred view; no Skia |
| A living Argus | `Presence` (state, level, size) | The mascot, 11 states (§8b), driven by app state and voice level | Still pose per state | about 200 lines + one `.riv` asset; replaces about 1,600 lines of today's procedural mascot and avatar |
| The hero sentence | `Status` variant `hero` | One `hero` line per screen (36/40), spoken by Argus, with a cross-fade on change | Instant change | inside `Status` |
| Glass on floating chrome | `material` token used by `Nav`, `Sheet`, `Menu`, `Command` | Floating bar, sheet backdrop, desktop sidebar and palette. iOS 26 native glass (expo-glass-effect), Android 12+ blur (expo-blur `BlurTargetView`), web `backdrop-filter`, and a solid surface elsewhere | Solid surface with a hairline | about 60 lines in the four owners |
| Physical motion | `springs.ts`: `snappy` (presses, toggles), `gentle` (sheets, layout), `playful` (the mascot only); `usePressScale` | One feel everywhere; presses scale to 0.96 | `ReduceMotion.System`: end state at once | about 60 lines |
| One door for everything | `Command` (⌘K on desktop, the search button on phones) | Commands, search and "ask Argus" in one bar, with shortcuts shown beside actions | — | about 250 lines; replaces the Inicio search bar and the bell popover |
| The signature gesture | inside `Nav`: hold the centre tab | Hold to talk from any screen: the `Aura` edge mode, `Presence` in `listen`, haptic `impactLight` on start and stop, a live transcript pill | Tap the centre, then tap to stop | about 80 lines |
| Grounded answers | `FeedItem` / chat result chips + `Media` `focus` overlay | Argus shows what it means: "this camera" (a dimmed frame with a box around the detected person), "this reminder" (a chip that opens it) | Thicker outline, no dimming | about 80 lines |
| Live tiles | `Media` | A breathing live dot, frames refreshed with a short cross-fade; the tile grows into the live view | Static dot, cut instead of zoom | inside `Media` |

What is deliberately **not** done: no glass behind reading text, no
animated backgrounds behind lists, no novel navigation, no 3D or Skia
canvases (CanvasKit is 2.9 MB gzip on web, and about 4 MB on Android and 6 MB
on iOS: [Skia web](https://www.mintlify.com/shopify/react-native-skia/getting-started/web)),
and no more than one mascot per screen.

## 3. Tokens (the values R5 writes into `tokens.ts`)

### 3.1 Colour: today's warm charcoal and sand, consolidated

v3 keeps the palette the owner likes: warm charcoal (`#181816`) with
`#24231E` cards in dark, warm paper (`#F4F1ED`) with white cards in light,
cream or grafito actions, the arena accent and gold icons in rounded wells.
The values are today's `color.constant.ts`. What changes is that the 59
constants collapse into the roles below, from one source (rule F16), and that
each role gets a single job. v1's near-monochrome "ink" proposal is
withdrawn.

| Token | Light | Dark | Use (today's name) |
|---|---|---|---|
| `bg` | `#F4F1ED` | `#181816` | screen background (`background`) |
| `surface` | `#FFFFFF` | `#24231E` | cards, grouped rows, sheets, dialogs (`card`) |
| `fill` | `#E9E4DC` | `#312E27` | icon wells, inputs, chips, secondary buttons (`surface-secondary`) |
| `fill-press` | `#DDD6CE` | `#3B372F` | pressed state |
| `line` | `#ECE8E2` | `#2D2A25` | hairlines inside cards (`border-subtle`) |
| `text` | `#161616` | `#F4EFE7` | primary text (`foreground`) |
| `text-2` | `#57524E` | `#D4CBBF` | secondary text (`foreground-secondary`) |
| `text-3` | `#746D68` | `#AEA18F` | meta on cards (`muted-foreground`). On the light `bg` it measures about 4.4:1, so meta placed directly on `bg` uses `text-2` |
| `ink` / `on-ink` | `#404040` / `#FAF8F5` | `#E4E1DB` / `#1A1713` | primary button, selected switch, checked box: today's grafito and cream (`interactive`) |
| `accent` | `#836A3C` text, `#B89A63` fill | `#D9BC85` | icons in wells, unread dot, focus ring, selection, Argus (`accent`, `accent-strong`) |
| `accent-soft` | `#F3E7D2` | `#332A1C` | accent wells (`accent-soft`) |
| `ok` / `ok-soft` | `#3B7B4F` / `#E3EFE5` | `#63AE73` / `#1C2B20` | calm, online, done (`success`) |
| `attn` / `attn-soft` | `#9A6114` / `#F8EBD6` | `#E5BC69` / `#33281A` | attention, review, stale (`warning-strong`) |
| `alert` / `alert-soft` | `#CC3535` / `#FBE4E2` | `#C9706B` / `#3A1F1C` | real alerts, destructive (`error-strong`) |
| `scrim` | `rgba(28,25,21,.32)` | `rgba(12,11,10,.5)` | behind sheets and dialogs (`overlay`) |

Rules:

- About 18 roles per theme instead of 59 constants. The text-safe "strong"
  values of today become the role values themselves; fills that cannot carry
  text (`accent` light fill `#B89A63`, `warning` `#E7A44A`) are named as
  fills. A unit test computes every text/background pair from `tokens.ts`
  (rule F20).
- **Cards keep today's look, with more care:**
  - radius 24 (sheets and the bar 28 or full);
  - no border in dark, with a 1 px top highlight (`rgba(255,255,255,.035)`)
    and a soft shadow that gives depth;
  - in light, a warm two-layer shadow;
  - rows inside a card are separated by inset hairlines;
  - icons sit in 42 dp rounded wells (radius 14) in the accent colour, as
    today.
- Event colours in the calendar map to five muted tints derived from these
  roles. The raw "blue" of W24 is gone.
- Dark mode: no pure black. Fills sit above surfaces, so checkboxes, empty
  cells and off switches stay visible (W37). Status colours are lighter, not
  inverted.
- Illustration colours (the mascot, procedural avatars) live in
  `tokens.illustration`, as the plan already says.
- **Aura tones** (fills only, never text; light / dark, three stops each):
  `calm` `#EBD9B4 #F3E7CF #E3EBDF` / `#5C4621 #332918 #3B2D1A`; `duty`
  `#C9CEE8 #E3E2F0 #D9E2EC` / `#262C52 #1A1D33 #162430`; `attn` `#F2CF95…` /
  `#5A3D12…`; `alert` `#F1AFA6…` / `#6A231E…`; `off` `#E2E0DC…` / `#2D2B28…`;
  `listen` `#E7C98E…` / `#5C4520…` (full values in the prototype). Text over
  the Aura uses `text` and `text-2`, and the Aura fades to `bg` before the
  content starts, so contrast is measured against `bg`.
- **Material:** `glass` `rgba(255,255,255,.66)` / `rgba(40,38,32,.66)` with
  a blur of 22, saturation 1.7 and a 1 px inner hairline (`glass-line`).
  Used only by `Nav`, `Sheet` (backdrop edge), `Menu` and `Command`.

### 3.2 Type: six steps, two weights, system fonts

| Step | Size / line | Weight | Use |
|---|---|---|---|
| `hero` | 36 / 40 (44 on desktop) | 800, tracking −3% | the one expressive sentence per screen (`Status` hero), onboarding headline |
| `title` | 24 / 30 | 750, tracking −2% | screen titles and section headings (today's bold "Recordatorios", "Usuarios") |
| `headline` | 17 / 24 | 600 | section headings, status sentence |
| `body` | 16 / 22 | 400 (500 for row titles) | all reading text, rows |
| `meta` | 14 / 20 | 400 | secondary lines, timestamps |
| `caption` | 12 / 16 | 500 | tab labels, chips, badges only |

This replaces today's eight steps (`display` 32 … `micro` 11). Body moves from
15 to 16 for older and non-technical readers. `hero` is the expressive moment
(M3 Expressive's "make the important thing bigger"). It appears once per
screen, and only in the `Status` hero and onboarding. Fonts are the platform system
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
- **Radii** (5 steps, concentric): `8` (small wells) · `14` (icon wells,
  inputs) · `16–20` (buttons, media) · `24` (cards, dialogs, today's card
  radius) · `28` (sheets) · `full` (the bar, pills, avatars, switches). Nested shapes
  keep concentric corners (outer radius = inner radius + padding), as Liquid
  Glass does. Down from nine steps.
- **Elevation** (3 levels): `card` for cards on the page (dark: a 1 px top
  highlight and a soft shadow; light: a warm two-layer shadow), `float` for
  sheets, dialogs, menus, toasts and the bar, and `none` for content inside
  cards (hairlines separate it).
- **Motion:** three springs instead of durations for anything that moves
  physically: `snappy` (damping 18, stiffness 320: presses, toggles, tab
  changes), `gentle` (damping 22, stiffness 180: sheets, layout, tile → live),
  `playful` (damping 10, stiffness 220: the mascot only). Cross-fades use
  `base 200 ms`. Native sheets, screens and alerts keep the platform's own
  curves.
  Common ranges are 150–250 ms for UI transitions; M3 ships duration tokens
  ([M3 motion tokens](https://github.com/google-labs-code/design.md/issues/47)).
- **Breakpoints:** see §6.

## 4. Component inventory: the smallest set that covers every screen

Today: 46 shared primitives in `shared/components/ui` (3,986 lines), 18 layout
files (921 lines), and 243 feature components (26,976 lines). Of those, 141
are cards, dialogs, forms, sheets, panels, rows, sections, lists, pickers,
banners, chips, tiles, heroes and headers, about 17,000 lines. That is where
the redesign removes the most code.

Proposed: **26 components in five families**: the four of v1 plus the identity
family (§4.5). Each has at most four variants,
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
| 8 | `Status` | `tone` calm / attention / alert; variant `hero` (the one expressive sentence over the `Aura`, with `Presence`) or `card`; sentence, meta, up to one primary + one secondary action, optional media | alert card, response card (248 lines), vigilance hero, settings "applied profile" card, module notices |
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
| 19 | `Sheet` | `form` / `list` / `detail`; slots: `title` (with ✕), body, pinned `footer` (one primary + at most one icon secondary); detents `auto`, `large`. Phone: native sheet. Medium and up: centred dialog (form, list) or side sheet (detail) | `sheet.tsx` (250), `adaptive-dialog` (139), `dialog` (176), `overlay-body` (110), 26 feature dialogs reduced to content |
| 20 | `Confirm` | `default` / `destructive`; names the object | `confirm-dialog`, ad-hoc confirm sheets (W7) |
| 21 | `Menu` | dropdown on pointer, sheet list on touch, context menu on long press and right click | `adaptive-menu`, `context-menu` (294), `popover`, single-item menus (W38) |
| 22 | `Toast` | `info`, `success`, `error` with Retry, `undo` | `toaster`, `toast-card` |
| 23 | `ResourceView` | renders `loading` (its `Skeleton`), `ready`, `empty` (its `Empty`), `stale` (`Notice`), `failed` and `refused` from a `Resource<T>`; failures use the error surfaces of §5.8 | `empty-state`, `infinite-list` states, the 42 `EmptyState` uses, spinners in lists |

### 4.5 Identity

| # | Component | Variants / props | Replaces today |
|---|---|---|---|
| 24 | `Aura` | `tone` (`calm`, `duty`, `attn`, `alert`, `off`, `listen`) × `mode` (`field`, `band`, `edge`); derives its tone from the home state, never set by a screen directly | the vigilance hero, the alert card's colour wash, the call screen's background |
| 25 | `Presence` | `state` (11, §8b), `level` (0–1 voice amplitude), `size` (`tab` 40, `inline` 28, `hero` 84–108, `stage` 190) | `welcome-mascot/*` (1,211 lines) and `voice/components/avatar.tsx` (391) |
| 26 | `Command` | ⌘K palette on pointer, a full-height `Sheet` on touch; groups `Pedir a Argus`, results, actions with shortcuts | the Inicio search bar, the bell popover, the compose menu |

The glass `material`, the `springs` and `usePressScale` are tokens and one
hook, not components. `Nav`, `Sheet`, `Menu` and `Command` read them.

Dropped without replacement: `orbit-hero`, `blur-reveal`, `brand-mark` variants
(the mark becomes `Presence`), `timeline` (the agenda uses `Row`), and
`native-only-animated-view`.

Domain components that stay feature-owned: the camera player, the PTZ pad, the
zone editor, the calendar month grid, the voice orb, the QR code and scanner,
and the face capture. They compose the primitives for everything around their
core.

### 4.6 Expected code reduction

The method is an estimate from today's line counts, not a measurement:

| Area | Today | Target | How |
|---|---|---|---|
| Shared primitives + layout | 64 files, 4,907 lines | 26 components, about 3,300 lines (the identity family adds about 700) | fewer variants; sheet, toast and keyboard mechanics move to maintained libraries (§8) |
| Feature cards, dialogs, forms, panels, rows, sections, lists, pickers, banners, chips, headers | 141 files, about 17,000 lines | about 55 files, about 6,500 lines | composed from `Section`/`Row`/`Status`/`Sheet`/`Field`; no own styling |
| Mascot and avatar | 8 files, 1,602 lines | inside `Presence` + one `.riv` asset | the animation lives in the Rive state machine (§8b) |
| Other feature components (player, wizards…) | 94 files, about 8,400 lines | about 70 files, about 7,200 lines | outer chrome only |
| Screens | 37 files, 6,865 lines | about 32 files, about 4,800 lines | fewer sections per screen; camera page split in two |
| **Total UI `.tsx`** | **about 39,000 lines** | **about 22,000 lines** | **about 40% less (range 35–45%)**: the identity costs about 700 lines and the mascot move saves about 1,400 |

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
3. **Compose: actions in one place.** Creation happens in a `Sheet`
   (`form`).
   - **Top:** the title and a close icon (✕), nothing else.
   - **Middle:** the title field is focused, then chips for when, repeat and
     who.
   - **Bottom:** the actions sit in a **pinned footer**, a full-width primary
     (Guardar) with at most one secondary as an icon button (⋯ for more
     options).
   - **No Cancelar button.** ✕, a swipe down, a tap outside and Back already
     close the sheet, and a dirty form asks before discarding (§5.7).
   - **No second Guardar** in the header or on the keyboard. The Return key
     is *Siguiente* between fields. On the last single-line field it is the
     platform's *done*, which submits without adding a button of its own.
   - **Icons** replace words only where the meaning is unambiguous (✕, ⋯,
     ↵). Destructive actions always keep their words.
   - **On the phone** the sheet opens at `auto` height and grows to the
     ceiling with the keyboard.
   - **On desktop** it is a 480 px centred dialog with the same anatomy:
     title + ✕ at the top, the footer actions at the bottom right (Guardar
     with its Ctrl/⌘+Enter hint, an optional ⋯ at the bottom left), and Esc
     or an outside click to close. Argus is the general compose: "Recuérdame
   pagar la luz el 30" creates the same row, and the reply shows it as a chip
   that opens it.
4. **States.** Every remote read is a `Resource<T>` rendered through
   `ResourceView`:
   - **Loading, by where the data lives** (local-first, as today's
     WatermelonDB + MMKV view cache):
     - **Data stored locally paints instantly**, with no skeleton and no
       spinner. That covers everything synced: reminders, events, tasks,
       projects, cameras, notifications, people and conversations.
     - **A refresh of local data** shows at most a subtle inline
       «Actualizando» in the screen's top bar or section header. It never
       puts a skeleton over content that is already shown.
     - **A skeleton** (`loading`) appears only for data fetched over HTTP
       that has no local copy yet: sessions, activity, episode detail,
       module catalogue, settings, the first open of a visitor gallery. It
       matches the final layout's shapes.
     - No spinner in any list, ever.
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
   The `Aura` switches to `alert` and `Presence` to `alert` (hat on, still,
   serious). Once the alert is resolved they return to calm with one `happy`
   beat.
7. **Dismissal (every overlay, every platform).** A sheet, dialog, menu,
   popover or palette closes when you tap or click outside it (on the scrim),
   with Esc on desktop and web, with Back on Android, and by dragging a sheet
   down on phones. Focus returns to the control that opened it. Two
   exceptions:
   - A **destructive confirmation** (`Confirm` `destructive`: siren, panic,
     purge, deactivate) ignores outside taps. Only its buttons, Esc or Back
     (which mean Cancelar) close it.
   - A **form with unsaved input** (any field changed since it opened) does
     not close on an outside tap, Esc, Back or a drag. It shows an inline
     "¿Descartar «…»?" with *Seguir editando* (the default, also what a
     second Esc or Back does) and *Descartar*. On phones the native sheet's
     dismiss is blocked the same way (TrueSheet's non-dismissible option, name to be confirmed in the spike, while
     dirty), and the discard question is a native alert.
   - Untouched forms close at once.
   - The prototype's desktop dialog and phone sheet implement this rule.
8. **Errors people can act on.** The user never sees a backend code, an
   HTTP status or a raw server message. Every code goes through one map,
   today's `serviceErrorKey` (`shared/libs/service-error.ts`: about 45 codes,
   a retryable set and `common.errors.unknown`). Each entry is a short es/en
   message saying what happened and what to do, and it names the object when
   one is known. The copy and the complete code→message map belong to the
   error-message rules on the plan branch (`docs/plans/error-messages-spec.md`).
   This section only fixes **where** a message appears. The surface is chosen
   by context and severity, never by the screen author:

   | Situation | Surface | Example (es) |
   |---|---|---|
   | A field is invalid (validation, 422 with field errors) | **Inline** under the field: alert-coloured text with an icon, the field border in `alert`, focus moved to the first error, the sheet or dialog stays open | «Escribe qué quieres recordar.» |
   | An action failed and can be retried (network, timeout, unavailable, write not sent) | **Toast `error` with Reintentar**. The optimistic change rolls back first, the toast names the object, it stays 8 s or until dismissed, and it is announced | «No pudimos guardar el recordatorio «Pagar la luz». Revisa tu conexión e inténtalo de nuevo.» |
   | An action was refused and retrying will not help (forbidden, module off, role inactive, conflict) | **Inline `Notice`** beside the action, with the action that resolves it when there is one | «La agenda está apagada en esta casa. Pídele al propietario que la active.» |
   | A screen or section could not load | **In-place failed state** in that section (`ResourceView` `failed`): `Presence` `concern`, one sentence, Reintentar. Cached data stays, labelled as stale. Never the empty copy | «No pude cargar tus cámaras. Revisa el Wi-Fi o inténtalo en un momento.» |
   | The session or the trust is gone (account disabled, pairing lost, certificate mismatch) | **Full-screen state** with one way out | «Tu cuenta está pausada. Pídele al propietario de la casa que la vuelva a activar.» |
   | An unknown code | The same surface its context would use, with the one generic message | «Algo no salió bien. Inténtalo de nuevo en un momento.» |

   The code goes to `log.error` with the request context, never to the screen.
   Error toasts are never stacked: a second one replaces the first. The
   mascot never appears in a toast.
9. **Sheet + keyboard.** Today's `sheet.tsx` translates the whole sheet up
   by the keyboard offset (`translateY + keyboardOffset`, line 170), and it
   caps the height only on web (line 201). On a phone, a tall form therefore
   rises above the status bar, which is A6 (`uiux-map/android/41-event-form-keyboard.png`).
   The rule:
   - **Ceiling.** The sheet's top never goes above the top safe area + 16 dp,
     so a strip of the screen behind stays visible and the sheet reads as a
     sheet. True-sheet clamps the keyboard-inflated height to
     `screenHeight - topInset` (source-verified on Android with
     edge-to-edge). Set `maxContentHeight = windowHeight - insets.top - 16`
     for the margin.
   - **Pinned title.** The title and ✕ sit in the sheet's `header` slot:
     fixed, never scrolled away, never under the status bar.
   - **Pinned footer.** The actions (Guardar full-width, an optional ⋯ icon)
     sit in the sheet's footer slot and ride **above the keyboard**
     (true-sheet's `footer` with `footerOptions.keyboardOffset`). There is no
     action in the header and no "Guardar" key on the keyboard.
   - **Inner scroll.** The fields scroll inside the sheet, between the pinned
     title and the pinned footer: one scroll container (`scrollable`), no page
     scroll behind it, no double scroll, no jump.
   - **Focused field.** It stays visible with 16 dp above the keyboard
     (`scrollableOptions.keyboardScrollOffset: 16`). Switching fields with the
     keyboard's Next key scrolls only as much as needed.
   - **Detents.**
     - Short forms (one to three fields) use `auto`: the sheet grows by the
       keyboard height up to the ceiling.
     - Long forms use `[0.6, 1]` with `scrollable`: with the keyboard open the
       sheet sits at the ceiling. When the keyboard closes it returns to the
       detent the user left, and never jumps to a different one.
   - **Multiline fields** grow up to 5 lines, then scroll inside themselves.
     The caret stays visible.
   - **Landscape and font scale 1.3–2.0.** In landscape the sheet goes to the
     ceiling and stays scrollable. At large font scales the title keeps one
     line (it truncates before the ✕ moves), and the footer button grows in
     height instead of truncating.
   - **Focus on open.** Focus the first field in `onDidPresent`, never with
     `autoFocus`.
   - **Platforms.** Android uses edge-to-edge with the window insets
     (true-sheet tracks `WindowInsetsAnimationCompat`), so no `adjustPan`.
     iOS uses UIKit's keyboard avoidance. Desktop and web use a centred
     dialog, with no keyboard rise at all.
   - **Prototype.** The «Hoja inferior · acciones abajo» and «Hoja + teclado
     (formulario largo)» frames show this layout.

## 6. Responsive rules: one layout system

One set of breakpoints, the same names in CSS variants and `useWindowClass`
(rule F18). The values follow Material's window size classes, adjusted at the
top so laptops get the sidebar
([Android adaptive navigation](https://developer.android.com/develop/adaptive-apps/guides/build-adaptive-navigation)):

| Class | Width | Navigation | Content |
|---|---|---|---|
| `compact` | < 600 | bottom bar (labels always) | one column, 16 gutter |
| `medium` | 600–1023 | rail (icons + labels) | one column, max 640, centred |
| `expanded` | 1024–1439 | sidebar with labels | 3 columns (Inicio) or main + aside (Seguridad), or list + detail panes |
| `wide` | ≥ 1440 | sidebar | 3 columns, and from 1700 px 4 columns (Inicio) or main + 2 asides (Seguridad); content capped at 2,200 px and centred, with the sidebar attached (fixes W33: today at 2560 the content stops at about 1,640 px and floats about 370 px from the rail) |

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

### 6b. Density: nothing feels empty

- **Phone above the fold.** The hero is compact: the mascot (58–66) *beside*
  the hero sentence (30), one meta line, and one row of 2–3 glanceable stats
  ("5 cámaras", "0 alertas hoy", "1 por revisar"). The first content section
  starts within the top 40% of the screen (by about y = 300 of 760 on
  Inicio), and the Aura is at most 300 px tall.
- **Content-rich rows.** Every row carries a glanceable secondary line (time,
  place, who, amount) and, where useful, a trailing next step or inline stat:
  «Posponer», «ahora», «en 1 h», «Revisar», «3 de 8 hechas». A section header
  carries its count («Ahora · 3 · 1 atrasado»).
- **Vertical rhythm.** Sections are 24 apart, rows are at least 58 dp (still
  ≥ 48 dp targets), and cards have 4 px inner padding around their rows.
  Empty states stay as tall as a typical populated state and always offer the
  next step (the 2026-10-03 rule).
- **Desktop uses the width with columns of real content.**
  - **Inicio:**
    - expanded: Ahora + Hoy + Mañana | Novedades | Cámaras 2×2 + En casa;
    - from 1700 px: Ahora/Hoy | Novedades | a camera grid with Lo que pasó
      | En casa + Proyectos.
  - **Seguridad:**
    - a status band (mascot, sentence, stats, mode, SOS);
    - a camera grid that adds columns as the width grows (`auto-fill`,
      minimum tile 280 px, 340 px from 2400 px);
    - a Lo que pasó column;
    - from 1700 px, an aside with Visitas, Lugares and Mantenimiento.
- **Line length.** Text columns are capped at 620–680 px (about 72
  characters). Extra width goes to media (camera grids, the week grid) and to
  additional columns, never to longer lines.
- **What fills space (useful, never decorative)**, as shown in the
  prototype:

  | Screen | Fill |
  |---|---|
  | Inicio | the latest clip first in the camera strip; a desktop "Último clip" |
  | Seguridad | last activity on each camera tile; a desktop "Actividad por cámara · hoy" table (last event, today's count) |
  | Agenda | the day's count and the free slots («Libre 16:00–17:00»); "Próximos días" (3 days); a desktop aside with Libre hoy, Próximos días and Sin fecha |
  | Night mode | "Esta noche": what Argus watches and when it will wake you |
  | Voice call | what Argus will do (the result rows), under the transcript |
  | Empty states | a compact card with the mascot and one action, then suggestion chips («Recuérdame pagar el agua») and the next days |
  | Offline | the last-known facts with their age («Lo último que sé · hace 10 min») |
  | Errors (full screen) | who can fix it, with a call action, and what is still safe |
  | Onboarding | what Argus does (three rows); where to find the pairing code |
  | Desktop Argus | more conversations, suggestion chips, and "Tu día" in the context panel |

  Weather is not included. Argus is local-first and has no weather source
  today; adding one is a product decision, not a layout fix.

### 6c. Scrolling: one owner per region

- **One scroll owner per region.** On phones that is the screen, or the
  sheet's inner area. On desktop, each column scrolls on its own. A list never
  scrolls inside a card that scrolls inside a page: today's agenda list and
  episodes panel (W29) are the cases this rule removes.
- **What stays put.**
  - The phone's top bar and the floating tab bar.
  - The desktop sidebar and the status band.
  - A sheet's title and footer.
  - Section headers stick inside a desktop column (`position: sticky`, with a
    fade to `bg`) where a column is long (Novedades, Lo que pasó).
- **Scrollbars.** On web and Tauri they are thin and consistent: 10 px, a
  `fill-press` thumb with a radius, a transparent track
  (`scrollbar-width: thin`, plus `::-webkit-scrollbar` for WebKitGTK). They
  appear only on the region that scrolls. Phones use the platform's own
  indicators.
- **Input and resizing.**
  - Trackpad and mouse wheel scroll the region under the pointer, with no
    scroll chaining into the page (`overscroll-behavior: contain` on columns
    and sheets).
  - Keyboard Page Up/Down and Space work in the focused column.
  - On window resize, columns re-flow at the breakpoints without losing each
    column's scroll position.
- **No horizontal page scroll** at any width. Horizontal strips (the camera
  strip on phones) scroll on their own, with snap.

## 7. Motion

- Only what explains a change: a sheet rising, a row leaving after Deshacer
  expires, a check filling, the Aura changing tone, the mascot reacting. No
  decorative loops except the two ambient ones (`Aura` drift, `Presence`
  breathing), and both obey §7b. The orbit hero and the compose-glyph morph
  go. The mascot moves out of its choreography into `Presence`.
- Physical motion uses the three springs of §3.3: presses scale to 0.96 with
  `snappy`, sheets and layout use `gentle`, and only the mascot uses
  `playful`. Native sheets, screen pushes and alerts keep the platform's own
  curves.
- **Tile → live view.** The camera tile grows into the live screen. Reanimated
  shared-element transitions are still experimental (behind a flag, "closer to
  stable" in 4.7: [React Navigation](https://reactnavigation.org/docs/shared-element-transitions),
  [Reanimated 4.7](https://newreleases.io/project/npm/react-native-reanimated/release/4.7.0)),
  so v1 of the redesign uses a scale-from-origin transition and swaps in the
  shared element once it is stable.
- Reduce motion (system setting; Reanimated `ReduceMotion.System` and
  `useReducedMotion`, [Reanimated a11y](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility)):
  every transition jumps to its end state or becomes a 120 ms cross-fade. The
  Aura is a still gradient, the mascot holds the still pose of its state, the
  listening edge is a steady rim, and the skeleton is a static fill.

## 7b. Performance budget: beautiful, but performance first

Every animation runs on the UI thread: Reanimated shared values, Reanimated 4
CSS animations, or the Rive native renderer. No `setState` per frame, no JS
timers driving visuals, and the voice level reaches `Presence` throttled to
30 Hz. The budget is checked on a low-end Android reference device in the
plan's R9 (frame stats from `dumpsys gfxinfo` / Perfetto) and on the desktop
build in WebKitGTK.

| Budget | Value |
|---|---|
| Frame time | ≤ 16.7 ms on the mid-tier reference, ≤ 1% janky frames scrolling Inicio; 120 Hz devices get 8.3 ms where the OS allows |
| Continuous animations on screen | at most 2 (`Aura` + `Presence`); both pause off-screen, in the background, and once the user scrolls the hero out of view |
| Blur layers visible at once | at most 1 (the bar *or* a sheet's backdrop), never a full-screen blur over moving video |
| JS thread during scroll and gestures | untouched by visuals |
| Startup | the identity adds nothing to first paint: `Presence` loads its `.riv` after the first frame, showing the still pose meanwhile |

**Performance tier.** `perfTier` is `high` or `low`, decided once from the
hardware profile (Android below API 31, under 4 GB RAM, or the user's
"Reducir efectos" setting gives `low`). Each effect states its cost and its
low-tier form:

| Effect | Runs on | Cost (estimate; the spike measures it) | Low-end Android / reduced fallback |
|---|---|---|---|
| `Aura` field | UI thread, 3 pre-blurred gradient views animating `transform` and `opacity` only (compositor; no per-frame blur) | about 0.3–0.6 ms GPU per frame | Still gradient, no drift; with Reduce Transparency or Increase Contrast, a flat tint |
| Glass (`material`) | iOS 26 native glass (expo-glass-effect); Android 12+ `RenderEffect` blur (expo-blur `BlurTargetView`); web `backdrop-filter` | proportional to the blurred area: kept to the 70 dp bar or the sheet edge | Below API 31, `low` tier, Reduce Transparency: solid `surface` with a hairline ([expo-blur](https://docs.expo.dev/versions/latest/sdk/blur-view/), [expo-glass-effect](https://docs.expo.dev/versions/latest/sdk/glass-effect.md)) |
| `Presence` (mascot) | Rive native renderer, one artboard, its own thread; JS sends only the state and the level | +2.4 MB Android / +1.7 MB iOS download for the runtime ([Rive sizes](https://rive.app/docs/runtimes/runtime-sizes.md)); the `.riv` file is tens of KB (inference) | `low` tier: idle breathing at 30 fps and state changes as cuts; reduce motion: still pose |
| Listening edge | UI thread, one inset shadow animating opacity | negligible | Steady rim |
| Springs and press scale | UI thread worklets | negligible | Instant |
| Skeleton shimmer | Reanimated CSS animation (opacity) | negligible | Static fill |
| Live tiles | the native player, frames at most every 10 s, cross-faded | network-bound, not frame-bound | Static thumbnail, refreshed on focus |

## 8. Platform-native mechanics: libraries

All are checked against Expo SDK 57, the new architecture (Fabric), RN 0.86 and
react-native-web 0.21 inside Tauri 2 (WebKitGTK). Licences are all MIT.

| Need | Recommendation | Web / Tauri | Reduces our code? |
|---|---|---|---|
| Bottom sheets (phone) | **react-native-true-sheet 3.11.x** (lodev09, MIT): the system sheet controller on iOS, Material `BottomSheetBehavior` on Android, Fabric-only, RN 0.81+. Stable 3.11.18 is from 2026-10-02 and the repo is very active. It has a `header` slot, `scrollable` with `keyboardScrollOffset`, and a keyboard-height clamp at the status bar ([keyboard guide](https://sheet.lodev09.com/guides/keyboard), [repo](https://github.com/lodev09/react-native-true-sheet)). Stay on 3.11.x and move to 3.11.19+ for PR #938 (focus in `onWillPresent`) and #920 (web keyboard). v4 (4.0.0-beta.25) rewrites the layout engine and is still beta. | its own Radix drawer exists, but we use `@rn-primitives/dialog` at medium and up and on every web build | **Yes.** `sheet.tsx` (250), `overlay-body.tsx` (110) and `use-keyboard-progress.ts` (37), about 400 lines, plus most of the per-sheet keyboard workarounds |
| Route-level sheets | **Not** Expo Router `formSheet` for forms. keyboard-controller [#1683](https://github.com/kirillzyusko/react-native-keyboard-controller/issues/1683) (open, 2026-10-15): with `KeyboardProvider` mounted, as it is in our root layout, a formSheet no longer rises with the keyboard. Also screens [#4863](https://github.com/software-mansion/react-native-screens/issues/4863) (open; ignores the top inset after a config change), [#3640](https://github.com/software-mansion/react-native-screens/issues/3640), [#4994](https://github.com/software-mansion/react-native-screens/issues/4994) and [#4310](https://github.com/software-mansion/react-native-screens/issues/4310) (Samsung One UI relayout loop) | a route | — |
| Rejected: `@gorhom/bottom-sheet` 5.2.14 | JS-driven (Reanimated), last release 2026-05-09, **no commits since**. Recent bugs are closed by a stale bot: [#2734](https://github.com/gorhom/react-native-bottom-sheet/issues/2734) (5.2.14 regression), [#2747](https://github.com/gorhom/react-native-bottom-sheet/issues/2747) (peeks under edge-to-edge), [#2638](https://github.com/gorhom/react-native-bottom-sheet/issues/2638) (`maxDynamicContentSize` ignored with the keyboard), [#2674](https://github.com/gorhom/react-native-bottom-sheet/issues/2674) (keyboard covers input). Its keyboard-controller wrapper has open issues [#819](https://github.com/kirillzyusko/react-native-keyboard-controller/issues/819), [#1280](https://github.com/kirillzyusko/react-native-keyboard-controller/issues/1280) and [#923](https://github.com/kirillzyusko/react-native-keyboard-controller/issues/923) | weak | — |
| Watched, not yet | `@expo/ui` BottomSheet (SDK 57): keyboard and footer props are accepted but have **no effect** ([docs](https://docs.expo.dev/versions/v57.0.0/sdk/ui/drop-in-replacements/bottomsheet.md)). `@swmansion/react-native-bottom-sheet` 0.17: native gestures, but 0.x and created 2026-02 (no footer slot, [#62](https://github.com/software-mansion-labs/react-native-bottom-sheet/issues/62)) | — | — |
| Dialogs, menus, popovers (web, Tauri, medium+) | **Keep `@rn-primitives`** dialog, alert dialog, dropdown menu and context menu (already installed, portal-based, accessible) | yes | Yes: the adaptive components become thin switches |
| Native confirm | RN `Alert.alert` on iOS and Android (it is a no-op in react-native-web, so web uses the `@rn-primitives` alert dialog) ([RNW source](https://raw.githubusercontent.com/necolas/react-native-web/master/packages/react-native-web/src/exports/Alert/index.js)) | via alert dialog | Yes: removes confirm sheets on phones |
| Native context menus | Optional later: `@expo/ui` (`ContextMenu` on SwiftUI, `DropdownMenu` on Compose) behind `Menu`. zeego is deferred until its pinned native versions are proven on RN 0.86 ([zeego](https://zeego.dev/start)) | — | No (adds code), so only if the native look is wanted |
| Haptics | **expo-haptics** through one `feedback(kind)` helper: `selectionAsync`, `impactAsync`, `notificationAsync`, and `performAndroidHapticsAsync` on Android (no VIBRATE permission, closer to iOS feel) ([Expo haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)) | no-op on WebKitGTK (no `navigator.vibrate`) | Small addition, about 30 lines |
| Press feedback | RNGH `Pressable` inside `PressableSurface`: `android_ripple` on Android, highlight on iOS, hover and focus ring on web; cancels when a parent scrolls ([RNGH Pressable](https://docs.swmansion.com/react-native-gesture-handler/docs/components/pressable)) | hover works | Yes: one place instead of 104 |
| Keyboard | **react-native-keyboard-controller** (already present): `KeyboardAwareScrollView` in `Screen` and forms, `KeyboardToolbar` for multi-field forms; `.web.tsx` passthrough ([Expo docs](https://docs.expo.dev/versions/v57.0.0/sdk/keyboard-controller.md)) | passthrough | Yes: one integration in `Screen` |
| Toasts with undo | **sonner-native** on iOS/Android, **sonner** on web, behind `Toast` (both MIT, the same API shape, action buttons) ([sonner-native](https://github.com/gunnartorfis/sonner-native)). Not burnt: it has no action button for undo ([burnt](https://github.com/nandorojo/burnt)). | sonner | Yes: replaces most of `toaster` and `toast-card` |
| Skeleton | Own 20–30 line `Skeleton` on Reanimated 4 CSS animations (they work on web) ([Reanimated CSS animations](https://docs.swmansion.com/react-native-reanimated/docs/css-animations/animation-name/)). Not moti: no stated Reanimated 4 support. | yes | Neutral |
| Glass material | iOS 26: **expo-glass-effect** (falls back to a plain View elsewhere). Android 12+: **expo-blur** with `BlurTargetView` (without it, it is only a translucent view). Web/Tauri: CSS `backdrop-filter` | `backdrop-filter` | Small addition, about 60 lines, inside `Nav`/`Sheet`/`Menu`/`Command` |
| Mascot | **Rive**: `@rive-app/react-native` (Nitro runtime) on iOS/Android, `@rive-app/canvas-lite` on web if the WebKitGTK CSP test passes (§8b) | wasm, about 420 KB gzip | **Yes**: about 1,600 lines of procedural mascot become a wrapper and one asset |
| Formatting | `Intl` through the existing `useDateFormatter` + `date-fns` (es/en), with the hour cycle from expo-localization's `getCalendars().uses24hourClock` passed explicitly. Hermes delegates `Intl` to platform ICU, so results vary by OS; `formatToParts` is Android-only ([Hermes Intl](https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md), [expo-localization](https://docs.expo.dev/versions/latest/sdk/localization/)) | yes | Neutral |

**Verdict on the sheet library (the owner asked for evidence).**
react-native-true-sheet 3.11.x is the right choice, so David's pick holds. It
is the only candidate that is truly native, actively maintained, and has
verified keyboard code that stops at the status bar with a pinned header and
inner scroll. Gorhom is JS-driven and has stalled. formSheet breaks with our
`KeyboardProvider`. `@expo/ui` ignores the keyboard. No credible Android
frame-rate benchmark exists for any of them: "best performance" is an
inference from native animation (system controller vs Reanimated JS-defined
sheet) and is measured in the spike on the S21 FE.

Two open questions are measured in the spike:
- whether true-sheet's inset callback still fires with `KeyboardProvider`
  mounted (#1683 is the analogous failure for screens; for true-sheet this is
  an inference);
- whether [#790](https://github.com/lodev09/react-native-true-sheet/issues/790)
  (a gap left after dragging, closed for lack of a repro) still reproduces.

Configuration: `detents` (`['auto']` for short forms, `[0.6, 1]` + `scrollable`
for long ones), `scrollableOptions={{ keyboardScrollOffset: 16 }}`,
`header={<SheetTitle/>}` (title + ✕), `footer={<SheetActions/>}` with
`footerOptions.keyboardOffset`, `maxContentHeight={windowHeight - insets.top - 16}`,
`insetAdjustment="automatic"` and focus in `onDidPresent`. Inside a
`scrollable` sheet the inset belongs to the sheet: no nested
`KeyboardAwareScrollView`.

Risks: TrueSheet v3 → v4 changes its web renderer, which we don't use, so the
impact is contained. Every library here needs its `.web` passthrough tested in
WebKitGTK through `check:bundle`. Re-check the peer ranges at the next SDK.
**Two spikes come first:**
1. TrueSheet 3.11.x on the dev-client for both Android (the owner's Samsung
   S21 FE) and iOS, passing the Sheet + keyboard acceptance list of §10 and
   the dirty-form dismissal block. If it fails, the fallback is the
   hand-written sheet fixed to §5.9's rules (a height cap at the top inset, a
   pinned header, one inner `KeyboardAwareScrollView`), not gorhom.
2. Rive on a low-end Android (frame time, latency from voice level to mouth)
   and `canvas-lite` in the Tauri WebKitGTK build under the strict CSP with
   `'wasm-unsafe-eval'`.

## 8b. The mascot: Argus as a living presence

David keeps the mascot, the white figure with the detective's deerstalker and
lens from today's welcome, and it becomes the face of Argus everywhere. Today
it exists twice: `welcome-mascot/*` (1,211 lines of procedural SVG and
Reanimated choreography) and the call `avatar.tsx` (391 lines, states `idle`,
`listening`, `thinking`, `speaking`, `error`). Both become one `Presence`.

**States** (shown in the prototype, light and dark):

| State | Looks like | When |
|---|---|---|
| `idle` (Atento) | breathing, blinking, eyes open | En casa, all calm; the default |
| `duty` (De guardia) | **hat on**, a slow scanning gaze | Noche, Fuera, Armado: Argus is on watch |
| `listen` | leans in, rings follow the voice level | hold-to-talk, the voice call while you speak |
| `think` | gaze up, lens out, three dots | looking something up, running a tool |
| `speak` | mouth and body squash follow the TTS level | Argus is speaking |
| `happy` | ^ ^ eyes, one small hop | saved, done, all clear after an alert, empty "nothing pending" |
| `concern` | brows, lowered gaze, slower breath | something to review, a failed section |
| `alert` | hat on, eyes wide, **still** (serious, not cute) | a real alert |
| `rest` | eyes closed, a "z" | the assistant's quiet hours (it will not call you). The text always says security keeps working |
| `off` | grey, still | the app cannot reach Argus |
| `wave` | waving, hat on | onboarding and first run only |

**The hat means "on watch".** The mascot never suggests that security is off
while it is on: in Noche, Fuera or Armado it wears the hat and its eyes are
open. `rest` is used only for the assistant's quiet hours, never for a
security mode.

**Where it appears, at most one per screen:**

- the centre tab (40 pt, reflecting its state, so the bar shows Argus
  listening, thinking or on watch);
- the Inicio and Seguridad hero (84–108);
- beside Argus' chat bubbles (28; it thinks while a tool runs);
- the voice call stage (190, driven by `level`);
- empty and failed states (110: `happy` for "nothing pending", `concern` for
  "could not load");
- onboarding (`wave`, then `think` while pairing searches the network);
- the desktop sidebar mark and the Argus conversation row.

It never appears in toasts, confirmations, forms or settings rows.

**Accessibility.** It is decorative (`accessibilityElementsHidden`): the
sentence beside it always carries the meaning. It holds a still pose under
reduce motion and pauses off-screen.

**Proposals for a male voice (v3.2).** Argus will speak with a calm,
warm, confident male voice, so the character is open for choice.
`mascot-proposals/index.html` shows six options. Each one appears in all 11
states, at 28 · 36 · 96–120 · 200 px, in light and dark, and inside real dark
screens (Inicio hero, chat, voice call), with a side-by-side comparison at
the small sizes:

- **0 · Argus evolucionado.** Today's figure, firmer, with taller eyes and no
  blush; the hat when on watch, the lens when thinking. Continuity, but it
  reads younger than the voice.
- **1 · Panoptes.** A sand face under a crown of five peacock eyes that open
  on watch. The strongest link to the name; busy at 28 px.
- **2 · Búho (owl).** A night-watch owl in cocoa and sand: on watch its eyes
  glow amber, its tufts rise, and a Panoptes ocellus appears on its chest.
  **Recommended.** It is the best fit for a calm male guardian voice and the
  most legible at 28 px, and it rigs simply.
- **3 · Can guardián.** A stylised shepherd (reads shiba- or fox-like) with
  ears that rise when attentive, and a collar with a shield tag on watch.
  Protective, but it reads as a pet for assistant tasks.
- **4 · Orbe.** A warm sand orb with one iris, a lid and a ring that becomes a
  dial on watch. The cheapest to animate and perfect at 28 px; less warmth,
  and a single eye can read as surveillance.
- **5 · Vigía.** A grown-up concierge-watchman face with brows, over
  charcoal shoulders, with a cap on watch. The most human; it risks uncanny
  or cultural readings.

The main prototype keeps today's mascot until the owner chooses (R-D28). The
eleven states, the "on watch" rule and the Rive plan apply to whichever is
chosen. The "on watch" signifier becomes the chosen concept's equivalent of
the hat.

**Technology: comparison.** Checked for Expo SDK 57, RN 0.86, Fabric, the web
build in Tauri/WebKitGTK and its strict CSP:

| Option | Native | Web / Tauri | Live inputs (state + voice level) | Size | Licence and cost | Fit |
|---|---|---|---|---|---|---|
| **Rive** (`@rive-app/react-native` 0.5.x, Nitro, RN ≥ 0.78, Expo ≥ 53, dev client) | native renderer | no RN-web target: a `.web.tsx` over `@rive-app/canvas-lite`; the wasm must be self-hosted and the CSP needs `'wasm-unsafe-eval'` | state machine + data binding (`useRiveNumber`, triggers); a 1D blend state mixes timelines from one number (mouth by level) | runtime +2.4 MB Android / +1.7 MB iOS download; web about 420 KB gzip (canvas-lite) | runtimes MIT; editor closed, exporting needs a paid seat (about $9/month) | **best**: one file holds all 11 states, smooth, real-time inputs |
| Lottie / dotLottie (`lottie-react-native` 7.5, `@lottiefiles/dotlottie-react-native` 0.12) | native | dotLottie wasm about 484 KB; lottie-web's full build needs `unsafe-eval` | state machines gate transitions; no blend from a continuous number; still changing | moderate | Apache-2.0 / MIT; After Effects to author | one-off flourishes only |
| Skia + Reanimated (`@shopify/react-native-skia` 2.14) | UI thread, excellent | CanvasKit 2.9 MB gzip on web | anything, in code | +4 MB Android / +6 MB iOS | MIT, code only | smooth, but heavy on web and hand-drawn |
| SVG + Reanimated (today) | fine for few nodes; each frame is a Fabric commit | free (DOM SVG), no wasm, no CSP change | anything, in code | 0 | MIT | safe, but it is the 1,600 lines we want to remove |

Sources: [Rive RN](https://rive.app/docs/runtimes/react-native/react-native),
[Rive in Expo](https://rive.app/docs/runtimes/react-native/adding-rive-to-expo.md),
[Rive states](https://rive.app/docs/editor/state-machine/states),
[Rive sizes](https://rive.app/docs/runtimes/runtime-sizes.md),
[Rive pricing](https://rive.app/blog/rive-s-new-9-mo-plan),
[dotLottie state machines](https://docs.lottiefiles.com/en/runtimes/distributions/react-native/v0.x/state-machines),
[lottie-react-native](https://github.com/lottie-react-native/lottie-react-native),
[Skia web](https://www.mintlify.com/shopify/react-native-skia/getting-started/web),
[Reanimated performance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance),
[CSP and wasm](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src).
Web sizes are gzip measurements of the npm packages taken during this
research. Whether WebKitGTK honours `'wasm-unsafe-eval'` is **not confirmed**
and must be tested in the exact Tauri build.

**Recommendation: Rive.** It is native on iOS and Android, and one `.riv`
holds all eleven states with the inputs `state` (enum) and `level` (0–1). It
sits behind one interface, `<Presence state level size />`.
- **Web and desktop:** the same file through `canvas-lite` when the CSP test
  passes. If it fails, the desktop shows the still pose of each state,
  exported from the same Rive file as SVG, with a cross-fade between states.
  That is not a second animation system.
- **Code:** about 1,600 lines of procedural mascot and avatar code become
  about 200.
- **Costs:** the paid editor seat, about +2 MB per app download, and a 0.x
  runtime whose API may still change.
- **Fallback:** if the Rive spike fails, Skia can take the native side behind
  the same interface without touching the screens.

## 8c. Desktop and mobile idioms

The same components carry two sets of idioms. Each is chosen by input and
window class, never by a screen.

**Desktop (Tauri and web, expanded and wide):**

- **Glass sidebar.** Labels, the ⌘K field at its top, the Argus mark, and
  shortcut hints (1–5) that show on hover.
- **⌘K / Ctrl+K: `Command`.** One bar for commands, search and "pedir a
  Argus". Results are grouped, actions show their shortcut (as Raycast
  teaches), and Enter on free text asks Argus.
- **Shortcuts.** N new, 1–5 sections, / search, Space (held) to talk, Esc
  closes, Ctrl/⌘+Enter saves, ↑↓ moves in lists, E edits, Delete deletes
  (with Deshacer). A "?" overlay lists them.
- **Hover.**
  - Rows highlight.
  - Camera tiles reveal *Ver* / *Hablar*.
  - Calendar events lift.
  - Every icon-only button has a tooltip with its shortcut.
  - Right click opens the row's `Menu`.
- **Multi-column layouts that use the width.**
  - Inicio: the feed column plus an aside with cameras and today.
  - Seguridad: a status band, a 3-column camera grid and a "Lo que pasó"
    column.
  - Agenda: a 7-day week grid with a now-line.
  - Argus: conversations, chat and a context panel showing what Argus did and
    the camera it opened.
  - Personas and Ajustes: list + detail panes.
- **Pointer-sized overlays.** Dialogs are 480 px (560 for long forms),
  popovers are anchored to their control, and menus have 36 px rows. Overlays
  never cover the sidebar's navigation.

**Mobile (phones):**

- **Thumb reach.**
  - Primary actions sit in the lower half: the status actions, hold-to-talk,
    the sheet's Guardar (also the Return key).
  - The top bar holds only navigation and secondary actions.
  - The floating glass bar keeps the five destinations at the thumb.
- **Native sheets and gestures.**
  - Swipe back (iOS) and predictive Back (Android).
  - Drag sheets to dismiss.
  - Swipe a row for its main action, with Deshacer.
  - Long press for the row menu.
  - Pull to refresh on server lists.
  - Pinch and double-tap on the live camera.
- **Haptics** as in §10, including hold-to-talk start/stop and the hold-to-
  confirm SOS ticks.
- **The bar shrinks on scroll down** (labels hide, icons stay) and comes back
  on scroll up. It stays fixed under reduce motion.

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
| 3 | **Argus** (centre, drawn as the mascot) | tap: the Argus thread (text + voice) and, from its header, the conversations with people. **Hold: talk to Argus from any screen** (the signature gesture) |
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
- The floating "+" goes. Creation is the "+" inside Agenda and Proyectos,
  "Nuevo…" in `Command`, or simply asking Argus.
- **The signature gesture.** Holding the centre tab (≥ 220 ms) starts
  listening on any screen:
  - an `impactLight` haptic;
  - the `Aura` edge glows;
  - `Presence` in the tab turns to `listen`;
  - a glass pill reads «Te escucho… suelta para enviar» with the live
    transcript.

  Releasing sends; sliding off cancels. The answer arrives as a toast-sized
  card with the result chip, and the full thread is one tap away. A tap
  without holding opens the chat. With reduce motion the edge is a steady
  rim. For people who cannot hold, a tap on the mic in the chat starts and
  stops.
- Search: a search button in the Inicio top bar opens `Command`, which
  searches reminders, events, projects, tasks, people and cameras, runs
  actions, and sends free text to Argus.
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
- **Layout:**
  - **Top bar:** the greeting as a meta line ("Buenas tardes, Ana"; with
    several places, the place picker), and search on the right.
  - **Hero (compact, §6b):**
    - the `Aura` (at most 300 px) behind the top;
    - `Presence` (66) *beside* the `Status` hero sentence «Todo tranquilo.»
      (30), with the meta "En casa · Luis y tú en casa";
    - one row of glass stats in today's chip style: "5 cámaras", "0 alertas
      hoy", "4 detecciones". The stats wrap, and each one opens its screen.
    - Ahora starts above the fold.
  - **Ahora:** the header carries its count («3 · 1 atrasado»), then up to 3
    rows, overdue first, then the next by time. Each row has a next step or
    time-to-go («Posponer», «ahora», «en 1 h»).
  - **Cámaras:** a horizontal strip of live tiles (today's home had camera
    cards; they come back as a strip, not a grid), with the link "Seguridad".
  - **Novedades:** the latest 5 feed items in a card, with inline actions
    such as "Activar" and the link "Ver todo".
  - **The hero changes with the home:**
    - night or away: «Buenas noches.» with the hat on;
    - alert: «Alguien en el patio.» with media and actions;
    - offline: «Sin conexión», grey.
- **Desktop:**
  - a status band (mascot, sentence, stats, Nuevo) that never scrolls;
  - at 1024–1699 px, three independently scrolling columns: Ahora + Hoy +
    Mañana | Novedades | Cámaras 2×2 + En casa;
  - from 1700 px, four: Ahora/Hoy | Novedades (at most 620 px) | a camera
    grid with Lo que pasó | En casa + Proyectos;
  - content capped at 2,200 px. Before and after at 1280, 1920 and 2560 are in
    the prototype.
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
- **Layout:** title + SOS, the `Aura`-backed hero for the current place
  (`Presence` + the mode as a 30 px hero line + one sentence) with the mode
  `Choice` as a glass segmented control under it, within thumb reach, "Cámaras" (2×2 `Media` tiles with live thumbnails, privacy and off
  states), "Lo que pasó" (3 rows, "Revisar" chip on those pending review, "Ver
  todo"), and "Más" (Visitas esperadas, Lugares y modos, Mantenimiento,
  Personas vistas for the owner). With several places, the status shows the
  place picker as its title ("Casa ▾") and "Todos los lugares" in the sheet.
  Changing the mode plays one `snappy` slide, a `success` haptic and the
  Aura's cross-fade to the new tone; `Presence` puts on or takes off its hat.
- **Phone:** a compact hero (mascot 58 beside «En casa») with stats («1 por
  revisar», «0 en curso», «1 visita hoy») and the mode control, so the cameras
  start above the fold.
- **Desktop:**
  - a status band (Aura `band`, mascot, sentence, stats, mode control, SOS);
  - an `auto-fill` camera grid (3 columns at 1280, more as width grows) whose
    tiles reveal *Ver* / *Hablar* on hover;
  - a "Lo que pasó" column with inline *Revisar*;
  - from 1700 px, a third column with Visitas, Lugares and Mantenimiento.
  - Each column scrolls on its own. Before and after at 1280, 1920 and 2560
    are in the prototype.
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
- **Layout:** `Presence` (28) beside Argus' bubbles, showing `think` while a
  tool runs and `happy` when something was created. Bubbles: mine in ink,
  Argus' on surface. The source as meta
  ("por voz", "desde el portátil"), results as chips that open the created item
  or the camera, suggestion chips above the composer that change with context
  ("Muéstrame la cocina", "Recuérdame…", "Modo noche").
- **States:** empty thread (three suggestions, a one-line "Puedes escribirme o
  hablarme"); thinking (a three-dot bubble); voice listening/speaking/muted;
  mic denied (button to grant); Argus unreachable (the message stays as
  "No enviado · Reintentar", never silently lost); module-off request
  ("Activar Productividad" as a pending intent chip).
- **Voice:** the call stage is `Presence` at 190 in `listen` / `speak`, driven
  by `level`, over the `Aura` `listen` tone with the edge glow. A live
  transcript sits under it (as Claude and ChatGPT do); result cards (the
  camera, the reminder) appear inline instead of covering the transcript.
- **Desktop:** three columns. Conversations on the left (Argus pinned with its
  mascot), the chat in the centre (max 760 px; holding Space talks), and a
  context panel on the right: what Argus did in this conversation (created
  items), the camera it opened, and who is home.

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
      detents `auto` → `large`.
- [ ] Medium+ and web: the same `Sheet` is a centred dialog or right side
      sheet, focus is trapped and returned, Ctrl/⌘+Enter submits.
- [ ] **Every overlay closes on a tap or click outside it (the scrim), with
      Esc on desktop, with Back on Android (A15) and by dragging a sheet
      down**. Exceptions: a destructive confirmation (only its buttons,
      Esc or Back = Cancelar), and a form with unsaved input, which asks
      «¿Descartar «…»?» with *Seguir editando* as the default (§5.7).
- [ ] Irreversible or loud actions use `Confirm` (native alert on phones) with
      a named verb; reversible actions use Deshacer instead.

**Sheet + keyboard (acceptance on the owner's Samsung S21 FE, Samsung Keyboard, Android 14 and 15, plus one iPhone)**

- [ ] Open a form and focus the first field: the title and ✕ are fully
      visible, and the sheet's top is at or below the status bar + 16 dp.
- [ ] The footer (Guardar, optional ⋯) sits directly above the keyboard and
      stays there while the fields scroll between the pinned title and the
      footer.
- [ ] Focus the last field of a long form: it is visible above the footer,
      and the title stays pinned.
- [ ] Move through every field with the keyboard's Siguiente key: no jump and
      no flicker. On the last field the platform's *done* submits; no key or
      header button repeats "Guardar".
- [ ] There is no Cancelar button: ✕, a swipe down, a tap outside and Back
      close it, and each asks before discarding when the form is dirty.
- [ ] Type 10 lines in a multiline field: it grows to 5 lines, then scrolls,
      and the caret stays visible.
- [ ] Toggle the Samsung keyboard's suggestion or toolbar strip (its height
      changes): the layout follows.
- [ ] Dismiss the keyboard by Back, by dragging and by tapping outside it: no
      gap is left behind (#790), and the sheet returns to the detent it had.
- [ ] Swipe the sheet down with the keyboard open: it closes cleanly, or
      asks to discard if the form is dirty.
- [ ] Rotate to landscape with the keyboard open: the header is visible and
      every field is reachable.
- [ ] Font scale at maximum and display zoom Large: the title keeps one line
      (it truncates before the ✕ moves), the footer button grows instead of
      truncating, and the content scrolls.
- [ ] Switch dark/light while the app runs, then reopen the sheet: the top
      inset is still respected (the #4863 pattern).
- [ ] Open and close it 20 times: no lost taps and no stuck sheet.
- [ ] Profile a drag and an open (GPU profiler / Perfetto): no frame over
      16 ms.
- [ ] The same forms on the desktop build: a centred dialog with title + ✕
      at the top and the actions at the bottom right; Esc and an outside
      click behave as in §5.7.

**Keyboard and input**

- [ ] The focused field stays visible above the keyboard, in sheets too (A6).
- [ ] The Return key is "Siguiente" between fields and the platform's *done*
      on the last one (it submits). It never carries the label of a button
      that is already on screen.
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
      hero and title cap at 1.5), at 320 px width, and in phone landscape
      (gate: the UI-map viewports plus font-scale states).
- [ ] Icons 20 or 24, stroke 1.75, from the registry only.
- [ ] **Actions in one place:** each sheet or dialog has one primary action,
      in its footer; no duplicate of it in the header or on the keyboard; no
      Cancelar where ✕, the scrim, Esc or Back already close it.
- [ ] **Not empty:** on phones the first content section starts within the
      top 40% of the screen; every row carries a secondary line; no dead area
      taller than one row on phone or one card on desktop (empty states
      included, which always offer the next step).
- [ ] **Width:** checked at 1280, 1440, 1920 and 2560. Columns are added as
      width grows, text columns stay at most about 680 px, content is capped
      at 2,200 px, and nothing floats in empty space.
- [ ] **Scroll:** one scroll owner per region; no nested scrollbars; the top
      bar, sidebar, status band and sheet title/footer stay put; long desktop
      columns have sticky section headers; columns scroll independently with
      the thin shared scrollbar style; the wheel and trackpad do not chain
      into the page; resize keeps each column's position; no horizontal page
      scroll.

**States and data**

- [ ] **Local data paints instantly:** a screen fed by WatermelonDB or the
      MMKV view cache shows no skeleton and no spinner, ever. A refresh shows
      at most an inline «Actualizando» in the top bar or section header,
      never a skeleton over content.
- [ ] **Skeletons only for HTTP data with no local copy yet**, in the final
      layout's shapes; no spinner in a list (gate: no `ActivityIndicator` in
      features).
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
- [ ] Transitions use the springs of §3.3 and run on the UI thread; none with
      reduce motion.
- [ ] At most two continuous animations on screen (`Aura`, `Presence`), both
      paused off-screen; at most one blur layer; the screen passes §7b's
      frame budget on the low-end reference (gate in R9).
- [ ] No glass behind reading text; Reduce Transparency and the `low` tier
      give solid surfaces.
- [ ] At most one mascot on screen, always beside words that carry the
      meaning; its state matches the truth (the hat whenever on watch).

**Errors**

- [ ] No backend code, HTTP status or raw server text on screen; every
      failure goes through the one code→message map, with a generic message
      for unknown codes (§5.8).
- [ ] The surface follows §5.8: inline for fields, a toast with Reintentar
      for a retryable action (after rollback), an inline `Notice` for a
      refusal, an in-place failed state for a read, full screen only for
      session or trust.
- [ ] Status never by colour alone: always an icon or a word.

## 11. Accessibility rules

- Text contrast ≥ 4.5:1, icons and control borders ≥ 3:1, in both themes,
  checked from `tokens.ts` by a unit test (WCAG 1.4.3, 1.4.11).
- Text scales with the OS: `allowFontScaling` stays on; `maxFontSizeMultiplier`
  2.0 for body/meta/caption and 1.5 for hero/title. That meets WCAG 1.4.4's
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
- Reduce motion, Reduce Transparency and Increase Contrast are honoured. On
  iOS: `isReduceTransparencyEnabled`, `isDarkerSystemColorsEnabled`. On
  Android: `isHighTextContrastEnabled`
  ([RN AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo)).
  Glass becomes solid, the Aura becomes a flat tint (and disappears with
  Increase Contrast), and the edge glow becomes a 3 px border. The app's own
  "Reducir efectos" setting does the same on every platform.
- The mascot and the Aura are decorative to screen readers; the hero sentence
  is the screen's first heading.
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
| R-D2 | ~~Actions in ink~~ **v3:** keep today's palette (warm charcoal and sand, cream or grafito actions, arena accent, gold icon wells), consolidated into about 18 roles from one source | yes |
| R-D3 | Body text 16 and system fonts, no custom font | yes |
| R-D4 | Remove the floating "+"; create from Agenda/Proyectos "+" or by asking Argus; long press on Argus for quick create | yes |
| R-D5 | Merge Cámaras into Seguridad; split the camera page into live + Ajustes de la cámara | yes |
| R-D6 | Agenda views: Hoy + Calendario (month on phone, week from tablet up) + Proyectos; drop Day and Agenda-list views | yes |
| R-D7 | Projects on phone as a list grouped by state; board only on wide screens | yes |
| R-D8 | Native sheets with **react-native-true-sheet 3.11.x**: David's pick, confirmed on evidence (§8: native, maintained, keyboard clamp verified; gorhom stalled; formSheet breaks with `KeyboardProvider`). Spike on the S21 FE first; sonner for toasts; expo-haptics | yes, after the spike |
| R-D9 | Font scale cap raised from 1.6 to 2.0 for body text | yes |
| R-D10 | Panic as hold-to-confirm "SOS" in Seguridad (and in the guest's Inicio) | yes |
| R-D11 | ~~The mascot only in onboarding and the voice call~~ **Reversed by the owner in v2:** the mascot is a living presence across the app (§8b); the orbit hero and the "+" morph go | yes |
| R-D12 | Rename "Entornos" → "Lugares", "Vigilancia" → "Seguridad" everywhere | yes |
| R-D13 | The Argus tab opens the Argus thread directly; conversations with people sit behind its header | yes; alternative: a conversations list with Argus pinned first |
| R-D14 | Identity: the `Aura` ambient status, the `hero` sentence, glass only on floating chrome, the three springs (§2b) | yes |
| R-D15 | Signature gesture: **hold the centre tab to talk** from any screen; a tap opens the chat (replaces v1's "long press = quick create") | yes |
| R-D16 | The hat means "on watch": the mascot wears it in Noche, Fuera and Armado and in alerts, and never suggests that security is off | yes |
| R-D17 | Mascot technology: **Rive** (native runtime; `canvas-lite` on desktop if the WebKitGTK CSP test passes, otherwise still poses from the same file). Needs a paid Rive editor seat (about $9/month) and someone to rig the `.riv` from today's figure | yes, after the spike |
| R-D18 | Allow `'wasm-unsafe-eval'` in the Tauri/web CSP (self-hosted wasm only) so desktop gets the animated mascot | yes, if the WebKitGTK test passes; otherwise keep the strict CSP and the still poses |
| R-D19 | ⌘K `Command` as the one door on desktop (commands, search, ask Argus), and the search button on phones | yes |
| R-D20 | A "Reducir efectos" setting, plus an automatic `low` tier on older Android (no blur, still Aura, simpler mascot) | yes |
| R-D21 | Dismissal: overlays close on an outside tap/click, Esc and Back, except destructive confirmations and dirty forms, which ask (§5.7) | yes |
| R-D22 | **v3 basis:** the redesign evolves today's look (palette, cards, chips, mascot) instead of replacing it; the new-era layer (Aura, glass on what floats, springs, the living mascot) sits on top | yes |
| R-D23 | Sheet + keyboard: ceiling at the top safe area + 16 dp, pinned title, inner scroll, footer above the keyboard, focused field 16 dp above it (§5.9); accepted only after the §10 list passes on the S21 FE | yes |
| R-D24 | Actions in one place: title + ✕ at the top, a pinned footer with one primary (and at most one icon secondary), no Cancelar, no duplicate Guardar; desktop dialogs put the footer actions bottom right (§5.3) | yes |
| R-D25 | Density: compact heroes (content above the fold on phones), content-rich rows, and 3 or 4 columns of real content on desktop (§6b) | yes |
| R-D26 | Large screens and scrolling: 4 columns from 1700 px, a 2,200 px content cap, text at most about 680 px, and one scroll owner per region with sticky headers and shared thin scrollbars (§6c) | yes |
| R-D27 | Loading: local data paints instantly, with at most an inline «Actualizando»; skeletons only for HTTP data without a local copy (§5.4) | yes |
| R-D28 | Mascot: choose one of the six proposals (`mascot-proposals/index.html`); the recommendation is **2 · Búho**, with **0 · Argus evolucionado** as the continuity option | the owner decides |

## 14. Order of work

The rules, the refactor and the redesign run as one programme after the owner
approves this design (owner decision, 2026-10-20). Within it:

1. The two spikes (TrueSheet, Rive and the WebKitGTK CSP) and the low-end
   Android performance reference come first, because they can change R-D8,
   R-D17 and R-D18.
2. `tokens.ts` gets §3's values (R5) and the 26 components of §4 are built
   in `ui-lab` with baselines at three widths × two themes × reduced
   motion/transparency (R6).
3. Navigation (§9.0) and Inicio first: they change the first impression and
   remove the most code.
4. Then Seguridad + Cámara, Agenda + Proyectos, Argus, Tú/Ajustes/Personas,
   and onboarding last (it already works and is seen once).
5. Each screen lands only when it passes §10 and its UI-map states are
   re-captured. Deleted components go in the same change (no dead code).

## 15. Alignment with the refactor plan and the rules

The rules agent's `frontend-rules-final.md` did not exist on the plan branch
when this was written. It should reference §3 (tokens) and §4 (the 26
components) of this file. Where this spec departs from
`frontend-refactor-plan.md` / `frontend-rules-proposal.md`, the difference is
deliberate and needs the owner's or the rules agent's confirmation:

| # | Plan / rules say | This spec says | Resolution proposed |
|---|---|---|---|
| A1 | D7: the redesign starts after R5 and R6 exit | the owner's 2026-10-20 decision: rules, refactor and redesign are implemented together after design approval | the plan's D7 and §5 ordering are superseded; update the plan |
| A2 | F20: `Text` caps font scale at 1.6 | 2.0 for body/meta/caption, 1.5 for hero/title (§11) | change F20's number |
| A3 | F21: today's type scale (8 steps) and radius scale (9 steps) are kept | 6 type steps (`hero` 36 … `caption` 12) and 5 concentric radii (§3) | F21 keeps the *mechanism* (lint-enforced scales) with the new *values* |
| A4 | §2.4 / F20: status colours are fills with `*-strong` text twins | v3 keeps today's values. The "strong" values become the role values and the pure fills are named as fills (§3.1), so there is no separate twin token | F20 keeps the contrast test and names roles, not twins |
| A5 | §3.7 primitive names: `PressableSurface`, `Button`, `IconButton`, `ListRow`, `SegmentedControl` (falls back to a select), `RetryNotice`, `StaleRibbon`, `Field`, `Stack`/`Inline`/`Cluster` | `Pressable`(`PressableSurface`), `Button` (with `iconOnly`, absorbing `IconButton`), `Row`, `Choice`, `Notice` (covers retry and stale), `Field`; `Stack`/`Inline`/`Cluster` are kept as layout helpers and not counted among the 26 | use this spec's names in the rules, or keep the plan's: only one list may exist |
| A6 | F27 performance budgets cover bundle and startup | adds §7b's animation budget, the `perfTier`, and new dependencies: TrueSheet, sonner(-native), expo-haptics, expo-blur, expo-glass-effect, Rive (+about 420 KB gzip wasm on web, lazy-loaded; +about 2 MB per native app) | add §7b to F27; budget the new dependencies explicitly |
| A7 | F31 / the Tauri CSP: scripts only from the app itself | Rive on desktop needs `'wasm-unsafe-eval'` with self-hosted wasm (R-D18) | the owner decides; without it, the desktop uses still poses |
| A8 | F11: a failure is never shown as a fact | §5.8 adds *where* each error appears; the copy and the code→message map stay with `error-messages-spec.md` (not yet on the plan branch) | consistent; the rules should name `serviceErrorKey` as the single map |
| A9 | Breakpoints `compact < 600 ≤ medium < 1024 ≤ expanded < 1440 ≤ wide` | identical (§6) | no conflict |

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
- v2 identity research (new-era design, AI assistants, smart home): see the
  links in §2b. Mascot runtimes: see §8b.
