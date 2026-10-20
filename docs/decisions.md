# Frontend decisions

## Argus calls are never answered on their own (2026-10-15)

David, verbatim: "esta bien, aplica la B, la que me recomiendas".

- A call from Argus is never answered on its own. The microphone opens only when
  the user taps "Contestar".
- The incoming-call surface shows on any screen; a critical alert shows its
  reason prominently and vibrates without needing an answer.
- In the background and killed, the full-screen CallStyle notification with the
  same two buttons is still to be built (native work, not in this change).
- The earlier design, where a foreground ring is answered at once, is withdrawn.

## The conversation thread is a LegendList that rides the keyboard (2026-10-20)

David asked for the thread with Argus and the household to feel like WhatsApp:
"busca la mejor librería o crea una nativa para la virtualización tipo
WhatsApp que sea fluida y simple". The thread rendered every message in a plain
`ScrollView` inside a `KeyboardAvoidingView`.

**Decision.** `@legendapp/list` 3.3.7 (already a dependency, MIT) renders the
thread, through its `@legendapp/list/keyboard` entry (`KeyboardAwareLegendList`,
a LegendList whose scroll component is `react-native-keyboard-controller`'s
`KeyboardChatScrollView`) on Android and iOS, and the plain `LegendList` on the
web and the desktop. The composer sits in a `KeyboardStickyView`. No new
dependency and no native module.

**What was compared.**

| Requirement | LegendList 3 | FlashList v2 | FlatList `inverted` | Own native list |
|---|---|---|---|---|
| Starts at the newest line | `initialScrollAtEnd` | `maintainVisibleContentPosition.startRenderingFromBottom` | inverted order | to build |
| Stick to the bottom only when at the bottom | `maintainScrollAtEnd` + `isWithinMaintainScrollAtEndThreshold` | `autoscrollToBottomThreshold` | manual | to build |
| Older lines load above without a jump | `maintainVisibleContentPosition` + `onStartReached` | `maintainVisibleContentPosition` (on by default) + `onStartReached` | `onEndReached` of the flipped list | to build |
| Short thread sits at the bottom | `alignItemsAtEnd` | no prop | inverted | to build |
| Keyboard integration | first-party `KeyboardAwareLegendList` over `KeyboardChatScrollView` | via `renderScrollComponent` by hand | via `renderScrollComponent` by hand | to build |
| Web and WebKitGTK | the same component (`react-native.web` entry), already shipped in `InfiniteList` | not verified for the chat options | `scaleY(-1)`, wheel and selection reversed, needs a react-native-web patch | none |
| Screen-reader order | chronological, not flipped | chronological | reversed DOM/view order | to build |
| Cost to adopt | none, in the tree | a new dependency | none | Kotlin + Swift + a web twin |

- FlashList v2 now asks for `maintainVisibleContentPosition` instead of
  `inverted` too, so both libraries agree that a chat list is a normal list kept
  at its end. LegendList wins on the parts that would otherwise be hand-written
  (end alignment, the keyboard scroll view, an end-threshold signal to listen
  to) and is already the list every other screen uses.
- `inverted` is rejected: it reverses the accessibility order and, on the web,
  the wheel and the text selection.
- A native list is not needed: no requirement fails with the libraries, and
  the web/desktop would still need its own implementation.
- On the web `react-native-keyboard-controller` is a no-op binding, so the web
  file renders the plain `LegendList` instead of pushing a `KeyboardChatScrollView`
  through the browser (`thread-scroller.web.tsx`); the desktop has no on-screen
  keyboard to ride.

**Measured** (the exported web bundle in Chromium, 412x915, CPU slowed 4x, a
2,000-message thread seeded through the e2e fake; the view cache keeps the
newest 1,000, `VIEW_CACHE_LIST_LIMIT`), before and after on the same harness
(`tests/e2e/conversation-thread-list.e2e.ts`, `ARGUS_E2E_PERF_OUT`):

| | ScrollView (before) | LegendList (after) |
|---|---|---|
| Tap to newest line painted | 15.7 s | 1.2-1.3 s |
| Bubbles mounted | 1,000 | 15 |
| DOM nodes | 10,138 | 690-840 |
| JS heap after open | 49.1 MB | 26 MB |
| Scroll up, 3 s of wheel | 38 fps, 12 frames > 50 ms, worst 117 ms | 39-47 fps, 3-5 frames > 50 ms, worst 67-133 ms (older pages load during it) |
| Scroll down, 3 s of wheel | 48 fps, 5 frames > 50 ms, worst 83 ms | 57 fps, 0 frames > 50 ms, worst 33-50 ms |

Android FPS and memory on a mid-range phone are left to the phone round
(CONTEXT.md, "The thread list", checklist).

**Sources.**
- Legend List v3, keyboard and chat:
  https://legendapp.com/open-source/list/v3/react-native/keyboard-and-animated/
- Legend List v3 overview and API: https://legendapp.com/open-source/list/v3/overview/ ,
  https://legendapp.com/open-source/list/v3/api/
- `KeyboardChatScrollView`:
  https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-chat-scroll-view
- FlashList v2: https://shopify.engineering/flashlist-v2 ,
  https://shopify.github.io/flash-list/docs/usage/
- react-native-web and inverted wheel scrolling:
  https://github.com/necolas/react-native-web/pull/2601
