import type { CameraRecordMode, TranslationKey } from '@/core/types';

const RECORD_MODE_LABEL: Record<CameraRecordMode, TranslationKey> = {
  off: 'screens.cameras.form.record-off',
  motion: 'screens.cameras.form.record-motion',
  events: 'screens.cameras.form.record-events',
  continuous: 'screens.cameras.form.record-continuous',
};

const RECORD_MODE_ORDER: readonly CameraRecordMode[] = ['events', 'motion', 'continuous', 'off'];

export function recordModeLabelKey(mode: CameraRecordMode): TranslationKey {
  return RECORD_MODE_LABEL[mode] ?? 'screens.cameras.form.record-events';
}

export function recordModeOptions(): readonly CameraRecordMode[] {
  return RECORD_MODE_ORDER;
}

export function recordsSomething(mode: CameraRecordMode): boolean {
  return mode !== 'off';
}
