import { describe, expect, test } from 'bun:test';
import { ptzHold, ptzStep, reachedLimit } from '@/features/cameras/model/camera-ptz';
import { liveAudioLevel, liveAudioReason, storedMuted } from '@/features/cameras/model/camera-live-audio';
import { capabilitiesFromRow, hasDeviceControls, resolveCapabilities } from '@/features/cameras/model/camera-capabilities';
import { optimisticStatus } from '@/features/cameras/model/camera-device';
import {
  defaultQuality,
  frameRateChoices,
  isStall,
  recordStall,
  shouldFallBack,
  STALL_WINDOW_MS,
  storedQuality,
} from '@/features/cameras/model/camera-stream-quality';
import { fpsOf, StreamMeter } from '@/features/cameras/model/stream-meter';

function be32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function ascii(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0));
}

function box(type: string, body: number[]): number[] {
  return [...be32(body.length + 8), ...ascii(type), ...body];
}

function zeros(count: number): number[] {
  return Array.from({ length: count }, () => 0);
}

function videoInit(width: number, height: number, withAudio: boolean): Uint8Array {
  const tkhd = box('tkhd', [
    ...be32(0),
    ...be32(0),
    ...be32(0),
    ...be32(1),
    ...be32(0),
    ...be32(0),
    ...zeros(8),
    ...zeros(8),
    ...zeros(36),
    ...be32(width * 65536),
    ...be32(height * 65536),
  ]);
  const mdhd = box('mdhd', [...be32(0), ...be32(0), ...be32(0), ...be32(90000), ...be32(0)]);
  const hdlr = box('hdlr', [...be32(0), ...be32(0), ...ascii('vide'), ...be32(0)]);
  const avc1 = box('avc1', [...zeros(78), ...box('avcC', [1, 0x4d, 0x40, 0x1f, 0xff])]);
  const stbl = box('stbl', box('stsd', [...be32(0), ...be32(1), ...avc1]));
  const video = box('trak', [...tkhd, ...box('mdia', [...mdhd, ...hdlr, ...box('minf', stbl)])]);
  const audioTkhd = box('tkhd', [...be32(0), ...be32(0), ...be32(0), ...be32(2), ...be32(0)]);
  const audioMdhd = box('mdhd', [...be32(0), ...be32(0), ...be32(0), ...be32(8000), ...be32(0)]);
  const audioHdlr = box('hdlr', [...be32(0), ...be32(0), ...ascii('soun'), ...be32(0)]);
  const fLaC = box('fLaC', [...zeros(16), 0, 1, ...zeros(6), ...be32(8000 * 65536)]);
  const audioStbl = box('stbl', box('stsd', [...be32(0), ...be32(1), ...fLaC]));
  const audio = box('trak', [...audioTkhd, ...box('mdia', [...audioMdhd, ...audioHdlr, ...box('minf', audioStbl)])]);
  return new Uint8Array([
    ...box('ftyp', ascii('iso5')),
    ...box('moov', [...box('mvhd', be32(0)), ...video, ...(withAudio ? audio : [])]),
  ]);
}

function videoFragment(durationTicks: number): Uint8Array {
  const payload = [1, 2, 3, 4];
  const tfhd = box('tfhd', [
    ...be32(0x020038),
    ...be32(1),
    ...be32(durationTicks),
    ...be32(payload.length),
    ...be32(0x02000000),
  ]);
  const tfdt = box('tfdt', [...be32(0x01000000), ...be32(0), ...be32(0)]);
  const traf = box('traf', [...tfhd, ...tfdt, ...box('trun', [...be32(0x000001), ...be32(1), ...be32(0)])]);
  const moof = box('moof', [...box('mfhd', [...be32(0), ...be32(1)]), ...traf]);
  const patched = [...moof];
  patched.splice(patched.length - 4, 4, ...be32(moof.length + 8));
  return new Uint8Array([...patched, ...box('mdat', payload)]);
}

describe('capabilities synced on the camera row', () => {
  test('an empty list means the row has not been told yet, so the device answer decides', () => {
    expect(capabilitiesFromRow([])).toBeNull();
    expect(resolveCapabilities([], { ptz: true, catalogId: 'tapo-c225' })).toEqual({ ptz: true, catalogId: 'tapo-c225' });
  });

  test('a synced list wins over a stale device answer, so a driver change shows at once', () => {
    const stale = { ptz: false, talk: false, streamOnly: true, catalogId: 'tapo-c225' };
    const features = resolveCapabilities(['ptz', 'presets', 'talk', 'microphone'], stale);
    expect(features?.ptz).toBe(true);
    expect(features?.talk).toBe(true);
    expect(features?.streamOnly).toBe(false);
    expect(features?.catalogId).toBe('tapo-c225');
    expect(hasDeviceControls(features)).toBe(true);
    expect(hasDeviceControls(capabilitiesFromRow(['streamOnly']))).toBe(false);
  });
});

