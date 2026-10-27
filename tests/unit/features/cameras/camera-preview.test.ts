import { describe, expect, test } from 'bun:test';
import {
  firstInOrder,
  grantedPreviews,
  inViewport,
  previewSubscribeFrame,
  readMediaHeader,
  type PreviewWish,
} from '@/features/cameras/model/camera-preview';
import { previewBoard } from '@/features/cameras/services/preview-board';

const wish = (key: string, order: number, visible = true, cameraId = key): PreviewWish => ({
  key,
  cameraId,
  order,
  visible,
});

function frameOf(bytes: readonly number[]): ArrayBuffer {
  return new Uint8Array([...bytes, ...new Array<number>(12 - bytes.length).fill(0)]).buffer;
}

describe('which tiles play live', () => {
  test('the first visible tiles in order play, up to the cap', () => {
    const granted = grantedPreviews(
      [wish('c', 2), wish('a', 0), wish('hidden', 1, false), wish('d', 3), wish('b', 1)],
      3
    );
    expect([...granted].sort()).toEqual(['a', 'b', 'c']);
  });

  test('two tiles of one camera never take two decoders', () => {
    const granted = grantedPreviews([wish('home', 0, true, '7'), wish('list', 1, true, '7')], 4);
    expect([...granted]).toEqual(['home']);
  });

  test('a cap of zero plays nothing', () => {
    expect(grantedPreviews([wish('a', 0)], 0).size).toBe(0);
  });

  test('the board grants by the cap and tells its listeners only when the grant changes', () => {
    let told = 0;
    const stop = previewBoard.subscribe(() => {
      told += 1;
    });
    previewBoard.setCap(1);
    previewBoard.wish(wish('board-a', 0));
    previewBoard.wish(wish('board-b', 1));
    expect(previewBoard.isGranted('board-a')).toBe(true);
    expect(previewBoard.isGranted('board-b')).toBe(false);
    previewBoard.wish(wish('board-b', 1));
    expect(told).toBe(1);
    previewBoard.forget('board-a');
    expect(previewBoard.isGranted('board-b')).toBe(true);
    previewBoard.forget('board-b');
    stop();
  });
});

describe('a tile on screen', () => {
  const phone = { width: 360, height: 640 };

  test('a tile that overlaps the window is visible', () => {
    expect(inViewport({ x: 0, y: 600, width: 180, height: 100 }, phone)).toBe(true);
  });

  test('a tile scrolled past either edge, or not laid out, is not', () => {
    expect(inViewport({ x: 0, y: 640, width: 180, height: 100 }, phone)).toBe(false);
    expect(inViewport({ x: 0, y: -100, width: 180, height: 100 }, phone)).toBe(false);
    expect(inViewport({ x: 0, y: 10, width: 0, height: 0 }, phone)).toBe(false);
  });
});

describe('the preview wire', () => {
  test('a frame header names its type, keyframe flag and subscription', () => {
    expect(readMediaHeader(frameOf([0xa7, 1, 2, 1, 0x01, 0x02]))).toEqual({
      type: 2,
      keyframe: true,
      subId: 258,
    });
  });

  test('a short frame or a foreign magic is not a media frame', () => {
    expect(readMediaHeader(new Uint8Array([0xa7, 1]).buffer)).toBeNull();
    expect(readMediaHeader(frameOf([0x00, 1, 2]))).toBeNull();
  });

  test('a preview asks for the sub stream as a preview', () => {
    expect(JSON.parse(previewSubscribeFrame(4, false))).toEqual({
      type: 'camera:subscribe',
      payload: { cameraId: 4, quality: 'sub', preview: true, fastStart: false },
    });
  });

  test('the next subscription is the lowest order', () => {
    expect(firstInOrder([{ order: 3 }, { order: 1 }, { order: 2 }])).toEqual({ order: 1 });
    expect(firstInOrder([])).toBeNull();
  });
});
