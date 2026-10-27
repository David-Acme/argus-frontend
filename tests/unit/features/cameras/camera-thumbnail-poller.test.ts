import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { CAMERA_THUMBNAIL_REFRESH_MS } from '@/features/cameras/constants';

mock.module('@/features/cameras/services/camera-control.service', () => ({
  cameraControlService: {
    snapshot: async (id: string) => ({
      ok: true,
      status: 200,
      errors: null,
      info: { image: `frame-${id}`, capturedAt: 0 },
    }),
  },
}));

const { CameraThumbnailPoller } =
  await import('@/features/cameras/services/camera-thumbnail.service');
const { previewBoard } = await import('@/features/cameras/services/preview-board');

type Poller = InstanceType<typeof CameraThumbnailPoller>;

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

let poller: Poller | null = null;

async function refreshes(repeat: boolean) {
  const timer = spyOn(globalThis, 'setTimeout');
  const seen: ReadonlyMap<string, string>[] = [];
  poller = new CameraThumbnailPoller(['1', '2'], (frames) => seen.push(frames), repeat);
  poller.start();
  await settle();
  await settle();
  const scheduled = timer.mock.calls.filter(([, delay]) => delay === CAMERA_THUMBNAIL_REFRESH_MS);
  timer.mockRestore();
  return { seen, scheduled: scheduled.length };
}

afterEach(() => {
  poller?.stop();
  poller = null;
});

describe('camera thumbnails', () => {
  test('a repeating poller reads every camera and schedules its next round', async () => {
    const { seen, scheduled } = await refreshes(true);
    expect(seen.at(-1)).toEqual(
      new Map([
        ['1', 'frame-1'],
        ['2', 'frame-2'],
      ])
    );
    expect(scheduled).toBe(1);
  });

  test('a poller that does not repeat reads every camera once and schedules nothing', async () => {
    const { seen, scheduled } = await refreshes(false);
    expect(seen.at(-1)?.size).toBe(2);
    expect(scheduled).toBe(0);
  });

  test('a camera already playing live is not polled for a still', async () => {
    previewBoard.markLive('2', true);
    const { seen } = await refreshes(false);
    previewBoard.markLive('2', false);
    expect(seen.at(-1)).toEqual(new Map([['1', 'frame-1']]));
  });
});