describe('live quality', () => {
  test('a phone starts on the light stream and every larger screen on the full one', () => {
    expect(defaultQuality({ wide: false, native: true })).toBe('sub');
    expect(defaultQuality({ wide: true, native: true })).toBe('main');
    expect(defaultQuality({ wide: false, native: false })).toBe('main');
    expect(storedQuality('sub')).toBe('sub');
    expect(storedQuality('4k')).toBeNull();
  });

  test('two stalls within a minute on the full stream fall back, older ones are forgotten', () => {
    expect(isStall('live', 'reconnecting')).toBe(true);
    expect(isStall('connecting', 'reconnecting')).toBe(false);
    const first = recordStall([], 1000);
    expect(shouldFallBack('main', first)).toBe(false);
    const second = recordStall(first, 2000);
    expect(shouldFallBack('main', second)).toBe(true);
    expect(shouldFallBack('sub', second)).toBe(false);
    expect(recordStall(first, 1000 + STALL_WINDOW_MS)).toHaveLength(1);
  });

  test('frame rates below ten are not offered, the current one always is', () => {
    expect(frameRateChoices({ frameRate: 15, frameRates: [1, 15, 20, 25, 30] })).toEqual([15, 20, 25, 30]);
    expect(frameRateChoices({ frameRate: 15, frameRates: [] })).toEqual([15]);
    expect(frameRateChoices(null)).toEqual([]);
  });
});

describe('stream meter', () => {
  test('reads the picture size from the init and the frame rate from the samples', () => {
    const meter = new StreamMeter();
    expect(meter.init(videoInit(2688, 1520, true))).toEqual({ width: 2688, height: 1520, fps: 0, audio: true });
    expect(meter.fragment(videoFragment(6000))).toEqual({ width: 2688, height: 1520, fps: 15, audio: true });
    expect(meter.fragment(videoFragment(6000))).toBeNull();
    expect(new StreamMeter().init(videoInit(1280, 720, false))?.audio).toBe(false);
  });

  test('an irregular cadence reads as its average, not its most common gap', () => {
    expect(fpsOf([50_000, 50_000, 100_000, 50_000, 83_333])).toBe(15);
    expect(fpsOf([])).toBe(0);
  });
});

describe('device settings', () => {
  test('a frame rate change shows at once on the device status', () => {
    const status = {
      model: 'C225',
      video: { resolution: '2688x1520', frameRate: 15, encoding: 'H264', frameRates: [15, 30], resolutions: [] },
    };
    expect(optimisticStatus(status, { frameRate: 30 }).video?.frameRate).toBe(30);
    expect(optimisticStatus(status, { led: true }).video?.frameRate).toBe(15);
  });
});

describe('live camera audio', () => {
  test('plays by default, and the user, an Argus call or a camera call silence it', () => {
    const base = { muted: false, argusCall: false, cameraCall: false };
    expect(liveAudioReason(base)).toBe('on');
    expect(liveAudioLevel(base)).toBe(1);
    expect(liveAudioReason({ ...base, argusCall: true })).toBe('argus-call');
    expect(liveAudioLevel({ ...base, argusCall: true })).toBe(0);
    expect(liveAudioReason({ ...base, cameraCall: true })).toBe('camera-call');
    expect(liveAudioReason({ ...base, muted: true, argusCall: true })).toBe('muted');
    expect(storedMuted(null)).toBe(false);
    expect(storedMuted(true)).toBe(true);
  });
});

describe('pan and tilt', () => {
  test('each arrow is a 10 degree relative step with the C225 signs: +x right, +y up', () => {
    expect(ptzStep('right')).toEqual({ x: 10, y: 0 });
    expect(ptzStep('left')).toEqual({ x: -10, y: 0 });
    expect(ptzStep('up')).toEqual({ x: 0, y: 10 });
    expect(ptzStep('down')).toEqual({ x: 0, y: -10 });
  });

  test('holding an arrow moves continuously in the protocol direction', () => {
    expect(ptzHold('right')).toEqual({ angle: 0 });
    expect(ptzHold('up')).toEqual({ angle: 90 });
    expect(ptzHold('left')).toEqual({ angle: 180 });
    expect(ptzHold('down')).toEqual({ angle: 270 });
  });

  test('the server says when the camera stood at the end of its travel', () => {
    expect(reachedLimit({ moved: false, limit: true })).toBe(true);
    expect(reachedLimit({ moved: true, limit: false })).toBe(false);
    expect(reachedLimit(null)).toBe(false);
  });
});
