export type CameraPreset = {
  id: string;
  name: string;
};

type Node = Record<string, unknown>;

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null;
}

function asStrings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item) : ''));
}

export function parsePresets(data: unknown, depth = 0): CameraPreset[] {
  if (!isNode(data) || depth > 8) return [];
  const ids = asStrings(data.id);
  const names = asStrings(data.name);
  if (ids && names && ids.length === names.length) {
    return ids
      .map((id, index) => ({ id, name: names[index] ?? '' }))
      .filter((preset) => preset.id.length > 0);
  }
  for (const value of Object.values(data)) {
    const found = parsePresets(value, depth + 1);
    if (found.length > 0) return found;
  }
  return [];
}

export function nextPresetName(presets: readonly CameraPreset[], base: string): string {
  const taken = new Set(presets.map((preset) => preset.name));
  for (let index = presets.length + 1; index < presets.length + 100; index += 1) {
    const name = `${base} ${index}`;
    if (!taken.has(name)) return name;
  }
  return `${base} ${Date.now()}`;
}

export const MOTION_SENSITIVITY = { low: 20, normal: 50, high: 80 } as const;

export type MotionSensitivityLevel = keyof typeof MOTION_SENSITIVITY;

export function sensitivityLevel(value: number | undefined): MotionSensitivityLevel {
  if (value == null) return 'normal';
  if (value <= 33) return 'low';
  if (value <= 66) return 'normal';
  return 'high';
}
