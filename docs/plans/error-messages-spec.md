# Error messages for users: specification

Status: final proposal, 2026-10-20. It is documentation only and nothing in it
is implemented yet. It lands together with the redesign (see
`frontend-rules-final.md`, "Implementation order with the redesign"). Rule 20
of `frontend-rules-final.md` points here. The redesign spec §5.8 fixes
**where** an error appears, and this file fixes **what it says**, **how a code
becomes words**, and **how the gates prove it**. Measured on `09cf103`
(frontend) and on the backend `master` of the same day.

## 1. The requirement

The owner's requirement (David, 2026-10-20):

- The user never sees a backend error code, an HTTP status or a raw server
  message.
- Each backend code maps to an i18n key with a short, human, actionable
  message in es and en, saying what happened and what to do.
- An unknown code maps to one friendly generic message.
- Codes appear only in logs and telemetry.
- One central error-to-message map is generated or typed from the backend
  catalogs.
- A gate fails when a backend code has no i18n key, or when the UI renders a
  raw code or message.

The research behind it:

- NN/g's error-message guidelines [nng-errors]:
  - Show the message near its source.
  - Make it visible and redundant (colour plus icon plus text).
  - Size its prominence by impact.
  - Do not show it prematurely.
  - Use human-readable language, and keep codes for diagnostics.
  - Describe the problem precisely and offer constructive advice.
  - Do not blame the user.
  - Keep the user's input and reduce the effort to correct it.
  - NN/g lists codes, blame and vagueness as hostile patterns [nng-hostile].
- Apple's HIG [hig-alerts] [hig-writing]:
  - Alerts are only for what needs attention now.
  - Buttons name the act.
  - Errors that can be fixed in place are shown in place.
- Material 3:
  - Snackbars carry brief messages with at most one action, and never critical
    information [m3-snackbar].
  - Dialogs are for interruptions that need a decision [m3-dialogs].
- Microsoft's guidance [ms-errors] says the same in long form: what happened,
  why, and what to do, with codes kept out of the message.
- WCAG 2.2 makes it normative:
  - 3.3.1: an error is identified in text [wcag-error-id].
  - 3.3.3: a known fix is suggested [wcag-error-sugg].
  - 4.1.3: status messages are announced without moving focus [wcag-status].
- Argus's own rules:
  - Rule 16: a failure is never shown as a fact.
  - Rule 14: a gate fails closed.

## 2. What exists today

### 2.1 The backend

The backend envelope is `{status, info, errors}`. `errors` is one
`{code, message}` object, or a list of them, or a 422 validation object with
`fields` (`packages/lib/http/src/http/api-response.cc`).

- **Codes.** `ErrorCode` (`packages/lib/errors/src/errors/error-code.hxx`) has
  **52 wire codes**. They are coarse: 288 `ErrorDefinition`s in 20 catalogs
  (`packages/contracts/*/src/*/*-errors.hxx` and seven service catalogs under
  `services/*/src/feature/**`) share them. The most shared codes:

  | Code | Definitions using it |
  |---|---|
  | `NOT_FOUND` | 43 |
  | `BAD_REQUEST` | 41 |
  | `SERVICE_UNAVAILABLE` | 41 |
  | `CONFLICT` | 28 |
  | `VALIDATION_ERROR` | 19 |
  | `INTERNAL_ERROR` | 16 |
  | `TOO_MANY_REQUESTS` | 14 |
  | `UNAUTHORIZED` | 13 |
  | `FORBIDDEN` | 13 |

  A `CONFLICT` can mean "this camera is in privacy mode", "the privacy notice
  changed", "the reminder is already done", or 25 other things. The code alone
  cannot tell them apart.
