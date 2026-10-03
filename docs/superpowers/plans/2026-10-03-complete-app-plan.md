# Argus app — completion plan (2026-10-03)

Source: four read-only audits run on 2026-10-03 (HTTP integration, `/sync`
engine, voice path, UI quality) against backend `master` at eb1ccf63, plus the
owner's 12-point brief. The backend audit round is closed (full orchestrator
green, every gate green), so the frontend is unfrozen.

Transport split (owner's point 11, confirmed as the target):
- **WebSocket `/sync`** — everything synchronised and persisted on the device
  (WatermelonDB projection + MMKV view cache).
- **HTTPS** — quick reads that are not projected and every mutation
  (POST/PATCH/DELETE), routed per service.
- **Voice** — its own real-time channel (phase F), not the sync socket.

Every phase ends verified: `bunx tsc --noEmit`, `bun run lint`, Android build
on the emulator against the native sandbox stack
(`backend/scripts/native-stack.sh up`), and for native changes `cargo check`.
Each unit is committed on its own, in English, no comments in code.

## Phase A — the app reaches the backend again (blocking)

Today the app cannot get past pairing: the backend split into services that
each announce their own routes, and the client still expects one gateway.

1. **Route discovery.** Browse `_argus-route._tcp` (TXT `path`, `https`) on
   Android, iOS and Tauri; persist a route table `{prefix → host, port}` with
   the pairing; `http.service`, the session refresh, `/sync` and the camera
   media socket resolve their base URL by path prefix. Rediscovery refreshes
   the table.
2. **Pairing.** Drop the client's "code is a fingerprint prefix" check (the
   code is now a random secret; the CA is still verified by SHA-256 of its
   DER against `caFingerprint`). Backend: a repeated pairing from the
   recorded owner device answers the same CA instead of 409, so a client
   failure after the server committed is recoverable. Map 422/409 natively.
3. **Owner existence.** New identity `GET /pairing/status → {hasOwner}`
   (DeviceFilter only); the app stops calling the deleted `/auth/has-admin`.
   A failed probe is "server unreachable" with retry, never owner-enroll.
4. **Camera.** Live view socket path `/media`; PTZ pad sends what the driver
   reads (absolute direction 0..359 for steps, `x/y` for continuous moves).
5. **Session resilience.** Refresh keeps the session on 429/503/network
   errors and retries; login/register skip the refresh retry; device
   credential header sent when the server issued one; error copy mapped by
   code (`TOO_MANY_REQUESTS`, `SERVICE_UNAVAILABLE`, `CONFLICT`, …), never
   raw backend English.

## Phase B — the sync engine is correct

1. Bootstrap page 2 never sends `startTime == endTime` without `startId`
   (422 today); cursors come from the server's own timestamps, not the device
   clock.
2. Optional dates are stored as epoch ms on create (`toOptDate`), not `null`.
3. 409 `ReplicaTooOld` → full re-bootstrap; `*_error` frames are routed to
   the request they answer (sync, audit, user audit, voice).
4. Live frames never advance a cursor past rows not yet pulled: buffer during
   a sync, replay only after success, drop-and-resync otherwise.
5. Clearing the projection (role change, logout) is serialised with the
   socket: close/pause first, then clear, then rebootstrap.
6. A missing audit target refetches that row (or skips a deleted one), never
   wipes the whole database.
7. Native sockets buffer events until JS attaches (Android) and report
   open/close/401 (iOS); keepalive pings.
8. Batch live writes per tick, debounce the view-cache coordinator, bound
   every queue.
9. Map `person.status` and `user.lang`. Backend: notification sync queries
   tie-break on id.

## Phase C — product journeys that dead-end

Settings (appearance, language, voice, paired server, sign out, unpair);
"approve a desktop" entry on mobile; native-only actions hidden on desktop;
offline/connection banner; Android back from tabs; edit actions open the
item; list paging beyond 40 rows; no fabricated charts; the guard surface
(mode, incidents, expected guests) and notifications read/ack; a proposed
role widening for guard (Resident sets the mode, Guard reads mode and
incidents) to be confirmed with the owner before changing `role-access.hxx`.

## Phase D — one design system on every form factor

Keep the owner's language (warm neutrals, graphite actions, sand accent,
hierarchical radii). Add what is missing: a semantic type scale with font
scaling caps, elevation tokens, AA-safe light text and status colours, touch
targets ≥ 44 pt at every size, layout primitives (`Page`, `Grid`,
`SplitView` list-detail for tablet/desktop), `ListRow`/`List`/desktop
`Table`, `Spinner`/`Skeleton`/`ErrorState`/`OfflineBanner`, tooltips and
hover/focus states, keyboard shortcuts on desktop, rail navigation on every
desktop width. Migrate every screen; remove dead code and the ~1,200 comment
lines; split files over 400 lines; write the rules into `AGENTS.md` the way
the backend's are written, with a script gate for comments.

## Phase E — first-run welcome

Progress stepper, language/theme choice, a plain explanation of what Argus
needs (the home server on the same network), pairing that lets the user read
before the camera opens, the role/server shown before accepting an
invitation, a biometric consent step before face enrolment, manual capture
fallback, permission priming for camera and microphone. Designed with the
frontend-design guidance, reviewed on phone, tablet and desktop screenshots.

## Phase F — the voice call

The audit's thesis: quality comes from the platform audio stack, streaming
playout, Opus and a real barge-in/resume protocol; remote access crosses a
TCP-only tunnel, where WebRTC degrades to the same head-of-line blocking as
WebSocket. WebRTC stays an optional LAN upgrade.

- F0: native duplex audio module (AEC/NS/AGC on Android and iOS, streaming
  playout with played-position, mic never restarted mid-call); backend LLM
  cancellation on interrupt, per-session STT language, 24 kHz TTS, text
  before audio, segment ids.
- F1: voice protocol v2 on its own socket, Opus, client VAD barge-in with
  server confirmation and truncation to what was heard, push-to-talk mode
  (Tapo-style), resumable sessions with a TTL, session summary to memory,
  desktop voice through Rust audio.
- F2: the assistant drives the app — role and language carried into the LLM,
  server tools (reminder, guard mode, camera snapshot) and client tools
  (navigate, open camera) through an allow-list, risky actions confirmed on
  screen; a full-screen call UI in the ChatGPT-voice style.
- F3 (optional): WebRTC on the LAN if measurements justify it.
