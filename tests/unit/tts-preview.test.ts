import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ChoiceState, Setting, SettingsOverview } from '@/core/types';
import { settingsOverviewSchema } from '@/core/contracts/http.contract';
import {
  canChoose,
  canInstallCurrent,
  choiceStatus,
  hasInstallingChoice,
  isNonCommercialChoice,
  megabytes,
  previewClipId,
  ttsPreviewClipIds,
  usesChoiceList,
} from '@/features/settings/model/tts-preview';

const CLIP_DIR = join(import.meta.dir, '../../src/assets/audio/tts-previews');

function choiceSetting(key: string, choices: string[], value: string, choiceStates?: ChoiceState[]): Setting {
  return {
    key,
    group: 'engine',
    type: 'choice',
    level: 'basic',
    apply: 'live',
    min: 0,
    max: 0,
    step: 0,
    choices,
    value,
    fallback: choices[0] ?? '',
    ...(choiceStates ? { choiceStates } : {}),
  };
}

const ttsSettings = (variant: string, spanish: string, english: string): Setting[] => [
  choiceSetting('tts.engine_es', ['pocket', 'supertonic'], 'pocket'),
  choiceSetting('tts.engine_en', ['pocket', 'supertonic'], 'pocket'),
  choiceSetting('tts.pocket_variant_es', ['fast', 'quality'], variant),
  choiceSetting('tts.pocket_voice_es', ['jean', 'lola', 'cosette'], spanish),
  choiceSetting('tts.pocket_voice_en', ['jean', 'alba'], english),
];

const state = (choice: string, availability: ChoiceState['availability'], sizeMb = 0): ChoiceState => ({
  choice,
  availability,
  sizeMb,
  hostCommand: availability === 'hostOnly' ? `services/tts/scripts/provision.sh --voice en:${choice}` : '',
});

describe('voice preview clips', () => {
  test('every option the app offers has an Opus and an AAC clip, and nothing else is bundled', () => {
    const ids = ttsPreviewClipIds();
    expect(ids).toHaveLength(29);
    const files = readdirSync(CLIP_DIR).sort();
    const expected = ids.flatMap((id) => [`${id}.m4a`, `${id}.ogg`]).sort();
    expect(files).toEqual(expected);
  });

  test('both platform manifests name every clip', () => {
    for (const platform of ['web', 'native']) {
      const manifest = readFileSync(
        join(import.meta.dir, `../../src/features/settings/constants/tts-preview-clips.${platform}.ts`),
        'utf8'
      );
      for (const id of ttsPreviewClipIds()) expect(manifest).toContain(`'${id}':`);
    }
  });

  test('each option plays what the house would say with it', () => {
    const settings = ttsSettings('quality', 'jean', 'alba');
    expect(previewClipId('tts.engine_es', 'pocket', settings)).toBe('pocket-es-quality-jean');
    expect(previewClipId('tts.engine_es', 'supertonic', settings)).toBe('supertonic-es-m3');
    expect(previewClipId('tts.engine_en', 'pocket', settings)).toBe('pocket-en-alba');
    expect(previewClipId('tts.engine_en', 'supertonic', settings)).toBe('supertonic-en-m3');
    expect(previewClipId('tts.pocket_variant_es', 'fast', settings)).toBe('pocket-es-fast-jean');
    expect(previewClipId('tts.pocket_voice_es', 'lola', settings)).toBe('pocket-es-quality-lola');
    expect(previewClipId('tts.pocket_voice_en', 'jean', settings)).toBe('pocket-en-jean');
    const fast = ttsSettings('fast', 'lola', 'jean');
    expect(previewClipId('tts.pocket_voice_es', 'jean', fast)).toBe('pocket-es-fast-jean');
    expect(previewClipId('tts.engine_es', 'pocket', fast)).toBe('pocket-es-fast-lola');
  });

  test('an option without a clip has no preview', () => {
    const settings = ttsSettings('quality', 'jean', 'jean');
    expect(previewClipId('tts.pocket_voice_es', 'cosette', settings)).toBeNull();
    expect(previewClipId('tts.quality', 'high', settings)).toBeNull();
    expect(previewClipId('tts.pocket_voice_en', '../x', settings)).toBeNull();
  });

  test('jean is flagged as non-commercial only where it is a voice', () => {
    expect(isNonCommercialChoice('tts.pocket_voice_es', 'jean')).toBe(true);
    expect(isNonCommercialChoice('tts.pocket_voice_en', 'alba')).toBe(false);
    expect(isNonCommercialChoice('tts.engine_es', 'jean')).toBe(false);
  });
});

