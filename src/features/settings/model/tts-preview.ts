import type { ChoiceAvailability, ChoiceState, Setting, SettingsOverview } from '@/core/types';

export type ChoiceStatus =
  | { kind: 'ready' }
  | { kind: 'missing'; sizeMb: number }
  | { kind: 'installing' }
  | { kind: 'failed'; sizeMb: number }
  | { kind: 'host'; sizeMb: number; command: string };

export const TTS_PREVIEW_VOICES = {
  es: ['jean', 'lola', 'alba', 'eve', 'fantine', 'giovanni', 'marius', 'javert', 'michael'],
  en: ['jean', 'alba', 'eve', 'jane', 'mary', 'marius', 'javert', 'michael', 'george'],
} as const;

export const TTS_PREVIEW_VARIANTS = ['fast', 'quality'] as const;

const NON_COMMERCIAL_VOICES: readonly string[] = ['jean'];
const VOICE_KEYS: readonly string[] = ['tts.pocket_voice_es', 'tts.pocket_voice_en'];
const PREVIEW_KEYS: readonly string[] = [
  'tts.engine_es',
  'tts.engine_en',
  'tts.pocket_variant_es',
  'tts.pocket_voice_es',
  'tts.pocket_voice_en',
];

export function ttsPreviewClipIds(): string[] {
  const spanish = TTS_PREVIEW_VARIANTS.flatMap((variant) =>
    TTS_PREVIEW_VOICES.es.map((voice) => `pocket-es-${variant}-${voice}`)
  );
  const english = TTS_PREVIEW_VOICES.en.map((voice) => `pocket-en-${voice}`);
  return ['supertonic-es-m3', 'supertonic-en-m3', ...spanish, ...english];
}

const KNOWN_CLIPS = new Set(ttsPreviewClipIds());

function valueOf(settings: readonly Setting[], key: string): string {
  const setting = settings.find((candidate) => candidate.key === key);
  if (!setting) return '';
  return setting.value || setting.fallback;
}

function pocketSpanish(variant: string, voice: string): string {
  return `pocket-es-${variant}-${voice}`;
}

function candidateClip(key: string, choice: string, settings: readonly Setting[]): string | null {
  const variant = valueOf(settings, 'tts.pocket_variant_es') || 'quality';
  const spanishVoice = valueOf(settings, 'tts.pocket_voice_es') || 'jean';
  const englishVoice = valueOf(settings, 'tts.pocket_voice_en') || 'jean';
  switch (key) {
    case 'tts.engine_es':
      return choice === 'supertonic' ? 'supertonic-es-m3' : pocketSpanish(variant, spanishVoice);
    case 'tts.engine_en':
      return choice === 'supertonic' ? 'supertonic-en-m3' : `pocket-en-${englishVoice}`;
    case 'tts.pocket_variant_es':
      return pocketSpanish(choice, spanishVoice);
    case 'tts.pocket_voice_es':
      return pocketSpanish(variant, choice);
    case 'tts.pocket_voice_en':
      return `pocket-en-${choice}`;
    default:
      return null;
  }
}

export function previewClipId(key: string, choice: string, settings: readonly Setting[]): string | null {
  const clip = candidateClip(key, choice, settings);
  return clip !== null && KNOWN_CLIPS.has(clip) ? clip : null;
}

export function isNonCommercialChoice(key: string, choice: string): boolean {
  return VOICE_KEYS.includes(key) && NON_COMMERCIAL_VOICES.includes(choice);
}

export function usesChoiceList(setting: Setting): boolean {
  if (setting.type !== 'choice') return false;
  return PREVIEW_KEYS.includes(setting.key) || (setting.choiceStates?.length ?? 0) > 0;
}

export function choiceStateOf(setting: Setting, choice: string): ChoiceState | null {
  return setting.choiceStates?.find((state) => state.choice === choice) ?? null;
}

const STATUS_OF: Record<ChoiceAvailability, (state: ChoiceState) => ChoiceStatus> = {
  installed: () => ({ kind: 'ready' }),
  installable: (state) => ({ kind: 'missing', sizeMb: state.sizeMb }),
  installing: () => ({ kind: 'installing' }),
  failed: (state) => ({ kind: 'failed', sizeMb: state.sizeMb }),
  hostOnly: (state) => ({ kind: 'host', sizeMb: state.sizeMb, command: state.hostCommand }),
};

export function choiceStatus(setting: Setting, choice: string): ChoiceStatus {
  const state = choiceStateOf(setting, choice);
  return state ? STATUS_OF[state.availability](state) : { kind: 'ready' };
}

export function canChoose(setting: Setting, choice: string): boolean {
  return choice === setting.value || choiceStatus(setting, choice).kind !== 'host';
}

export function canInstallCurrent(setting: Setting): boolean {
  const status = choiceStatus(setting, setting.value);
  return status.kind === 'missing' || status.kind === 'failed';
}

export function hasInstallingChoice(overview: SettingsOverview): boolean {
  return overview.owners.some((owner) =>
    owner.settings.some((setting) =>
      (setting.choiceStates ?? []).some((state) => state.availability === 'installing')
    )
  );
}

export function megabytes(sizeMb: number): string {
  if (sizeMb <= 0) return '';
  return String(Math.max(1, Math.round(sizeMb)));
}
