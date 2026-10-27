export const WEB_NOTE_TYPES: readonly string[] = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
];

export const SLIDE_CANCEL_PX = 96;

export const SLIDE_LOCK_PX = 72;

export const NOTE_CAPTURE: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
};
