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

**v3.5 (2026-10-20):** the owner chose **Estela** as Argus' presence (R-D28). It replaces the white mascot everywhere, with an animation catalogue in §8b. Where older text in this document says «mascot» or «Presence», read Estela.

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

Inside the Aura, Argus itself (Estela, §8b) says how things are in one large
sentence: «Todo tranquilo.», «Buenas noches.», «Alguien en el patio.» Argus
becomes a calm sweeping arc whenever it is on watch, and draws an eye when it looks through a camera.

Talking to it is one signature gesture everywhere: **hold the centre of the
bar**. The screen's edge lights up, Estela streams toward you, and you
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
| A living Argus | `Presence` (state, intensity, target, level, event, size) | Estela, 17 states and 11 events (§8b), driven by app state and voice level | Still frame per state | about 400 lines (engine, Skia Atlas renderer, Canvas 2D renderer, icon form), no asset; replaces about 1,600 lines of today's procedural mascot and avatar |
| The hero sentence | `Status` variant `hero` | One `hero` line per screen (36/40), spoken by Argus, with a cross-fade on change | Instant change | inside `Status` |
| Glass on floating chrome | `material` token used by `Nav`, `Sheet`, `Menu`, `Command` | Floating bar, sheet backdrop, desktop sidebar and palette. iOS 26 native glass (expo-glass-effect), Android 12+ blur (expo-blur `BlurTargetView`), web `backdrop-filter`, and a solid surface elsewhere | Solid surface with a hairline | about 60 lines in the four owners |
| Physical motion | `springs.ts`: `snappy` (presses, toggles), `gentle` (sheets, layout), free flow (Estela only); `usePressScale` | One feel everywhere; presses scale to 0.96 | `ReduceMotion.System`: end state at once | about 60 lines |
| One door for everything | `Command` (⌘K on desktop, the search button on phones) | Commands, search and "ask Argus" in one bar, with shortcuts shown beside actions | — | about 250 lines; replaces the Inicio search bar and the bell popover |
| The signature gesture | inside `Nav`: hold the centre tab | Hold to talk from any screen: the `Aura` edge mode, `Presence` in `listen`, haptic `impactLight` on start and stop, a live transcript pill | Tap the centre, then tap to stop | about 80 lines |
| Grounded answers | `FeedItem` / chat result chips + `Media` `focus` overlay | Argus shows what it means: "this camera" (a dimmed frame with a box around the detected person), "this reminder" (a chip that opens it) | Thicker outline, no dimming | about 80 lines |
| Live tiles | `Media` | A breathing live dot, frames refreshed with a short cross-fade; the tile grows into the live view | Static dot, cut instead of zoom | inside `Media` |