describe('installation state', () => {
  const voices = choiceSetting('tts.pocket_voice_en', ['jean', 'alba', 'george', 'mary', 'eve'], 'jean', [
    state('jean', 'hostOnly', 6.195),
    state('alba', 'installed', 6.195),
    state('george', 'installable', 6.244152),
    state('mary', 'installing', 6.195),
    state('eve', 'failed', 6.539),
  ]);

  test('each availability becomes what the option says', () => {
    expect(choiceStatus(voices, 'alba')).toEqual({ kind: 'ready' });
    expect(choiceStatus(voices, 'george')).toEqual({ kind: 'missing', sizeMb: 6.244152 });
    expect(choiceStatus(voices, 'mary')).toEqual({ kind: 'installing' });
    expect(choiceStatus(voices, 'eve')).toEqual({ kind: 'failed', sizeMb: 6.539 });
    expect(choiceStatus(voices, 'jean')).toEqual({
      kind: 'host',
      sizeMb: 6.195,
      command: 'services/tts/scripts/provision.sh --voice en:jean',
    });
    expect(choiceStatus(voices, 'unknown')).toEqual({ kind: 'ready' });
  });

  test('a host-only option cannot be chosen unless it is already the value', () => {
    expect(canChoose(voices, 'jean')).toBe(true);
    expect(canChoose({ ...voices, value: 'alba' }, 'jean')).toBe(false);
    expect(canChoose({ ...voices, value: 'alba' }, 'george')).toBe(true);
    expect(canChoose({ ...voices, value: 'alba' }, 'eve')).toBe(true);
  });

  test('the selected option offers an install only when the server can do it', () => {
    expect(canInstallCurrent(voices)).toBe(false);
    expect(canInstallCurrent({ ...voices, value: 'george' })).toBe(true);
    expect(canInstallCurrent({ ...voices, value: 'eve' })).toBe(true);
    expect(canInstallCurrent({ ...voices, value: 'mary' })).toBe(false);
    expect(canInstallCurrent({ ...voices, value: 'alba' })).toBe(false);
  });

  test('the screen polls only while something installs', () => {
    const overview = (setting: Setting): SettingsOverview => ({
      owners: [{ service: 'tts', reachable: true, settings: [setting] }],
    });
    expect(hasInstallingChoice(overview(voices))).toBe(true);
    expect(hasInstallingChoice(overview({ ...voices, choiceStates: [state('alba', 'installed')] }))).toBe(false);
    expect(hasInstallingChoice(overview(choiceSetting('tts.quality', ['auto'], 'auto')))).toBe(false);
  });

  test('sizes read as whole megabytes and an unknown size says nothing', () => {
    expect(megabytes(672.425286)).toBe('672');
    expect(megabytes(0.4)).toBe('1');
    expect(megabytes(0)).toBe('');
  });

  test('tts engine, variant and voice settings use the option list; other choices keep their control', () => {
    expect(usesChoiceList(voices)).toBe(true);
    expect(usesChoiceList(choiceSetting('tts.engine_es', ['pocket', 'supertonic'], 'pocket'))).toBe(true);
    expect(usesChoiceList(choiceSetting('tts.quality', ['auto', 'low'], 'auto'))).toBe(false);
    expect(usesChoiceList(choiceSetting('stt.engine', ['a', 'b'], 'a', [state('a', 'installed')]))).toBe(true);
  });

  test('the settings contract accepts the states and the older shape without them', () => {
    const parse = (setting: Setting) =>
      settingsOverviewSchema.safeParse({ owners: [{ service: 'tts', reachable: true, settings: [setting] }] });
    expect(parse(voices).success).toBe(true);
    expect(parse(choiceSetting('tts.quality', ['auto'], 'auto')).success).toBe(true);
    const broken = { ...voices, choiceStates: [{ ...state('alba', 'installed'), availability: 'downloaded' }] };
    expect(parse(broken as unknown as Setting).success).toBe(false);
  });
});
