export type CameraFormFactor =
  | 'pan-tilt'
  | 'outdoor-pan-tilt'
  | 'cube'
  | 'bullet'
  | 'turret'
  | 'dome'
  | 'doorbell';

export type CameraFeatureKey =
  | 'ptz'
  | 'presets'
  | 'autoTrack'
  | 'microphone'
  | 'speaker'
  | 'siren'
  | 'privacy'
  | 'led'
  | 'dayNight'
  | 'motion'
  | 'sdCard';

export type CameraProbeStepId = 'network' | 'main' | 'sub' | 'device' | 'talk';

export type CameraProbeStepStatus = 'ok' | 'failed' | 'skipped' | 'warning';

export type CameraTalkMode = 'call' | 'push' | 'listen';

export type CameraCallState = 'idle' | 'connecting' | 'live' | 'ending';

export type CameraHealthState =
  | 'ok'
  | 'dark'
  | 'bright'
  | 'blurred'
  | 'moved'
  | 'covered'
  | 'unreachable'
  | 'unknown';
