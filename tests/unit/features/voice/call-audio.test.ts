import { describe, expect, test } from 'bun:test';
import type { CallAudioDevice } from '@/core/types';
import {
  callAudioIcon,
  callAudioLabel,
  desktopDevicesOf,
  groupCallAudio,
  inputNamed,
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

describe('the chosen microphone in a desktop call', () => {
  const input = (id: string, name: string) =>
    ({ id, kind: 'microphone', direction: 'input', name, active: false }) as const;
  const devices = [
    input('0', ''),
    input('1', 'Built-in Audio Analog Stereo'),
    input('2', 'Blue Yeti Stereo Microphone'),
    {
      id: '9',
      kind: 'output',
      direction: 'output',
      name: 'Blue Yeti Stereo Microphone',
      active: true,
    } as const,
  ];

  test('the native input with the same name, or the one that contains it, carries the choice', () => {
    expect(inputNamed(devices, 'blue yeti stereo microphone')?.id).toBe('2');
    expect(inputNamed(devices, 'Blue Yeti')?.id).toBe('2');
    expect(inputNamed(devices, 'USB headset')).toBeNull();
    expect(inputNamed(devices, '  ')).toBeNull();
  });
});
