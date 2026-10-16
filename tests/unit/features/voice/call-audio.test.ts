import { describe, expect, test } from 'bun:test';
import type { CallAudioDevice } from '@/core/types';
import {
  callAudioIcon,
  callAudioLabel,
  desktopDevicesOf,
  groupCallAudio,
  livekitOutputKind,
} from '@/features/voice/model/call-audio';

const route = (kind: CallAudioDevice['kind'], name: string, active = false): CallAudioDevice => ({
  id: `${kind}-1`,
  kind,
  direction: 'route',
  name,
  active,
});

describe('the call audio model', () => {
  test('LiveKit output ids map to the kinds the panel shows', () => {
    expect(livekitOutputKind('force_speaker')).toBe('speaker');
    expect(livekitOutputKind('speaker')).toBe('speaker');
    expect(livekitOutputKind('default')).toBe('earpiece');
    expect(livekitOutputKind('headset')).toBe('wired');
    expect(livekitOutputKind('bluetooth')).toBe('bluetooth');
    expect(livekitOutputKind('car')).toBe('unknown');
  });

  test('a Bluetooth device keeps its own name and a built-in route uses the kind label', () => {
    const label = (kind: string) => `label-${kind}`;
    expect(callAudioLabel(route('bluetooth', 'Galaxy Buds'), label)).toBe('Galaxy Buds');
    expect(callAudioLabel(route('bluetooth', '  '), label)).toBe('label-bluetooth');
    expect(callAudioLabel(route('speaker', 'Speaker'), label)).toBe('label-speaker');
    expect(callAudioLabel(route('earpiece', 'Earpiece'), label)).toBe('label-earpiece');
  });

  test('every kind has an icon', () => {
    expect(callAudioIcon('bluetooth')).toBe('bluetooth');
    expect(callAudioIcon('wired')).toBe('headphones');
    expect(callAudioIcon('microphone')).toBe('mic');
  });

  test('desktop devices are read defensively and grouped by direction', () => {
    const devices = desktopDevicesOf([
      { id: 'in-1', direction: 'input', name: 'Built-in microphone', active: true },
      { id: 'out-1', direction: 'output', name: 'Speakers', active: false },
      { id: '', direction: 'input', name: 'broken', active: false },
      { id: 'x', direction: 'sideways', name: 'broken', active: false },
      'garbage',
    ]);
    expect(devices).toHaveLength(2);
    const groups = groupCallAudio([...devices, route('speaker', 'Speaker', true)]);
    expect(groups.inputs.map((device) => device.kind)).toEqual(['microphone']);
    expect(groups.outputs.map((device) => device.kind)).toEqual(['output']);
    expect(groups.routes).toHaveLength(1);
    expect(desktopDevicesOf(null)).toEqual([]);
  });
});
