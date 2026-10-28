import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localeDictionaries } from '@/core/locales/all';
import { translate } from '@/core/i18n/translate';
import type { IncidentResponse, TranslateFn } from '@/core/types';
import { canDecide, placeOf } from '@/features/response/model/response';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const responseSource = (relative: string) =>
  readFileSync(join(import.meta.dir, '../../../../src/features/response', relative), 'utf8');

const alert: IncidentResponse = {
  id: 5,
  threadKey: 'guard:5',
  kind: 'guard_episode',
  environmentId: 1,
  environmentName: 'Casa',
  cameraId: 3,
  cameraName: 'Patio trasero',
  episodeId: 51,
  strategy: 'ordered',
  state: 'active',
  step: 1,
  stepCount: 2,
  attendedBy: null,
  verdict: '',
  verdictBy: null,
  verdictAt: 0,
  emergencyNumber: '105',
  contacts: [],
  showContacts: false,
  offers: ['attend', 'verdict'],
  createdAt: 1791860000,
  updatedAt: 1791860000,
  mine: { step: 1, mode: 'call', mandatory: false, discreet: false, reached: true },
};

const KIND_KEYS = {
  guard_episode: 'episode',
  guard_panic: 'panic',
  guard_duress: 'duress',
  guard_tamper: 'tamper',
} as const satisfies Readonly<Record<IncidentResponse['kind'], string>>;

describe('the alert card the response e2e answers', () => {
  test('the kind and the place share one line, exactly as the e2e waits for it', () => {
    const card = responseSource('components/response-card.tsx');
    expect(card).toContain(
      "const KIND_KEYS = {\n  guard_episode: 'episode',\n  guard_panic: 'panic',\n  guard_duress: 'duress',\n  guard_tamper: 'tamper',\n} as const satisfies Readonly<Record<IncidentResponse['kind'], string>>;"
    );
    expect(card).toContain("{place ? ` · ${place}` : ''}");

    for (const key of Object.values(KIND_KEYS)) {
      expect(en(`screens.response.kind.${key}`).length).toBeGreaterThan(0);
      expect(es(`screens.response.kind.${key}`).length).toBeGreaterThan(0);
    }
    expect(en(`screens.response.kind.${KIND_KEYS[alert.kind]}`)).toBe('Security alert');
    expect(es(`screens.response.kind.${KIND_KEYS[alert.kind]}`)).toBe('Alerta de vigilancia');
    expect(`${en(`screens.response.kind.${KIND_KEYS[alert.kind]}`)} · ${placeOf(alert)}`).toBe(
      'Security alert · Patio trasero (Casa)'
    );
  });

  test("the two answers are the card's own buttons, each waiting on the other", () => {
    expect(en('screens.response.real')).toBe('It is real');
    expect(es('screens.response.real')).toBe('Es real');
    expect(en('screens.response.false-alarm')).toBe('False alarm');
    expect(es('screens.response.false-alarm')).toBe('Falsa alarma');

    const card = responseSource('components/response-card.tsx');
    expect(card).toMatch(/variant="destructive"[\s\S]{0,320}choose\('real'\)/);
    expect(card).toMatch(/variant="outline"[\s\S]{0,320}choose\('false_alarm'\)/);
    expect(card).toContain("loading={pending === 'real'}");
    expect(card).toContain("loading={pending === 'false_alarm'}");
    expect(card.match(/disabled=\{pending !== null\}/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(card).toContain("const choose = async (verdict: 'real' | 'false_alarm') => {");
    expect(canDecide(alert, 'real')).toBe(true);
    expect(canDecide(alert, 'false_alarm')).toBe(true);
    expect(canDecide({ ...alert, state: 'false_alarm' }, 'real')).toBe(false);
    expect(canDecide({ ...alert, state: 'false_alarm' }, 'false_alarm')).toBe(false);
  });

  test('the strip draws one card per alert and nothing at all when there is none', () => {
    const strip = responseSource('components/response-strip.tsx');
    expect(strip).toContain('const responses = useResponses();');
    expect(strip).toContain('if (responses.length === 0) return null;');
    expect(strip).toMatch(
      /responses\.map\(\(response\) => \(\s*<ResponseCardFor key=\{response\.id\} response=\{response\} \/>/
    );
  });

  test('a false alarm asks before it answers, and the question is the one the e2e confirms', () => {
    expect(en('screens.response.confirm-false-title')).toBe('Is it a false alarm?');
    expect(es('screens.response.confirm-false-title')).toBe('¿Es una falsa alarma?');
    expect(en('screens.response.confirm-false-description')).toBe(
      'The others stop being called and Argus learns from this alert.'
    );
    expect(en('common.cancel')).toBe('Cancel');

    const hook = responseSource('hooks/use-responses.ts');
    expect(hook).toMatch(
      /verdict === 'false_alarm'\s*\?\s*\{\s*title: t\('screens\.response\.confirm-false-title'\)/
    );
    expect(hook).toContain("description: t('screens.response.confirm-false-description')");
    expect(hook).toContain("confirmLabel: t('screens.response.false-alarm')");
    expect(hook).toContain("cancelLabel: t('common.cancel')");
    expect(hook).toMatch(/\}\s*:\s*undefined,/);
  });

  test('the answer shows at once, is put back when the server refuses, and never runs if the question is cancelled', () => {
    const hook = responseSource('hooks/use-responses.ts');
    expect(hook).toMatch(/const before = response;\s*const result = await runServiceAction\(\{/);
    expect(hook).toMatch(/confirm:[\s\S]*?: undefined,[\s\S]*?call: \(\) => \{\s*store\.apply\(/);
    expect(hook).toContain('return responseService.decide(response.id, verdict);');
    expect(hook).toContain("errorTitle: t('screens.response.verdict-failed')");
    expect(hook).toMatch(
      /useResponseStore\.setState\(\(state\) => \(\{\s*responses: \{ \.\.\.state\.responses, \[before\.id\]: before \},?\s*\}\)\);/
    );
    expect(en('screens.response.verdict-failed')).toBe('Your answer could not be saved');
  });
});
