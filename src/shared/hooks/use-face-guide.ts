import { createArgusFace, type FaceDetection } from 'argus-face';
import type { CameraView } from 'expo-camera';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Platform } from 'react-native';
import {
  FACE_CENTER_X_TOL,
  FACE_CENTER_Y_MAX,
  FACE_CENTER_Y_MIN,
  FACE_CLOSE_MIN_HEIGHT,
  FACE_DRIFT_GRACE_MS,
  FACE_EYE_MIN_OPEN,
  FACE_FAR_MAX_HEIGHT,
  FACE_LOW_LIGHT_LUM,
  FACE_MAX_PITCH_DEG,
  FACE_MAX_ROLL_DEG,
  FACE_MAX_YAW_DEG,
  FACE_UI_UPDATE_MS,
  FACE_READY_STABLE_MS,
  FACE_SAMPLE_FAST_MS,
  FACE_SAMPLE_MS,
} from '@/shared/constants';
import type { FaceGuideSnapshot } from '@/core/types';

type UseFaceGuideOptions = {
  cameraRef: RefObject<CameraView | null>;
  /** Pauses the sampling loop (e.g. while submitting or confirming). */
  active: boolean;
  /** Fired once when the face stays perfect for FACE_READY_STABLE_MS. */
  onReady: () => void;
  /** Fired when a perfect face leaves the ready zone (e.g. cancel countdowns). */
  onDrift?: () => void;
};

type FaceGuideData = Omit<FaceGuideSnapshot, 'reset'>;
type UnknownRecord = Record<string, unknown>;
type NativeFaceEvent = { nativeEvent: UnknownRecord };
type FaceGuideResult = FaceGuideSnapshot & { onFacesDetected: (event: NativeFaceEvent) => void };

