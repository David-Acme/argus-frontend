import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { privacyDirectorySchema, privacyMeSchema } from '@/core/contracts/privacy.contract';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { HouseholdPrivacy, PrivacyMe, PrivacyState, TranslateFn, TranslationKey } from '@/core/types';
import { PRIVACY_JURISDICTION } from '@/features/privacy/constants/privacy';
import {
  decisionOf,
  locationChosen,
  locationOffered,
  watchmanReadiness,
  withLocation,
} from '@/features/privacy/model/privacy';
import { buildSignage, escapeHtml, signageHtml, signageResponsible, signageText } from '@/features/privacy/model/signage';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const privacySource = (relative: string) =>
  readFileSync(join(import.meta.dir, '../../../../src/features/privacy', relative), 'utf8');

const CHOICES = { presence: true, faceCameras: true, voiceLearning: true, cameraAudio: true };

const household = (patch: Partial<HouseholdPrivacy> = {}): HouseholdPrivacy => ({
  ...CHOICES,
  visitorRecognition: false,
  watchman: true,
  ...patch,
});

const state = (cameraAudio: boolean, decided = true): PrivacyState => ({
  decided,
  noticeVersion: 2,
  current: true,
  decidedAt: decided ? 1_790_000_000 : null,
  updatedAt: null,
  choices: { ...CHOICES, cameraAudio },
  effective: { ...CHOICES, cameraAudio },
});

const me: PrivacyMe = {
  ...state(true),
  currentNoticeVersion: 2,
  household: { ...CHOICES, location: true },
  applicable: { ...CHOICES, location: true },
};

describe('the household watchman', () => {
  test('it listens only when the switch, the household audio and every person allow it', () => {
    expect(watchmanReadiness(household({ watchman: false }), [state(true)])).toBe('off');
    expect(watchmanReadiness(household({ cameraAudio: false }), [state(true)])).toBe('audio-off');
    expect(watchmanReadiness(household(), [state(true), state(false)])).toBe('audio-held');
    expect(watchmanReadiness(household(), [state(true), state(true, false)])).toBe('audio-held');
    expect(watchmanReadiness(household(), [state(true), state(true)])).toBe('ready');
  });

  test('the directory reads an older identity without the watchman as off', () => {
    const parsed = privacyDirectorySchema.parse({
      currentNoticeVersion: 2,
      household: { ...CHOICES, visitorRecognition: false },
      householdUpdatedAt: null,
      visitorAcknowledgedAt: null,
      users: [],
    });
    expect(parsed.household.watchman).toBe(false);
    expect(parsed.watchmanAcknowledgedAt).toBeNull();
  });

  test('the directory reads the watchman and its acknowledgement as identity answers them', () => {
    const parsed = privacyDirectorySchema.parse({
      currentNoticeVersion: 2,
      household: { ...CHOICES, location: true, visitorRecognition: false, watchman: true },
      householdUpdatedAt: 1_790_000_000,
      visitorAcknowledgedAt: null,
      watchmanAcknowledgedAt: 1_790_000_100,
      users: [],
    });
    expect(parsed.household.watchman).toBe(true);
    expect(parsed.household.location).toBe(true);
    expect(parsed.watchmanAcknowledgedAt).toBe(1_790_000_100);
  });

  test('turning it on goes through the acknowledgement, turning it off confirms', () => {
    const panel = privacySource('components/household-privacy-panel.tsx');
    expect(panel).toContain("onChange={(value) => (value ? setWatchmanAsking(true) : void setSwitch('watchman', false))}");
    expect(panel).toContain("const saved = await setSwitch('watchman', true, true);");
    const hook = privacySource('hooks/use-privacy-directory.ts');
    expect(hook).toContain("const ACKNOWLEDGED_SWITCHES: readonly HouseholdSwitch[] = ['visitorRecognition', 'watchman'];");
    expect(hook).toContain("watchman: ['screens.privacy.household.watchman-off-title', 'screens.privacy.household.watchman-off-description'],");
  });

  test('the acknowledgement names the installer, the signs, the rest areas, consent and retention in both languages', () => {
    const dialog = privacySource('components/watchman-acknowledgement-dialog.tsx');
    for (const point of [
      'watchman-ack-installer',
      'watchman-ack-sign',
      'watchman-ack-rest',
      'watchman-ack-consent',
      'watchman-ack-retention',
    ]) {
      expect(dialog).toContain(`'${point}'`);
      expect(es(`screens.privacy.household.${point}` as TranslationKey).length).toBeGreaterThan(20);
      expect(en(`screens.privacy.household.${point}` as TranslationKey).length).toBeGreaterThan(20);
    }
    expect(es('screens.privacy.household.watchman-ack-rest')).toContain('sin audio');
    expect(en('screens.privacy.household.watchman-ack-rest')).toContain('no audio');
  });
});

