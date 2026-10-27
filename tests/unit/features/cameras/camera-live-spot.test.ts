import { describe, expect, test } from 'bun:test';
import { liveStatusSpot } from '@/features/cameras/model/camera-live-spot';

const base = { picture: false, live: false, compact: false, hidden: false };

describe('liveStatusSpot', () => {
  test('a full view covers itself until the picture arrives, then keeps a corner pill', () => {
    expect(liveStatusSpot(base)).toBe('cover');
    expect(liveStatusSpot({ ...base, picture: true, live: true })).toBe('corner');
    expect(liveStatusSpot({ ...base, picture: true })).toBe('corner');
  });

  test('a tile centres its pill, so it never sits on the name at the bottom or the live chip at the top', () => {
    expect(liveStatusSpot({ ...base, compact: true })).toBe('center');
    expect(liveStatusSpot({ ...base, compact: true, picture: true })).toBe('center');
  });

  test('a live tile leaves the live mark to the tile, and a hidden status shows nothing over the picture', () => {
    expect(liveStatusSpot({ ...base, compact: true, picture: true, live: true })).toBe('none');
    expect(liveStatusSpot({ ...base, picture: true, live: true, hidden: true })).toBe('none');
    expect(liveStatusSpot({ ...base, hidden: true })).toBe('cover');
  });
});