const abs = Math.abs;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function numberOr(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function pointOrNull(value: unknown): { x: number; y: number } | null {
  if (!isRecord(value)) return null;
  return { x: numberOr(value.x), y: numberOr(value.y) };
}

function faceOrNull(value: unknown): FaceDetection | null {
  if (!isRecord(value) || !isRecord(value.bounds)) return null;
  const bounds = value.bounds;
  return {
    bounds: {
      x: numberOr(bounds.x),
      y: numberOr(bounds.y),
      width: numberOr(bounds.width),
      height: numberOr(bounds.height),
    },
    yawDeg: numberOr(value.yawDeg),
    pitchDeg: numberOr(value.pitchDeg),
    rollDeg: numberOr(value.rollDeg),
    leftEyeOpenProbability: numberOr(value.leftEyeOpenProbability),
    rightEyeOpenProbability: numberOr(value.rightEyeOpenProbability),
    leftEye: pointOrNull(value.leftEye),
    rightEye: pointOrNull(value.rightEye),
    nose: pointOrNull(value.nose),
    mouth: pointOrNull(value.mouth),
  };
}

function readNativeFrame(event: NativeFaceEvent): { luminance: number; faces: FaceDetection[] } {
  const nativeEvent = isRecord(event?.nativeEvent) ? event.nativeEvent : {};
  const source = isRecord(nativeEvent.data)
    ? nativeEvent.data
    : isRecord(nativeEvent.payload)
      ? nativeEvent.payload
      : nativeEvent;
  const faces = Array.isArray(source.faces)
    ? source.faces.map(faceOrNull).filter((face): face is FaceDetection => face !== null)
    : [];
  return { luminance: numberOr(source.luminance), faces };
}

function analyze(frame: { luminance: number; faces: FaceDetection[] }): FaceGuideSnapshot['state'] {
  const { luminance, faces } = frame;
  if (luminance > 0 && luminance < FACE_LOW_LIGHT_LUM) return 'low-light';
  if (faces.length === 0) return 'no-face';
  if (faces.length > 1) return 'multiple-faces';

  const f = faces[0];
  const h = f.bounds.height;
  if (h < FACE_FAR_MAX_HEIGHT) return 'too-far';
  if (h > FACE_CLOSE_MIN_HEIGHT) return 'too-close';

  const cx = f.bounds.x + f.bounds.width / 2;
  const cy = f.bounds.y + f.bounds.height / 2;
  if (abs(cx - 0.5) > FACE_CENTER_X_TOL || cy < FACE_CENTER_Y_MIN || cy > FACE_CENTER_Y_MAX) {
    return 'off-center';
  }

  if (
    abs(f.yawDeg) > FACE_MAX_YAW_DEG ||
    abs(f.pitchDeg) > FACE_MAX_PITCH_DEG ||
    abs(f.rollDeg) > FACE_MAX_ROLL_DEG
  ) {
    return 'tilted';
  }

  const pL = f.leftEyeOpenProbability;
  const pR = f.rightEyeOpenProbability;
  if ((pL > 0.1 || pR > 0.1) && Math.min(pL, pR) < FACE_EYE_MIN_OPEN) {
    return 'eyes-closed';
  }

  return 'ready';
}

/**
 * Live face-capture guidance: samples low-quality frames from the front
 * camera, runs the native detector and derives the guiding state. Fires
 * `onReady` when the face stays perfect long enough (auto-capture).
 */
export function useFaceGuide({ cameraRef, active, onReady, onDrift }: UseFaceGuideOptions): FaceGuideResult {
  // The detector is created lazily once; native modules may throw when the
  // dev-client predates argus-face, in which case the screen falls back to
  // manual capture.
  const face = useMemo(() => {
    try {
      return createArgusFace();
    } catch {
      return null;
    }
  }, []);
  const available = face !== null;

  const [snapshot, setSnapshot] = useState<FaceGuideData>({
    state: null,
    available,
    luminance: 0,
    offset: { dx: 0, dy: 0 },
    faces: [],
  });

  const readySinceRef = useRef<number | null>(null);
  const readyFiredRef = useRef(false);
  const driftSinceRef = useRef<number | null>(null);
  const lastReadyFrameRef = useRef<{ luminance: number; faces: FaceDetection[] } | null>(null);
  const lastUiUpdateRef = useRef(0);
  const lastUiStateRef = useRef<FaceGuideSnapshot['state'] | null>(null);
  const onReadyRef = useRef(onReady);
  const onDriftRef = useRef(onDrift);
  const activeRef = useRef(active);
  useEffect(() => {
    onReadyRef.current = onReady;
    onDriftRef.current = onDrift;
    activeRef.current = active;
  }, [active, onDrift, onReady]);

  const applyFrame = useCallback(
    (frame: { luminance: number; faces: FaceDetection[] }): FaceGuideSnapshot['state'] => {
      const now = Date.now();
      const detectedState = analyze(frame);
      let state = detectedState;
      let frameForUi = frame;

      if (detectedState === 'ready') {
        lastReadyFrameRef.current = frame;
        driftSinceRef.current = null;
        readySinceRef.current ??= now;
        if (!readyFiredRef.current && now - readySinceRef.current >= FACE_READY_STABLE_MS) {
          readyFiredRef.current = true;
          onReadyRef.current();
        }
      } else {
        if (readySinceRef.current !== null) {
          driftSinceRef.current ??= now;
          const withinGrace = now - driftSinceRef.current < FACE_DRIFT_GRACE_MS;
          if (withinGrace && lastReadyFrameRef.current) {
            state = 'ready';
            frameForUi = lastReadyFrameRef.current;
          } else if (!withinGrace) {
            const shouldNotifyDrift = readyFiredRef.current;
            readySinceRef.current = null;
            readyFiredRef.current = false;
            driftSinceRef.current = null;
            lastReadyFrameRef.current = null;
            if (shouldNotifyDrift) onDriftRef.current?.();
          }
        }
      }

      if (
        state !== lastUiStateRef.current ||
        now - lastUiUpdateRef.current >= FACE_UI_UPDATE_MS
      ) {
        const f = frameForUi.faces[0];
        setSnapshot({
          state,
          available: true,
          luminance: frameForUi.luminance,
          offset: f
            ? {
                dx: Math.max(-1, Math.min(1, (f.bounds.x + f.bounds.width / 2 - 0.5) * 6)),
                dy: Math.max(-1, Math.min(1, (f.bounds.y + f.bounds.height / 2 - 0.4) * 6)),
              }
            : { dx: 0, dy: 0 },
          faces: frameForUi.faces,
        });
        lastUiStateRef.current = state;
        lastUiUpdateRef.current = now;
      }
      return state;
    },
    [],
  );

  const onFacesDetected = useCallback(
    (event: NativeFaceEvent) => {
      if (Platform.OS !== 'android' || !activeRef.current || !available) return;
      applyFrame(readNativeFrame(event));
    },
    [applyFrame, available],
  );

  useEffect(() => {
    if (Platform.OS === 'android' || !active || !available || !face) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const sample = async () => {
      if (cancelled) return;
      const shot = await cameraRef.current?.takePictureAsync({
        quality: 0.15,
        shutterSound: false,
      });
      if (cancelled || !shot?.uri) {
        if (!cancelled) timer = setTimeout(() => void sample(), FACE_SAMPLE_MS);
        return;
      }
      try {
        const frame = await face.detectFaces(shot.uri);
        if (cancelled) return;
        const state = applyFrame(frame);

        timer = setTimeout(
          () => void sample(),
          state === 'ready' ? FACE_SAMPLE_FAST_MS : FACE_SAMPLE_MS,
        );
      } catch {
        if (!cancelled) timer = setTimeout(() => void sample(), FACE_SAMPLE_MS);
      }
    };

    timer = setTimeout(() => void sample(), FACE_SAMPLE_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [active, applyFrame, available, cameraRef, face]);

  const reset = useCallback(() => {
    readySinceRef.current = null;
    readyFiredRef.current = false;
    driftSinceRef.current = null;
    lastReadyFrameRef.current = null;
    lastUiUpdateRef.current = 0;
    lastUiStateRef.current = null;
    setSnapshot({ state: null, available, luminance: 0, offset: { dx: 0, dy: 0 }, faces: [] });
  }, [available]);

  return { ...snapshot, reset, onFacesDetected };
}
