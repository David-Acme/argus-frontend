import { describe, expect, test } from 'bun:test';
import type { VoiceActionRecord } from '@/core/types';
import { voiceActionLabel } from '@/features/voice/model/voice-action-label';

const KNOWN: Readonly<Record<string, string>> = {
  'screens.voice.actions.screens.agenda': 'Agenda',
  'screens.security.mode.night': 'Noche',
};

const copy = {
  t: ((key: string, params?: Record<string, string>) =>
    params ? `${key}(${Object.values(params).join(',')})` : key) as never,
  tk: (key: string) => KNOWN[key] ?? key,
};

const action = (
  name: VoiceActionRecord['name'],
  args: Record<string, unknown>
): VoiceActionRecord => ({
  id: '1',
  name,
  arguments: args,
  status: 'done',
  detail: null,
});

describe('voiceActionLabel', () => {
  test('a camera is named, or the alert camera stands in', () => {
    expect(voiceActionLabel(action('app.show_camera', { camera: ' Cocina ' }), copy)).toBe(
      'screens.voice.actions.show-camera(Cocina)'
    );
    expect(voiceActionLabel(action('app.show_camera', {}), copy)).toBe(
      'screens.voice.actions.show-camera-any'
    );
  });

  test('a screen uses its translated name, or its own id when unknown', () => {
    expect(voiceActionLabel(action('app.open', { screen: 'agenda' }), copy)).toBe(
      'screens.voice.actions.open(Agenda)'
    );
    expect(voiceActionLabel(action('app.open', { screen: 'lab' }), copy)).toBe(
      'screens.voice.actions.open(lab)'
    );
  });

  test('a guard mode names its place when one was given', () => {
    expect(voiceActionLabel(action('app.set_guard_mode', { mode: 'night' }), copy)).toBe(
      'screens.voice.actions.set-guard-mode(Noche)'
    );
    expect(
      voiceActionLabel(action('app.set_guard_mode', { mode: 'night', environment: 'Tienda' }), copy)
    ).toBe('Tienda · screens.voice.actions.set-guard-mode(Noche)');
  });
});
