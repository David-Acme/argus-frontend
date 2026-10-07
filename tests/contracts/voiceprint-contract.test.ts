import { describe, expect, test } from 'bun:test';
import { voiceprintDirectorySchema } from '@/core/contracts/voiceprint.contract';

describe('the voice directory the owner reads', () => {
  test('accepts the answer argus-identity gives', () => {
    const answer = {
      available: true,
      recognized: [{ userId: 7, since: 1790000000, updatedAt: 1790500000 }],
    };
    expect(voiceprintDirectorySchema.safeParse(answer).success).toBe(true);
    expect(voiceprintDirectorySchema.safeParse({ available: false, recognized: [] }).success).toBe(true);
  });

  test('refuses an answer that leaks more than ids and dates or misses one', () => {
    expect(voiceprintDirectorySchema.safeParse({ recognized: [] }).success).toBe(false);
    expect(
      voiceprintDirectorySchema.safeParse({
        available: true,
        recognized: [{ userId: 0, since: 1, updatedAt: 1 }],
      }).success
    ).toBe(false);
    expect(
      voiceprintDirectorySchema.safeParse({
        available: true,
        recognized: [{ userId: 7, since: -1, updatedAt: 1 }],
      }).success
    ).toBe(false);
    const strict = voiceprintDirectorySchema.parse({
      available: true,
      recognized: [{ userId: 7, since: 1, updatedAt: 2, embedding: [0.1] }],
    });
    expect(Object.keys(strict.recognized[0] ?? {})).toEqual(['userId', 'since', 'updatedAt']);
  });
});