What is deliberately **not** done: no glass behind reading text, no
animated backgrounds behind lists, no novel navigation, no 3D or Skia
canvases (CanvasKit is 2.9 MB gzip on web, and about 4 MB on Android and 6 MB
on iOS: [Skia web](https://www.mintlify.com/shopify/react-native-skia/getting-started/web)),
and no more than one Estela per screen.

## 3. Tokens (the values R5 writes into `tokens.ts`)

The prototype (`docs/plans/redesign-prototype/`) is the visual truth, and
`src/shared/theme/tokens.ts` holds its values (owner decision, 2026-10-20).
The numbers in this section are the values of `tokens.ts`, measured from the
prototype; where an earlier draft of this spec disagreed (the headline, the
hero line, the row height, the radius steps), the prototype won and the text
below follows it. A value changes in `tokens.ts` first, from the prototype,
and this section follows.

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
| `accent` | `#836A3C` | `#D9BC85` | text-safe accent: icons in wells, unread dot, focus ring, selection, Argus (`accent-strong`) |
| `accent-fill` | `#B89A63` | `#D9BC85` | accent as a fill that carries no text (`accent`) |
| `accent-soft` | `#F3E7D2` | `#332A1C` | accent wells (`accent-soft`) |
| `ok` / `ok-soft` | `#3B7B4F` / `#E3EFE5` | `#63AE73` / `#1C2B20` | calm, online, done (`success`) |
| `attn` / `attn-soft` | `#9A6114` / `#F8EBD6` | `#E5BC69` / `#33281A` | attention, review, stale (`warning-strong`) |
| `alert` / `alert-soft` | `#CC3535` / `#FBE4E2` | `#C9706B` / `#3A1F1C` | real alerts, destructive (`error-strong`) |
| `scrim` | `rgba(20,18,16,0.32)` | `rgba(0,0,0,0.5)` | behind sheets and dialogs (`overlay`) |
| `skel` / `skel-2` | `#ECE9E4` / `#F5F3F0` | `#24221F` / `#2C2A26` | skeleton blocks and their shimmer |
| `ev1`–`ev4` (each with `evN-text`) | `#EFE4D0` `#E2ECE3` `#E1E6EF` `#F2E1DF` | `#3A2F1C` `#1F3326` `#222C3D` `#3A2321` | calendar event tints, each with its text colour (`#5E4A22` `#2C5338` `#2F4366` `#6E2F28` light, `#EBD3A6` `#A9D8B6` `#B4C6E6` `#F0BDB6` dark) |

Rules:

- 33 roles per theme instead of 59 constants: the 20 above the skeleton row,
  the three of the glass material, the two skeleton tones and the four event
  tints with their text colours. The text-safe "strong"
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
- Event colours in the calendar map to the four muted tints `ev1`–`ev4`. The raw "blue" of W24 is gone.
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
- **Material:** `glass` `rgba(255,255,255,0.66)` / `rgba(40,38,32,0.66)` with
  a blur of 22, saturation 1.7, a 1 px inner hairline (`glass-line`,
  `rgba(255,255,255,0.7)` / `rgba(255,255,255,0.08)`) and an outer edge
  (`glass-edge`). Controls blur 18 at saturation 1.6, the sheet 26 and the
  palette 30 (`tokens.material`).
  Used only by `Nav`, `Sheet` (backdrop edge), `Menu` and `Command`.

### 3.2 Type: six steps and their roles, system fonts

| Step | Size / line | Weight | Use |
|---|---|---|---|
| `hero` | 36 / 39.6 | 800, tracking −3% | the one expressive sentence per screen (`Status` hero), onboarding headline |
| `title` | 24 / 30 | 750, tracking −2% | screen titles and section headings (today's bold "Recordatorios", "Usuarios") |
| `headline` | 17 / 23.8 | 650 | section headings, status sentence |
| `body` | 16 / 22.4 | 400 | all reading text |
| `meta` | 14 / 19.88 | 400 | secondary lines, timestamps |
| `caption` | 12 / 16.2 | 500 | tab labels, chips, badges only |

The prototype also uses named type roles, kept in `tokens.typeRoles` beside the
steps: `heroCompact` 30 / 33 and `heroSecondary` 26 / 28.6 (800, −3%),
`section` 21 / 29.4 (750, −1.5%), `rowTitle` 16 / 21.6 (500), `rowMeta`
14 / 18.9, `button` 16 / 22.4 and `buttonCompact` 15 / 21 (650), `label`
15 / 21 (600), `feed` 15 / 21, `chip` 13 / 17.55 (600), `tab` 12 / 16.2 (600)
and `key` 11 / 17 (650). Steps scale with the OS text size up to 2× (`hero`,
`title` and the hero roles up to 1.5×, `tab` 1.15×).

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
  minimum height 62, icon 24 (20 inside rows and buttons), icon wells 42
  (36 small), avatar 36/56, button 50 (40 compact), field 48, switch 46 × 28,
  tab bar 72, icon stroke 1.75 everywhere (`tokens.size`).
- **Radii** (named roles, concentric, `tokens.radius`): `key` 6 (keyboard
  keys) · `sm` 8 (small wells) · `segInner` 11 (the selected segment) ·
  `control` 12 (inputs, segmented controls) · `well` 14 (icon wells) ·
  `button` 16 · `toast` 18 · `media` 20 · `dialog` 22 · `card` 24 (cards,
  today's card radius) · `status` 26 (the status hero) · `sheet` 28 · `full`
  (the bar, pills, avatars, switches). Each role is one job, so a component
  reads its role, never a number. Nested shapes keep concentric corners
  (outer radius = inner radius + padding), as Liquid Glass does.
- **Elevation** (3 levels): `card` for cards on the page (dark: a 1 px top
  highlight and a soft shadow; light: a warm two-layer shadow), `float` for
  sheets, dialogs, menus, toasts and the bar, and `none` for content inside
  cards (hairlines separate it).
- **Motion:** three springs instead of durations for anything that moves
  physically: `snappy` (damping 18, stiffness 320: presses, toggles, tab
  changes), `gentle` (damping 22, stiffness 180: sheets, layout, tile → live),
  `playful` (damping 10, stiffness 220: the mascot only). Durations are
  `fast` 120, `base` 200 (cross-fades) and `slow` 300 ms; a press scales to
  0.96 (0.9 for an icon). Native sheets, screens and alerts keep the platform's own
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
| 25 | `Presence` (Estela) | `state` (17, §8b), `intensity`, `target`, `level` (0–1 voice amplitude), `event`, `size` (icon 28–48, compact, medium, stage) | `welcome-mascot/*` (1,211 lines) and `voice/components/avatar.tsx` (391) |
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
| Mascot and avatar | 8 files, 1,602 lines | inside `Presence` (about 400 lines) | Estela's target function and renderers (§8b) |
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
   - **Connection: silent when it works (owner rule, 2026-10-20).** The app
     never shows «Conectando…», «Conectado», «Reconectado» or any spinner,
     toast or banner for a connect or reconnect that succeeds. It paints from
     local data and stays optimistic.
     - **Grace period: 12 s.** Something appears only after Argus has been
       unreachable for 12 s in a row.
     - **Why 12 s.** The ordinary interruptions recover within seconds:
       - a Wi-Fi/mobile handover;
       - the app returning from the background (the route probe, CONTEXT.md
         "Local-first route choice");
       - the sync socket's reconnect.

       The Android field test measured recovery in 12 s or less after Wi-Fi
       came back (`uiux-map/android/findings.md`, measured timings). 12 s
       hides those blips without leaving a real outage unannounced for long.
       The camera live view, which shows the gap itself, keeps its own
       unreachable state.
     - **What appears then** is the calm offline pattern:
       - a quiet one-line `Notice` at the top of the content (not over the
         header, W10/W11) naming the right cause, «Sin Wi-Fi» versus «Fuera
         de casa» (A7);
       - the last-known data, labelled with its age;
       - Estela in `off`.
     - **When the connection returns** the notice simply disappears and
       Estela regains its colour. No «Conectado» toast, no announcement.
     - **The exception is a real error the user must act on.** A write that
       could not be saved is reported at once, because the server never
       received it and nothing is queued (CONTEXT.md, Phase 4b). The report is
       the toast with Reintentar of §5.8, naming what was not saved. It is
       never a connection status.
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
   The `Aura` switches to `alert` and `Presence` to `alert` (faster, warmer, readable,
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
- **Vertical rhythm.** Sections are 24 apart, rows are at least 62 dp
  (`size.row`; still ≥ 48 dp targets), and cards have 4 px inner padding around their rows.
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

### 6b-1. Desktop fills the viewport height, not just the width (v3.4)

David's capture of the 2560 comparison showed the redesign's columns ending
at different heights with large blanks below, while today's app filled its
columns better. The rules:

- **Every desktop column is a full-height panel with its own scroll.** The
  last section of each column grows to the bottom (`flex: 1 0 auto`), so no
  column ends with a blank while its neighbours continue. A section can be
  marked to grow instead (the camera grid).
- **Content scales to the height:**
  - Lists show as many items as fit: Novedades shows 8, 11 or 14 items at
    1280, 1920 and 2560.
  - Hoy is the full day timeline, free slots included.
  - Camera tiles stretch to fill their column (`grid-auto-rows: 1fr`, at
    least 120 px).
  - The week grid's hour rows divide the available height.
  - The Argus thread is anchored to the bottom, with more history above it
    on taller screens.
- **The aside grows into more sections** as height and width allow: who is
  home, projects, recent clips, upcoming reminders, system status (server,
  modules, cameras, storage), activity per camera, recordings, and what Argus
  remembers.
- **The sidebar ends with useful content:** server status, the current guard
  mode, cameras online, storage, and a quick «Pregúntale a Argus».
- **With little data, columns still end at the bottom,** filled with
  setup steps (Primeros pasos), suggestions («Recuérdame…»), recent history,
  "what each camera will do", quick templates and system status, never a
  blank.
- **Verification:** in the prototype, a measurement of every desktop column at
  1920 and 2560, with real data and with little data, shows each column's
  last block within its 20–28 px padding of the bottom, or scrolling.

### 6b-2. Phone text and card rules (v3.3, from the owner's phone)

The owner's capture of Seguridad offline on his phone showed:
- an error card squeezing icon, a four-line title, three lines of body and
  a button into three columns at 360 px;
- a hero a third of the screen tall for one fact;
- a section heading that wrapped;
- tab labels too close to the bottom edge.

The rules that remove all four:

- **Notice, empty and error cards stack on phones** (`ncard`):
  - first row: an icon well and a title;
  - second row: one line of body;
  - third row: the action, right-aligned (compact) or full width.

  Text and action never sit side by side when the text would wrap. This
  follows Material 3's card guidance (content first, actions in their own
  row) and Apple's advice to keep text, not controls, as the primary content
  ([M3 cards](https://m3.material.io/components/cards/guidelines),
  [HIG layout](https://developer.apple.com/design/human-interface-guidelines/layout)).
- **Length budget at 360 dp with font scale 1.0:**
  - A card title is at most about 28 characters (one line in 16/650);
    at most 2 lines at 1.3.
  - A body is at most about 70 characters (2 lines). Longer copy goes behind
    the row, not into it.
  - A section heading is at most about 18 characters. Qualifiers such as
    time, age or counts go in the header's meta slot («Lo último» + «hace
    10 min»), never in the heading.
  - Line length for reading text stays within about 45–90 characters
    ([Butterick, line length](https://practicaltypography.com/line-length.html)).

  Mobile users read less and need shorter, front-loaded text
  ([NN/g, mobile content](https://www.nngroup.com/articles/mobile-content/)).
- **Type hierarchy on phones:**
  - one hero line, 30 at 1.0, 26 for secondary screens;
  - card titles 16 semibold;
  - body and meta 14, caption 12.

  This mirrors the M3 roles title-medium, body-medium and label
  ([M3 type scale](https://m3.material.io/styles/typography/type-scale-tokens)).
  It keeps Apple's minimum of 11 pt for any text
  ([HIG typography](https://developer.apple.com/design/human-interface-guidelines/typography)).
- **Compact heroes everywhere on phones.**
  - The mascot is 48–62 *beside* the sentence; the hero never takes more
    than about 20% of the screen.
  - Only onboarding and the voice call may centre a large mascot.
- **Rows keep one trailing item, and only a short one** (a time, a count,
  «ahora»). An action that needs words goes in the row's menu or swipe, not
  as a trailing chip that squeezes the title.
- **The tab bar sits above the system's bottom inset** (iOS home indicator,
  Android gesture bar: `safe-area-inset-bottom` / window insets), so labels
  always show fully. Labels scale with the user's font setting up to 1.15×;
  beyond that the bar keeps icons and relies on the accessibility large
  content viewer (iOS) or long-press tooltip.
- **Text spacing holds** under WCAG 1.4.12's overrides (line height 1.5,
  paragraph spacing 2×) without clipping
  ([WCAG 1.4.12](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)).

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
CSS animations, or Skia driven by a Reanimated worklet. No `setState` per frame, no JS
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
| Startup | the identity adds nothing to first paint: `Presence` starts its particles after the first frame, showing the state's still frame meanwhile |

**Performance tier.** `perfTier` is `high` or `low`, decided once from the
hardware profile (Android below API 31, under 4 GB RAM, or the user's
"Reducir efectos" setting gives `low`). Each effect states its cost and its
low-tier form:

| Effect | Runs on | Cost (estimate; the spike measures it) | Low-end Android / reduced fallback |
|---|---|---|---|
| `Aura` field | UI thread, 3 pre-blurred gradient views animating `transform` and `opacity` only (compositor; no per-frame blur) | about 0.3–0.6 ms GPU per frame | Still gradient, no drift; with Reduce Transparency or Increase Contrast, a flat tint |
| Glass (`material`) | iOS 26 native glass (expo-glass-effect); Android 12+ `RenderEffect` blur (expo-blur `BlurTargetView`); web `backdrop-filter` | proportional to the blurred area: kept to the 70 dp bar or the sheet edge | Below API 31, `low` tier, Reduce Transparency: solid `surface` with a hairline ([expo-blur](https://docs.expo.dev/versions/latest/sdk/blur-view/), [expo-glass-effect](https://docs.expo.dev/versions/latest/sdk/glass-effect.md)) |
| `Presence` (Estela) | Skia Atlas of streak sprites, physics in a Reanimated worklet on the UI thread; JS sends only state, intensity, target, level and event | one draw call per frame; 560 particles at stage size, 200 compact; the icon form is about 24 strokes | `low` tier: half the particles, no trails, 30 fps; reduce motion: the catalogue's still frame |
| Listening edge | UI thread, one inset shadow animating opacity | negligible | Steady rim |
| Springs and press scale | UI thread worklets | negligible | Instant |
| Skeleton shimmer | Reanimated CSS animation (opacity) | negligible | Static fill |
| Live tiles | the native player, frames at most every 10 s, cross-faded | network-bound, not frame-bound | Static thumbnail, refreshed on focus |

## 7c. Moments without sound: animation and haptics carry them

Owner decision (2026-10-20): **no UI sound in this redesign**, only
animation, made beautiful. The sound design is kept for later in Appendix B.
These moments are carried by Estela's animation (§8b) and the haptic
(expo-haptics, §8):

| Moment | Animation | Haptic |
|---|---|---|
| Call connected | Estela `assemble` into `listen`; the screen edge lights | `success` |
| Call ended | Estela `disperse`, then rest | `impactLight` |
| Voz → Chat / Chat → Voz | the ribbon re-forms (`modechange`); the composer morphs between the mic and the text field | `selection` |
| Message sent | the bubble rises into place with the `snappy` spring | `impactLight` |
| Reply received | Estela `notify` brighten; the bubble fades in | none |
| Done (saved, completed) | Estela `happy` flourish; the check fills | `success` |
| Soft error | Estela `error` droop; the error surface of §5.8 | `warning` |
| Estela opens her eye | `look` / `search` | none |
| First appearance | `appear` (onboarding) | none |

Panic, SOS and duress keep their hold-to-confirm haptic ticks and stay
visually calm. No moment depends on sound to be understood.

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
| Presence (Estela) | **@shopify/react-native-skia** v2 Atlas + Reanimated on iOS/Android; a Canvas 2D renderer of the same particle system on web and Tauri (no wasm, no CSP change) | Canvas 2D | **Yes**: about 1,600 lines of procedural mascot and avatar become about 400 |
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
2. Estela on a low-end Android: frame time with Skia Atlas, and latency from voice level to waves
   and the Canvas 2D renderer in the Tauri WebKitGTK build under the strict CSP, which
   stays as it is (no wasm, R-D18 withdrawn).

## 8b. Estela: the presence of Argus

**Decision (R-D28, resolved 2026-10-20).** The owner chose **Estela** from
the aura proposals (`mascot-proposals/aura.html`, option 1). Estela replaces
the white mascot everywhere: the prototype, the components, the states and
every screen.

Estela is a stream of stars and light that flows like a living brushstroke.
It has no body, no circle and no container: its edges fade into the
background. It keeps the identity's palette (warm sand and amber, with deep
indigo accents) and suits a calm, warm male voice: premium, unhurried and
never cute or scary.

The earlier rounds that led here are kept as pages, for the record:
- `mascot-proposals/index.html` (six characters);
- `slimes.html`;
- `cosmic.html`;
- `aura.html`, with Estela marked as chosen.

### One primitive: `Presence`

Everything Estela does is a parameter of one component:

```
<Presence state intensity target level size event />
```

- **`state`** is one of the 17 states in the catalogue below.
- **`intensity`** (0–1) scales speed and brightness. Alert and panic share a
  shape; panic is alert at full intensity plus its 1.2 Hz pulse.
- **`target`** is the point the pupil or the lean goes to: the person in the
  frame, the search hit, the user's touch.
- **`level`** (0–1) is the voice amplitude, smoothed with about 40 ms attack
  and 250 ms release.
- **`event`** is a one-shot overlay that never changes the state: `assemble`,
  `appear`, `disperse`, `cancel`, `ripple-in`, `ripple-out`, `notify`,
  `glint`, `modechange`, `reconnect`, `touch`.

**Sizes.** Every size reads the same parameters:
- 28, 36 and 48 are the **icon form**: a procedural brushstroke, an eye or a
  line, drawn as about 24 strokes with no particles.
- 49–89 is the **compact** form: 200 particles. The Inicio and Seguridad
  heroes, the desktop band.
- 90–149 is the **medium** form: 320 particles. Empty states and the eye
  overlay.
- 150 and up is the **stage** form: 560 particles. The voice call, onboarding
  and the catalogue.

**Where it appears** (one per screen, always beside words):
- the centre tab: the 36 px icon form, reflecting the current state;
- the Inicio and Seguridad heroes, beside the sentence;
- the Argus chat, beside Argus' bubbles at 28 px: thinking, looking, done;
- the voice call stage, at 190–300 px;
- the camera live view: the eye, drawn in a corner chip «Argus mira» while
  Argus is looking or searching;
- empty states;
- onboarding: the first appearance, assembled from scattered stars;
- the desktop sidebar mark and the Argus conversation row.

### Life (micro-reactions)

- **It leans** toward the user's touch or pointer: up to 14% of its width,
  spring-smoothed, only within about 380 px and for 4 s after the last move.
- **It brightens** briefly when a message or notification arrives, or when
  it is tapped (`notify`, `touch`).
- **It drifts lightly with the scroll** on Inicio: up to 12% upward over the
  first 160 px.
- **It breathes with the home's state:**
  - calm: about 12 breaths a minute, ±2%;
  - on watch: slower and deeper, about 7 a minute;
  - alert: faster.
- **It never distracts while reading.**
  - Continuous motion stays slow (rotation at most 0.12 rad/s at rest).
  - Nothing sharper than the brushstroke appears.
  - No flash goes above 3 per second (WCAG 2.3.1).
  - The hero copy of Estela pauses once it scrolls out of view.

### The animation catalogue

Priority decides what shows when two things happen at once:
- **P0 truth:** offline. It never claims a state it cannot know. Only panic
  shows over it, because panic is local.
- **P1 safety:** panic, then alert.
- **P2 gaze:** look, search, found or not found, known, unknown.
- **P3 talk:** listen, then speak, then think.
- **P4 outcome:** done, cancel, error. These are short overlays of 1.5 s or
  less, after which the state underneath returns.
- **P5 ambient:** idle, on watch, night or asleep, mode change.

Event overlays (arrival, departure, notification, touch, open, close) never
replace a state, and are suppressed during P1.

| Case | When it triggers | What the stars do | Duration and easing | Priority | Reduced-motion still | Performance tier |
|---|---|---|---|---|---|---|
| Mirar (look) | live camera view, «muéstrame la cocina», watching a visitor | the stars draw an open almond eye; a lens-shaped pupil of light follows the subject (`target`) or the pointer; the stars shimmer along the outline | enter 600 ms gentle spring; holds while the view is open | P2 | open eye, pupil centred | medium 320; low 160, no trails |
| Buscar → encontrado | «¿dónde dejé las llaves?», «¿quién está en la puerta?», scanning cameras, recordings or memory | the eye narrows and the pupil sweeps side to side like a searchlight, brightening the stars it passes; on a hit it settles on the target, narrows to focus and glints | sweep 1.7 rad/s until a result; focus 400 ms snappy; glint 1.1 s ease-out | P2 | narrowed eye on the target, static glint | medium; low: no searchlight band |
| Buscar → sin resultado | the same search with no match | the sweep slows and the eye closes gently into a low line, then rests | close 900 ms ease-in-out, then idle | P2 → P5 | closed low line | any |
| Reconocer: conocido | a household member or named visitor is recognised | open eye, warmer tone, a soft warm glint over the pupil | glint 1.1 s ease-out; holds 2 s | P2 | warm eye, static glint | any |
| Reconocer: desconocido | an unknown person is detected (no alarm by itself) | the eye narrows calmly, cooler tone, the pupil steady on the person; no flashing, no red | narrow 700 ms gentle; holds while detected | P2 | narrowed eye | any |
| Escucha | hold-to-talk; the call while you speak | the stream gathers and flows toward you; its width follows `level` | enter 300 ms snappy; level-driven | P3 | a gathered stream | any; low: level at 15 Hz |
| Piensa | a tool runs; Argus looks something up | the ribbon braids into three strands | enter 400 ms; loops | P3 | a still braid | any |
| Habla | Argus speaks (TTS) | waves along the ribbon follow the voice amplitude | level-driven | P3 | a gentle wave | any |
| Piensa → habla | the first audio of the answer arrives | the braid untwists into the wave without breaking: one continuous stream | 600 ms gentle spring | P3 | — | any |
| Hecho | a task, reminder or setting is completed | a short upward flourish and a burst of sparkles, then rest | 1.6 s ease-out | P4 | flourish with three sparkles | any; low: no sparkle trails |
| Cancelado | the user cancels or interrupts | the stars unravel outward and fade, then reassemble softly | unravel 1.3 s ease-in, reassemble 2.2 s ease-out | P4 | a loose, dim ribbon | any |
| Error / no puedo | a request fails or is not allowed | the ribbon droops into a low curve and dims; no shaking | droop 800 ms ease-in-out; holds 2.4 s | P4 | drooped dim ribbon | any |
| Alerta | an alert needs attention | faster swirl, brighter, amber shifting to red, still smooth and readable | enter 300 ms; swirl 0.55 rad/s | P1 | warm-red swirl | any |
| Pánico | panic or a confirmed intruder | the fastest swirl, red-amber, with a steady 1.2 Hz brightness pulse (below 3 flashes/s) | enter 200 ms; pulse 1.2 Hz | P1 (wins over all) | bright red-amber swirl, no pulse | any; never dropped |
| Cambio de modo | the guard mode changes (En casa → Noche) | the ribbon loosens briefly and re-forms in the new mode's tempo and shape | 1.4 s gentle spring | P5 event | the new mode's still | any |
| Noche / duerme | night with quiet hours; the assistant resting | a thin, dim, slow ribbon | enter 1.2 s ease-in-out | P5 | thin dim line | low: 30 fps cap |
| De guardia | Noche, Fuera, Armado | an open arc (an upper lid) with a light that sweeps along it like a calm gaze | sweep 0.4 rad/s; breath about 7/min | P5 | arc with the light centred | any |
| Llegada / salida | someone arrives / leaves | a ripple of light travels from the edges to the centre (arrival) or from the centre out (departure) | 1.6 s ease-out | event | — | any |
| Aviso nuevo | a message or notification arrives | a brief brighten of the whole ribbon | 900 ms ease-out | event | — | any |
| Toque / desplazamiento | touch, hover, scroll | it leans toward the touch and drifts with the scroll; a tap brightens it | continuous spring; tap 800 ms | continuous | no lean | off on the low tier while scrolling |
| Abrir / cerrar la app | launch or foreground / background | scattered stars assemble into the current state / the ribbon disperses and fades | 2.2 s ease-out / 1.1 s ease-in | P5 event | the current state | low: 1.2 s |
| Sin conexión / reconexión | the app cannot reach Argus / Argus answers again | dim, grey, still; on reconnect, colour flows back from grey | 600 ms / 1.6 s ease-out | P0 | grey still line | any |
| Primera aparición | onboarding, the first time | stars drift in from far away and assemble into the ribbon | 3.4 s ease-out | onboarding | the ribbon at rest | any |

The prototype's «Estela · catálogo» section plays every row on a dark and a
light stage. Its table is generated from the same data.

### Build

- **iOS and Android:** `@shopify/react-native-skia` with an **Atlas** of
  streak sprites (one draw for all particles). A Reanimated worklet
  integrates the spring physics on the UI thread, and the trails come from an
  offscreen layer faded each frame. The target shapes (swirl, stream, braid,
  wave, eye, arc, ribbon) are a pure function `target(particle, state, t,
  level, target)`, the same one the prototype uses. JS sends only `state`,
  `intensity`, `target`, `level` and `event`.
- **Skia version.** Skia v2 (OpenGL ES) runs on every device. v3
  (Graphite/Vulkan) needs Vulkan 1.1, and the Play Store then stops serving
  devices without it. Recommendation: **v2**, or v3 with a static fallback
  when `Skia.gpu.isAvailable` is false.
- **Web and Tauri:** the same particle system on a plain Canvas 2D (the
  prototype is that renderer). No CanvasKit (2.9 MB) and no wasm, so the
  strict Tauri CSP stays as it is. R-D18 is no longer needed.
- **Icon form:** about 24 strokes per frame, drawn by the same component at
  28–48 px. It costs next to nothing.

**Code.** It replaces `welcome-mascot/*` and `avatar.tsx` (about 1,600
lines) with an estimated 350–450 lines: the target function, the Atlas
renderer, the web canvas renderer and the icon form. The prototype's whole
engine is under 200 lines.

### Performance tiers and stills

| Tier | Particles (stage / medium / compact) | Trails | Frame rate | Lean and scroll |
|---|---|---|---|---|
| `high` | 560 / 320 / 200 | yes | 60 fps active, 30 fps at rest | on |
| `low` (Android < 12, < 4 GB, «Reducir efectos») | 280 / 160 / 100 | no | 30 fps | off while scrolling |
| Reduced motion | — | — | still | off |

With reduced motion, each state renders once to its still frame (listed in
the catalogue) and only changes when the state changes, with a 200 ms
crossfade at most. Off-screen, backgrounded or scrolled-out copies pause.

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
    - night or away: «Buenas noches.» with Estela's on-watch arc;
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
  Aura's cross-fade to the new tone; Estela plays `modechange` and re-forms in the new mode's tempo.
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
- [ ] **Phone text budget (§6b-2):** notice, empty and error cards stack
      (title, one short body line, action below); card titles fit one line
      at 1.0; bodies two lines at most; section headings about 18 characters
      or fewer, with age or counts as meta; at most one short trailing item
      per row. Checked with data, empty, loading, error, offline, long text
      and font scale 1.3 at 360 dp.
- [ ] **Tab labels fully visible** above the bottom inset on iOS and on
      Android gesture navigation; labels capped at 1.15× scale.
- [ ] **Not empty:** on phones the first content section starts within the
      top 40% of the screen; every row carries a secondary line; no dead area
      taller than one row on phone or one card on desktop (empty states
      included, which always offer the next step).
- [ ] **Height:** at 1280, 1920 and 2560, with real data and with little
      data, every desktop column ends at the bottom: lists fill, the camera
      grid stretches, the aside grows sections, and the sidebar ends with
      status and a quick prompt. No column leaves a blank while others continue.
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
- [ ] **No connection status:** no «Conectando…», «Conectado» or
      «Reconectado», and no spinner, toast or banner for a successful connect
      or reconnect. The offline notice appears only after 12 s unreachable,
      and leaves silently. An unsaved write is reported at once as an error
      naming what was not saved.
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
- [ ] At most one Estela on screen, always beside words that carry the
      meaning; its state matches the truth (the on-watch arc whenever on
      watch, the eye only while Argus is actually looking).

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
- Short beats complete on phones. «Cámaras sin conexión» + «Revisa el
  Wi-Fi.» + «Reintentar», not «No puedo mostrar las cámaras ahora. Revisa el
  Wi-Fi o espera un momento.» Titles state the fact, bodies the one thing to
  do (§6b-2's length budget).
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
| R-D16 | ~~The hat means "on watch"~~ **Superseded by Estela:** on watch is the sweeping arc (§8b) | — |
| R-D17 | ~~Mascot technology: Rive~~ **Superseded:** Estela is built with Skia Atlas on phones and Canvas 2D on web/desktop (§8b); no Rive seat needed | yes |
| R-D18 | ~~Allow `'wasm-unsafe-eval'` in the Tauri CSP~~ **No longer needed:** Estela's web renderer is plain Canvas 2D | — |
| R-D19 | ⌘K `Command` as the one door on desktop (commands, search, ask Argus), and the search button on phones | yes |
| R-D20 | A "Reducir efectos" setting, plus an automatic `low` tier on older Android (no blur, still Aura, simpler mascot) | yes |
| R-D21 | Dismissal: overlays close on an outside tap/click, Esc and Back, except destructive confirmations and dirty forms, which ask (§5.7) | yes |
| R-D22 | **v3 basis:** the redesign evolves today's look (palette, cards, chips, mascot) instead of replacing it; the new-era layer (Aura, glass on what floats, springs, the living mascot) sits on top | yes |
| R-D23 | Sheet + keyboard: ceiling at the top safe area + 16 dp, pinned title, inner scroll, footer above the keyboard, focused field 16 dp above it (§5.9); accepted only after the §10 list passes on the S21 FE | yes |
| R-D24 | Actions in one place: title + ✕ at the top, a pinned footer with one primary (and at most one icon secondary), no Cancelar, no duplicate Guardar; desktop dialogs put the footer actions bottom right (§5.3) | yes |
| R-D25 | Density: compact heroes (content above the fold on phones), content-rich rows, and 3 or 4 columns of real content on desktop (§6b) | yes |
| R-D26 | Large screens and scrolling: 4 columns from 1700 px, a 2,200 px content cap, text at most about 680 px, and one scroll owner per region with sticky headers and shared thin scrollbars (§6c) | yes |
| R-D27 | Loading: local data paints instantly, with at most an inline «Actualizando»; skeletons only for HTTP data without a local copy (§5.4) | yes |
| R-D28 | **Resolved 2026-10-20: Estela** (`aura.html`, option 1) is Argus' presence everywhere, with the catalogue of §8b | decided |
| R-D29 | The desktop status band shows the `Aura` (the prototype hid it only through a CSS accident) | decided 2026-10-21 |
| R-D30 | Reduce Transparency uses §8b's flat tint and a steady rim | decided 2026-10-21 |
| R-D31 | One live Estela per screen: where a screen draws its hero Estela, the sidebar shows a small static mark instead of a second live one | decided 2026-10-21 |
| R-D32 | The `concern` state maps to Estela's `error` state | decided 2026-10-21 |
| R-D33 | The eye chip's Estela always uses the dark palette, for contrast over video | decided 2026-10-21 |
| R-D34 | Toasts are polite announcements; only errors that need an action use alert semantics | decided 2026-10-21 |
| R-D35 | The 641-file formatting commit stays deferred, and the format ratchet holds | decided 2026-10-21 |
| R-D36 | The web entry chunk comes down to the 6.6 MB ceiling through route-level lazy loading, in Phase 2 | decided 2026-10-21 |
| S1 | Sound: **deferred** by the owner (2026-10-20); no UI sound in this redesign. The v2 palette and rules are kept in Appendix B for a later decision | deferred |

## 14. Order of work

The rules, the refactor and the redesign run as one programme after the owner
approves this design (owner decision, 2026-10-20). Within it:

1. The two spikes (TrueSheet, and Estela on Skia Atlas) and the low-end
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
| A6 | F27 performance budgets cover bundle and startup | adds §7b's animation budget, the `perfTier`, and new dependencies: TrueSheet, sonner(-native), expo-haptics, expo-blur, expo-glass-effect, react-native-skia v2 (about +4 MB Android, +6 MB iOS; nothing on web, where Estela uses Canvas 2D) | add §7b to F27; budget the new dependencies explicitly |
| A7 | F31 / the Tauri CSP: scripts only from the app itself | no change: Estela renders with Canvas 2D on desktop (R-D18 withdrawn) | no conflict |
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

## Appendix B. Deferred: sound (out of scope for this redesign)

**Status: deferred by the owner on 2026-10-20.** No UI sound ships in this
redesign: the moments below are carried by animation and haptics (§7c). This
appendix keeps the research, the rules and the v2 palette, so the decision
can be taken later without starting over. Nothing in it is part of the
checklist, the component list or the implementation order.


Sound makes Argus feel alive and recognisable, but only when it confirms
something the user cares about. A sound on every tap is noise.

#### Research

- **Material sound guidance** gives these points
  ([about sound](https://m2.material.io/design/sound/about-sound.html),
  [applying sound to UI](https://m2.material.io/design/sound/applying-sound-to-ui.html),
  [sound choreography](https://m2.material.io/design/sound/sound-choreography.html)):
  - Sound is often unnecessary.
  - Leave it out of frequent actions, privacy-sensitive UI, and moments when
    the user asked not to be interrupted.
  - **Hero sounds** mark rare, important moments and are used sparingly and
    consistently.
  - Sounds form a hierarchy: brand, then hero, then alerts, then primary,
    then secondary.
  - Sounds in the same flow share timbre and envelope.
- **Apple HIG, playing audio**
  ([HIG](https://developer.apple.com/design/human-interface-guidelines/playing-audio)):
  - People who set the device to silent also want nonessential sound
    effects and feedback silenced.
  - In silent mode only audio the person explicitly starts plays.
  - Overriding the Ring/Silent switch for UI sounds is not acceptable.
- **Duolingo.** It is the best-known example of short "right / wrong" earcons.
  The correct-answer cue is commonly described as a short rising interval,
  and the wrong-answer cue as a deflated, descending tone that is
  "discouraging enough … but not so harsh that it induces anxiety"
  ([commentary](https://out-of-scope-product.beehiiv.com/p/duolingo-has-it-venmo-has-it-even-slack-has-it-your-product-doesn-t)).
  This is secondhand commentary, not Duolingo's own statement.
- **Discord.** Its join, leave and message sounds are short, one family, and
  instantly tied to one meaning each. I found no primary source on how they
  were designed. Only user requests for packs and customisation turned up
  ([support forum](https://support.discord.com/hc/vi/community/posts/16545888714647-Adjustable-Customizable-Notification-sounds)).
  The lesson I take from them is consistency, which is my inference.
- **expo-audio** ([SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/sdk/audio.md)):
  - `setAudioModeAsync` sets the session; `playsInSilentMode` must stay
    `false` for UI sounds.
  - `createAudioPlayer` gives a reusable, preloadable player. `seekTo(0)`
    before replaying, because a finished player stays at its end.

#### Moments that make a sound

| Moment | Meaning | Haptic pair (§10) | Notes |
|---|---|---|---|
| Call connected | Argus is with you | `success` | the only sound that plays when a call starts; never «conectando» |
| Call ended | the call is over | `impactLight` | plays on hang-up from either side |
| Voz → Chat | switched to typing | `selection` | short, about 0.5 s |
| Chat → Voz | switched to talking | `selection` | the mirror of Voz → Chat (rising vs falling) |
| Message sent | your message left | `impactLight` | only for a message to Argus or a person; about 0.5 s; silent when sent by voice |
| Reply received | Argus or a person answered | none | once per reply, never per streamed chunk; silent if it arrives within 1.5 s of sending and the thread is on screen (you are already looking) |
| Done | reminder, event or task saved; a task completed | `success` | the hero sound of daily use; at most once per 1.5 s, so a burst of completions plays once |
| Soft error | something was not saved or not allowed | `warning` | the descending, gentle cue; paired with the error toast of §5.8 |
| Estela opens her eye | looking through a camera, or searching | none | plays when the `look` or `search` state begins from the user's request; silent when the eye opens on its own (an automatic detection) or during a call |
| First appearance (proposed) | onboarding: Estela assembles for the first time | none | a single brand moment, once per install, as Material's hero sounds intend |

#### Moments that stay silent

- Every tap, toggle, segmented choice, menu, navigation and tab change.
- Scrolling, pull-to-refresh, skeletons and loading.
- «Conectando» and «conectado», reconnects, going offline and coming back,
  in line with the silent-connection rule of §5.4.
- Typing, each streamed chunk of a reply, Estela's ambient states (idle,
  breathing, watch, sleep) and her micro-reactions.
- Arrivals, departures and feed items while the app is in the foreground.
  Notifications outside the app use the OS notification sound and channel
  settings, not these UI sounds.
- **Panic, SOS and duress: always silent in the app.** Someone in danger
  must not be given away by their phone. The haptic ticks of the
  hold-to-confirm stay.
- Alerts and the siren are not UI sounds. They belong to the
  alert/notification channels and the camera siren, outside this registry.

#### Rules

1. **The OS decides first.**
   - **iOS:** the Ring/Silent switch silences UI sounds (an ambient audio
     session: `playsInSilentMode: false`, mixing with other audio, so the
     user's music never stops).
   - **Android:** in silent or vibrate ringer mode, and under Do Not
     Disturb, only the haptic plays. The sound plays on the
     sonification/notification usage, so its system volume applies.
   - **Web and Tauri:** the system output mute and volume apply. The
     browser's autoplay rule means no sound plays before the first user
     gesture, and none plays while the window is hidden.
2. **An in-app switch.**
   - Ajustes → Este dispositivo → «Sonidos de la app», on by default.
   - «Reducir efectos» (§7b) also turns UI sounds off, so people who choose
     calm get one switch for both.
   - When the OS asks for reduced motion, the onboarding sound row offers
     «Sonidos de la app» off in the same step, so it is never assumed.
3. **Quiet by default.**
   - Every asset is mastered to **−20 LUFS integrated** (±1), with true peaks
     at or below **−6 dBTP**.
   - Each lasts **0.5–2.0 s** including its tail; frequent ones (send, mode
     switch) are 0.5–0.7 s.
4. **Never overlap, never burst.**
   - One central player plays one sound at a time.
   - Any sound is dropped (not queued) within 300 ms of another.
   - The same sound is dropped within 1.5 s of itself.
   - When two compete, the higher priority wins: error > done > call
     connect/end > eye > reply > send > mode switch.
5. **Haptics go with them** where the platform has them (expo-haptics, §8).
   They follow the same toggle, except that the system haptic settings
   decide on their own.
6. **During an active call** only «call connected» and «call ended» play.
   Everything else stays silent, so Argus' voice is never stepped on.
7. **Same rules on every platform.** Desktop (Tauri) and web follow rules 1–6;
   only the platform-specific parts of rule 1 change.

#### Implementation notes (later; nothing is built now)

- **One registry file:** `shared/sound/sounds.ts` maps names to assets
  (`callConnect`, `callEnd`, `modeVoice`, `modeChat`, `send`, `reply`,
  `done`, `error`, `eye`, `appear`).
- **One function:** `playSound(name)` owns the toggle, the OS checks, the
  debounce, the priority and the haptic pair. Features never touch the audio
  API.
- **Preloaded players:** `createAudioPlayer` per asset at start-up (about
  10). `seekTo(0)` then `play()` keeps latency low. A web/Tauri variant uses
  pre-decoded Web Audio buffers behind the same function.
- **Assets:** mono, 44.1 kHz, about 10–15 KB each as AAC/MP3 at 64–96 kbps,
  about 150 KB for the whole set.
  - The v2 palette measures 7.5–28.5 KB as MP3, about 113 KB for all nine
    (ffmpeg `ebur128`).
  - Five files peak above −6 dBFS and need limiting.
- **Android ringer mode:** expo-audio does not report it. A small check in
  the existing native module (`AudioManager.getRingerMode` / DND) feeds
  `playSound`. This is to be built and verified on the S21 FE.

#### One material per moment (principle)

Each moment gets its own **material** (timbre), its own **direction**
(rising, falling, flat) and its own **note count**, with the first note
accented. Then no two moments are confused, even by someone who has heard
each sound only a few times.

This follows Brewster, Wright and Edwards' earcon guidelines
([Glasgow guidelines](https://www.dcs.gla.ac.uk/~stephen/earcon_guidelines.shtml),
[CHI'93 evaluation](https://www.dcs.gla.ac.uk/~stephen/papers/CHI93.PDF)):
- **Timbre first:** musical timbres are recognised better than simple tones.
- **Then rhythm and register:** different numbers of notes are an effective
  way to tell rhythms apart, and register differences must be large when
  listeners judge them on their own.
- **Similar timbres for related events.** That is why only the two halves of
  a pair share a material: conectar and colgar are the same marimba,
  mirrored.

The owner rejected the earlier two-family samples (Cristal, Estela) as
"muy similares", which is exactly what the guidelines predict when one
timbre is used for everything.

#### The proposed palette (v2, pending the owner's approval of each sound)

Generated by `scratchpad/sounds/synth2.py`, files
`scratchpad/sounds/v2/argus-*.mp3`, listen page
[Sonidos](https://claude.ai/artifact/RJVddo6Bv21PURR7uPLzz4). Measured with
ffmpeg's `ebur128` filter:

| Moment | Material | Direction · notes | Length | Loudness / peak | To fix before shipping |
|---|---|---|---|---|---|
| Call connected (`conectar`) | wooden marimba, with a breath | rising · 3 | 0.97 s | −20.4 LUFS / −6.2 dBFS | — |
| Call ended (`colgar`) | the same marimba plus a soft low thud | falling · 2 (the mirror of conectar) | 1.11 s | −20.4 / −4.7 | limit the peak to −6 |
| Chat → Voz (`modo_voz`) | a low pop and an opening inhale | rising · 1 + breath | 0.98 s | −20.4 / −5.2 | limit the peak |
| Voz → Chat (`modo_chat`) | dry high key clicks | flat · 2 | 0.57 s | −22.1 / −4.2 | raise to −20 ±1, limit the peak |
| Message sent (`enviar`) | an air sweep moving away | rising · sweep | 0.63 s | −20.2 / −3.9 | limit the peak |
| Reply received (`mensaje`) | water droplets | rising · 2 | 0.88 s | −20.5 / −5.2 | limit the peak |
| Done (`listo`) | bright glass bells with sparkle (the only glass sound) | rising · 2 | 1.32 s | −21.2 / −8.1 | — |
| Soft error (`error`) | dull low thuds | flat, same note · 2 | 0.79 s | −20.4 / −6.2 | — |
| Estela opens her eye (`ojo`) | a long spatial pad with star dust: Estela's own voice | swelling · pad | 2.30 s | −20.4 / −6.7 | trim to ≤ 2.0 s, or accept it as the one hero exception |
| First appearance (proposed) | the `ojo` material, longer and once | swelling | ≤ 3 s | −20 | onboarding only |

**What distinguishes each sound:**
- **The material** sets wood, air, water, glass and thud apart.
- **The direction** sets the pairs apart:
  - conectar rises and colgar falls;
  - modo_voz opens and modo_chat clicks shut;
  - enviar moves away and mensaje arrives.
- **The note count** gives 1, 2 or 3 notes.
- **Error** is the only flat, low, repeated note: unmistakable, never
  harsh, as with Duolingo's deflated cue.
- **Done** is the only glass sound, so the hero moment of daily use is never
  confused with an incoming message.
- **Ojo** is the only pad, so the eye opening sounds like Estela herself.

**Open item S1 (deferred):** the owner approves or replaces each sound one by one. The
palette's principle, the rules and the loudness targets above apply whatever
he picks.