describe('the location opt-out', () => {
  test('location is on unless the person turned it off', () => {
    expect(locationChosen(CHOICES)).toBe(true);
    expect(locationChosen({ ...CHOICES, location: true })).toBe(true);
    expect(locationChosen({ ...CHOICES, location: false })).toBe(false);
  });

  test('it is offered only with surveillance on and when identity applies it', () => {
    const on = (id: string) => id === 'core' || id === 'surveillance';
    expect(locationOffered(me, on)).toBe(true);
    expect(locationOffered(me, (id) => id === 'core')).toBe(false);
    expect(locationOffered({ applicable: { ...CHOICES, location: false } }, on)).toBe(false);
    expect(locationOffered(null, on)).toBe(true);
  });

  test('the decision keeps every other choice and carries the location', () => {
    const choices = withLocation(me, false);
    expect(choices).toEqual({ ...me.choices, location: false });
    expect(decisionOf(choices).location).toBe(false);
  });

  test('identity may answer the choices with or without the location', () => {
    expect(privacyMeSchema.safeParse(me).success).toBe(true);
    expect(privacyMeSchema.safeParse({ ...me, applicable: CHOICES, household: CHOICES }).success).toBe(true);
  });
});

describe('the entrance sign', () => {
  test('a sign without audio says cameras only, with audio it explains the tone', () => {
    const plain = buildSignage({ audio: false, responsible: '', language: 'es', jurisdiction: PRIVACY_JURISDICTION }, es);
    expect(plain.heading).toBe('ZONA VIDEOVIGILADA');
    expect(plain.lines.some((line) => line.includes('Argus'))).toBe(false);

    const audio = buildSignage(
      { audio: true, responsible: '  David   Acme · 999 ', language: 'es', jurisdiction: PRIVACY_JURISDICTION },
      es
    );
    expect(audio.heading).toBe('ZONA VIDEOVIGILADA CON AUDIO');
    expect(audio.lines).toContain('Responsable: David Acme · 999');
    expect(audio.lines.some((line) => line.includes('ANPD'))).toBe(true);
    expect(signageText(audio).startsWith('ZONA VIDEOVIGILADA CON AUDIO\n\n')).toBe(true);
  });

  test('the English sign names the authority in English', () => {
    const sign = buildSignage({ audio: true, responsible: '', language: 'en', jurisdiction: PRIVACY_JURISDICTION }, en);
    expect(sign.heading).toBe('VIDEO AND AUDIO SURVEILLANCE AREA');
    expect(sign.lines.some((line) => line.includes('National Personal Data Protection Authority'))).toBe(true);
  });

  test('the printed page escapes what the owner typed', () => {
    expect(escapeHtml('<b>"x" & \'y\'</b>')).toBe('&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
    const html = signageHtml({ heading: 'A', lines: ['<script>'] }, 'es');
    expect(html).toContain('<p>&lt;script&gt;</p>');
    expect(html).not.toContain('<script>');
    expect(signageResponsible('x'.repeat(300)).length).toBe(120);
  });
});
