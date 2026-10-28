import { afterEach, describe, expect, mock, test } from 'bun:test';

const answers: { ok: boolean; status: number; info: unknown }[] = [];

let asked = 0;

mock.module('@/features/cameras/services/camera-clips.service', () => ({
  cameraClipsService: {
    poster: async () => {
      asked += 1;
      return answers.shift() ?? { ok: false, status: 500, info: null };
    },
  },
}));

const { clipPosters } = await import('@/features/cameras/services/clip-poster.service');

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  clipPosters.clear();
  answers.length = 0;
  asked = 0;
});

describe('clip posters', () => {
  test('a refused or failed poster is asked again later, and then shows', async () => {
    answers.push({ ok: false, status: 401, info: null });
    clipPosters.request({ id: '9', cameraId: '1' });
    await settle();
    expect(clipPosters.poster('9')).toBeNull();
    answers.push({ ok: true, status: 200, info: { base64: 'cG9zdGVy', mimeType: 'image/jpeg' } });
    clipPosters.request({ id: '9', cameraId: '1' });
    await settle();
    expect(asked).toBe(2);
    expect(clipPosters.poster('9')).toBe('data:image/jpeg;base64,cG9zdGVy');
  });

  test('a clip the server has no poster for is not asked twice', async () => {
    answers.push({ ok: false, status: 404, info: null });
    clipPosters.request({ id: '8', cameraId: '1' });
    await settle();
    clipPosters.request({ id: '8', cameraId: '1' });
    await settle();
    expect(asked).toBe(1);
  });
});
