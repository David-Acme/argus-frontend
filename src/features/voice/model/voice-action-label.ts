import type { TranslateFn, VoiceActionRecord } from '@/core/types';

export type VoiceActionCopy = { t: TranslateFn; tk: (key: string) => string };

const named = (tk: VoiceActionCopy['tk'], key: string, fallback: string): string =>
  tk(key) === key ? fallback : tk(key);

const textOf = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export function voiceActionLabel(action: VoiceActionRecord, { t, tk }: VoiceActionCopy): string {
  if (action.name === 'app.show_camera') {
    const camera = textOf(action.arguments.camera);
    return camera
      ? t('screens.voice.actions.show-camera', { name: camera })
      : t('screens.voice.actions.show-camera-any');
  }
  if (action.name === 'app.open') {
    const screen = String(action.arguments.screen ?? '');
    return t('screens.voice.actions.open', {
      screen: named(tk, `screens.voice.actions.screens.${screen}`, screen),
    });
  }
  const mode = String(action.arguments.mode ?? '');
  const label = t('screens.voice.actions.set-guard-mode', {
    mode: named(tk, `screens.security.mode.${mode}`, mode),
  });
  const place = textOf(action.arguments.environment);
  return place ? `${place} · ${label}` : label;
}
