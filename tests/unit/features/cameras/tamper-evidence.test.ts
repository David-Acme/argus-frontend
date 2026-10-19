import { describe, expect, test } from 'bun:test';
import type { ICameraClip } from '@/core/interfaces';
import {
  TAMPER_EVIDENCE_VIDEO_MAX_BYTES,
  TAMPER_EVIDENCE_WINDOW_S,
  evidenceScope,
  evidenceVideo,
  lastGoodFrame,
  lookCrops,
  pickEvidenceClips,
  retainedScopes,
  type TamperEvidence,
} from '@/features/cameras/model/tamper-evidence';

const ONSET = 1_760_000_000;

function clip(overrides: Partial<ICameraClip> & Pick<ICameraClip, 'id'>): ICameraClip {
  return {
    cameraId: '4',
    trigger: 'tamper',
    contentType: 'video/mp4',
    codec: 'h264',
    startedAt: ONSET,
    durationMs: 12_000,
    byteSize: 1024 * 1024,
    createdAt: ONSET,
    expiresAt: 0,
    ...overrides,
  };
}

describe('which clips are kept as tamper evidence', () => {
  test('the last good frame and the tamper clip around the onset, nothing else', () => {
    const picked = pickEvidenceClips(
      [
        clip({ id: '1' }),
        clip({ id: '2', contentType: 'image/jpeg', durationMs: 0, startedAt: ONSET - 2 }),
        clip({ id: '3', trigger: 'motion' }),
        clip({ id: '4', startedAt: ONSET - TAMPER_EVIDENCE_WINDOW_S - 1 }),
        clip({ id: '5', cameraId: '9' }),
      ],
      { cameraId: 4, onsetAt: ONSET },
    );
    expect(picked.map((row) => row.id)).toEqual(['2', '1']);
  });

  test('a video too large to keep on the phone is left on the server', () => {
    const picked = pickEvidenceClips(
      [clip({ id: '1', byteSize: TAMPER_EVIDENCE_VIDEO_MAX_BYTES + 1 })],
      { cameraId: 4, onsetAt: ONSET },
    );
    expect(picked).toEqual([]);
  });

  test('look crops come along with the frame, closest first', () => {
    const picked = pickEvidenceClips(
      [
        clip({ id: '7', trigger: 'look', contentType: 'image/jpeg', startedAt: ONSET + 30 }),
        clip({ id: '8', trigger: 'look', contentType: 'image/jpeg', startedAt: ONSET + 5 }),
      ],
      { cameraId: 4, onsetAt: ONSET },
    );
    expect(picked.map((row) => row.id)).toEqual(['8', '7']);
  });
});

describe('the evidence index', () => {
  test('the newest incident goes first and the oldest falls out', () => {
    expect(retainedScopes(['4-1', '4-2', '5-3'], '6-4', 3)).toEqual(['6-4', '4-1', '4-2']);
    expect(retainedScopes(['4-1', '4-2'], '4-2', 3)).toEqual(['4-2', '4-1']);
  });

  test('a scope names the camera and the onset', () => {
    expect(evidenceScope({ cameraId: 4, onsetAt: ONSET })).toBe(`4-${ONSET}`);
  });
});

describe('reading kept evidence', () => {
  const evidence: TamperEvidence = {
    cameraId: 4,
    onsetAt: ONSET,
    keptAt: 0,
    items: [
      { clipId: '2', trigger: 'tamper', contentType: 'image/jpeg', startedAt: ONSET, durationMs: 0, base64: 'AA==' },
      { clipId: '8', trigger: 'look', contentType: 'image/jpeg', startedAt: ONSET, durationMs: 0, base64: 'AA==' },
      { clipId: '1', trigger: 'tamper', contentType: 'video/mp4', startedAt: ONSET, durationMs: 9000, base64: 'AA==' },
    ],
  };

  test('frame, crops and clip are told apart', () => {
    expect(lastGoodFrame(evidence)?.clipId).toBe('2');
    expect(lookCrops(evidence).map((item) => item.clipId)).toEqual(['8']);
    expect(evidenceVideo(evidence)?.clipId).toBe('1');
  });

  test('nothing kept reads as nothing', () => {
    expect(lastGoodFrame(null)).toBeNull();
    expect(lookCrops(null)).toEqual([]);
    expect(evidenceVideo(null)).toBeNull();
  });
});
