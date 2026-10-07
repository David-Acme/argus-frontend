import { describe, expect, test } from 'bun:test';
import { biometricErasureSchema } from '@/core/contracts/voiceprint.contract';
import { erasureSummary, withoutVoice } from '@/features/people/model/biometric-erase';

describe('erasing a person biometrics', () => {
  test('the answer is read as counts and a voice flag', () => {
    const parsed = biometricErasureSchema.safeParse({ faces: 3, portraits: 1, voiceProfile: true, voiceSamples: 12 });
    expect(parsed.success).toBe(true);
    expect(biometricErasureSchema.safeParse({ faces: -1, portraits: 0, voiceProfile: false, voiceSamples: 0 }).success).toBe(
      false,
    );
    expect(biometricErasureSchema.safeParse({ faces: 1, portraits: 0, voiceSamples: 0 }).success).toBe(false);
  });

  test('the toast reports what was erased, or that nothing was stored', () => {
    expect(erasureSummary({ faces: 3, portraits: 1, voiceProfile: true, voiceSamples: 12 })).toEqual({
      kind: 'counts',
      faces: 3,
      portraits: 1,
      samples: 12,
    });
    expect(erasureSummary({ faces: 0, portraits: 0, voiceProfile: false, voiceSamples: 0 })).toEqual({ kind: 'nothing' });
    expect(erasureSummary({ faces: 0, portraits: 0, voiceProfile: true, voiceSamples: 0 }).kind).toBe('counts');
  });

  test('the erased voice leaves the recognized list at once', () => {
    const directory = {
      available: true,
      recognized: [
        { userId: 4, since: 1, updatedAt: 2 },
        { userId: 5, since: 1, updatedAt: 2 },
      ],
    };
    expect(withoutVoice(directory, 4)?.recognized.map((voice) => voice.userId)).toEqual([5]);
    expect(withoutVoice(null, 4)).toBeNull();
  });
});
