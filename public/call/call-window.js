const CALL_ID_PATTERN = /^(rtc-[0-9a-f]{32}|call-\d+)$/;
const CANCEL_EVENT = 'argus-call-cancelled';
const DECLINE_FAILED_EVENT = 'argus-call-decline-failed';
const MAIN_GONE_TEXT = 'No se pudo rechazar; la llamada se cerrará sola';
const REFUSED_TEXT = 'No se pudo rechazar. Inténtalo de nuevo.';
const ENDED_TEXTS = new Map([
  ['CALL_NOT_FOUND', 'La llamada ya no está activa.'],
  ['CALL_EXPIRED', 'La llamada ya terminó.'],
  ['CALL_TAKEN', 'Otra persona ya contestó.'],
]);

const callId = new URLSearchParams(window.location.search).get('callId') ?? '';
const ringtone = document.getElementById('ringtone');
const statusLine = document.getElementById('status');
const answerButton = document.getElementById('answer');
const declineButton = document.getElementById('decline');

const invoke = (command, args) => window.__TAURI_INTERNALS__.invoke(command, args);

const listen = (event, handler) =>
  invoke('plugin:event|listen', {
    event,
    target: { kind: 'Any' },
    handler: window.__TAURI_INTERNALS__.transformCallback(handler),
  }).catch(() => {});

const setStatus = (text) => {
  statusLine.textContent = text;
};

const setBusy = (busy) => {
  answerButton.disabled = busy;
  declineButton.disabled = busy;
};

const startRinging = () => {
  ringtone.play().catch(() => {});
};

const stopRinging = () => {
  ringtone.pause();
  ringtone.currentTime = 0;
};

const describe = (error) => (error instanceof Error ? error.message : String(error));

const answer = async () => {
  stopRinging();
  setBusy(true);
  try {
    await invoke('argus_call_answer', { callId });
  } catch (error) {
    setStatus(`No se pudo contestar. ${describe(error)}`);
    setBusy(false);
  }
};

const decline = async () => {
  stopRinging();
  setBusy(true);
  setStatus('Rechazando la llamada…');
  try {
    await invoke('argus_call_decline', { callId });
  } catch (error) {
    if (describe(error).startsWith('MAIN_UNAVAILABLE|')) {
      mainGone();
    } else {
      declineRefused();
    }
  }
};

const mainGone = () => {
  stopRinging();
  setBusy(true);
  setStatus(MAIN_GONE_TEXT);
};

const declineRefused = () => {
  setStatus(REFUSED_TEXT);
  setBusy(false);
  startRinging();
};

const callEnded = (text) => {
  stopRinging();
  setBusy(true);
  setStatus(text);
};

const declineFailed = (code) => {
  const ended = ENDED_TEXTS.get(code);
  if (ended === undefined) {
    declineRefused();
  } else {
    callEnded(ended);
  }
};

const cancelled = () => {
  stopRinging();
  setBusy(true);
  setStatus('La llamada ya no está activa.');
};

if (CALL_ID_PATTERN.test(callId)) {
  answerButton.addEventListener('click', answer);
  declineButton.addEventListener('click', decline);
  listen(CANCEL_EVENT, cancelled);
  listen(DECLINE_FAILED_EVENT, (event) => declineFailed(event.payload));
  startRinging();
} else {
  setBusy(true);
  setStatus('Llamada no válida.');
}
