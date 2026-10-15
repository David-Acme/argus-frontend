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
