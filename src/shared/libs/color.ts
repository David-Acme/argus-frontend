const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function hexChannel(hex: string, start: number, end: number): number {
  return Number.parseInt(hex.slice(start, end), 16) / 255;
}

export function hexToRgba(hex: string, alpha = 1): [number, number, number, number] {
  const normalized = hex.replace('#', '');
  if (!HEX_RE.test(hex)) {
    return [1, 1, 1, alpha];
  }
  const full = normalized.length === 3 ? normalized.replace(/./g, (c) => c + c) : normalized;
  return [hexChannel(full, 0, 2), hexChannel(full, 2, 4), hexChannel(full, 4, 6), alpha];
}

export function hexToHsv(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgba(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta > 0) {
    if (max === r) {
      hue = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      hue = ((b - r) / delta + 2) / 6;
    } else {
      hue = ((r - g) / delta + 4) / 6;
    }
  }

  return [hue, max === 0 ? 0 : delta / max, max];
}
