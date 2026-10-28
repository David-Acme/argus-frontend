import { rebaseClipTimes } from '@/features/cameras/model/clip-timeline';
import { listBoxes, parseFragment, parseInit, type Fmp4Init } from '@/features/cameras/model/fmp4';

export type ClipFragment = {
  bytes: Uint8Array;
  keyframe: boolean;
  atUs: number;
};

export type ClipFile = {
  init: Uint8Array;
  track: Fmp4Init | null;
  fragments: ClipFragment[];
};

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const BASE64_LOOKUP = (() => {
  const table = new Int16Array(128).fill(-1);
  for (let index = 0; index < BASE64_ALPHABET.length; index += 1)
    table[BASE64_ALPHABET.charCodeAt(index)] = index;
  return table;
})();

export function decodeBase64(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/=]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array(Math.max(0, Math.floor((clean.length * 3) / 4) - padding));
  let accumulator = 0;
  let bits = 0;
  let written = 0;
  for (let index = 0; index < clean.length; index += 1) {
    const code = clean.charCodeAt(index);
    const value = code === 61 ? -2 : code < 128 ? (BASE64_LOOKUP[code] ?? -1) : -1;
    if (value === -2) break;
    if (value < 0) continue;
    accumulator = (accumulator << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[written] = (accumulator >> bits) & 0xff;
      written += 1;
    }
  }
  return written === bytes.length ? bytes : bytes.slice(0, written);
}

export function splitClipFile(bytes: Uint8Array): ClipFile | null {
  const listed = listBoxes(bytes);
  const moov = listed.find((box) => box.type === 'moov');
  if (!moov) return null;
  const init = bytes.slice(0, moov.end);
  const track = parseInit(init);

  const pieces: Uint8Array[] = [];
  for (let index = 0; index < listed.length; index += 1) {
    const box = listed[index];
    if (!box || box.type !== 'moof') continue;
    const next = listed[index + 1];
    pieces.push(bytes.slice(box.start, next && next.type === 'mdat' ? next.end : box.end));
  }
  rebaseClipTimes(init, pieces);

  const fragments: ClipFragment[] = [];
  for (const fragment of pieces) {
    const samples = track ? parseFragment(fragment, track) : [];
    const first = samples[0];
    fragments.push({
      bytes: fragment,
      keyframe:
        samples.length === 0 ? fragments.length === 0 : samples.some((sample) => sample.isKey),
      atUs: first ? first.timestampUs : (fragments.at(-1)?.atUs ?? 0),
    });
  }
  if (fragments.length === 0) return null;
  return { init, track, fragments };
}

export type ClipPaceStep = {
  index: number;
  atMs: number;
};

export function clipPaceSteps(fragments: readonly ClipFragment[], leadMs = 400): ClipPaceStep[] {
  const base = fragments[0]?.atUs ?? 0;
  return fragments.map((fragment, index) => ({
    index,
    atMs: Math.max(0, Math.round((fragment.atUs - base) / 1000) - leadMs),
  }));
}

export function clipDurationMs(fragments: readonly ClipFragment[]): number {
  const first = fragments[0];
  const last = fragments[fragments.length - 1];
  if (!first || !last) return 0;
  return Math.max(0, Math.round((last.atUs - first.atUs) / 1000));
}
