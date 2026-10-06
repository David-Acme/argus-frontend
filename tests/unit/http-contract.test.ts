import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readActivityPage } from '@/core/contracts/activity.contract';
import { envelopeSchema, HTTP_CONTRACTS } from '@/core/contracts/http.contract';
import { privacyDirectorySchema, privacyMeSchema } from '@/core/contracts/privacy.contract';

type Probe = {
  method: string;
  route: string;
  probe: string;
  response: { status: number; json: unknown };
};

const FIXTURES = join(import.meta.dir, '../../../backend/scripts/fixtures/http');
const MASKED_STRINGS = new Set(['accessToken', 'refreshToken', 'token', 'capability', 'challengeId']);

const probes: Probe[] = readdirSync(FIXTURES)
  .filter((file) => file.endsWith('.json') && file !== 'manifest.json')
  .flatMap((file) => (JSON.parse(readFileSync(join(FIXTURES, file), 'utf8')) as { probes: Probe[] }).probes);

const MASKED_SAMPLES: Readonly<Record<string, string>> = {
  '<masked-hex32>': '0'.repeat(32),
  '<masked-hex64>': '0'.repeat(64),
};

function unmask(value: unknown, key = ''): unknown {
  if (typeof value === 'string' && value in MASKED_SAMPLES) return MASKED_SAMPLES[value];
  if (typeof value === 'string' && value.startsWith('<masked')) return MASKED_STRINGS.has(key) ? value : 0;
  if (Array.isArray(value)) return value.map((item) => unmask(item, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, unmask(item, field)]));
  }
  return value;
}

const recorded = probes.filter(
  (probe) => probe.route !== '/health' && probe.response.json !== null && typeof probe.response.json === 'object'
);

const AWAITING_GOLDEN: ReadonlySet<string> = new Set(['GET /modules/{1}/impact', 'POST /modules/{1}/request']);

describe('backend fixtures honour the app contracts', () => {
  test('there are recordings to check', () => {
    expect(recorded.length).toBeGreaterThan(50);
  });

  test('every JSON response is the {status, info, errors} envelope', () => {
    const failures = recorded
      .filter((probe) => !envelopeSchema.safeParse(probe.response.json).success)
      .map((probe) => `${probe.method} ${probe.route} (${probe.probe})`);
    expect(failures).toEqual([]);
  });

  const successesOf = (route: string) =>
    recorded.filter(
      (probe) =>
        `${probe.method} ${probe.route}` === route && probe.response.status >= 200 && probe.response.status < 300
    );

  for (const [route, schema] of Object.entries(HTTP_CONTRACTS)) {
    if (AWAITING_GOLDEN.has(route) && successesOf(route).length === 0) {
      test.todo(`${route} matches the shape the app reads (no golden recorded yet)`, () => undefined);
      continue;
    }
    test(`${route} matches the shape the app reads`, () => {
      const successes = successesOf(route);
      expect(successes.length).toBeGreaterThan(0);
      for (const probe of successes) {
        const envelope = envelopeSchema.parse(probe.response.json);
        const parsed = schema.safeParse(unmask(envelope.info));
        expect(parsed.success ? null : `${probe.probe}: ${parsed.error.message}`).toBeNull();
      }
    });
  }

  test('a route waiting for its golden leaves the waiting list once it is recorded', () => {
    const recordedNow = [...AWAITING_GOLDEN].filter((route) => successesOf(route).length > 0);
    expect(recordedNow).toEqual([]);
  });

  test('every route waiting for a golden has a contract to check it with', () => {
    expect([...AWAITING_GOLDEN].filter((route) => !(route in HTTP_CONTRACTS))).toEqual([]);
  });

  test('every activity item the backend recorded is read, none is dropped', () => {
    const pages = successesOf('GET /sync/activity');
    expect(pages.length).toBeGreaterThan(0);
    for (const probe of pages) {
      const info = unmask(envelopeSchema.parse(probe.response.json).info) as { items: unknown[] };
      expect(info.items.length).toBeGreaterThan(0);
      expect(readActivityPage(info)?.rows).toHaveLength(info.items.length);
    }
  });

  test('the privacy answers carry the applicable signals the app reads', () => {
    for (const [route, schema] of [
      ['GET /privacy/me', privacyMeSchema],
      ['GET /privacy/users', privacyDirectorySchema],
    ] as const) {
      const answers = successesOf(route);
      expect(answers.length).toBeGreaterThan(0);
      for (const probe of answers) {
        const info = unmask(envelopeSchema.parse(probe.response.json).info);
        const read = schema.parse(info);
        expect(read.applicable).toEqual({ presence: true, faceCameras: true, voiceLearning: true, cameraAudio: true });
      }
    }
  });
});
