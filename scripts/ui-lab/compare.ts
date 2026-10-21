import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export type Comparison = { mismatch: number; sheet: Buffer };

const GAP = 8;
const THRESHOLD = 0.1;

function padded(image: PNG, width: number, height: number): PNG {
  const canvas = new PNG({ width, height });
  PNG.bitblt(image, canvas, 0, 0, image.width, image.height, 0, 0);
  return canvas;
}

function sideBySide(panels: readonly PNG[], width: number, height: number): Buffer {
  const sheet = new PNG({ width: width * panels.length + GAP * (panels.length - 1), height });
  sheet.data.fill(255);
  panels.forEach((panel, index) =>
    PNG.bitblt(panel, sheet, 0, 0, width, height, index * (width + GAP), 0)
  );
  return PNG.sync.write(sheet);
}

export function compare(ours: Buffer, prototype: Buffer): Comparison {
  const a = PNG.sync.read(ours);
  const b = PNG.sync.read(prototype);
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const left = padded(a, width, height);
  const right = padded(b, width, height);
  const diff = new PNG({ width, height });
  const different = pixelmatch(left.data, right.data, diff.data, width, height, {
    threshold: THRESHOLD,
  });
  return {
    mismatch: Math.round((different / (width * height)) * 10000) / 100,
    sheet: sideBySide([left, right, diff], width, height),
  };
}
