import type { SettingApply, SettingsOwnerName, TranslationKey } from '@/core/types';
import type { AvatarTone } from '@/shared/ui/avatar';
import type { IconGlyph } from '@/shared/ui/icon';
import type { ProfileLevel } from '@/features/settings/model/profile-meters';

export type ServiceLook = { icon: IconGlyph; tone: AvatarTone; hint: TranslationKey };

export const SERVICE_LOOK: Readonly<Record<SettingsOwnerName, ServiceLook>> = {
  tts: { icon: 'speaker', tone: 'accent', hint: 'screens.settings.owners.tts.hint' },
  stt: { icon: 'ear', tone: 'default', hint: 'screens.settings.owners.stt.hint' },
  llm: { icon: 'chat', tone: 'default', hint: 'screens.settings.owners.llm.hint' },
  voice: { icon: 'mic', tone: 'default', hint: 'screens.settings.owners.voice.hint' },
  vlm: { icon: 'eye', tone: 'default', hint: 'screens.settings.owners.vlm.hint' },
  camera: { icon: 'cam', tone: 'default', hint: 'screens.settings.owners.camera.hint' },
  guard: { icon: 'shield', tone: 'default', hint: 'screens.settings.owners.guard.hint' },
  notification: {
    icon: 'bell',
    tone: 'default',
    hint: 'screens.settings.owners.notification.hint',
  },
};

export type MeterKey = 'response' | 'memory' | 'voice';

export const METERS: readonly MeterKey[] = ['response', 'memory', 'voice'];

export const METER_LABEL: Readonly<Record<MeterKey, TranslationKey>> = {
  response: 'screens.settings.how.response',
  memory: 'screens.settings.how.memory',
  voice: 'screens.settings.how.voice',
};

export const LEVEL_LABEL: Readonly<
  Record<MeterKey, Readonly<Record<ProfileLevel, TranslationKey>>>
> = {
  response: {
    performance: 'screens.settings.how.levels.response.performance',
    balanced: 'screens.settings.how.levels.response.balanced',
    quality: 'screens.settings.how.levels.response.quality',
  },
  memory: {
    performance: 'screens.settings.how.levels.memory.performance',
    balanced: 'screens.settings.how.levels.memory.balanced',
    quality: 'screens.settings.how.levels.memory.quality',
  },
  voice: {
    performance: 'screens.settings.how.levels.voice.performance',
    balanced: 'screens.settings.how.levels.voice.balanced',
    quality: 'screens.settings.how.levels.voice.quality',
  },
};

export const COMMIT_DELAY_MS = 600;

export const STEPPER_MAX_STEPS = 400;

export const APPLY_LABEL: Readonly<Record<SettingApply, TranslationKey>> = {
  live: 'screens.settings.apply.live',
  nextSession: 'screens.settings.apply.nextSession',
  restart: 'screens.settings.apply.restart',
};

export const APPEARANCE_HREF = '/profile/appearance';