- **Messages** are developer English ("Invalid cameraId", "subscribe_failed",
  "too_many_viewers", "Relay limit reached for this hour
  (messenger.max_relays_per_hour)"). `withMessage` can replace one with a
  device's own words (`CameraErrors::CameraUnreachable.withMessage(...)`).
  None of this text is fit for a user.
- **Validation** (422) sends `fields: {name: ["email must not be empty"]}`.
  That is English prose with no rule id.
- **List entries** carry data, not messages: `MODULE_ID` and `ROLE_HOLDER`
  (`error-list.hxx`).

### 2.2 The frontend

- **One central map already exists.** `serviceErrorKey`
  (`src/shared/libs/service-error.ts`) maps about 45 codes to
  `common.errors.*`, with a retryable set and `common.errors.unknown` as the
  fallback. It is the right shape and this spec grows it. It does not
  replace it.
- **23 of the 52 backend codes have no entry in the map:**
  - `CALL_EXPIRED`, `CALL_NOT_FOUND`, `CALL_TAKEN`;
  - `CAMERA_CONTROL_REFUSED`;
  - `CANCELLED`, `ERROR`, `METHOD_NOT_ALLOWED`, `ROUTE_NOT_FOUND`;
  - `FACE_QUALITY_INSUFFICIENT`, `LIVENESS_CHECK_FAILED`,
    `LIVENESS_UNAVAILABLE`;
  - `INVITATION_MODULE_DISABLED`;
  - `LLM_NOT_LOADED`, `STT_NOT_LOADED`, `TTS_NOT_LOADED`, `VLM_NOT_LOADED`;
  - `PIN_INVALID`, `PIN_LOCKED`, `PIN_REQUIRED`;
  - `RTC_UNAVAILABLE`, `SESSION_NOT_FOUND`;
  - `WATCH_EXPIRED`, `WATCH_NOT_FOUND`.

  Some of them are handled by their own flows (`pinStep`, `face-error.ts`,
  `invitation-refusal.ts`, the call engine), so the knowledge is scattered.
- **13 client codes** come from the transport and the native layers:
  - `NETWORK_ERROR`, `TIMEOUT`, `WRITE_NOT_SENT`, `WRITE_UNCONFIRMED`;
  - `PAIRING_REQUIRED`, `CERT_NOT_TRUSTED`, `FINGERPRINT_MISMATCH`;
  - `INVALID_RESPONSE`, `UNREACHABLE_ROUTE`, `STORAGE_ERROR`;
  - `DESKTOP_SHELL_ERROR`;
  - `CAMERA_SECRET_NOT_SEALED`, which the client synthesizes;
  - `MAINTENANCE_OFF_DUTY`, which no backend sends any more (the backend now
    sends `GUARD_OFF_DUTY`). It is dead.

  The Rust, Kotlin and Swift layers emit more `CODE|message` strings that are
  not in the map: `HOST_NOT_ALLOWED`, `MIC_UNAVAILABLE`,
  `SECURE_KEY_NOT_ALLOWED`, `RTC_NOT_CONNECTED`, `DISCOVERY_NOT_FOUND`,
  `INVALID_PAIRING_CODE`, `ALREADY_PAIRED`, `AUDIO_DEVICE_UNAVAILABLE`, and
  others.
- **Four places read the English server message to decide something:**
  - `cameras/model/camera-probe.ts` (`STORED_ELSEWHERE.test(message)`);
  - `cameras/model/camera-form-steps.ts` (`SECRET_NOT_SEALED.test(message)`);
  - `auth/model/face-error.ts` (it joins the message and the field errors and
    searches them);
  - `cameras/model/media-access.ts` (`viewerLimitNotice(message)`).

  All four break silently when the backend rewords a message. The last one
  also **returns the server's text as the reason shown to the user**
  (`rtcRefusalReason`).
- `face-capture-sheet.tsx` renders `error.message` behind `__DEV__`. That is
  allowed (development only), but the pattern must not spread.

## 3. Design

### 3.1 One owner: `platform/errors`

The module lives in `platform/errors/` (until R3 creates it,
`shared/libs/service-error.ts` and its siblings). It is the only module that
reads an envelope's `code` or `message`. Everything else holds an
`ApiFailure`:

```ts
type ApiFailure = {
  readonly kind: 'transport' | 'refused' | 'invalid' | 'server' | 'unknown';
  readonly retryable: boolean;
  is(code: ErrorCode | ErrorReason): boolean;
  fields(): ReadonlyMap<string, FieldProblem>;
  copy(context?: ErrorContext): ErrorCopy;
  surface(context?: ErrorContext): ErrorSurface;
};
```

- The raw code, reason, status and message are private fields of the class
  that implements it. They are reachable only through `log(failure, context)`,
  which writes them to `log.error` (and to telemetry, when telemetry exists).
  Code outside `platform/errors` **cannot** read them. The type system is the
  gate, not a review.
- `is()` lets a flow branch on a code without printing it. For example, a 403
  `PIN_REQUIRED` opens the PIN prompt, and a 409 `MODULE_ROLES_HELD` reopens
  the impact preview. A code that starts a flow is listed in
  `FLOW_CODES` and has no message of its own.
- `copy(context)` returns `{ key: TranslationKey, params }` and never a
  string. `context` is `{ action?: ActionId; object?: string; module?:
  ModuleId }`. The `object` is the user's own words ("Pagar la luz", "Patio"),
  never an id.
- `surface(context)` returns one of the surfaces of §4. It is decided here,
  never by a screen.

### 3.2 Where the codes come from

There are three lists, and each one has a single source:

| List | Source | How it reaches the frontend |
|---|---|---|
| `BACKEND_ERROR_CODES` (52) | `backend/packages/lib/errors/src/errors/error-code.hxx` | `scripts/gen-error-codes.ts` writes `platform/errors/backend-error-codes.ts` (a `const` tuple and its union). The generated file is committed, and `tests/contracts/error-code-contract.test.ts` regenerates it in memory and compares, through the existing `backendPath()` helper, as the role-access contract test does. |
| `ERROR_REASONS` (see §3.3) | every `inline constexpr ErrorDefinition` in the backend catalogs | the same script writes `platform/errors/backend-error-reasons.ts` with `{reason, code, status}` per definition. It is compared by the same contract test. |
| `CLIENT_ERROR_CODES` | `platform/http`, `platform/net` (TS), `src-tauri/src` (Rust), `modules/*/android` (Kotlin), `modules/*/ios` (Swift) | hand-written in `platform/errors/client-error-codes.ts`. The contract test scans those sources for the `"CODE|` pattern and fails when a code is emitted that the list does not name, or when the list names one that nothing emits (`MAINTENANCE_OFF_DUTY` today). |

### 3.3 Reasons: the fine-grained identity (backend change, owner decision E1)

Because 288 definitions share 52 codes, a message keyed by code alone has to
be generic ("This changed while you were editing it"). The precise message
("The Patio camera is in privacy mode") needs the definition's identity.

The proposal is an **additive** backend field: each error entry carries
`reason`, built from its catalog and definition name in kebab case:

- `CameraErrors::CameraPrivacyOn` → `camera.camera-privacy-on`
- `IdentityErrors::InvitationInvalidOrExpired` →
  `identity.invitation-invalid-or-expired`

`ErrorDefinition` gains the field, and `ApiResponse` serializes it. Old
clients ignore it.

- With `reason`, the map is keyed reason first, then code, then the generic
  fallback. The four message-regex sites of §2.2 become `is(reason)` calls.
- Without `reason` (if the owner declines E1), the map is keyed by code plus
  the action context (`reminder.save` + `CONFLICT` → "Este recordatorio ya
  estaba hecho…"). The four regex sites stay as counted debt (gate G4) until
  the backend gives them a code of their own.

Not every reason needs its own words. Most are internal: an invalid JSON body,
a service credential, an engine not loaded. Their code's message is right.
`platform/errors/reason-audience.ts` classifies **every** reason as `user` or
`internal`:

```ts
export const REASON_AUDIENCE = {
  'camera.camera-privacy-on': 'user',
  'auth.invalid-json-body': 'internal',
} as const satisfies Record<ErrorReason, 'user' | 'internal'>;
```

A new backend definition therefore fails `tsc` until someone decides its
audience. A `user` reason must have its own key. An `internal` reason falls
back to its code's message.

### 3.4 The copy map

```ts
type ErrorCopy = {
  key: TranslationKey;
  withObject?: TranslationKey;
  surface: ErrorSurface;
  retryable: boolean;
};

export const ERROR_COPY = {
  NETWORK_ERROR: {
    key: 'errors.network',
    withObject: 'errors.network-object',
    surface: 'toast-retry',
    retryable: true,
  },
} as const satisfies Record<BackendErrorCode | ClientErrorCode, ErrorCopy>;

export const REASON_COPY = {
  'camera.camera-privacy-on': {
    key: 'errors.camera-privacy-on',
    surface: 'notice',
    retryable: false,
  },
} as const satisfies Record<UserReason, ErrorCopy>;
```

The `satisfies Record<…>` lines make a missing code or a missing user reason
a `tsc` error, and the i18n schema makes a key missing in `en` a `tsc` error,
as it does today. `FLOW_CODES` (`PIN_REQUIRED`, `MODULE_ROLES_HELD` and the
like) map to the message used if the flow cannot run, so nothing is left
unmapped.

Keys live in their own namespace, `errors.*` (one file per language,
`locales/{es,en}/errors/index.ts`). They move there from `common.errors.*`.
Key names are the code or reason in kebab case without the catalog prefix
(`errors.camera-privacy-on`). When two codes share one message, they share the
key.

### 3.5 Unknown codes

A code or reason the build does not know (a newer server, a native code not
yet listed):

- reads as `kind: 'unknown'`;
- is shown on the surface its context would use, with `errors.unknown` ("Algo
  no salió bien. Inténtalo de nuevo en un momento.");
- is logged with everything known about it;
- is never retried automatically, and never treated as success.

When the failure is on an access, consent or privacy decision, it is `deny`
(rule 14, fail closed). The user sees the refused state with a retry, never
the protected content.

### 3.6 Field errors (422)

- The client validates first. Each form's zod schema produces keys, not text
  (zod's error customization [zod] returns a `TranslationKey`). Most 422s
  never leave the device.
- A server 422 maps by field name onto the form's fields. Each field shows its
  own key for the failed rule when the server says which rule failed (owner
  decision E2). Otherwise it shows the generic field key, for example
  `errors.field-invalid` ("Revisa este dato.").
- A field the form does not have becomes the form-level `VALIDATION_ERROR`
  message.
- The server's English sentence is logged, never shown.

### 3.7 Logging and telemetry

`log(failure, context)` is the only place codes appear. It writes the code,
the reason, the HTTP status, the route (never its query string), the action
and the time. It writes no user data and no `object`.

`log.error` stays the sink (rule 33). When telemetry exists, it reads the same
record. A "copy diagnostic details" affordance is **not** part of this spec.
The owner asked for codes in logs only.

## 4. Presentation: where an error appears

The surface is chosen by `surface(context)` from the failure and the context,
following the redesign spec §5.8. A screen never chooses it.

| Situation | Surface | Rules |
|---|---|---|
| A field is invalid | **Inline** under the field (`Field` `error`) | Text in `alert`, plus an icon, plus a border: the message is never colour alone. Shown after the first submit, never while typing [nng-forms]. Focus moves to the first invalid field. The sheet stays open and the input is kept. Announced as a status [wcag-status]. |
| An action failed and retrying can help (transport, timeout, unavailable, write not sent) | **Toast `error` with Reintentar** | The optimistic change rolls back first. The message names the object. The toast stays 8 s or until dismissed, and longer while focused or hovered. Never two error toasts: a new one replaces the old one. It is a polite live region. Retrying is single-flight (rule 18). |
| An action was refused and retrying will not help (forbidden, module off, role inactive, conflict, off duty) | **Inline `Notice`** next to the control that failed | It says who can change it, or gives the action that resolves it ("Pídele al propietario…", "Empieza tu turno"). The control is disabled with the reason when the refusal is known in advance (the capability says so), so the user does not have to fail first [nng-errors] "safeguard". |
| A read failed | **In-place failed state** (`ResourceView` `failed`) | One sentence and Reintentar, with `Presence` in `concern`. Cached data stays, marked stale. **Never the empty copy** (rule 16). |
| The session or the trust is gone (unauthorized after refresh, account disabled, pairing lost, certificate mismatch) | **Full-screen state** with one way out | Fail closed. Nothing behind it stays interactive. |
| The failure is critical and needs a decision now (a PIN is locked during a disarm, a siren failed during an alert) | **`Confirm`-style alert** (native alert on phones) | Only here [hig-alerts] [m3-dialogs]. Its buttons name the act. |
| Unknown | the surface of its context, with `errors.unknown` | logged |

Never:

- a modal for a recoverable error;
- a toast for a field error;
- an error inside a toast that disappears while the form it belongs to is
  still showing (web finding 25: the privacy-accept failure);
- the mascot inside a toast;
- an HTTP status, a code, an id or English server text anywhere on screen.

## 5. How a message is written

Each message is checked against this list, partly by the copy test G6:

1. **What happened, then what to do**, in at most two sentences (about 140
   characters). The second sentence starts with a verb: "Revisa…",
   "Inténtalo…", "Pídele…" [nng-errors] [ms-errors].
2. **It names the object** when the context gives one: «Pagar la luz», the
   Patio camera. The `withObject` key is used whenever `object` is present.
3. **No technical words.** No "error", "código", "servidor", "HTTP", "token",
   "sync", "módulo" or "endpoint", and no English inside Spanish. "Argus" and
   "tu casa" are the words for the system (redesign spec §12).
4. **No blame and no drama.** No exclamation marks, no "¡Ups!", no "inválido".
   A refusal says who can change it.
5. **Voice.** Tú, neutral Latin-American Spanish. Argus speaks in the first
   person when it is the actor ("No te reconocí"). Otherwise the sentence
   describes the situation ("No hay conexión con Argus"). Never "nosotros".
   English is written natively, not translated word for word.
6. **One name per thing**, from the i18n glossary (Seguridad, Lugar,
   Recordatorio…).
7. **Formatting**:
   - Spanish quotes «…» and English quotes “…” around the user's own words.
   - Durations in words through the formatter ("unos minutos", never
     "3590 s").
   - A final period.
8. **Honest.** When the app cannot know whether a write landed
   (`WRITE_UNCONFIRMED`), it says so and asks the user to check. It never
   claims a result it does not know.

## 6. The 30 most user-visible codes

The selection follows what the UI map and the Android testing reached, plus
the codes the user meets in normal use: connectivity, writes, access,
cameras, safety PINs, face login, invitations and calls. `{object}` and
`{module}` are filled from the context. The "with object" form is used when
`object` is known.

| # | Code (or reason, E1) | When | Surface | es | en |
|---|---|---|---|---|---|
| 1 | `NETWORK_ERROR` (client) | the request could not reach Argus | toast with Reintentar; on a read, a stale `Notice` | No hay conexión con Argus. Revisa el Wi-Fi o los datos y vuelve a intentarlo. | Argus can't be reached. Check your Wi-Fi or mobile data and try again. |
| 2 | `TIMEOUT`, `DEADLINE_EXCEEDED` | no answer in time | toast with Reintentar | Argus tardó demasiado en responder. Vuelve a intentarlo en un momento. | Argus took too long to answer. Try again in a moment. |
| 3 | `WRITE_NOT_SENT` (client) | a change was not sent | toast with Reintentar | No se guardó «{object}» porque no hay conexión con Argus. Vuelve a intentarlo cuando tengas conexión. | “{object}” wasn't saved because Argus can't be reached. Try again when you're connected. |
| 4 | `WRITE_UNCONFIRMED` (client) | the connection dropped mid-write | toast, no automatic retry | Se cortó la conexión y no sé si «{object}» se guardó. Revisa cómo quedó antes de repetirlo. | The connection dropped and I can't tell whether “{object}” was saved. Check it before you try again. |
| 5 | `SERVICE_UNAVAILABLE`, `BAD_GATEWAY` | a part of Argus is busy or starting | toast with Reintentar; on a read, the failed state | Argus no puede atender esto ahora mismo. Inténtalo de nuevo en un momento. | Argus can't handle this right now. Try again in a moment. |
| 6 | `INTERNAL_ERROR` | the server failed | toast with Reintentar | Algo falló en Argus y no se completó. Inténtalo de nuevo en un momento. | Something failed in Argus and it wasn't finished. Try again in a moment. |
| 7 | `UNAUTHORIZED` (after a failed refresh) | the session ended | full screen | Tu sesión terminó. Entra de nuevo para seguir. | Your session has ended. Sign in again to continue. |
| 8 | `FORBIDDEN` | the role cannot do this | inline `Notice` | Tu cuenta no puede hacer esto. Si lo necesitas, pídeselo al propietario de la casa. | Your account can't do this. If you need it, ask the home's owner. |
| 9 | `NOT_FOUND` | the item is gone | toast and refresh; on a detail screen, the in-place state | «{object}» ya no existe. Puede que alguien lo haya borrado. | “{object}” no longer exists. Someone may have deleted it. |
| 10 | `CONFLICT` (generic) | the item changed in the meantime | inline `Notice` with Actualizar | Esto cambió mientras lo editabas. Revisa cómo está ahora y vuelve a intentarlo. | This changed while you were editing it. Check how it is now and try again. |
| 11 | `VALIDATION_ERROR` (no field matched) | the server refused the data | inline, at the form | Revisa los datos marcados y vuelve a intentarlo. | Check the highlighted details and try again. |
| 12 | `TOO_MANY_REQUESTS` | rate limit | inline `Notice` | Demasiados intentos seguidos. Espera un minuto y vuelve a probar. | Too many tries in a row. Wait a minute and try again. |
| 13 | `ACCOUNT_DISABLED` | the account was deactivated | full screen | Tu cuenta está pausada. Pídele al propietario de la casa que la vuelva a activar. | Your account is paused. Ask the home's owner to turn it back on. |
| 14 | `MODULE_DISABLED` | a part of Argus is off | inline `Notice` (Owner: with Activar) | {module} está apagado en esta casa. Pídele al propietario que lo active. | {module} is off in this home. Ask the owner to turn it on. |
| 15 | `ROLE_INACTIVE` | the role's module is off | full screen (the inactive-role screen) | Tu acceso está en pausa mientras {module} esté apagado. Pídele al propietario que lo active. | Your access is paused while {module} is off. Ask the owner to turn it on. |
| 16 | `REMOTE_NOT_ALLOWED` | a home-only action from outside | inline `Notice` | Esto solo se puede hacer desde el Wi-Fi de tu casa. | You can only do this from your home Wi-Fi. |
| 17 | `CAMERA_UNREACHABLE` | the camera did not answer | inline `Notice` on the camera; toast for a command | La cámara {object} no responde. Revisa que esté encendida y conectada al Wi-Fi. | The {object} camera isn't responding. Check that it's on and connected to Wi-Fi. |
| 18 | `CAMERA_CONTROL_LOCKED` | the camera locked its login | inline `Notice` | La cámara bloqueó el acceso después de varios intentos fallidos. Espera unos minutos y vuelve a intentarlo. | The camera locked access after several failed attempts. Wait a few minutes and try again. |
| 19 | `GUARD_OFF_DUTY` | a guard acts off duty | inline `Notice` with Empezar turno | Solo puedes hacer esto mientras estás de turno. Empieza tu turno y vuelve a intentarlo. | You can only do this while you're on duty. Start your shift and try again. |
| 20 | `APP_SIREN_DISABLED` | the app siren is off | inline `Notice` | La sirena desde la app está apagada. El propietario puede activarla en Ajustes › Seguridad. | The app siren is off. The owner can turn it on in Settings › Security. |
| 21 | `PIN_INVALID` | a wrong safety PIN | inline under the PIN field | Ese PIN no es correcto. Vuelve a escribirlo. | That PIN isn't right. Type it again. |
| 22 | `PIN_LOCKED` | too many wrong PINs | alert during a disarm; inline elsewhere | Demasiados PIN incorrectos. Espera unos minutos antes de volver a intentarlo. | Too many wrong PINs. Wait a few minutes before you try again. |
| 23 | `FACE_QUALITY_INSUFFICIENT` | the photo is not usable | inline in the face capture | No se vio bien tu cara. Mira de frente a la cámara, con buena luz y sin nadie más en la imagen. | Your face wasn't clear. Face the camera in good light, with no one else in the picture. |
| 24 | `LIVENESS_CHECK_FAILED` | the liveness check failed | inline in the face capture | No pude confirmar que eres tú en persona. Mira a la cámara y vuelve a intentarlo. | I couldn't confirm it's really you. Look at the camera and try again. |
| 25 | `INVITATION_MODULE_DISABLED` | the invitation's module went off | full screen (invitation) | Esta invitación se cerró porque {module} se apagó. Pide una nueva al propietario. | This invitation was closed because {module} was turned off. Ask the owner for a new one. |
| 26 | `CALL_EXPIRED`, `WATCH_EXPIRED` | the call or camera conversation is over | in-place state of the call (informative tone, not an error) | Esta llamada ya terminó. | This call has already ended. |
| 27 | `RTC_UNAVAILABLE` | calls cannot start | inline `Notice` with Reintentar | Las llamadas no están disponibles ahora mismo. Inténtalo de nuevo en un momento. | Calls aren't available right now. Try again in a moment. |
| 28 | `CERT_NOT_TRUSTED`, `FINGERPRINT_MISMATCH` (client) | the server is not the paired Argus | full screen with Volver a vincular | No pude confirmar que este es tu Argus, así que no me conecté. Vuelve a vincular este dispositivo. | I couldn't confirm this is your Argus, so I didn't connect. Pair this device again. |
| 29 | `camera.camera-privacy-on` (reason) | the camera is in privacy mode | inline `Notice` (the control is disabled in advance when known) | La cámara {object} está en modo privado. Quita el modo privado para usarla. | The {object} camera is in privacy mode. Turn privacy mode off to use it. |
| 30 | `identity.invitation-invalid-or-expired` (reason) | the invitation was used or expired | full screen (invitation) | Esta invitación ya no sirve: se usó o caducó. Pide una nueva a quien te invitó. | This invitation no longer works: it was used or it expired. Ask whoever invited you for a new one. |
| — | unknown | anything not mapped | the surface of its context | Algo no salió bien. Inténtalo de nuevo en un momento. | Something didn't work. Try again in a moment. |

These reasons need E1 and are next in line. Each one replaces a regex or a
generic message:

| Reason | es | en |
|---|---|---|
| `auth.face-not-recognized` | No te reconocí. Acércate a la cámara, con buena luz, y vuelve a intentarlo. | I didn't recognise you. Move closer to the camera, in good light, and try again. |
| `camera.talk-line-busy` | Alguien ya está hablando por esta cámara. Espera a que termine. | Someone is already talking through this camera. Wait until they finish. |
| `camera.too-many-viewers` | Ya hay demasiadas personas viendo esta cámara. Inténtalo cuando alguien la cierre. | Too many people are watching this camera. Try again when someone closes it. |
| `camera.camera-control-refused` | La cámara no aceptó la contraseña guardada. Revísala en Ajustes de la cámara. | The camera didn't accept the saved password. Check it in Camera settings. |
| `identity.privacy-notice-outdated` | El aviso de privacidad cambió. Léelo de nuevo para continuar. | The privacy notice has changed. Read it again to continue. |
| `productivity.reminder-already-done` | «{object}» ya estaba hecho, así que no se puede posponer. | “{object}” was already done, so it can't be snoozed. |
| `camera.secret-not-sealed` | No se guardó la contraseña de la cámara porque no se pudo proteger. Inténtalo de nuevo en un momento. | The camera password wasn't saved because it couldn't be protected. Try again in a moment. |

The other 22 backend codes are written at implementation time under §5:

- the codes of §2.2's list that are not in the table above;
- `METHOD_NOT_ALLOWED` and `ROUTE_NOT_FOUND`, which say "Argus necesita
  actualizarse";
- the `*_NOT_LOADED` engines, which say "El asistente se está preparando".

Gate G1 makes it impossible to ship with one missing.

## 7. Gates

| # | Gate | What fails | Command | Baseline |
|---|---|---|---|---|
| G1 | Exhaustive map | A backend or client code without an `ERROR_COPY` entry, a `user` reason without a `REASON_COPY` entry, a reason without an audience, or an `errors.*` key missing in `en` | `tsc --noEmit` (the `satisfies Record<…>` lines and the locale schema) | 0, by construction |
| G2 | Backend parity | The generated code and reason lists differ from the backend headers | `bun run test` → `tests/contracts/error-code-contract.test.ts` (reads the backend through `backendPath()`) | 0 |
| G3 | Native parity | A `"CODE|` emitted by Rust, Kotlin, Swift or TS that `CLIENT_ERROR_CODES` does not list, or a listed code that nothing emits | same contract test | 1 today (`MAINTENANCE_OFF_DUTY`) → 0 |
| G4 | No logic on server text | `RegExp#test`, `includes`, `match` or `startsWith` on an envelope's `message` | `bun run check:quality` counter `error-message-match` (a TypeScript AST scan) | 4 → 0 (0 requires E1) |
| G5 | No raw text on screen, statically | Reading `.code`/`.message` of an envelope outside `platform/errors`, or a `t()`/`toast` argument that is not a key | by type (`ApiFailure` hides them) plus `no-restricted-syntax` on `errors?.message`/`errors?.code` outside `platform/errors` and `platform/http` (rule 2: lint, with bulk suppressions) | about 34 candidate reads today (a grep; the R0 AST counter fixes the number) → 0 |
| G6 | Copy quality | An `errors.*` value with a code pattern (`/\b[A-Z]{2,}(_[A-Z0-9]+)+\b/`), a banned word (§5.3), an exclamation mark, more than 160 characters, no final period, or es and en sharing the same text | `bun run test` → `tests/unit/errors-copy.test.ts` | 0 |
| G7 | No raw text on screen, at runtime | Visible text that matches the code pattern, an HTTP status phrase, or any backend catalog message (the generated list of 288 English messages) | the UI-map layout audit adds `rawErrorText` per capture, and a fixture state per surface makes the fake server answer with each code | 0, from the first audit run |
| G8 | Every surface is exercised | Each surface of §4 has a component test that renders it from an `ApiFailure` and checks the role and live region | component tests (rule 34) | built with the components |

## 8. When it lands

All of this lands in step S1 of "Implementation order with the redesign" in
`frontend-rules-final.md`, together with `ResourceView`, `Toast`, `Notice`
and `Field`. Those components render these surfaces, so the copy and the
surfaces are written once.

The order:

1. The generator and the contract tests come first (G2, G3).
2. Then the `ApiFailure` type and the map (G1).
3. Then the copy (G6).
4. Each feature's screens adopt `ApiFailure` as they are rebuilt (G4, G5
   ratchet down).
5. The UI-map check (G7) starts with the layout audit.

## 9. Decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| E1 | The backend adds an additive `reason` field (`<catalog>.<definition>` in kebab case) to every error entry | yes. Without it, 28 kinds of `CONFLICT` share one generic message, and four client sites keep matching English text |
| E2 | The backend's 422 `fields` carry a rule id next to the sentence (`{ "rule": "IS_EMAIL", "message": "…" }`) | yes, additive. The client then shows a precise field message without parsing English |
| E3 | Argus's voice in errors: the first person when Argus is the actor ("No te reconocí"), otherwise a description ("No hay conexión con Argus"); never "nosotros" | yes |
| E4 | No visible diagnostic code anywhere, not even behind a "details" disclosure | yes, as the owner asked; codes only in logs and telemetry |
